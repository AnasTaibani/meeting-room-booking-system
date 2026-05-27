"""
Meeting Room Booking System - FastAPI Backend
"""
from dotenv import load_dotenv
load_dotenv()

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal
from pathlib import Path

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict


# -----------------------------------------------------------------------------
# Setup
# -----------------------------------------------------------------------------
ROOT_DIR = Path(__file__).parent
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"

ROOMS_SEED = [
    {"id": "room-1", "name": "Meeting Room 1", "capacity": 6,  "description": "Cozy 6-seater for stand-ups and small syncs."},
    {"id": "room-2", "name": "Meeting Room 2", "capacity": 10, "description": "Medium room with conferencing and whiteboard."},
    {"id": "room-3", "name": "Boardroom",       "capacity": 16, "description": "Executive boardroom with premium AV setup."},
]

ROOM_IMAGES = {
    "room-1": "https://images.pexels.com/photos/20390772/pexels-photo-20390772.jpeg",
    "room-2": "https://images.pexels.com/photos/260689/pexels-photo-260689.jpeg",
    "room-3": "https://images.unsplash.com/photo-1571624436279-b272aff752b5?crop=entropy&cs=srgb&fm=jpg",
}

# -----------------------------------------------------------------------------
# Models
# -----------------------------------------------------------------------------
class UserPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    name: str
    team: str
    role: Literal["employee", "admin"]


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)
    team: str = Field(min_length=1, max_length=80)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class RoomOut(BaseModel):
    id: str
    name: str
    capacity: int
    description: str
    image_url: str
    maintenance: bool = False


class BookingIn(BaseModel):
    room_id: str
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default="", max_length=1000)
    start_time: datetime
    end_time: datetime


class FindAndBookIn(BaseModel):
    duration_minutes: int = Field(ge=15, le=240)
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default="", max_length=1000)
    min_capacity: int = Field(default=1, ge=1, le=50)


class BookingPatch(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    room_id: Optional[str] = None


class BookingOut(BaseModel):
    id: str
    room_id: str
    room_name: str
    title: str
    description: str
    start_time: datetime
    end_time: datetime
    user_id: str
    user_name: str
    user_email: EmailStr
    user_team: str
    status: Literal["upcoming", "active", "past", "cancelled"]
    created_at: datetime


class MaintenanceIn(BaseModel):
    maintenance: bool


# -----------------------------------------------------------------------------
# Auth helpers
# -----------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id, "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def _cookie_kwargs(max_age: int) -> dict:
    """Cookie attrs driven by env so the same code works locally (lax/no-secure)
    and in production cross-origin (none/secure). Defaults are safe for local dev."""
    samesite = os.environ.get("COOKIE_SAMESITE", "lax").lower()
    if samesite not in ("lax", "strict", "none"):
        samesite = "lax"
    secure_env = os.environ.get("COOKIE_SECURE", "auto").lower()
    if secure_env == "true":
        secure = True
    elif secure_env == "false":
        secure = False
    else:
        # auto: samesite=none requires secure=true per browser spec
        secure = samesite == "none"
    return {
        "httponly": True,
        "secure": secure,
        "samesite": samesite,
        "max_age": max_age,
        "path": "/",
    }


def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=60 * 60 * 24,
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=60 * 60 * 24 * 7,
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


def public_user(doc: dict) -> dict:
    return {
        "id": doc["id"], "email": doc["email"], "name": doc["name"],
        "team": doc["team"], "role": doc["role"],
    }


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")

        sub = payload.get("sub")
        email = (payload.get("email") or "").lower() or None
        user = None

        # Primary lookup by uuid id (the canonical identifier the JWT stores)
        if sub:
            user = await db.users.find_one({"id": sub}, {"_id": 0, "password_hash": 0})

        # Fallback by email — handles imported docs / migrations where the
        # `id` field may have drifted. The JWT is still cryptographically
        # verified, so this remains safe.
        if not user and email:
            user = await db.users.find_one({"email": email}, {"_id": 0, "password_hash": 0})
            if user:
                logger.warning(
                    "get_current_user: id lookup miss, fell back to email. jwt.sub=%s db.id=%s email=%s",
                    sub, user.get("id"), email,
                )
                # Self-heal: stamp the user with the JWT sub so future lookups hit the fast path.
                if sub and not user.get("id"):
                    await db.users.update_one({"email": email}, {"$set": {"id": sub}})
                    user["id"] = sub

        if not user:
            logger.warning("get_current_user: user not found. jwt.sub=%s email=%s", sub, email)
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user


# -----------------------------------------------------------------------------
# Booking helpers
# -----------------------------------------------------------------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def to_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def booking_status(start: datetime, end: datetime, cancelled: bool) -> str:
    if cancelled:
        return "cancelled"
    now = now_utc()
    start = to_aware(start)
    end = to_aware(end)
    if now < start:
        return "upcoming"
    if start <= now < end:
        return "active"
    return "past"


def serialize_booking(doc: dict) -> dict:
    start = datetime.fromisoformat(doc["start_time"]) if isinstance(doc["start_time"], str) else doc["start_time"]
    end = datetime.fromisoformat(doc["end_time"]) if isinstance(doc["end_time"], str) else doc["end_time"]
    created = datetime.fromisoformat(doc["created_at"]) if isinstance(doc["created_at"], str) else doc["created_at"]
    return {
        "id": doc["id"],
        "room_id": doc["room_id"],
        "room_name": doc["room_name"],
        "title": doc["title"],
        "description": doc.get("description", ""),
        "start_time": to_aware(start),
        "end_time": to_aware(end),
        "user_id": doc["user_id"],
        "user_name": doc["user_name"],
        "user_email": doc["user_email"],
        "user_team": doc["user_team"],
        "status": booking_status(start, end, doc.get("cancelled", False)),
        "created_at": to_aware(created),
    }


async def find_conflicting_booking(room_id: str, start: datetime, end: datetime, exclude_id: Optional[str] = None) -> Optional[dict]:
    """Find a non-cancelled overlapping booking for the room."""
    cursor = db.bookings.find({
        "room_id": room_id,
        "cancelled": {"$ne": True},
        "start_time": {"$lt": end.isoformat()},
        "end_time":   {"$gt": start.isoformat()},
    }, {"_id": 0})
    async for doc in cursor:
        if exclude_id and doc["id"] == exclude_id:
            continue
        return doc
    return None


def validate_booking_times(start: datetime, end: datetime, is_update: bool = False) -> None:
    start = to_aware(start)
    end = to_aware(end)
    if end <= start:
        raise HTTPException(status_code=400, detail="End time must be after start time")
    if not is_update and start < now_utc() - timedelta(minutes=1):
        raise HTTPException(status_code=400, detail="Cannot book in the past")
    if (end - start) > timedelta(hours=12):
        raise HTTPException(status_code=400, detail="Bookings cannot exceed 12 hours")


# -----------------------------------------------------------------------------
# App & router
# -----------------------------------------------------------------------------
app = FastAPI(title="Meeting Room Booking System")
api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"message": "Meeting Room Booking API"}


# ---------------------- Auth ------------------------------------------------
@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id, "email": email, "name": payload.name.strip(),
        "team": payload.team.strip(), "role": "employee",
        "password_hash": hash_password(payload.password),
        "created_at": now_utc().isoformat(),
    }
    await db.users.insert_one(doc)
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return public_user(doc)


@api.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    # Migration safety: back-fill `id` if the doc was imported without one.
    user_id = user.get("id")
    if not user_id:
        user_id = str(uuid.uuid4())
        await db.users.update_one({"email": email}, {"$set": {"id": user_id}})
        user["id"] = user_id
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return public_user(user)


@api.post("/auth/logout")
async def logout(response: Response, _user: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@api.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        sub = payload.get("sub")
        user = None
        if sub:
            user = await db.users.find_one({"id": sub})
        if not user:
            email = (payload.get("email") or "").lower() or None
            if email:
                user = await db.users.find_one({"email": email})
                if user and sub and not user.get("id"):
                    await db.users.update_one({"email": email}, {"$set": {"id": sub}})
                    user["id"] = sub
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        new_access = create_access_token(user["id"], user["email"])
        response.set_cookie("access_token", new_access, **_cookie_kwargs(3600))
        return {"ok": True}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


# ---------------------- Rooms -----------------------------------------------
@api.get("/rooms", response_model=List[RoomOut])
async def list_rooms():
    rooms = await db.rooms.find({}, {"_id": 0}).to_list(100)
    rooms.sort(key=lambda r: r["id"])
    out = []
    for r in rooms:
        out.append({
            "id": r["id"], "name": r["name"], "capacity": r["capacity"],
            "description": r["description"],
            "image_url": ROOM_IMAGES.get(r["id"], ""),
            "maintenance": r.get("maintenance", False),
        })
    return out


@api.get("/rooms/status")
async def rooms_status():
    rooms = await db.rooms.find({}, {"_id": 0}).to_list(100)
    rooms.sort(key=lambda r: r["id"])
    now = now_utc()
    result = []
    for r in rooms:
        room_state = {
            "id": r["id"], "name": r["name"], "capacity": r["capacity"],
            "description": r["description"], "image_url": ROOM_IMAGES.get(r["id"], ""),
            "maintenance": r.get("maintenance", False),
        }
        if r.get("maintenance"):
            room_state["status"] = "maintenance"
            room_state["current_booking"] = None
            room_state["next_booking"] = None
            result.append(room_state)
            continue
        bookings = await db.bookings.find(
            {"room_id": r["id"], "cancelled": {"$ne": True}, "end_time": {"$gt": now.isoformat()}},
            {"_id": 0},
        ).to_list(200)
        bookings.sort(key=lambda b: b["start_time"])
        current = None
        upcoming = None
        for b in bookings:
            s = datetime.fromisoformat(b["start_time"])
            e = datetime.fromisoformat(b["end_time"])
            if s <= now < e:
                current = serialize_booking(b)
            elif s > now and upcoming is None:
                upcoming = serialize_booking(b)
        if current:
            room_state["status"] = "occupied"
        elif upcoming:
            room_state["status"] = "booked"
        else:
            room_state["status"] = "available"
        room_state["current_booking"] = current
        room_state["next_booking"] = upcoming
        result.append(room_state)
    return result


# ---------------------- Bookings --------------------------------------------
@api.post("/bookings/find-and-book", response_model=BookingOut)
async def find_and_book(payload: FindAndBookIn, user: dict = Depends(get_current_user)):
    """Find the first available room (smallest capacity that still fits) and book it now."""
    start = now_utc().replace(microsecond=0)
    end = start + timedelta(minutes=payload.duration_minutes)
    rooms = await db.rooms.find({"maintenance": {"$ne": True}}, {"_id": 0}).to_list(100)
    # Prefer the smallest room that fits the requested capacity
    rooms = [r for r in rooms if r.get("capacity", 0) >= payload.min_capacity]
    rooms.sort(key=lambda r: r.get("capacity", 0))
    chosen = None
    for r in rooms:
        if not await find_conflicting_booking(r["id"], start, end):
            chosen = r
            break
    if not chosen:
        raise HTTPException(status_code=409, detail="No available rooms for that slot. Try a shorter meeting or smaller team size.")
    booking_id = str(uuid.uuid4())
    doc = {
        "id": booking_id, "room_id": chosen["id"], "room_name": chosen["name"],
        "title": payload.title.strip(), "description": (payload.description or "").strip(),
        "start_time": start.isoformat(), "end_time": end.isoformat(),
        "user_id": user["id"], "user_name": user["name"],
        "user_email": user["email"], "user_team": user["team"],
        "cancelled": False, "created_at": now_utc().isoformat(),
    }
    await db.bookings.insert_one(doc)
    return serialize_booking(doc)


@api.post("/bookings", response_model=BookingOut)
async def create_booking(payload: BookingIn, user: dict = Depends(get_current_user)):
    room = await db.rooms.find_one({"id": payload.room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.get("maintenance"):
        raise HTTPException(status_code=400, detail="Room is under maintenance")
    start = to_aware(payload.start_time)
    end = to_aware(payload.end_time)
    validate_booking_times(start, end)
    conflict = await find_conflicting_booking(payload.room_id, start, end)
    if conflict:
        raise HTTPException(status_code=409, detail=f"Time slot conflicts with: '{conflict['title']}'")
    booking_id = str(uuid.uuid4())
    doc = {
        "id": booking_id, "room_id": payload.room_id, "room_name": room["name"],
        "title": payload.title.strip(), "description": (payload.description or "").strip(),
        "start_time": start.isoformat(), "end_time": end.isoformat(),
        "user_id": user["id"], "user_name": user["name"],
        "user_email": user["email"], "user_team": user["team"],
        "cancelled": False, "created_at": now_utc().isoformat(),
    }
    await db.bookings.insert_one(doc)
    return serialize_booking(doc)


@api.get("/bookings", response_model=List[BookingOut])
async def list_bookings(
    user: dict = Depends(get_current_user),
    mine: bool = Query(False),
    room_id: Optional[str] = Query(None),
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
):
    q: dict = {"cancelled": {"$ne": True}}
    if mine:
        q["user_id"] = user["id"]
    if room_id:
        q["room_id"] = room_id
    if start and end:
        q["start_time"] = {"$lt": to_aware(end).isoformat()}
        q["end_time"] = {"$gt": to_aware(start).isoformat()}
    rows = await db.bookings.find(q, {"_id": 0}).to_list(2000)
    rows.sort(key=lambda b: b["start_time"])
    return [serialize_booking(b) for b in rows]


@api.patch("/bookings/{booking_id}", response_model=BookingOut)
async def update_booking(booking_id: str, payload: BookingPatch, user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking or booking.get("cancelled"):
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["user_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not allowed to edit this booking")
    update: dict = {}
    new_room_id = payload.room_id or booking["room_id"]
    new_start = to_aware(payload.start_time) if payload.start_time else to_aware(datetime.fromisoformat(booking["start_time"]))
    new_end = to_aware(payload.end_time) if payload.end_time else to_aware(datetime.fromisoformat(booking["end_time"]))
    validate_booking_times(new_start, new_end, is_update=True)
    if payload.room_id and payload.room_id != booking["room_id"]:
        room = await db.rooms.find_one({"id": payload.room_id}, {"_id": 0})
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        if room.get("maintenance"):
            raise HTTPException(status_code=400, detail="Room is under maintenance")
        update["room_id"] = room["id"]
        update["room_name"] = room["name"]
    conflict = await find_conflicting_booking(new_room_id, new_start, new_end, exclude_id=booking_id)
    if conflict:
        raise HTTPException(status_code=409, detail=f"Time slot conflicts with: '{conflict['title']}'")
    if payload.title is not None:
        update["title"] = payload.title.strip()
    if payload.description is not None:
        update["description"] = payload.description.strip()
    if payload.start_time is not None:
        update["start_time"] = new_start.isoformat()
    if payload.end_time is not None:
        update["end_time"] = new_end.isoformat()
    if update:
        await db.bookings.update_one({"id": booking_id}, {"$set": update})
    fresh = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    return serialize_booking(fresh)


@api.delete("/bookings/{booking_id}")
async def cancel_booking(booking_id: str, user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking or booking.get("cancelled"):
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["user_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not allowed to cancel this booking")
    await db.bookings.update_one({"id": booking_id}, {"$set": {"cancelled": True, "cancelled_at": now_utc().isoformat()}})
    return {"ok": True}


# ---------------------- Admin -----------------------------------------------
@api.get("/admin/bookings", response_model=List[BookingOut])
async def admin_list_bookings(_admin: dict = Depends(require_admin)):
    rows = await db.bookings.find({"cancelled": {"$ne": True}}, {"_id": 0}).to_list(5000)
    rows.sort(key=lambda b: b["start_time"], reverse=True)
    return [serialize_booking(b) for b in rows]


@api.patch("/admin/rooms/{room_id}/maintenance", response_model=RoomOut)
async def admin_set_maintenance(room_id: str, payload: MaintenanceIn, _admin: dict = Depends(require_admin)):
    room = await db.rooms.find_one({"id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    await db.rooms.update_one({"id": room_id}, {"$set": {"maintenance": payload.maintenance}})
    room["maintenance"] = payload.maintenance
    return {
        "id": room["id"], "name": room["name"], "capacity": room["capacity"],
        "description": room["description"], "image_url": ROOM_IMAGES.get(room["id"], ""),
        "maintenance": room["maintenance"],
    }


@api.get("/admin/users")
async def admin_list_users(_admin: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(2000)
    users.sort(key=lambda u: u.get("name", ""))
    return users


@api.get("/admin/analytics")
async def admin_analytics(_admin: dict = Depends(require_admin)):
    rooms = await db.rooms.find({}, {"_id": 0}).to_list(100)
    rooms.sort(key=lambda r: r["id"])
    bookings = await db.bookings.find({"cancelled": {"$ne": True}}, {"_id": 0}).to_list(5000)

    total_bookings = len(bookings)
    now = now_utc()
    upcoming = 0
    active = 0
    past = 0
    minutes_by_room: dict = {r["id"]: 0 for r in rooms}
    count_by_room: dict = {r["id"]: 0 for r in rooms}
    count_by_team: dict = {}
    last_7_days = {(now - timedelta(days=i)).date().isoformat(): 0 for i in range(6, -1, -1)}

    for b in bookings:
        s = datetime.fromisoformat(b["start_time"])
        e = datetime.fromisoformat(b["end_time"])
        if now < s:
            upcoming += 1
        elif s <= now < e:
            active += 1
        else:
            past += 1
        minutes_by_room[b["room_id"]] = minutes_by_room.get(b["room_id"], 0) + int((e - s).total_seconds() // 60)
        count_by_room[b["room_id"]] = count_by_room.get(b["room_id"], 0) + 1
        count_by_team[b["user_team"]] = count_by_team.get(b["user_team"], 0) + 1
        day_key = s.date().isoformat()
        if day_key in last_7_days:
            last_7_days[day_key] += 1

    most_used_id = max(count_by_room, key=lambda k: count_by_room[k]) if count_by_room else None
    most_used = next((r["name"] for r in rooms if r["id"] == most_used_id), None) if most_used_id else None

    return {
        "total_bookings": total_bookings,
        "upcoming": upcoming, "active": active, "past": past,
        "most_used_room": most_used,
        "utilization": [
            {"room_id": r["id"], "room_name": r["name"],
             "bookings": count_by_room.get(r["id"], 0),
             "minutes": minutes_by_room.get(r["id"], 0)}
            for r in rooms
        ],
        "by_team": [{"team": t, "count": c} for t, c in sorted(count_by_team.items(), key=lambda x: -x[1])],
        "last_7_days": [{"date": d, "count": c} for d, c in last_7_days.items()],
    }


# -----------------------------------------------------------------------------
# Startup: indexes + seed
# -----------------------------------------------------------------------------
async def seed_admin_and_users():
    # Indexes — wrap in try so a single failure (e.g. dup keys in imported data)
    # doesn't kill startup. Logged so it's still visible.
    for idx in [
        ("users", "email", True),
        ("users", "id", True),
        ("rooms", "id", True),
        ("bookings", "id", True),
    ]:
        try:
            await db[idx[0]].create_index(idx[1], unique=idx[2])
        except Exception as e:
            logger.warning("Index create skipped for %s.%s: %s", idx[0], idx[1], e)
    try:
        await db.bookings.create_index([("room_id", 1), ("start_time", 1)])
    except Exception as e:
        logger.warning("Compound bookings index skipped: %s", e)

    # Migration safety: back-fill missing `id` on any users that lack one.
    # Happens once on first boot against a pre-existing collection.
    async for doc in db.users.find({"id": {"$exists": False}}, {"email": 1}):
        new_id = str(uuid.uuid4())
        await db.users.update_one({"_id": doc["_id"]}, {"$set": {"id": new_id}})
        logger.info("Backfilled id for user %s", doc.get("email"))

    # Seed rooms
    for r in ROOMS_SEED:
        existing = await db.rooms.find_one({"id": r["id"]})
        if not existing:
            await db.rooms.insert_one({**r, "maintenance": False})

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@company.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": admin_email, "name": "System Admin",
            "team": "Operations", "role": "admin",
            "password_hash": hash_password(admin_password),
            "created_at": now_utc().isoformat(),
        })
    else:
        updates = {}
        if not existing_admin.get("id"):
            updates["id"] = str(uuid.uuid4())
        if not existing_admin.get("password_hash") or not verify_password(admin_password, existing_admin["password_hash"]):
            updates["password_hash"] = hash_password(admin_password)
        if existing_admin.get("role") != "admin":
            updates["role"] = "admin"
        if updates:
            await db.users.update_one({"email": admin_email}, {"$set": updates})

    # Seed employees
    employees = [
        {"email": "jane@company.com",  "name": "Jane Cooper",   "team": "Product"},
        {"email": "alex@company.com",  "name": "Alex Mendoza",  "team": "Engineering"},
        {"email": "priya@company.com", "name": "Priya Sharma",  "team": "Design"},
        {"email": "sam@company.com",   "name": "Sam Whitaker",  "team": "Marketing"},
    ]
    for emp in employees:
        if not await db.users.find_one({"email": emp["email"]}):
            await db.users.insert_one({
                "id": str(uuid.uuid4()), "email": emp["email"], "name": emp["name"],
                "team": emp["team"], "role": "employee",
                "password_hash": hash_password("employee123"),
                "created_at": now_utc().isoformat(),
            })

    # Seed sample bookings (only if no bookings exist yet)
    count = await db.bookings.count_documents({})
    if count == 0:
        users = await db.users.find({"role": "employee"}, {"_id": 0}).to_list(20)
        if users:
            now = now_utc().replace(minute=0, second=0, microsecond=0)
            samples = [
                # Active right now (occupied) - Boardroom
                {"room": "room-3", "user_idx": 0, "title": "Quarterly Strategy Review",
                 "desc": "Q1 planning with leadership team.",
                 "start": now - timedelta(minutes=30), "end": now + timedelta(hours=1, minutes=30)},
                # Upcoming today - Meeting Room 1
                {"room": "room-1", "user_idx": 1, "title": "Daily Engineering Standup",
                 "desc": "15-min daily sync.",
                 "start": now + timedelta(hours=2), "end": now + timedelta(hours=2, minutes=30)},
                # Later today - Meeting Room 2
                {"room": "room-2", "user_idx": 2, "title": "Design Critique",
                 "desc": "Review new dashboard mockups.",
                 "start": now + timedelta(hours=4), "end": now + timedelta(hours=5)},
                # Tomorrow morning
                {"room": "room-1", "user_idx": 3, "title": "Marketing Campaign Kickoff",
                 "desc": "Launch plan for spring campaign.",
                 "start": now + timedelta(days=1, hours=2), "end": now + timedelta(days=1, hours=3)},
                # Day after tomorrow
                {"room": "room-3", "user_idx": 0, "title": "Customer Advisory Board",
                 "desc": "External meeting with top accounts.",
                 "start": now + timedelta(days=2, hours=3), "end": now + timedelta(days=2, hours=5)},
                # Past booking
                {"room": "room-2", "user_idx": 1, "title": "Sprint Retrospective",
                 "desc": "Last sprint retro.",
                 "start": now - timedelta(days=1, hours=2), "end": now - timedelta(days=1, hours=1)},
            ]
            for s in samples:
                room = await db.rooms.find_one({"id": s["room"]}, {"_id": 0})
                if not room:
                    continue
                u = users[s["user_idx"] % len(users)]
                await db.bookings.insert_one({
                    "id": str(uuid.uuid4()), "room_id": room["id"], "room_name": room["name"],
                    "title": s["title"], "description": s["desc"],
                    "start_time": s["start"].isoformat(), "end_time": s["end"].isoformat(),
                    "user_id": u["id"], "user_name": u["name"],
                    "user_email": u["email"], "user_team": u["team"],
                    "cancelled": False, "created_at": now_utc().isoformat(),
                })


@app.on_event("startup")
async def on_startup():
    try:
        await seed_admin_and_users()
        logger.info("Startup seed complete")
    except Exception as e:
        logger.exception("Startup seeding failed: %s", e)


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


def _allowed_origins() -> list:
    """Comma-separated list. Falls back to FRONTEND_URL + localhost for dev.
    Use CORS_ORIGINS in production (e.g., 'https://app.vercel.app,https://staging.vercel.app')."""
    raw = os.environ.get("CORS_ORIGINS") or os.environ.get("FRONTEND_URL", "")
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    if "http://localhost:3000" not in origins:
        origins.append("http://localhost:3000")
    if not origins:
        origins = ["*"]
    return origins


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://meeting-room-booking-system-umber.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
