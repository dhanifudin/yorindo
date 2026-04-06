# Secrets & Deployment Setup

## Overview

Three CD workflows deploy to different targets:

| Workflow | Trigger | Target | Env template |
|----------|---------|--------|--------------|
| `cd.yml` | Tag push `v*.*.*` | Full demo stack at `demo.yorindo.app` | `env.demo.template` |
| `cd-api.yml` | Push to `main` (api changes) | API-only at `api.dhanifudin.com` | `env.api.template` |
| `cd-app.yml` | Push to `main` (app changes) | App preview at `app.dhanifudin.com` | `env.app.template` |

Each workflow reads the corresponding template from the repo, replaces `CHANGE_ME_*` placeholders with individual GitHub secrets, and SCPs the resulting `.env` to the VPS.

---

## GitHub Actions Secrets

Configure these secrets in **GitHub → Settings → Secrets and variables → Actions**:

### Infrastructure (all workflows)

| Secret | Purpose | How to obtain |
|--------|---------|---------------|
| `VPS_SSH_KEY` | SSH private key (PEM) for VPS access | `ssh-keygen -t ed25519 -C "github-ci"`; add public key to VPS `~/.ssh/authorized_keys` |
| `VPS_HOST` | VPS IP address or hostname | From your VPS provider dashboard |
| `VPS_USER` | SSH username on VPS | e.g. `ubuntu`, `deploy` |
| `DOCKERHUB_USERNAME` | DockerHub username | Your DockerHub account |
| `DOCKERHUB_TOKEN` | DockerHub access token | DockerHub → Account Settings → Security → Access Tokens |

### Application secrets (cd.yml + cd-api.yml)

| Secret | Placeholder replaced | Required |
|--------|---------------------|----------|
| `POSTGRES_PASSWORD` | `CHANGE_ME_min_16_chars` | Yes — min 16 characters |
| `JWT_SECRET` | `CHANGE_ME_min_32_chars_xxxxxxxxxxxxxxxx` | Yes — min 32 characters |
| `JWT_REFRESH_SECRET` | `CHANGE_ME_different_min_32_chars_xxxx` | Yes — different from JWT_SECRET |

### Provider secrets (cd-api.yml only)

| Secret | Placeholder replaced | Required |
|--------|---------------------|----------|
| `BREVO_API_KEY` | `CHANGE_ME_BREVO_API_KEY` | Required when `EMAIL_PROVIDER=brevo` |
| `EVERPRO_API_KEY` | `CHANGE_ME_EVERPRO_API_KEY` | Required when `WHATSAPP_PROVIDER=everpro` |
| `OPENAI_API_KEY` | `CHANGE_ME_OPENAI_API_KEY` | Required when `AI_PROVIDER=openai` |
| `ANTHROPIC_API_KEY` | `CHANGE_ME_ANTHROPIC_API_KEY` | Required when `AI_PROVIDER=anthropic` |

### App-specific (cd-app.yml only)

| Secret | Purpose | Required |
|--------|---------|----------|
| `APP_SENTRY_DSN` | Sentry error monitoring DSN | No — Sentry DSN lines remain commented out if unset |

---

## Env Templates

The three template files live at the repo root and are committed to version control:

| File | Deployed as | Used by |
|------|-------------|---------|
| `env.demo.template` | `/var/www/yorindo/.env` | `cd.yml` |
| `env.api.template` | `/var/www/yorindo-api/.env` | `cd-api.yml` |
| `env.app.template` | `/var/www/yorindo-app/.env` | `cd-app.yml` |

To update a default (non-secret) value (e.g. `BASE_URL`, `EMAIL_PROVIDER`), edit the template directly and commit. Secrets stay in GitHub and are never committed.

---

## Branch Protection (Required for PR merge gate)

To enforce the CI test gate on pull requests:

1. Go to **GitHub → Settings → Branches → Add branch protection rule**
2. Branch name pattern: `main`
3. Enable **Require status checks to pass before merging**
4. Add required checks: `lint-typecheck (yorindo-app)` and `test (yorindo-app)`
5. Enable **Require branches to be up to date before merging**

---

## VPS One-Time Setup

### 1. Install Docker & Docker Compose

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Re-login for group change to take effect
```

### 2. Create deployment directories

```bash
# Full demo stack
sudo mkdir -p /var/www/yorindo/nginx
sudo chown -R $USER:$USER /var/www/yorindo

# API-only preview
sudo mkdir -p /var/www/yorindo-api
sudo chown -R $USER:$USER /var/www/yorindo-api

# App-only preview
sudo mkdir -p /var/www/yorindo-app
sudo chown -R $USER:$USER /var/www/yorindo-app
```

### 3. Authenticate Docker with DockerHub

```bash
docker login -u YOUR_DOCKERHUB_USERNAME
# Enter your DockerHub access token when prompted
```

### 4. Configure VPS nginx reverse proxy

Each deployment target requires an nginx site config. The Docker services bind only to localhost.

**Demo stack** (`demo.yorindo.app`) — proxies both app and API:

```nginx
server {
  listen 80;
  server_name demo.yorindo.app;

  location /api/ {
    proxy_pass http://127.0.0.1:8081;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

**API preview** (`api.dhanifudin.com`) — port `6666`:

```nginx
server {
  listen 80;
  server_name api.dhanifudin.com;

  location / {
    proxy_pass http://127.0.0.1:6666;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

**App preview** (`app.dhanifudin.com`) — port `5173`:

```nginx
server {
  listen 80;
  server_name app.dhanifudin.com;

  location / {
    proxy_pass http://127.0.0.1:5173;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Install and enable each config:

```bash
sudo cp /path/to/config /etc/nginx/sites-available/yorindo-demo.conf
sudo ln -sf /etc/nginx/sites-available/yorindo-demo.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Configure SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d demo.yorindo.app
sudo certbot --nginx -d api.dhanifudin.com
sudo certbot --nginx -d app.dhanifudin.com
```

---

## Deployment Triggers

### Demo stack (tagged release)

```bash
git tag v1.2.3
git push origin v1.2.3
```

`cd.yml` builds both API and App images tagged `v1.2.3`, SCPs `docker-compose.yml` + env to `/var/www/yorindo`, and runs `docker compose up -d` with health check against `https://demo.yorindo.app/api/health`.

### API preview (on every merge to main)

Triggered automatically when `yorindo-api/**` changes land on `main`. Deploys to `/var/www/yorindo-api` using `docker-compose.api.yml`, health checks `https://api.dhanifudin.com/api/health`.

### App preview (on every merge to main)

Triggered automatically when `yorindo-app/**` changes land on `main`. Builds with `NEXT_PUBLIC_ENABLE_MOCKS=true`. Deploys to `/var/www/yorindo-app` using `docker-compose.app.yml`, health checks `https://app.dhanifudin.com`.

---

## Docker Image Naming

| Image | Tags |
|-------|------|
| `DOCKERHUB_USERNAME/yorindo-api` | `{tag}` / `latest` (cd.yml), `{sha8}` / `latest` (cd-api.yml) |
| `DOCKERHUB_USERNAME/yorindo-app` | `{tag}` / `latest` (cd.yml), `preview-{sha8}` / `preview` (cd-app.yml) |

---

## Security Rules

- **DO NOT** commit `.env` — only `*.template` files are committed
- **DO NOT** put raw secret values in workflow files — use `secrets.*` only
- **DO** bind Docker services to localhost ports — VPS nginx is the only public ingress
- **DO** use distinct, randomly generated values for `JWT_SECRET` and `JWT_REFRESH_SECRET`
- **DO** use a `POSTGRES_PASSWORD` of at least 16 characters
- To rotate a secret: update the GitHub secret value, then re-trigger the relevant workflow — the VPS `.env` is refreshed on every deploy
