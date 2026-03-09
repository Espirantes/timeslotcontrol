#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Dock Scheduling System — Database Reset
# Drops and recreates the database, runs migrations, and seeds data.
#
# Usage:  bash scripts/db-reset.sh
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

DB_NAME="timeslotcontrol"
DB_USER="${PGUSER:-postgres}"
DB_PASSWORD="${PGPASSWORD:-postgres}"
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"

export PGPASSWORD="$DB_PASSWORD"

echo "==> Dropping database '$DB_NAME'..."
dropdb -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" --if-exists "$DB_NAME"

echo "==> Creating database '$DB_NAME'..."
createdb -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" "$DB_NAME"

echo "==> Running Prisma migrations..."
npx prisma migrate deploy

echo "==> Generating Prisma client..."
npx prisma generate

echo "==> Seeding database..."
psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -f prisma/seed-data/seed.sql

echo ""
echo "==> Reset complete! Run: npm run dev"
