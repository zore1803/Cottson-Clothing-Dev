# COTTSON Clothing

Custom cotton apparel store: live garment recoloring (PixiJS), a design studio for logos and text (Konva), and a Medusa v2 commerce backend.

| Folder | What |
| --- | --- |
| `storefront/` | Next.js 16 + TypeScript + Tailwind + shadcn/ui. See [storefront/README.md](storefront/README.md) |
| `backend/` | Medusa v2 (Postgres + Redis). COTTSON seed scripts in `backend/apps/backend/src/scripts/` |
| `docker-compose.yml` | Local Postgres (port 5433) and Redis (6379) |

Data: products, carts, orders in **Medusa / Postgres**; COTTSON's own data (saved studio designs, bulk quotes) in **MongoDB**.

## Run locally

```bash
docker compose up -d                          # Postgres + Redis

cd backend/apps/backend
cp .env.template .env                         # then set DATABASE_URL=postgres://medusa:medusa@localhost:5433/medusa and PORT=9100
npx medusa db:migrate
npx medusa exec ./src/scripts/seed-cottson.ts
npx medusa exec ./src/scripts/seed-cottson-pricing.ts
npx medusa user -e you@example.com -p <password>
npm run dev                                   # http://localhost:9100 (admin at /app)

cd ../../../storefront
# .env.local: MONGODB_URI, NEXT_PUBLIC_MEDUSA_URL=http://localhost:9100,
#             NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY, NEXT_PUBLIC_MEDUSA_REGION_ID (printed by seed-cottson.ts)
npm install --legacy-peer-deps
npm run dev                                   # http://localhost:3000
```

Windows notes: port 9000 is reserved by Hyper-V (hence 9100), and a local Postgres install may already use 5432 (hence 5433).
