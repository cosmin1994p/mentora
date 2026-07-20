# AGENTS.md

## Cursor Cloud specific instructions

This repo is a monorepo for **Mentora / StreamClass**, a MasterClass-style online learning platform. The primary product is the **web app** made of three cooperating dev services. The `react_native_app/` and `flutter_app/` directories are alternate mobile clients and are out of scope for normal web development.

### Services (web product)

| Service | Location | Dev command | Port | Notes |
|---|---|---|---|---|
| MongoDB | system | `mongod --dbpath /workspace/.mongodb/data --logpath /workspace/.mongodb/log/mongod.log --port 27017 --bind_ip 127.0.0.1` | 27017 | Hard dependency — backend calls `process.exit(1)` if it can't connect. |
| Backend API | `backend/` | `cd backend && npm run dev` (nodemon) | 8080 | Auto-spawns the Python ML server on 5001. |
| Web frontend | repo root | `npm run dev:frontend` (Vite) | 3000 | Talks to backend at `http://<hostname>:8080/api` by default (see `src/config.ts`). |
| Python ML API | `src/utils/` | auto-started by backend; standalone: `npm run start:ml` | 5001 | Optional. Emotion-based recommendations with graceful fallback; runs rule-based when TensorFlow/PyMongo are absent. |

Start MongoDB first, then the backend, then the frontend. `mongod` and each server should be run in their own long-lived shell (e.g. tmux); none of them daemonize on their own.

Do NOT use the root `npm run dev` / `npm run start:all` on Linux — they invoke `start-all.bat` (Windows only). Run each service individually as above.

### Environment config

The backend loads `backend/.env` first, then the repo-root `.env` (both git-ignored). For local dev create `backend/.env` with at least:

```
MONGODB_URI=mongodb://127.0.0.1:27017/masterclass
JWT_SECRET=dev-local-jwt-secret-change-me
PORT=8080
NODE_ENV=development
```

`MONGODB_URI` defaults to `mongodb://localhost:27017/masterclass` if unset. B2/Backblaze credentials are only needed for real video upload/streaming; core auth + course browsing work without them.

### Seeding demo data (important gotcha)

The database starts empty. Seed with `node backend/seedDatabase.js` (inserts published courses + reels using external thumbnail URLs; no local media files needed).

Gotcha 1 — stale index: older seeders (`seed_courses.js`, `seed.js`) leave a unique `id_1` index on `courses` that makes `seedDatabase.js`'s `insertMany` fail with `E11000 dup key { id: null }` after the first doc. If seeding only inserts 1 course, drop the collection to clear the index and reseed:
```
mongosh masterclass --quiet --eval 'db.courses.drop(); db.reels.drop();'
node backend/seedDatabase.js
```

Gotcha 2 — `packageTiers`: `seedDatabase.js` does NOT set `packageTiers`, but the web UI only renders courses whose `packageTiers` is non-empty (`visibleCourses`/`visibleRecommended` in `src/App.tsx` filter on it). Without this, the app hangs on a "Loading courses…" overlay even though the API returns data. After seeding, run:
```
mongosh masterclass --quiet --eval 'db.courses.updateMany({}, {$set: {packageTiers: ["Free"], isFree: true}})'
```

### Auth / onboarding flow quirks (not env problems)

A first login triggers, in order: a **"Cookie Preferences" (GDPR)** modal, then a **"How are you feeling today?"** mood modal (emotion-based recommendations, shown once per day). Both must be dismissed before the home page shows. The `POST /api/auth/saveGDPRConsent` call may 404, but consent is also persisted in `localStorage` so the flow still proceeds. Registration requires all of: username, full name, phone, email, password + confirm, at least one interest, and an activity domain — the "Create Account" button silently no-ops if any required field is empty.

### Lint / test / build

- No ESLint config or automated test suite exists for the web frontend or backend (`backend` `npm test` is a placeholder that exits 1; testing is done via ad-hoc `test_*.js` / `verify_*.js` scripts run with `node`).
- Frontend production build: `npm run build` (Vite, outputs `build/`). Use `npm run dev:frontend` for development.
