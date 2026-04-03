---
title: 'HTTPS and Domain Configuration'
slug: '13-4-https-and-domain-configuration'
created: '2026-04-02'
status: 'ready-for-dev'
epic: 13
story: 4
tech_stack: ['nginx', 'letsencrypt', 'certbot']
files_to_create:
  - 'docs/nginx-demo.conf' (example config)
---

# Story 13.4: HTTPS and Domain Configuration

**Story ID:** 13.4
**Story Key:** 13-4-https-and-domain-configuration
**Epic:** Epic 13 — Demo Environment Deployment
**Status:** ready-for-dev

---

## Story

As a VPS administrator managing the demo environment,
I want the nginx reverse proxy configured to route `demo.dhanifudin.com` to the Docker containers with valid HTTPS,
so that demo visitors access the platform securely.

---

## Acceptance Criteria

**AC1:** Given the VPS nginx is configured, when `https://demo.dhanifudin.com` is accessed, then the Yorindo app loads with a valid SSL certificate (no browser warnings).

**AC2:** Given the nginx config exists, when requests are made to `https://demo.dhanifudin.com/api/*`, then they are proxied to `localhost:3000` (yorindo-api).

**AC3:** Given the nginx config exists, when requests are made to `https://demo.dhanifudin.com/*` (non-API), then they are proxied to `localhost:5173` (yorindo-app).

**AC4:** Given the SSL certificate is managed by Certbot, when the certificate expires, then it auto-renews without manual intervention.

**AC5:** Given an example nginx config file exists in the repo, when a developer needs to set up the demo on a new VPS, then they can reference the config as a starting point.

---

## Context for Development

### Nginx Reverse Proxy Config

The VPS already runs nginx. This story creates the server block config for the demo subdomain:

```nginx
server {
    listen 80;
    server_name demo.dhanifudin.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name demo.dhanifudin.com;

    ssl_certificate /etc/letsencrypt/live/demo.dhanifudin.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/demo.dhanifudin.com/privkey.pem;

    # Yorindo App (Next.js)
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Yorindo API (Fastify)
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL Certificate

- Managed by Certbot/Let's Encrypt on the VPS
- Auto-renewal via `certbot renew` cron job (already configured on VPS)
- This story does NOT set up Certbot — it assumes the VPS already has it

### Existing Files to Reference

- VPS nginx config at `/etc/nginx/sites-available/` or `/etc/nginx/conf.d/` (reference for existing patterns)
- `docker-compose.demo.yml` — created in Story 13.1 (defines container ports)

### Technical Decisions

- **Config file in repo:** Store example config at `docs/nginx-demo.conf` for reference — not deployed by compose
- **HTTP → HTTPS redirect:** All HTTP traffic redirects to HTTPS (301)
- **WebSocket support:** Next.js may use WebSockets — proxy headers must support upgrade
- **API prefix routing:** `/api/*` routes to yorindo-api, everything else to yorindo-app

---

## Implementation Plan

### Task 1: Create example nginx config

Create `docs/nginx-demo.conf` with the complete server block configuration. Include comments explaining each section.

### Task 2: Document VPS setup steps

In `DEMO.md`, document the steps to:
1. Copy config to `/etc/nginx/sites-available/demo.dhanifudin.com`
2. Symlink to `/etc/nginx/sites-enabled/`
3. Run `certbot --nginx -d demo.dhanifudin.com`
4. Test with `nginx -t` and `systemctl reload nginx`

### Task 3: Verify DNS

Document that `demo.dhanifudin.com` must have an A record pointing to the VPS IP before nginx config works.

---

## Dependencies

- Story 13.1 (Docker Compose Demo Profile) — containers must expose ports 5173 and 3000
- VPS must have nginx installed and running
- VPS must have Certbot installed
- DNS A record for `demo.dhanifudin.com` must point to VPS IP
