# COTTSON frontend

Custom-apparel frontend: catalog, product pages with pre-rendered garment color variants, a design studio for logos/text, cart and checkout.

## Run

```bash
npm install --legacy-peer-deps   # react-konva's peer range lags React 19.2
npm run dev                      # http://localhost:3000
```

## Stack (phase 1)

| Area | Tech |
| --- | --- |
| App | Next.js 16 (App Router) + TypeScript, SSR/ISR |
| UI | Tailwind CSS v4 + shadcn/ui |
| Color variants | Pre-rendered per-color photos, cross-faded on swap (`src/components/variant-image.tsx`) |
| Design studio | Konva / react-konva (`src/components/studio/`) |
| State | Zustand (cart, persisted), TanStack Query (ready for API data) |
| Catalog | `src/data/products.json` via `src/lib/catalog.ts` (swap for Medusa Store API) |

## Image pipeline

Masks are prepared **once per photo, offline**, never in the shopper's browser:

```bash
# 1. put the photo at public/products/<slug>/photo.jpg and add the product to src/data/products.json
npm run prepare:product -- public/products/<slug>/photo.jpg   # -> mask.png + meta.json
npm run render:variants                                        # -> variants/<color>.webp for listings
```

- `mask.png`: R = top garment, G = logo/print (never recolored), B = trousers.
- `meta.json`: shading stats per part (median brightness, contrast, highlight peak, dark-fabric flag).
- Every page — listings, product pages, and the studio — shows the same **pre-rendered** variants (CDN-cacheable); switching color just swaps and cross-fades to a different variant image.

Today `prepare-product.mjs` runs SegFormer (clothes) with transformers.js on the CPU. In production it becomes the Python SAM 2 GPU worker (FastAPI + Modal/RunPod) writing the same two files to R2/S3.

## Next phases

1. **Medusa v2 backend** (Docker: Postgres + Redis): products, variants, price lists for bulk tiers, carts, orders. Replace `catalog.ts` and `cart-store.ts` internals with Store API calls.
2. **Payments**: Razorpay (+ Stripe) payment providers in Medusa; checkout page submits to the Medusa cart.
3. **Design saving + print files**: store the studio `design` JSON with the line item; render high-res print PNG/PDF server-side (node-canvas / Puppeteer) on order placement.
4. **GPU mask worker**: SAM 2 service triggered by product-image uploads (BullMQ queue), writing masks + variants to R2.
5. **Auth, email, search, monitoring**: Medusa auth or Clerk, Resend, Meilisearch, Sentry + PostHog, Crisp chat.
