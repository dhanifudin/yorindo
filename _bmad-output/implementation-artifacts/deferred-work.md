# Deferred Work

## From spec-1-7-cicd-pipeline-update (2026-03-26)

- **nginx `/api/` prefix forwarding**: nginx passes the `/api/` prefix verbatim to the BE container. The BE must mount all routes under `/api/` for proxying to work correctly. If the Fastify app listens at `/` (default), all proxied requests will 404. Confirm or set route prefix when implementing `yorindo-api` (Story 1.1/1.8).
- **`docker compose pull` partial failure**: In some Docker versions, `docker compose pull` exits 0 even if one image fails. Consider adding explicit image verification or switching to `docker compose up -d --pull always` when the API is real.
- **Health check sleep duration**: The 15-second sleep before the health check may be too short on a cold VPS. Consider a retry loop (`for i in {1..5}; do ... && break; sleep 5; done`) when API startup time becomes non-trivial.
- **VPS config drift**: `docker-compose.yml` and `nginx/nginx.conf` are not automatically synced to the VPS on tag pushes — they must be manually copied after config changes. Consider adding a `scp` step to the deploy job when config changes are frequent.
