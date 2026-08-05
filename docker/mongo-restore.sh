#!/bin/bash
# Restores masterclass.archive into the internal mongo service.
# Usage (from repo root on server):
#   docker compose -f docker-compose.prod.yml --profile restore run --rm mongo-restore

set -euo pipefail

: "${MONGO_ROOT_USER:?}"
: "${MONGO_ROOT_PASSWORD:?}"
: "${MONGO_DATABASE:=masterclass}"
: "${RESTORE_ARCHIVE:=/dump/masterclass.archive}"
: "${RESTORE_GZIP:=false}"

if [[ ! -f "${RESTORE_ARCHIVE}" ]]; then
  echo "ERROR: Archive not found at ${RESTORE_ARCHIVE}"
  echo "Place your dump at: data/dump/masterclass.archive"
  exit 1
fi

GZIP_FLAG=""
if [[ "${RESTORE_GZIP}" == "true" ]]; then
  GZIP_FLAG="--gzip"
fi

echo "Restoring ${RESTORE_ARCHIVE} into mongo:${MONGO_DATABASE} ..."

mongorestore \
  --host=mongo \
  --port=27017 \
  --username="${MONGO_ROOT_USER}" \
  --password="${MONGO_ROOT_PASSWORD}" \
  --authenticationDatabase=admin \
  --db="${MONGO_DATABASE}" \
  --archive="${RESTORE_ARCHIVE}" \
  ${GZIP_FLAG} \
  --drop

echo "Restore complete."
