# Secrets & Deployment Setup

## GitHub Actions Secrets

Configure these 5 secrets in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Purpose | How to obtain |
|--------|---------|---------------|
| `DOCKERHUB_USERNAME` | Docker Hub account username | Your Docker Hub username (e.g. `dhanifudin`) |
| `DOCKERHUB_TOKEN` | Docker Hub access token | Docker Hub → Account Settings → Security → New Access Token (read/write/delete scope) |
| `VPS_SSH_KEY` | SSH private key (PEM format) for VPS access | Generate with `ssh-keygen -t ed25519 -C "github-ci"`; add public key to VPS `~/.ssh/authorized_keys` |
| `VPS_HOST` | VPS IP address or hostname | From your VPS provider dashboard |
| `VPS_USER` | SSH username on VPS | e.g., `ubuntu`, `deploy`, `root` |

**All other secrets (API keys, etc.) live in `.env` on the VPS only — never in GitHub.**

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
| `cd.yml` | `git push origin v1.2.3` (semver tag) | Builds Docker images → Docker Hub → VPS at `demo.dhanifudin.com` |
| `deploy.yml` | same tag push | GitHub Pages static export → `yorindo.dhanifudin.com` (FE + MSW mocks) |

To release:
```bash
git tag v1.0.0
git push origin v1.0.0
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
sudo mkdir -p /var/www/yorindo/nginx/certs
sudo chown -R $USER:$USER /var/www/yorindo
cd /var/www/yorindo
```

### 3. Copy production files to VPS

```bash
# From your local machine:
scp docker-compose.yml user@VPS_HOST:/var/www/yorindo/
scp nginx/nginx.conf user@VPS_HOST:/var/www/yorindo/nginx/
```

### 4. Create .env on VPS

```bash
cp yorindo-api/.env.example /var/www/yorindo/.env
nano /var/www/yorindo/.env  # fill in all CHANGE_ME values
```

### 5. Configure SSL certificate (Let's Encrypt)

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d demo.dhanifudin.com
sudo cp /etc/letsencrypt/live/demo.dhanifudin.com/fullchain.pem /var/www/yorindo/nginx/certs/
sudo cp /etc/letsencrypt/live/demo.dhanifudin.com/privkey.pem /var/www/yorindo/nginx/certs/
sudo chown $USER:$USER /var/www/yorindo/nginx/certs/*.pem
```

### 6. Authenticate Docker with Docker Hub

```bash
echo $DOCKERHUB_TOKEN | docker login -u $DOCKERHUB_USERNAME --password-stdin
```

### 7. Initial deploy

```bash
cd /var/www/yorindo
docker compose pull
docker compose up -d
```

---

## Docker Hub Image Naming

- API: `dhanifudin/yorindo-api:{tag}` and `:latest`
- App: `dhanifudin/yorindo-app:{tag}` and `:latest`

---

## Security Rules

- **DO NOT** commit `.env` — only `.env.example` is committed
- **DO NOT** commit SSL certs — `nginx/certs/` is in `.gitignore`
- **DO NOT** use `ports` for api/app in compose — use `expose` only; Nginx is the ingress
- **DO NOT** hardcode any secrets in workflow files — all from `secrets.*`
