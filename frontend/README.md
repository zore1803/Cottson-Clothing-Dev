# COTTSON frontend

Custom-apparel frontend: catalog, product pages with pre-rendered garment color variants, a design studio for logos/text, cart and checkout.

## Run

```bash
npm install --legacy-peer-deps   # react-konva's peer range lags React 19.2
npm run dev                      # http://localhost:3000
```

## Superadmin product panel

Superadmins are Medusa admin users with the superadmin role. Sign in at `/login` with a
staff account; superadmins get extra **Staff & roles** and **Add products** screens
(`/superadmin/staff`, `/superadmin/products`) in the same console as `/admin`. Configure
`MONGODB_URI` for the catalogue.

To get the first superadmin, list their email in `SUPERADMIN_EMAILS` (comma separated, in
`frontend/.env.local`) and restart Next.js. Owners listed there are always superadmins and
can't be demoted or removed from the UI. Everyone else is promoted or demoted from the
Staff screen, where new staff accounts are created too.

The Add products screen creates products with an INR price, sizes, category, description, available
colours, a default colour, minimum quantity, production days and one photo URL for each
selected colour: either a link into the existing ImageKit library (`https://ik.imagekit.io/qiap0iq38/…`)
or a photo uploaded from the form, which is stored in Cloudinary.
Every selected colour requires its matching photo; the form previews each photo. Shop
cards and detail pages switch images with colour swatches. Added products use the same
detail component as existing products, with customization, size quantities and cart controls.
Custom colour, print on demand, express
and promotional flags feed the shop filters. Unique slugs cannot replace existing products.
Additions persist in MongoDB and appear immediately in `/products` and the studio selector.
Each addition is also created in Medusa (one variant per colour and size, so it can be stocked and
ordered); the superadmin products screen can sync products added before that existed. Photos should use the
same garment framing as existing products for accurate logo placement. The homepage
retains its existing collection for now.

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
