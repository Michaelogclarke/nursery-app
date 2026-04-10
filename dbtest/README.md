# Local database setup for development

## Option A — Docker (recommended, works on Mac and Linux)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
cd dbtest
docker compose up -d
```

The migration runs automatically on first start.  
To stop: `docker compose down`  
To wipe data and start fresh: `docker compose down -v`

## Option B — Homebrew (Mac only)

```bash
cd dbtest
chmod +x setup-mac.sh
./setup-mac.sh
```

## db.config.json

For both options, use:

```json
{ "connectionString": "postgresql://nursery_user:nursery_pass@localhost:5432/nursery" }
```
