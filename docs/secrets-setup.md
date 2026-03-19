# Secrets & Deployment Setup

## GitHub Actions Secrets

Configure these 4 secrets in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Purpose | How to obtain |
|--------|---------|---------------|
| `VPS_SSH_KEY` | SSH private key (PEM format) for VPS access | Generate with `ssh-keygen -t ed25519 -C "github-ci"`; add public key to VPS `~/.ssh/authorized_keys` |
| `VPS_HOST` | VPS IP address or hostname | From your VPS provider dashboard |
| `VPS_USER` | SSH username on VPS | e.g., `ubuntu`, `deploy`, `root` |
| `GHCR_TOKEN` | GitHub PAT with `write:packages` scope | GitHub → Settings → Developer settings → Personal access tokens |

**These 4 are all that are needed in GitHub Actions. All other secrets (DB passwords, API keys, etc.) live in `.env` on the VPS only — never in GitHub.**

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
sudo mkdir -p /opt/yorindo/nginx/certs
sudo chown -R $USER:$USER /opt/yorindo
cd /opt/yorindo
```

### 3. Copy production files to VPS

```bash
# From your local machine:
scp docker-compose.yml user@VPS_HOST:/opt/yorindo/
scp nginx/nginx.conf user@VPS_HOST:/opt/yorindo/nginx/
```

### 4. Create .env on VPS

```bash
cp yorindo-api/.env.example /opt/yorindo/.env
# Edit /opt/yorindo/.env and fill in all CHANGE_ME values
nano /opt/yorindo/.env
```

### 5. Configure SSL certificates (Let's Encrypt)

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d api.yorindo.app -d yorindo.app -d www.yorindo.app
sudo cp /etc/letsencrypt/live/api.yorindo.app/fullchain.pem /opt/yorindo/nginx/certs/
sudo cp /etc/letsencrypt/live/api.yorindo.app/privkey.pem /opt/yorindo/nginx/certs/
sudo chown $USER:$USER /opt/yorindo/nginx/certs/*.pem
```

### 6. Authenticate Docker with GHCR

```bash
echo $GHCR_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

### 7. Initial deploy

```bash
cd /opt/yorindo
docker compose pull
docker compose up -d
```

---

## GHCR Image Naming

Replace `YOUR_ORG` in `docker-compose.yml` with the actual GitHub organization or username:

- API: `ghcr.io/{github_org}/yorindo-api:{sha}` and `:latest`
- App: `ghcr.io/{github_org}/yorindo-app:{sha}` and `:latest`

---

## Security Rules

- **DO NOT** commit `.env` — only `.env.example` is committed
- **DO NOT** commit SSL certs — `nginx/certs/` is in `.gitignore`
- **DO NOT** use `ports` for api/app in production compose — use `expose` only; Nginx is the ingress
- **DO NOT** hardcode any secrets in workflow files — all from `secrets.*`
