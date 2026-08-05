#!/bin/bash
# Runs once on first MongoDB startup (empty data volume).
# Creates the application user used by the API container.

set -euo pipefail

: "${MONGO_INITDB_ROOT_USERNAME:?}"
: "${MONGO_INITDB_ROOT_PASSWORD:?}"
: "${MONGO_APP_USER:?}"
: "${MONGO_APP_PASSWORD:?}"
: "${MONGO_APP_DATABASE:=masterclass}"

echo "Creating application user '${MONGO_APP_USER}' on database '${MONGO_APP_DATABASE}'..."

mongosh "mongodb://${MONGO_INITDB_ROOT_USERNAME}:${MONGO_INITDB_ROOT_PASSWORD}@localhost:27017/admin" --quiet <<EOF
db = db.getSiblingDB('${MONGO_APP_DATABASE}');
if (db.getUser('${MONGO_APP_USER}')) {
  print('Application user already exists, skipping.');
} else {
  db.createUser({
    user: '${MONGO_APP_USER}',
    pwd: '${MONGO_APP_PASSWORD}',
    roles: [{ role: 'readWrite', db: '${MONGO_APP_DATABASE}' }]
  });
  print('Application user created.');
}
EOF
