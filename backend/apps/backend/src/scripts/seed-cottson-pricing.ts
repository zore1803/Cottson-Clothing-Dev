// COTTSON pricing rules in Medusa, matching what the storefront shows.
//   npx medusa exec ./src/scripts/seed-cottson-pricing.ts
// Safe to re-run.
//  - Bulk tiers on every garment variant: 25–49 −10%, 50–99 −15%, 100+ −20% (per line quantity)
//  - "Logo customization" product: ₹299 per customized piece
//  - Shipping: ₹99, free when the item total is ₹1,999 or more

import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, ProductStatus } from "@medusajs/framework/utils";
import {
  createProductsWorkflow,
  updateProductVariantsWorkflow,
  updateShippingOptionsWorkflow,
} from "@medusajs/medusa/core-flows";

// Keep in sync with storefront/src/lib/pricing.ts
export const BULK_TIERS = [
  { min: 25, max: 49, discount: 0.1 },
  { min: 50, max: 99, discount: 0.15 },
  { min: 100, max: undefined, discount: 0.2 },
];
export const CUSTOMIZATION_FEE = 299;
export const SHIPPING_FEE = 99;
export const FREE_SHIPPING_FROM = 1999;

export default async function seedCottsonPricing({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  // ---------- Bulk tiers ----------
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "metadata", "variants.id", "variants.prices.amount", "variants.prices.currency_code", "variants.prices.min_quantity"],
  });
  const garments = products.filter((p: any) => p.metadata?.brand === "cottson" && p.handle !== "customization");
  const variantUpdates = garments.flatMap((p: any) =>
    p.variants.map((v: any) => {
      const base = v.prices.find((pr: any) => pr.currency_code === "inr" && !pr.min_quantity)?.amount;
      return {
        id: v.id,
        prices: [
          { amount: base, currency_code: "inr" },
          ...BULK_TIERS.map((t) => ({
            amount: Math.round(base * (1 - t.discount)),
            currency_code: "inr",
            min_quantity: t.min,
            ...(t.max ? { max_quantity: t.max } : {}),
          })),
        ],
      };
    })
  );
  await updateProductVariantsWorkflow(container).run({ input: { product_variants: variantUpdates } });
  logger.info(`Bulk price tiers set on ${variantUpdates.length} variants`);

  // ---------- Customization fee product ----------
  if (!products.some((p: any) => p.handle === "customization")) {
    const { data: [store] } = await query.graph({ entity: "store", fields: ["default_sales_channel_id"] });
    const { data: [profile] } = await query.graph({ entity: "shipping_profile", fields: ["id"] });
    await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: "Logo customization",
            handle: "customization",
            description: "Your logo or text printed or embroidered on the garment. Charged per customized piece.",
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: profile.id,
            metadata: { brand: "cottson", internal: true },
            options: [{ title: "Type", values: ["Print or embroidery"] }],
            sales_channels: [{ id: store.default_sales_channel_id }],
            variants: [
              {
                title: "Logo customization",
                sku: "COTTSON-CUSTOMIZATION",
                manage_inventory: false,
                options: { Type: "Print or embroidery" },
                prices: [{ amount: CUSTOMIZATION_FEE, currency_code: "inr" }],
              },
            ],
          },
        ],
      },
    });
    logger.info("Created the Logo customization product (₹299)");
  }

  // ---------- Free shipping threshold ----------
  const { data: options } = await query.graph({ entity: "shipping_option", fields: ["id", "name", "prices.*"] });
  const { data: regions } = await query.graph({ entity: "region", fields: ["id", "currency_code"] });
  const india = regions.find((r: any) => r.currency_code === "inr");
  const indiaOptions = options.filter((o: any) => o.prices?.some((p: any) => p.currency_code === "inr"));
  for (const o of indiaOptions) {
    await updateShippingOptionsWorkflow(container).run({
      input: [
        {
          id: o.id,
          prices: [
            { currency_code: "inr", amount: SHIPPING_FEE },
            { region_id: india.id, amount: SHIPPING_FEE },
            {
              currency_code: "inr",
              amount: 0,
              rules: [{ attribute: "item_total", operator: "gte", value: FREE_SHIPPING_FROM }],
            },
            {
              region_id: india.id,
              amount: 0,
              rules: [{ attribute: "item_total", operator: "gte", value: FREE_SHIPPING_FROM }],
            },
          ],
        },
      ],
    });
  }
  logger.info(`Free shipping from ₹${FREE_SHIPPING_FROM} set on ${indiaOptions.length} shipping option(s)`);
}
