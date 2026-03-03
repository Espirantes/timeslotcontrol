#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Dock Scheduling System — Database Setup
# Creates the database, runs migrations, and seeds data.
#
# Usage:  bash scripts/db-setup.sh
#
# Prerequisites:
#   - PostgreSQL running locally
#   - psql and createdb available on PATH
#   - .env.local with DATABASE_URL configured
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────

DB_NAME="timeslotcontrol"
DB_USER="${PGUSER:-postgres}"
DB_PASSWORD="${PGPASSWORD:-postgres}"
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"

export PGPASSWORD="$DB_PASSWORD"

echo "==> Checking PostgreSQL connection..."
if ! psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d postgres -c "SELECT 1" > /dev/null 2>&1; then
  echo "ERROR: Cannot connect to PostgreSQL at $DB_HOST:$DB_PORT as $DB_USER"
  echo "Make sure PostgreSQL is running and credentials are correct."
  exit 1
fi

# ─── Create database if it doesn't exist ─────────────────────────────────────

echo "==> Checking if database '$DB_NAME' exists..."
if psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo "    Database '$DB_NAME' already exists."
else
  echo "    Creating database '$DB_NAME'..."
  createdb -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" "$DB_NAME"
  echo "    Done."
fi

# ─── Copy .env.local if missing ──────────────────────────────────────────────

if [ ! -f .env.local ]; then
  echo "==> Creating .env.local from .env.local.example..."
  cp .env.local.example .env.local
  echo "    Done. Edit .env.local if your DB credentials differ."
fi

# ─── Run Prisma migrations ──────────────────────────────────────────────────

echo "==> Running Prisma migrations..."
pnpm prisma migrate deploy
echo "    Migrations applied."

# ─── Generate Prisma client ─────────────────────────────────────────────────

echo "==> Generating Prisma client..."
pnpm prisma generate
echo "    Client generated."

# ─── Seed data ───────────────────────────────────────────────────────────────

echo "==> Checking if database has data..."
ROW_COUNT=$(psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM \"user\"" 2>/dev/null || echo "0")

if [ "$ROW_COUNT" -gt "0" ]; then
  echo "    Database already has $ROW_COUNT users — skipping seed."
  echo "    To re-seed, run: bash scripts/db-reset.sh"
else
  echo "    Seeding database..."
  psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -f prisma/seed-data/seed.sql
  echo "    Seed data imported."
fi

echo ""
echo "==> Setup complete!"
echo ""
echo "Test accounts (all passwords: password123):"
echo "  Admin:            admin@timeslotcontrol.com"
echo "  Warehouse Worker: worker@timeslotcontrol.com"
echo "  Client (Allegro): allegro@timeslotcontrol.com"
echo "  Supplier (P&G):   pg@timeslotcontrol.com"
echo "  Supplier (Jarda): jarda@jicin.cz"
echo "  Client (Empire):  alex@nejkafe.cz"
echo ""
echo "Run: pnpm dev"
