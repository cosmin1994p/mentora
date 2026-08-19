# Mentora — Production Deployment (Docker)

Self-hosted stack: **MongoDB + API + nginx frontend**. Images built in GitHub Actions, pulled on the server.

## Architecture

```
Internet :80
    └── frontend (nginx) ── /api/* ──► api (Node :8080, internal)
    api ──► mongo (internal only)
    api ──► Backblaze B2 (outbound)
```

Only port **80** is exposed. MongoDB is not reachable from outside Docker.

## Server setup

```bash
git clone https://github.com/cosmin1994p/mentora.git
cd mentora
cp .env.production.example .env
# Edit .env — set MONGO_* passwords, JWT_SECRET, B2 credentials

mkdir -p data/dump
cp /path/to/masterclass.archive data/dump/masterclass.archive

docker login ghcr.io   # if images are private

docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d mongo
docker compose -f docker-compose.prod.yml --profile restore run --rm mongo-restore
docker compose -f docker-compose.prod.yml up -d
```

## MongoDB credentials (you choose in `.env`)

| Variable | Purpose |
|----------|---------|
| `MONGO_ROOT_USER` / `MONGO_ROOT_PASSWORD` | Admin / restore only |
| `MONGO_APP_USER` / `MONGO_APP_PASSWORD` | Used by the API |

## Updates

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## Verify

```bash
curl http://localhost/api/health
docker compose -f docker-compose.prod.yml ps
```

## Troubleshooting

**API unhealthy** — ensure `docker-compose.prod.yml` uses the Node-based healthcheck on `127.0.0.1:8080` (not `wget` + `localhost`).

**Restore gzip** — set `RESTORE_GZIP=true` in `.env` if the archive was created with `--gzip`.
