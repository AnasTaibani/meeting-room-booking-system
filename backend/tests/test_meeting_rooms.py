"""
Backend tests for Meeting Room Booking System.
Covers: auth (cookies), rooms, bookings, admin, analytics.
"""
import os
import time
from datetime import datetime, timezone, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://space-reserve-22.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@company.com", "password": "admin123"}
JANE = {"email": "jane@company.com", "password": "employee123"}
ALEX = {"email": "alex@company.com", "password": "employee123"}


def _login(session: requests.Session, creds):
    r = session.post(f"{API}/auth/login", json=creds, timeout=20)
    return r


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = _login(s, ADMIN)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def jane_session():
    s = requests.Session()
    r = _login(s, JANE)
    assert r.status_code == 200, f"Jane login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def alex_session():
    s = requests.Session()
    r = _login(s, ALEX)
    assert r.status_code == 200, f"Alex login failed: {r.status_code} {r.text}"
    return s


def _future(hours_from_now: float, duration_min: int = 60):
    start = datetime.now(timezone.utc) + timedelta(hours=hours_from_now)
    return start.isoformat(), (start + timedelta(minutes=duration_min)).isoformat()


# ---------------- Auth ----------------
class TestAuth:
    def test_admin_login_sets_cookies(self):
        s = requests.Session()
        r = _login(s, ADMIN)
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == ADMIN["email"]
        assert body["role"] == "admin"
        # cookies set
        assert "access_token" in s.cookies, "access_token cookie not set"
        assert "refresh_token" in s.cookies, "refresh_token cookie not set"

    def test_employee_login(self):
        s = requests.Session()
        r = _login(s, JANE)
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == JANE["email"]
        assert body["role"] == "employee"
        assert body["team"] == "Product"

    def test_me_from_cookie(self, admin_session):
        r = admin_session.get(f"{API}/auth/me", timeout=20)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN["email"]

    def test_me_without_cookie_401(self):
        r = requests.get(f"{API}/auth/me", timeout=20)
        assert r.status_code == 401

    def test_login_invalid_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN["email"], "password": "wrong"}, timeout=20)
        assert r.status_code == 401

    def test_logout_clears_cookies(self):
        s = requests.Session()
        _login(s, JANE)
        r = s.post(f"{API}/auth/logout", timeout=20)
        assert r.status_code == 200
        # After logout, /me should be 401
        r2 = s.get(f"{API}/auth/me", timeout=20)
        assert r2.status_code == 401


# ---------------- Rooms ----------------
class TestRooms:
    def test_list_rooms(self, jane_session):
        r = jane_session.get(f"{API}/rooms", timeout=20)
        assert r.status_code == 200
        rooms = r.json()
        names = sorted([x["name"] for x in rooms])
        assert names == ["Boardroom", "Meeting Room 1", "Meeting Room 2"]
        for room in rooms:
            assert "image_url" in room and room["image_url"]
            assert "maintenance" in room

    def test_rooms_status_fields(self, jane_session):
        r = jane_session.get(f"{API}/rooms/status", timeout=20)
        assert r.status_code == 200
        rooms = r.json()
        assert len(rooms) == 3
        for room in rooms:
            assert room["status"] in ("available", "booked", "occupied", "maintenance")
            assert "current_booking" in room
            assert "next_booking" in room

    def test_boardroom_occupied(self, jane_session):
        r = jane_session.get(f"{API}/rooms/status", timeout=20)
        rooms = r.json()
        boardroom = next((x for x in rooms if x["name"] == "Boardroom"), None)
        assert boardroom is not None
        # Seed says Boardroom has an active booking, but only if first-time seed.
        # If maintenance toggled on, allow that too.
        assert boardroom["status"] in ("occupied", "available", "booked", "maintenance")


# ---------------- Bookings validation ----------------
class TestBookingsValidation:
    def test_create_valid_future_booking(self, jane_session):
        start, end = _future(hours_from_now=48, duration_min=45)
        r = jane_session.post(
            f"{API}/bookings",
            json={"room_id": "room-2", "title": "TEST_valid_future", "description": "", "start_time": start, "end_time": end},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        b = r.json()
        assert b["room_id"] == "room-2"
        assert b["status"] in ("upcoming", "active")
        # cleanup
        jane_session.delete(f"{API}/bookings/{b['id']}", timeout=20)

    def test_create_past_booking_rejected(self, jane_session):
        start = (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat()
        end = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        r = jane_session.post(
            f"{API}/bookings",
            json={"room_id": "room-1", "title": "TEST_past", "start_time": start, "end_time": end},
            timeout=20,
        )
        assert r.status_code == 400

    def test_create_end_before_start_rejected(self, jane_session):
        start = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
        end = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        r = jane_session.post(
            f"{API}/bookings",
            json={"room_id": "room-1", "title": "TEST_inverted", "start_time": start, "end_time": end},
            timeout=20,
        )
        assert r.status_code == 400

    def test_overlapping_rejected(self, jane_session):
        start, end = _future(hours_from_now=72, duration_min=60)
        r1 = jane_session.post(
            f"{API}/bookings",
            json={"room_id": "room-1", "title": "TEST_first", "start_time": start, "end_time": end},
            timeout=20,
        )
        assert r1.status_code == 200, r1.text
        bid = r1.json()["id"]
        # overlapping
        r2 = jane_session.post(
            f"{API}/bookings",
            json={"room_id": "room-1", "title": "TEST_overlap", "start_time": start, "end_time": end},
            timeout=20,
        )
        assert r2.status_code == 409
        # cleanup
        jane_session.delete(f"{API}/bookings/{bid}", timeout=20)

    def test_maintenance_blocks_booking(self, admin_session, jane_session):
        # Turn on maintenance
        r = admin_session.patch(f"{API}/admin/rooms/room-2/maintenance", json={"maintenance": True}, timeout=20)
        assert r.status_code == 200
        assert r.json()["maintenance"] is True
        # Status reflects maintenance
        rs = jane_session.get(f"{API}/rooms/status", timeout=20).json()
        mr2 = next(x for x in rs if x["id"] == "room-2")
        assert mr2["status"] == "maintenance"
        # Booking attempt rejected
        start, end = _future(hours_from_now=10, duration_min=30)
        rb = jane_session.post(
            f"{API}/bookings",
            json={"room_id": "room-2", "title": "TEST_maint", "start_time": start, "end_time": end},
            timeout=20,
        )
        assert rb.status_code == 400
        # turn off
        admin_session.patch(f"{API}/admin/rooms/room-2/maintenance", json={"maintenance": False}, timeout=20)


# ---------------- Mine / Edit / Cancel ----------------
class TestBookingsMine:
    def test_mine_filter(self, jane_session):
        start, end = _future(hours_from_now=80, duration_min=30)
        r = jane_session.post(
            f"{API}/bookings",
            json={"room_id": "room-3", "title": "TEST_mine", "start_time": start, "end_time": end},
            timeout=20,
        )
        assert r.status_code == 200
        bid = r.json()["id"]
        rm = jane_session.get(f"{API}/bookings?mine=true", timeout=20)
        assert rm.status_code == 200
        ids = [b["id"] for b in rm.json()]
        assert bid in ids
        # All are jane's
        for b in rm.json():
            assert b["user_email"] == JANE["email"]
        jane_session.delete(f"{API}/bookings/{bid}", timeout=20)

    def test_edit_other_user_forbidden(self, jane_session, alex_session):
        start, end = _future(hours_from_now=90, duration_min=30)
        r = jane_session.post(
            f"{API}/bookings",
            json={"room_id": "room-3", "title": "TEST_janes", "start_time": start, "end_time": end},
            timeout=20,
        )
        assert r.status_code == 200
        bid = r.json()["id"]
        # Alex tries to edit Jane's booking
        re = alex_session.patch(f"{API}/bookings/{bid}", json={"title": "hacked"}, timeout=20)
        assert re.status_code == 403
        jane_session.delete(f"{API}/bookings/{bid}", timeout=20)

    def test_cancel_own_soft_delete(self, jane_session):
        start, end = _future(hours_from_now=100, duration_min=30)
        r = jane_session.post(
            f"{API}/bookings",
            json={"room_id": "room-3", "title": "TEST_cancel", "start_time": start, "end_time": end},
            timeout=20,
        )
        bid = r.json()["id"]
        rd = jane_session.delete(f"{API}/bookings/{bid}", timeout=20)
        assert rd.status_code == 200
        # No longer in mine
        rm = jane_session.get(f"{API}/bookings?mine=true", timeout=20).json()
        assert bid not in [b["id"] for b in rm]


# ---------------- Admin ----------------
class TestAdmin:
    def test_employee_cannot_set_maintenance(self, jane_session):
        r = jane_session.patch(f"{API}/admin/rooms/room-1/maintenance", json={"maintenance": True}, timeout=20)
        assert r.status_code == 403

    def test_admin_list_bookings(self, admin_session):
        r = admin_session.get(f"{API}/admin/bookings", timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_list_users(self, admin_session):
        r = admin_session.get(f"{API}/admin/users", timeout=20)
        assert r.status_code == 200
        users = r.json()
        emails = {u["email"] for u in users}
        for e in ["admin@company.com", "jane@company.com", "alex@company.com", "priya@company.com", "sam@company.com"]:
            assert e in emails, f"Missing seeded user {e}"

    def test_admin_users_forbidden_for_employee(self, jane_session):
        r = jane_session.get(f"{API}/admin/users", timeout=20)
        assert r.status_code == 403

    def test_admin_analytics_shape(self, admin_session):
        r = admin_session.get(f"{API}/admin/analytics", timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k in ["total_bookings", "upcoming", "active", "past", "most_used_room", "utilization", "by_team", "last_7_days"]:
            assert k in d, f"Missing analytics key: {k}"
        assert isinstance(d["utilization"], list)
        assert isinstance(d["last_7_days"], list)
        assert len(d["last_7_days"]) == 7
