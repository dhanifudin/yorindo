# Demo Deployment

Self-contained demo environment at `demo.dhanifudin.com` (or `http://localhost:8888` for local testing).

## Prerequisites

- Docker Compose v2 installed
- Domain `demo.dhanifudin.com` pointing to VPS IP (for production)
- VPS nginx configured to reverse proxy to `localhost:8888`

## Quick Start

```bash
# Full deploy (pull images + migrate + seed)
make deploy-demo

# Or without Make:
./scripts/deploy-demo.sh
```

## Commands

| Command | Description |
|---------|-------------|
| `make deploy-demo` | Full deploy: wipe data, pull images, start, migrate, seed |
| `make reset-demo` | Reset data only: wipe, restart, migrate, seed (no pull) |
| `make stop-demo` | Stop containers, preserve data |
| `make logs-demo` | Follow logs from all services |
| `make migrate-demo` | Run migrations only |
| `make seed-demo` | Run seed only |

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@yorindo.id | Password123! |
| Viewer | viewer@yorindo.id | Password123! |
| Staff | staff@yorindo.id | Password123! |

## Seed Data Overview

Every deploy includes fresh data with these events:

| Event | Status | Date | Registrations |
|-------|--------|------|---------------|
| TechConf Jakarta 2026 | 🔴 Active | Ongoing | 80 (42 attended) |
| AI Summit Bandung | 🔴 Active | +2 days | 120 |
| ERP Workshop Surabaya | 🟢 Published | +14 days | 35 (5 pending) |
| Fintech Networking Bali | 🟢 Published | +30 days | 20 |
| Cloud Conference Jakarta | 🟡 Draft | +60 days | 0 |
| Data Summit Yogyakarta | 🟡 Draft | +90 days | 0 |
| DevOps Meetup Jakarta | ✅ Completed | -30 days | 55 (42 attended) |
| Marketing Forum Bandung | ✅ Completed | -60 days | 150 (98 attended) |
| HR Tech Summit | ❌ Cancelled | -15 days | 15 |
| Startup Pitch Night | 📦 Archived | -180 days | 200 (145 attended) |

Additional data:
- ~500 contacts (realistic Indonesian data)
- ~40 duplicate contact pairs (for dedup feature)
- 8 flagged records (4 duplicate, 4 invalid-data)
- ~15 opted-out contacts (for suppression list)
- 5 blast history records (3 for TechConf, 2 for AI Summit)
- Pre-built survey schemas on 6 events
- Survey responses on completed events

## Reset Data

```bash
make reset-demo
# or
./scripts/deploy-demo.sh --reset
```

## VPS Nginx Configuration

The VPS nginx reverse proxy config is provided in `nginx/vps.conf`. It handles SSL termination and forwards traffic to the Docker nginx container.

**Setup steps:**

1. Copy the config to the VPS:
   ```bash
   scp nginx/vps.conf root@your-vps:/etc/nginx/sites-available/demo.dhanifudin.com
   ```

2. Replace `NGINX_PORT` with the actual port from `.env` (default: `8888`):
   ```bash
   sed -i 's/NGINX_PORT/8888/g' /etc/nginx/sites-available/demo.dhanifudin.com
   ```

3. Obtain SSL certificates:
   ```bash
   certbot --nginx -d demo.dhanifudin.com
   ```

4. Enable the site:
   ```bash
   ln -s /etc/nginx/sites-available/demo.dhanifudin.com /etc/nginx/sites-enabled/
   ```

5. Test and reload:
   ```bash
   nginx -t && systemctl reload nginx
   ```

**Architecture:**

```
demo.dhanifudin.com (HTTPS via VPS nginx)
         │
         ▼  (SSL termination, proxy to Docker nginx)
   ┌──────────────────┐
   │  VPS nginx       │  ← nginx/vps.conf
   └────┬─────────────┘
        │  (forward to localhost:NGINX_PORT)
        ▼
   ┌──────────────┐
   │ Docker nginx │  ← nginx/nginx.conf
   └────┬─────┬───┘
        │     │
        ▼     ▼
     app:3000  api:3000
     (Next.js) (Fastify)
```

**DNS requirement:** `demo.dhanifudin.com` must have an A record pointing to the VPS IP before the nginx config works.

## Architecture

```
demo.dhanifudin.com (HTTPS via VPS nginx)
         │
         ▼  (reverse proxy → localhost:8888)
   ┌──────────────┐
   │ nginx:8888   │  ← Internal nginx container
   └────┬─────┬───┘
        │     │
        ▼     ▼
     app:3000  api:3000
     (Next.js) (Fastify)
                 │
                 ▼
           postgres:5432
           redis:6379
```

## Troubleshooting

### Postgres won't start
```bash
docker compose logs postgres
docker compose down -v && docker compose up -d postgres
```

### API can't connect to database
```bash
docker compose exec api env | grep DATABASE_URL
docker compose exec postgres pg_isready -U yorindo -d yorindo
```

### Seed script fails
```bash
docker compose logs api
docker compose exec api npx tsx scripts/seed.ts --demo  # Run manually
```

### View all logs
```bash
make logs-demo
# or
docker compose logs -f
```
