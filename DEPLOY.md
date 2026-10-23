# Deploying COTTSON

Frontend on **Vercel**, Medusa backend + PostgreSQL + Redis on **Render**, designs and quotes in **MongoDB Atlas**.

Order matters: backend first (it prints the keys the frontend needs), then the frontend, then point them at each other.

---

## 1. Backend on Render

1. Push this repo to GitHub.
2. Render dashboard → **New → Blueprint** → select this repo. It reads [`render.yaml`](render.yaml) and creates:
   - `cottson-medusa` (web service, Node)
   - `cottson-postgres` (PostgreSQL 16)
   - `cottson-redis` (Key Value / Valkey, `noeviction`)
3. When asked, fill the variables marked "sync: false". Put placeholders for now:
   - `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS` → `https://example.vercel.app`
   - `FRONTEND_URL` → `https://example.vercel.app`
4. After the first deploy, open the service **Shell** and run:
   ```bash
   cd apps/backend
   npx medusa db:migrate
   npx medusa exec ./src/scripts/seed-cottson.ts          # prints publishable key + region id — copy both
   npx medusa exec ./src/scripts/seed-cottson-pricing.ts
   npx medusa user -e you@cottson.com -p '<strong password>'
   ```
5. The admin dashboard is at `https://cottson-medusa.onrender.com/app`.

Plans: Postgres `basic-256mb` and the `starter` web service cost a few dollars a month. The free tiers work for testing, but the free web service sleeps (slow first request, background jobs stop) and the free database expires after 30 days.

## 2. Frontend on Vercel

1. Vercel → **Add New → Project** → import this repo.
2. **Root Directory: `frontend`** (important — the repo root is not the app).
3. Environment variables:
   | Name | Value |
   | --- | --- |
   | `MONGODB_URI` | your Atlas connection string |
   | `NEXT_PUBLIC_MEDUSA_URL` | `https://cottson-medusa.onrender.com` |
   | `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | printed by `seed-cottson.ts` |
   | `NEXT_PUBLIC_MEDUSA_REGION_ID` | printed by `seed-cottson.ts` |
| `CLOUDINARY_CLOUD_NAME` | the cloud name on your Cloudinary dashboard (not the API key name) |
| `CLOUDINARY_API_KEY` | from Cloudinary → API Keys |
| `CLOUDINARY_API_SECRET` | from Cloudinary → API Keys (server-side only, never `NEXT_PUBLIC_`) |
4. Deploy. The build uses `frontend/.npmrc` (`legacy-peer-deps=true`), which react-konva needs.

## 3. Connect them

1. In Render, set the real Vercel domain and redeploy:
   - `STORE_CORS` = `https://your-app.vercel.app`
   - `AUTH_CORS` = `https://your-app.vercel.app`
   - `ADMIN_CORS` = `https://cottson-medusa.onrender.com`
   - `FRONTEND_URL` = `https://your-app.vercel.app`
2. Re-run `npx medusa exec ./src/scripts/seed-cottson.ts` so product images point at the live domain.
3. MongoDB Atlas → **Network Access** → allow `0.0.0.0/0` (Vercel's IPs are not fixed).

## Checks after going live

- Home page loads and the hero color swatches work (pre-rendered images).
- A product page recolors live (PixiJS in the browser).
- Design Studio: upload a logo, add to cart → a document appears in Atlas `cottson.designs`.
- Checkout places an order visible in the Medusa admin, with totals matching the cart.
- Bulk quote form → document in Atlas `cottson.quotes`.

## Known limits

- **Customer logos and design previews are stored in Cloudinary** (folders `cottson/logos` and `cottson/previews`); only their URLs go in MongoDB. If the three `CLOUDINARY_*` variables are missing, designs fall back to storing images inline in MongoDB (fine for local development, not for real traffic). Nothing deletes uploads from designs that never became orders yet.
- **Payments are not connected.** Checkout uses Medusa's system provider and takes no money. Add the Razorpay (or Stripe) provider next.
- **Product garment layers and color variants are committed files** under `frontend/public/products/`. New products need `npm run make:product -- <photo.png> <outDir>` (or `make:garment-layer` for an already-composited photo) and `npm run render:variants` run locally, then committed. The pose images (`model-photo.webp`, `garment-layer.webp`) are WebP, at most 1600 px wide; the make/import scripts write them that way, and `node scripts/optimize-product-images.mjs` converts any stray PNGs.
- **Pricing rules live in two places** — `frontend/src/lib/pricing.ts` and `backend/apps/backend/src/scripts/seed-cottson-pricing.ts`. Change both, then re-run the script.
