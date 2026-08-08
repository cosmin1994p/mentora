# Mentora — Production Deployment (Docker)

Self-hosted stack for a Linux server: **MongoDB + API + nginx frontend**.  
Images are built in **GitHub Actions** and pulled on the server. ML service is disabled in v1.

---

## Architecture

```
Internet :80
    └── frontend (nginx) ── /api/* ──► api (Node :8080, internal)
                              └──► static React build
    api ──► mongo (internal, authenticated, no host port)
    api ──► Backblaze B2 (outbound HTTPS)
```

**Exposed:** port 80 only  
**Not exposed:** MongoDB, API port 8080, ML service

---

## Prerequisites

- Linux server with Docker Engine + Docker Compose v2
- `masterclass.archive` MongoDB dump on the server
- Backblaze B2 credentials
- GitHub Container Registry access to pull images (`ghcr.io/cosmin1994p/mentora-*`)

---

## 1. CI — build and push images

Images are published by `.github/workflows/docker-publish.yml` on push to `main` or manual dispatch.

| Image | Registry path |
|-------|----------------|
| API | `ghcr.io/cosmin1994p/mentora-api:latest` |
| Frontend | `ghcr.io/cosmin1994p/mentora-frontend:latest` |

Tagged releases also publish `:v1.0.0` style tags when you push a git tag.

**First-time GHCR access on the server** (if images are private):

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

Use a Personal Access Token with `read:packages` scope.

---

## 2. Server setup

```bash
# Clone or copy deployment files to the server
git clone https://github.com/cosmin1994p/mentora.git
cd mentora

# Configure secrets
cp .env.production.example .env
nano .env   # set ALL CHANGE_ME values

# Place your database dump
mkdir -p data/dump
cp /path/on/server/masterclass.archive data/dump/masterclass.archive
```

### MongoDB credentials (you choose these in `.env`)

| Variable | Purpose | Example |
|----------|---------|---------|
| `MONGO_ROOT_USER` | Root admin (restore, emergencies) | `mentora_root` |
| `MONGO_ROOT_PASSWORD` | Root password | *your strong password* |
| `MONGO_APP_USER` | API database user | `mentora_app` |
| `MONGO_APP_PASSWORD` | API database password | *your strong password* |
| `MONGO_DATABASE` | Database name | `masterclass` |

The API connects as `MONGO_APP_USER` only. Root credentials are never used by the application.

**Generate passwords:**

```bash
openssl rand -base64 24
```

---

## 3. First deploy (with database restore)

```bash
# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Start MongoDB (creates app user on first empty volume)
docker compose -f docker-compose.prod.yml up -d mongo

# Wait until healthy
docker compose -f docker-compose.prod.yml ps

# Restore dump (ONE TIME — only when data volume is empty/fresh)
docker compose -f docker-compose.prod.yml --profile restore run --rm mongo-restore

# Start full stack
docker compose -f docker-compose.prod.yml up -d
```

Open `http://SERVER_IP/` in a browser.

---

## 4. Subsequent deploys (code updates, no DB reset)

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

---

## 5. Verify

```bash
# All services healthy
docker compose -f docker-compose.prod.yml ps

# API health (via nginx proxy)
curl http://localhost/api/health

# Logs
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f frontend
```

Expected health response includes `"mongodb": "connected"`.

---

## 6. Login

Use accounts from your restored database, e.g.:

- Admin: `admin@stud.ase.ro` / `admintudy` (if present in dump)
- Or register a new user via the UI

---

## Security notes

- MongoDB has **no published ports** — only containers on `mentora-internal` can reach it.
- Only port **80** is exposed to the internet.
- Store `.env` only on the server; never commit it.
- Rotate `MONGO_*` and `JWT_SECRET` if they were ever exposed.
- Add HTTPS (Caddy / Traefik / certbot) when you have a domain.

---

## Troubleshooting

### `mongo-restore` fails: archive not found

Ensure file exists: `data/dump/masterclass.archive`

### Restore fails with gzip error

If your archive was created with `--gzip`, set in `.env`:

```
RESTORE_GZIP=true
```

### API cannot connect to MongoDB

```bash
docker compose -f docker-compose.prod.yml logs mongo api
```

Check `MONGO_APP_USER` / `MONGO_APP_PASSWORD` match what was created in `docker/mongo-init/01-init-app-user.sh` on first boot.

If your Mongo password contains special characters (`@`, `#`, `%`, `+`, etc.), URL-encode them in the connection string or use a password without those characters.

### `mentora-api` unhealthy / dependency failed to start

```bash
docker logs mentora-api --tail 80
docker inspect mentora-api --format='{{json .State.Health}}'
```

Common causes:

1. **MongoDB auth** — look for `MongoDB connection failed` in API logs; fix `MONGO_APP_*` in `.env`.
2. **Health check too early** — wait 90s after `up`; or pull the latest compose file (healthcheck uses Node, not `wget`).
3. **Crash loop** — repeated `MongoDB connection failed` then exit; API never stays up long enough to pass health.

If you restored **after** init but the dump includes its own users, you may need to align credentials with the dump or re-create the app user via `mongosh` as root.

### Cannot pull images from GHCR

```bash
docker login ghcr.io
docker compose -f docker-compose.prod.yml pull
```

### Re-import database from scratch

**This deletes all MongoDB data:**

```bash
docker compose -f docker-compose.prod.yml down
docker volume rm mentora_mongo_data   # name may vary: docker volume ls
docker compose -f docker-compose.prod.yml up -d mongo
docker compose -f docker-compose.prod.yml --profile restore run --rm mongo-restore
docker compose -f docker-compose.prod.yml up -d
```

---

## Enabling ML service later (v2)

ML Docker files are kept (`Dockerfile.ml`, dev compose). To add later:

1. Add `ml-api` service to `docker-compose.prod.yml`
2. Set `DISABLE_ML_SERVER=false` and `ML_API_URL=http://ml-api:5001/api` on `api`
3. Re-deploy

---

## File reference

| File | Role |
|------|------|
| `docker-compose.prod.yml` | Production orchestration |
| `.env.production.example` | Environment template |
| `docker/mongo-init/` | Creates app DB user on first boot |
| `docker/mongo-restore.sh` | Imports `masterclass.archive` |
| `nginx.conf` | SPA + `/api` reverse proxy |
| `.github/workflows/docker-publish.yml` | CI image builds |
