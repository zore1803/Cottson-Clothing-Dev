// Storefront copy of COTTSON's pricing rules. Medusa is the source of truth and charges
// exactly this (backend/apps/backend/src/scripts/seed-cottson-pricing.ts); keep both in sync.

export const BULK_TIERS = [
  { min: 100, discount: 0.2 },
  { min: 50, discount: 0.15 },
  { min: 25, discount: 0.1 },
];
export const CUSTOMIZATION_FEE = 299;
export const SHIPPING_FEE = 99;
export const FREE_SHIPPING_FROM = 1999;

/** Discount for one cart line, based on that line's quantity (as Medusa's quantity-tier prices do) */
export const bulkDiscount = (qty: number) => BULK_TIERS.find((t) => qty >= t.min)?.discount ?? 0;

/** Garment price per piece after the bulk tier, rounded like Medusa's stored tier prices */
export const garmentUnitPrice = (basePrice: number, qty: number) => Math.round(basePrice * (1 - bulkDiscount(qty)));

/** Per-piece price of a cart line: garment (with bulk tier) + customization fee if it has a design */
export const lineUnitPrice = (basePrice: number, qty: number, customized: boolean) =>
  garmentUnitPrice(basePrice, qty) + (customized ? CUSTOMIZATION_FEE : 0);

export const shippingFor = (itemTotal: number) => (itemTotal === 0 || itemTotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE);
