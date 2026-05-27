# Deployment Guide — Metamorphosys Meeting Room Booking

End-to-end production deployment for:

- **Frontend** → Vercel
- **Backend** → Render
- **Database** → MongoDB Atlas

---

## 1. Stack overview

| Layer    | Tech                       | Hosted on        |
|----------|----------------------------|------------------|
| Frontend | React 19, Tailwind, shadcn | Vercel           |
| Backend  | FastAPI, Motor             | Render Web Service |
| Database | MongoDB                    | MongoDB Atlas    |
| Auth     | JWT in HTTP-only cookies   | Backend-managed  |

All requests use **httpOnly cross-site cookies**. This requires `secure=True` + `samesite=None` in production (already wired via env vars).

---

## 2. MongoDB Atlas setup

1. Create a free cluster at https://cloud.mongodb.com.
2. **Database Access** → add a user with `readWrite` on your database.
3. **Network Access** → add `0.0.0.0/0` (or Render's outbound IPs).
4. **Database** → **Connect** → **Drivers** → copy the connection string:

   ```
   mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```

5. URL-encode any special characters in the password (`@` → `%40`, `:` → `%3A`, etc.).

The app creates `users`, `rooms`, and `bookings` collections (with indexes) automatically on first startup, and seeds 1 admin + 4 employees + 6 sample bookings.

---

## 3. Run locally

### Prerequisites
- Python 3.10+
- Node 18+ and **Yarn**
- MongoDB running locally (`brew services start mongodb-community`) or an Atlas URI

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env: set MONGO_URL, JWT_SECRET, FRONTEND_URL=http://localhost:3000
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend

```bash
cd frontend
yarn install
cp .env.example .env
# Edit .env: REACT_APP_BACKEND_URL=http://localhost:8001
yarn start
```

Open <http://localhost:3000> → log in as `admin@company.com / admin123`.

---

## 4. Deploy backend → Render

### Step 4.1 — Create a Web Service

1. Push your repo to GitHub.
2. Go to https://dashboard.render.com → **New** → **Web Service**.
3. Connect the repo. Configure:

   | Field              | Value                                                    |
   |--------------------|----------------------------------------------------------|
   | **Name**           | `metamorphosys-booking-api`                              |
   | **Region**         | Closest to your users                                    |
   | **Root Directory** | `backend`                                                |
   | **Runtime**        | Python 3                                                 |
   | **Build Command**  | `pip install -r requirements.txt`                        |
   | **Start Command**  | `uvicorn server:app --host 0.0.0.0 --port $PORT`         |
   | **Instance Type**  | Starter (free tier ok for evaluation)                    |

### Step 4.2 — Environment variables

Add the following under **Environment**:

| Key                | Value                                                                                       |
|--------------------|---------------------------------------------------------------------------------------------|
| `MONGO_URL`        | `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/?retryWrites=true&w=majority`           |
| `DB_NAME`          | `meeting_room_booking`                                                                      |
| `JWT_SECRET`       | run `python -c "import secrets;print(secrets.token_hex(48))"` and paste the output         |
| `ADMIN_EMAIL`      | `admin@company.com`                                                                         |
| `ADMIN_PASSWORD`   | strong-password                                                                             |
| `CORS_ORIGINS`     | `https://your-app.vercel.app,https://your-app-*.vercel.app` (comma-separated, no spaces)   |
| `COOKIE_SAMESITE`  | `none`                                                                                      |
| `COOKIE_SECURE`    | `true`                                                                                      |

> **Critical**: `COOKIE_SAMESITE=none` + `COOKIE_SECURE=true` is required for cross-origin auth cookies. Without these, login will silently fail in production.

### Step 4.3 — Deploy

Click **Create Web Service**. Render will build and assign a URL like `https://metamorphosys-booking-api.onrender.com`.

### Step 4.4 — Smoke test

```bash
curl https://your-api.onrender.com/api/
# {"message":"Meeting Room Booking API"}

curl -c c.txt -X POST https://your-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"<your ADMIN_PASSWORD>"}'

curl -b c.txt https://your-api.onrender.com/api/auth/me
```

---

## 5. Deploy frontend → Vercel

### Step 5.1 — Import project

1. Go to https://vercel.com/new and import the same GitHub repo.
2. Configure:

   | Field                 | Value                            |
   |-----------------------|----------------------------------|
   | **Framework Preset**  | Create React App                 |
   | **Root Directory**    | `frontend`                       |
   | **Build Command**     | `yarn build`                     |
   | **Output Directory**  | `build`                          |
   | **Install Command**   | `yarn install`                   |
   | **Node Version**      | 18.x or 20.x                     |

### Step 5.2 — Environment variables

Under **Settings** → **Environment Variables**:

| Key                       | Value                                          | Environments                |
|---------------------------|------------------------------------------------|-----------------------------|
| `REACT_APP_BACKEND_URL`   | `https://metamorphosys-booking-api.onrender.com` | Production, Preview, Dev |

> Note: CRA inlines `REACT_APP_*` at build time. After changing this, **redeploy**.

### Step 5.3 — Deploy

Click **Deploy**. Vercel assigns `https://your-app.vercel.app`. Copy this URL.

### Step 5.4 — Wire CORS back to backend

Return to Render → backend service → **Environment** → update `CORS_ORIGINS` to include your final Vercel URL(s):

```
CORS_ORIGINS=https://your-app.vercel.app,https://your-app-git-main-<team>.vercel.app
```

Trigger a redeploy on Render so the new value takes effect.

---

## 6. Custom domain (optional)

1. **Frontend custom domain (Vercel)**
   - Vercel → **Settings** → **Domains** → add `booking.yourcompany.com`.
   - Add the CNAME / A records they show in your DNS provider.

2. **Backend custom domain (Render)**
   - Render → service → **Settings** → **Custom Domains** → add `api.yourcompany.com`.
   - Add the CNAME record in DNS.

3. **Update env**
   - Frontend `REACT_APP_BACKEND_URL` = `https://api.yourcompany.com`
   - Backend `CORS_ORIGINS` = `https://booking.yourcompany.com`
   - Redeploy both.

Using same-root subdomains (`booking.yourcompany.com` ↔ `api.yourcompany.com`) lets you switch `COOKIE_SAMESITE` back to `lax` if desired — it's still secure and slightly more compatible.

---

## 7. Required environment variables — complete reference

### `backend/.env`

```bash
# Database
MONGO_URL="mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority"
DB_NAME="meeting_room_booking"

# Auth
JWT_SECRET="<run: python -c 'import secrets;print(secrets.token_hex(48))'>"

# Seed admin
ADMIN_EMAIL="admin@company.com"
ADMIN_PASSWORD="ChangeMeStrongly#2026"

# CORS — comma-separated list, exact origins (scheme + host, no trailing slash)
CORS_ORIGINS="https://your-app.vercel.app"

# Cookies — production cross-origin requires both:
COOKIE_SAMESITE="none"
COOKIE_SECURE="true"
```

### `frontend/.env`

```bash
REACT_APP_BACKEND_URL="https://metamorphosys-booking-api.onrender.com"
```

---

## 8. Cookie / CORS / Auth — how it works in production

1. The browser at `https://your-app.vercel.app` calls
   `https://your-api.onrender.com/api/auth/login` with `withCredentials: true`.
2. Backend responds with `Set-Cookie: access_token=...; SameSite=None; Secure; HttpOnly; Path=/`.
3. The browser stores it because both sides are HTTPS and `SameSite=None` is set.
4. Subsequent requests automatically include the cookie. Backend validates JWT inside.
5. CORS middleware echoes `Access-Control-Allow-Credentials: true` and `Access-Control-Allow-Origin: <exact frontend origin>` — never `*` with credentials.

**Common failure modes**

| Symptom                                                  | Cause                                              | Fix                                                      |
|----------------------------------------------------------|----------------------------------------------------|----------------------------------------------------------|
| `Login returns 200 but /auth/me returns 401`              | Cookie not stored                                  | Set `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true`     |
| `CORS error: 'Access-Control-Allow-Origin' missing`       | `CORS_ORIGINS` doesn't list the exact frontend URL | Add it, redeploy                                         |
| `Network tab shows OPTIONS preflight returning 400`       | Backend not deployed yet / wrong start command     | Verify `uvicorn server:app --host 0.0.0.0 --port $PORT` |
| `Login works locally but not on Vercel`                   | `REACT_APP_BACKEND_URL` still points to localhost  | Set it to the Render URL, redeploy frontend             |
| `cookie set but Safari doesn't send it`                   | Safari + iframe + cross-site rules                 | Use same-root subdomains (booking. / api.)              |

---

## 9. Production checklist

- [ ] MongoDB Atlas cluster created and accessible from `0.0.0.0/0` (or Render IPs)
- [ ] `JWT_SECRET` is unique and ≥ 64 random characters (not the placeholder)
- [ ] `ADMIN_PASSWORD` is **changed** from `admin123`
- [ ] Render service is on a paid plan if you need to avoid free-tier cold starts
- [ ] `CORS_ORIGINS` lists every Vercel domain that should be allowed
- [ ] `COOKIE_SAMESITE=none` + `COOKIE_SECURE=true` on production backend
- [ ] `REACT_APP_BACKEND_URL` points to the production Render URL on Vercel
- [ ] Smoke test login → /auth/me → create booking → reload → still authenticated
- [ ] Confirm the seeded admin can promote/manage users you no longer need
- [ ] Disable demo accounts you don't want in production (delete from MongoDB or change passwords)

---

## 10. Logs & monitoring

- **Render**: Service → **Logs** tab. Search for `Startup seed complete`, errors are stack traces with timestamps.
- **Vercel**: Project → **Deployments** → click a deployment → **Functions** / **Logs**.
- **Atlas**: cluster → **Metrics** for connections / ops/sec; **Network** for connection refusals.

---

## 11. Run end-to-end backend smoke test

```bash
API=https://your-api.onrender.com

# 1. health
curl -s $API/api/ | jq .

# 2. login
curl -s -c /tmp/c.txt -X POST $API/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@company.com\",\"password\":\"$ADMIN_PASSWORD\"}" | jq .

# 3. me
curl -s -b /tmp/c.txt $API/api/auth/me | jq .

# 4. rooms
curl -s -b /tmp/c.txt $API/api/rooms/status | jq '.[] | {name, status}'

# 5. create booking (replace start/end with future ISO timestamps)
curl -s -b /tmp/c.txt -X POST $API/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "room_id":"room-1",
    "title":"Smoke test",
    "start_time":"2026-12-01T10:00:00Z",
    "end_time":"2026-12-01T11:00:00Z"
  }' | jq .
```

If steps 1–5 all return successful JSON, the backend is production-ready.

---

## 12. Frequently asked questions

**Q: Can I use Railway / Fly.io / AWS instead of Render?**
Yes — the backend is a vanilla FastAPI app. Set the same env vars and run `uvicorn server:app --host 0.0.0.0 --port $PORT`.

**Q: Can I use Netlify instead of Vercel?**
Yes. CRA builds the same. Just set `REACT_APP_BACKEND_URL` in Netlify env vars.

**Q: How do I rotate `JWT_SECRET`?**
Update the env var on Render and redeploy. All existing sessions will be invalidated (users must log in again).

**Q: How do I add more meeting rooms?**
Edit the `ROOMS_SEED` list in `backend/server.py` and `ROOM_INITIAL` / `ROOM_TONES` maps in `frontend/src/components/RoomCard.jsx` and `pages/CalendarView.jsx`. New rooms are inserted on next backend boot.

---

Deploy with confidence. ✨
