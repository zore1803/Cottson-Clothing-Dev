# Deploying COTTSON

Frontend on **Vercel**, Medusa backend + PostgreSQL + Redis on **Render**, designs, quotes, staff roles and the audit log in **MongoDB Atlas**, customer artwork and uploaded product photos in **Cloudinary**, payments through **Razorpay**, and email over **SMTP**.

Order matters: backend first (it prints the keys the frontend needs), then the frontend, then point them at each other.

For running everything on your own machine, copy `frontend/.env.template` to `frontend/.env.local` and `backend/apps/backend/.env.template` to `backend/apps/backend/.env`, run `docker compose up -d` (Postgres and Redis), then `npm run dev` in `backend/apps/backend` and in `frontend`.

## Accounts you need

| Service | Used for | Free plan is enough to start? |
| --- | --- | --- |
| Render | Medusa, Postgres, Redis | Yes for testing (see the warnings in step 1) |
| Vercel | The website | Yes |
| MongoDB Atlas | Designs, quotes, staff, audit log | Yes |
| Cloudinary | Logos, previews, superadmin product photos | Yes |
| Razorpay | Taking payments | Test mode is free; live mode needs KYC |
| An SMTP provider (Resend, SendGrid, SES, a Gmail app password...) | Staff invites, password-reset links | Optional until you invite staff |
| A hosted Redis (e.g. Upstash) | Rate limits shared between server instances | Optional |

---

## 1. Backend on Render

1. Push this repo to GitHub.
2. Render dashboard → **New → Blueprint** → select this repo. It reads [`render.yaml`](render.yaml) and creates:
   - `cottson-medusa` (web service, Node)
   - `cottson-postgres` (PostgreSQL 16)
   - `cottson-redis` (Key Value / Valkey, `noeviction`)
3. When asked, fill the variables marked "sync: false". Put placeholders for now:
   - `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS` → `https://example.vercel.app`
   - `FRONTEND_URL` and `STOREFRONT_URL` → `https://example.vercel.app`
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD` → the login of your first admin (created during the build)
4. Render generates `CHECKOUT_SECRET` for you. **Copy its value** (service → Environment): the website needs the identical value.
5. The first deploy runs the migrations, seeds the catalogue and pricing, and creates the admin user as part of the build, because the free plan has no Shell. Read the **publishable key** and **region id** in the build log (Logs tab); you need both for Vercel.
   On a paid plan you can run the same by hand from the service **Shell**:
   ```bash
   cd apps/backend
   npx medusa db:migrate
   npx medusa exec ./src/scripts/seed-cottson.ts          # prints publishable key + region id
   npx medusa exec ./src/scripts/seed-cottson-pricing.ts
   npx medusa user -e you@cottson.com -p '<strong password>'
   ```
6. The Medusa dashboard is at `https://cottson-medusa.onrender.com/app`.

**Warnings**
- **Redeploys reset stock.** Every deploy re-runs `seed-cottson.ts`, which deletes and recreates the COTTSON catalogue products, and stock quantities set in the admin live on those products. After the first successful deploy, remove the `seed-cottson.ts` line (not the pricing one) from `buildCommand` in `render.yaml`.
- **Free plans are for testing.** The free web service sleeps when idle (slow first request, background jobs stop) and the free database is deleted after 30 days. Postgres `basic-256mb` and the `starter` web service cost a few dollars a month.

## 2. Frontend on Vercel

1. Vercel → **Add New → Project** → import this repo.
2. **Root Directory: `frontend`** (important, the repo root is not the app).
3. Environment variables. The full annotated list is in [`frontend/.env.template`](frontend/.env.template).

   **Required**

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_MEDUSA_URL` | `https://cottson-medusa.onrender.com` |
   | `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | printed by `seed-cottson.ts` |
   | `NEXT_PUBLIC_MEDUSA_REGION_ID` | printed by `seed-cottson.ts` |
   | `CHECKOUT_SECRET` | the value Render generated (step 1.4) |
   | `MONGODB_URI` | your Atlas connection string |
   | `CLOUDINARY_CLOUD_NAME` | the cloud name on your Cloudinary dashboard (not the API key's name) |
   | `CLOUDINARY_API_KEY` | from Cloudinary → API Keys |
   | `CLOUDINARY_API_SECRET` | from Cloudinary → API Keys (server-side only, never `NEXT_PUBLIC_`) |
   | `SUPERADMIN_EMAILS` | comma-separated emails that are always superadmins; list your first admin here |
   | `NEXT_PUBLIC_SITE_URL` | the public address of the site, used in links inside emails |

   **Payments** (without these, production keeps checkout switched off)

   | Name | Value |
   | --- | --- |
   | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | from Razorpay → Settings → API Keys. Use test keys until you have verified the flow. |
   | `RAZORPAY_WEBHOOK_SECRET` | any long random string; you enter the same one in Razorpay (step 3.3) |
   | `PAYMENT_MODE` | optional: `razorpay`, `off` (disable checkout), or `dummy` (a fake checkout that takes **no money**, for demos only) |

   **Email** (needed to send staff invites and password-reset links; without `SMTP_HOST` and `SMTP_FROM` nothing is sent)

   | Name | Value |
   | --- | --- |
   | `SMTP_HOST`, `SMTP_PORT` (587 by default), `SMTP_USER`, `SMTP_PASS` | from your SMTP provider |
   | `SMTP_FROM` | e.g. `COTTSON <no-reply@yourdomain.com>` |

   **Optional**

   | Name | Value |
   | --- | --- |
   | `REDIS_URL` | a Redis the website can reach, so rate limits are shared between server instances. Render's own Redis is internal-only and **not** reachable from Vercel; use a hosted one such as Upstash. Without it, limits are counted per server instance. |

4. Deploy. The build uses `frontend/.npmrc` (`legacy-peer-deps=true`), which react-konva needs.

## 3. Connect them

1. In Render, set the real Vercel domain and redeploy:
   - `STORE_CORS` = `https://your-app.vercel.app`
   - `AUTH_CORS` = `https://your-app.vercel.app`
   - `ADMIN_CORS` = `https://cottson-medusa.onrender.com`
   - `FRONTEND_URL` and `STOREFRONT_URL` = `https://your-app.vercel.app`
2. Re-run `npx medusa exec ./src/scripts/seed-cottson.ts` (or let the next deploy do it) so product images point at the live domain.
3. In the Razorpay dashboard → Settings → Webhooks, add `https://your-app.vercel.app/api/payments/razorpay/webhook`, tick the events **payment.captured** and **order.paid**, and enter the same secret as `RAZORPAY_WEBHOOK_SECRET`.
4. MongoDB Atlas → **Network Access** → allow `0.0.0.0/0` (Vercel's IPs are not fixed).

## Checks after going live

- Home page loads and the hero color swatches work (pre-rendered images).
- A product page shows its poses and colours.
- Design Studio: upload a logo, add to cart → a document appears in Atlas `cottson.designs` with a Cloudinary link, not inline image data.
- Checkout with a Razorpay test card places an order, visible in the Medusa admin and in `/admin`, with totals matching the cart. Look at the webhook deliveries in Razorpay to confirm they return 200.
- Trying to complete a cart straight against Medusa without the secret returns 403.
- Signing in with an admin email lands on `/admin`; a customer lands on the homepage.
- Bulk quote form → document in Atlas `cottson.quotes`, visible in `/admin`.
- Inviting a staff member from the Staff screen sends an email.

## Known limits

- **Customer logos and design previews are stored in Cloudinary** (folders `cottson/logos` and `cottson/previews`); only their URLs go in MongoDB. If the three `CLOUDINARY_*` variables are missing, designs fall back to storing images inline in MongoDB (fine for local development, not for real traffic). Nothing deletes uploads from designs that never became orders yet.
- **A redeploy resets stock** unless you remove the catalogue seed from the build (see step 1).
- **Product garment layers and color variants are committed files** under `frontend/public/products/`. New products need `npm run make:product -- <photo.png> <outDir>` (or `make:garment-layer` for an already-composited photo) and `npm run render:variants` run locally, then committed. The pose images (`model-photo.webp`, `garment-layer.webp`) are WebP, at most 1600 px wide; the make/import scripts write them that way, and `node scripts/optimize-product-images.mjs` converts any stray PNGs.
- **Pricing rules live in two places**: `frontend/src/lib/pricing.ts` and `backend/apps/backend/src/scripts/seed-cottson-pricing.ts`. Change both, then re-run the script.
- **Emails are only sent for staff invites and password resets.** Order confirmations, shipping updates and quote alerts are not sent yet.
- **Dependency audit.** The frontend's production dependencies have no known vulnerabilities. `npm audit` on the backend still reports findings that live inside Medusa's own dependency tree (for example `lodash` and `braces`); npm offers no safe fix, so they depend on upstream Medusa releases. Re-run `npm audit` after each Medusa update.
