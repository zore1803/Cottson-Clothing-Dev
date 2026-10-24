# Deploying COTTSON on the shared KVM VPS

Images are built on your PC (the VPS has ~1.9 GB spare RAM, too little for `next build`), pushed to
GitHub Container Registry, then pulled and run on the VPS next to the other projects.

Replace `cottson.com` with the real domain and `YOUR_GITHUB_USER` with your GitHub user.

Ports used on the VPS (all free): frontend `127.0.0.1:3100`, Medusa `127.0.0.1:9100`.
Postgres and Redis have no host ports.

## 1. DNS
Add A records pointing to the VPS IP: `@`, `www` and `medusa`.

## 2. Build and push images (on your PC, Docker Desktop running)
```bash
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USER --password-stdin   # token needs write:packages

docker build -t ghcr.io/YOUR_GITHUB_USER/cottson-medusa:latest backend
docker push ghcr.io/YOUR_GITHUB_USER/cottson-medusa:latest

docker build -t ghcr.io/YOUR_GITHUB_USER/cottson-frontend:latest frontend \
  --build-arg NEXT_PUBLIC_MEDUSA_URL=https://medusa.200-234-34-214.sslip.io \
  --build-arg NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<from seed step, see 5> \
  --build-arg NEXT_PUBLIC_MEDUSA_REGION_ID=<from seed step, see 5> \
  --build-arg NEXT_PUBLIC_SITE_URL=https://cottson.com
docker push ghcr.io/YOUR_GITHUB_USER/cottson-frontend:latest
```
The publishable key and region id only exist after the first seed (step 5), so build the backend first,
start it, seed, then build and push the frontend.

## 3. Prepare the VPS
```bash
mkdir -p /opt/cottson && cd /opt/cottson
# copy docker-compose.prod.yml here, and create .env.production, .env.medusa, .env.frontend
# from .env.production.example (chmod 600 them)
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USER --password-stdin   # token needs read:packages
```

## 4. Start the backend stack
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d postgres redis medusa
docker compose -f docker-compose.prod.yml --env-file .env.production exec medusa npx medusa db:migrate
```

## 5. Seed and create the admin user
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec medusa \
  npx medusa exec ./src/scripts/seed-cottson.js        # prints publishable key + region id
docker compose -f docker-compose.prod.yml --env-file .env.production exec medusa \
  npx medusa exec ./src/scripts/seed-cottson-pricing.js
docker compose -f docker-compose.prod.yml --env-file .env.production exec medusa \
  npx medusa user -e you@cottson.com -p 'STRONG_PASSWORD'
```
(The container runs the compiled build, so scripts end in `.js`. If that path is not found, check
with `exec medusa ls src/scripts`.) Now do the frontend build in step 2 with the printed values.

## 6. Add to Caddy
Append to `/etc/caddy/Caddyfile` (same style as the other sites), then check and reload:
```
cottson.com, www.cottson.com {
        reverse_proxy 127.0.0.1:3100
}

medusa.200-234-34-214.sslip.io {
        redir / /app
        reverse_proxy 127.0.0.1:9100
}
```
```bash
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```
Caddy fetches the SSL certificates by itself once DNS resolves. Reload (not restart) keeps the other sites up.

## 7. Start the frontend
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production pull frontend
docker compose -f docker-compose.prod.yml --env-file .env.production up -d frontend
```

## Checks
- `https://cottson.com` loads; `https://medusa.200-234-34-214.sslip.io` lands on the admin login (`/app`).
- `docker stats --no-stream` and `free -h`: the stack should stay around 1 GB.
- Atlas: add the VPS IP under Network Access.

## Updating later
Rebuild and push the changed image on your PC, then on the VPS:
`docker compose -f docker-compose.prod.yml --env-file .env.production pull && ... up -d`.
