#!/bin/bash
# Mac PostgreSQL setup for local development
# Requires Homebrew — https://brew.sh

set -e

echo "Installing PostgreSQL via Homebrew..."
brew install postgresql@15

echo "Starting PostgreSQL service..."
brew services start postgresql@15

# Give it a moment to start
sleep 2

echo "Creating database user and database..."
/opt/homebrew/opt/postgresql@15/bin/psql postgres -c "CREATE USER nursery_user WITH PASSWORD 'nursery_pass';" 2>/dev/null || echo "User already exists, skipping."
/opt/homebrew/opt/postgresql@15/bin/psql postgres -c "CREATE DATABASE nursery OWNER nursery_user;" 2>/dev/null || echo "Database already exists, skipping."

echo "Running migration..."
/opt/homebrew/opt/postgresql@15/bin/psql -h localhost -U nursery_user -d nursery -f ../migration.sql

echo ""
echo "Done. Add this to db.config.json:"
echo '{ "connectionString": "postgresql://nursery_user:nursery_pass@localhost:5432/nursery" }'
