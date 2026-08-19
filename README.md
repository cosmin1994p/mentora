# Mentora

Online learning platform: React web app, Node.js API, MongoDB, Backblaze B2 video storage.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React, TypeScript, Vite, Tailwind |
| Backend | Node.js, Express, Mongoose |
| Database | MongoDB |
| Media | Backblaze B2 + CDN |
| Deploy | Docker Compose (production), GitHub Actions → GHCR |

## Repository layout

```
backend/          API (Express)
src/              Web app (React)
ml/               Python ML service (optional, disabled in prod v1)
docker/           Mongo init + restore scripts
public/           Static assets
```

## Local development

```bash
# Prerequisites: Node 18+, MongoDB URI in .env
cp .env.example .env

npm install
cd backend && npm install && cd ..

# Terminal 1 — API
cd backend && npm start

# Terminal 2 — frontend
npm run dev:frontend
```

Open http://localhost:3000

## Production deployment

See [DEPLOY.md](./DEPLOY.md) for the Docker-based Linux server setup.

## Environment

Copy `.env.production.example` to `.env` on the server. Required: MongoDB credentials, JWT secret, B2 keys.
