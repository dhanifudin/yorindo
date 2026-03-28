# Secrets & Deployment Setup

## GitHub Actions Secrets

Configure these 5 required secrets in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Purpose | How to obtain |
|--------|---------|---------------|
| `VPS_SSH_KEY` | SSH private key (PEM format) for VPS access | Generate with `ssh-keygen -t ed25519 -C "github-ci"`; add public key to VPS `~/.ssh/authorized_keys` |
| `VPS_HOST` | VPS IP address or hostname | From your VPS provider dashboard |
| `VPS_USER` | SSH username on VPS | e.g., `ubuntu`, `deploy`, `root` |
| `VPS_ENV_FILE` | Full multiline contents of `/var/www/yorindo/.env` | Copy from the repository root `.env.example`, then replace all placeholder values |
| `GHCR_TOKEN` | GitHub Container Registry token | Personal access token or fine-grained token with package write access |

`VPS_ENV_FILE` should be stored as a **multiline secret**. Start from the repository root `.env.example`, then paste the final production values into the secret.

For the current Phase 1 demo deployment, the `.env.example` defaults intentionally keep `REPOSITORY_IMPL=memory`, `SERVICE_IMPL=mock`, and the AI providers on `mock`. Change those only when the VPS is ready for the real database and integrations.

---

## Branch Protection (Required for PR merge gate)

To enforce the CI test gate on pull requests:

1. Go to **GitHub → Settings → Branches → Add branch protection rule**
2. Branch name pattern: `main`
3. Enable **Require status checks to pass before merging**
4. Add required checks: `lint-typecheck (yorindo-app)` and `test (yorindo-app)`
5. Enable **Require branches to be up to date before merging**

> The CI workflow runs on **all PRs regardless of target branch** — the protection rule above enforces the merge gate for `main`. To protect additional long-lived branches (e.g. `develop`), add a separate rule with the same check names.

---

## Deployment Triggers

| Workflow | Trigger | Target |
|----------|---------|--------|
| `ci.yml` | Every PR + every push | Runs lint, typecheck, tests — blocks PR merge |
| `cd.yml` | Push to `main` | Builds Docker images → GHCR → VPS at `demo.dhanifudin.com` |
| `deploy.yml` | same tag push | GitHub Pages static export → `yorindo.dhanifudin.com` (FE + MSW mocks) |

To deploy the containerized stack:
```bash
git push origin main
```

---

## VPS One-Time Setup

Before CI/CD can deploy successfully, complete these steps on the VPS:

### 1. Install Docker & Docker Compose

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Re-login for group change to take effect
```

### 2. Create deployment directory

```bash
sudo mkdir -p /var/www/yorindo/nginx
sudo chown -R $USER:$USER /var/www/yorindo
cd /var/www/yorindo
```

### 3. Copy production files to VPS

```bash
# One-time bootstrap only; later tag releases sync docker-compose.yml automatically.
scp docker-compose.yml user@VPS_HOST:/var/www/yorindo/
scp nginx/nginx.conf user@VPS_HOST:/var/www/yorindo/nginx/nginx.conf
```

### 4. Create deployment env secret

```bash
# On your local machine:
cp .env.example /tmp/yorindo-vps.env
nano /tmp/yorindo-vps.env  # fill in all real values
# Paste the final contents into the GitHub Actions secret: VPS_ENV_FILE
```

The CD workflow writes `VPS_ENV_FILE` to `/var/www/yorindo/.env` on every deploy, so the server stays in sync with the release config.

### 5. Configure VPS nginx reverse proxy

`nginx/nginx.conf` is now a VPS site config snippet, not a full `/etc/nginx/nginx.conf` replacement. Install it as a site config, for example:

```bash
sudo cp /var/www/yorindo/nginx/nginx.conf /etc/nginx/sites-available/yorindo.conf
sudo ln -sf /etc/nginx/sites-available/yorindo.conf /etc/nginx/sites-enabled/yorindo.conf
```

The Docker services bind only to localhost, so VPS nginx must proxy to `127.0.0.1:5000` and `127.0.0.1:5001`:

```nginx
server {
  listen 80;
  server_name demo.dhanifudin.com;

  location /api/ {
    proxy_pass http://127.0.0.1:5001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

After installing the site config:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Configure SSL certificate (Let's Encrypt)

```bash
sudo apt install certbot
sudo certbot --nginx -d demo.dhanifudin.com
```

### 7. Authenticate Docker with GHCR

```bash
echo $GHCR_TOKEN | docker login ghcr.io -u GITHUB_USERNAME --password-stdin
```

### 8. Initial deploy

```bash
git push origin main
```

After the push reaches `main`, GitHub Actions builds/pushes GHCR images, uploads `docker-compose.yml`, refreshes `.env`, copies the latest nginx site config to `/var/www/yorindo/nginx/nginx.conf`, then runs the remote `docker compose pull && docker compose up -d` sequence for you. The VPS nginx service reverse-proxies traffic to app port `5000` and API port `5001`.

---

## GHCR Image Naming

- API: `ghcr.io/dhanifudin/yorindo-api:{sha}` and `:latest`
- App: `ghcr.io/dhanifudin/yorindo-app:{sha}` and `:latest`

---

## Security Rules

- **DO NOT** commit `.env` — only `.env.example` is committed
- **DO NOT** publish Docker containers on ports `80` or `443` on the VPS — system nginx owns those ports
- **DO** bind app/api only to localhost ports (`127.0.0.1:5000` and `127.0.0.1:5001`) so VPS nginx remains the only public ingress
- **DO NOT** hardcode any secrets in workflow files — all from `secrets.*`
- **DO** rotate `VPS_ENV_FILE` values in GitHub whenever production secrets change, then trigger the next tagged deploy so `/var/www/yorindo/.env` is refreshed on the VPS
