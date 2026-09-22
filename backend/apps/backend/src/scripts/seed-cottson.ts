// Seeds COTTSON's catalog into Medusa.
//   npx medusa exec ./src/scripts/seed-cottson.ts
// Safe to re-run: existing COTTSON products are replaced, the India region is created once.
// Product data comes from the storefront's catalog file so both stay in sync.

import fs from "node:fs";
import path from "node:path";
import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils";
import {
  createProductCategoriesWorkflow,
  createProductOptionsWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createShippingOptionsWorkflow,
  createTaxRegionsWorkflow,
  deleteProductsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

type Catalog = {
  colors: { id: string; name: string; hex: string }[];
  products: {
    slug: string; title: string; category: string; description: string; price: number;
    sizes: string[]; originalColor: string; colors: string[]; pantsColors: string[]; minBulk: number;
  }[];
};

export default async function seedCottson({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const fulfillment = container.resolve(Modules.FULFILLMENT);

  const catalogPath = path.resolve(process.cwd(), "../../../storefront/src/data/products.json");
  const catalog: Catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  const colorName = (id: string) => catalog.colors.find((c) => c.id === id)!.name;

  // ---------- Store currency ----------
  const { data: [store] } = await query.graph({ entity: "store", fields: ["id", "supported_currencies.*", "default_sales_channel_id"] });
  if (!store.supported_currencies?.some((c: { currency_code: string }) => c.currency_code === "inr")) {
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          supported_currencies: [
            { currency_code: "inr", is_default: true },
            ...(store.supported_currencies ?? []).map((c: { currency_code: string }) => ({ currency_code: c.currency_code, is_default: false })),
          ],
        },
      },
    });
    logger.info("Added INR as the default currency");
  }

  // ---------- India region, tax, shipping ----------
  const { data: regions } = await query.graph({ entity: "region", fields: ["id", "name", "currency_code"] });
  let india = regions.find((r: { currency_code: string }) => r.currency_code === "inr");
  if (!india) {
    const { result } = await createRegionsWorkflow(container).run({
      input: { regions: [{ name: "India", currency_code: "inr", countries: ["in"], payment_providers: ["pp_system_default"] }] },
    });
    india = result[0];
    await createTaxRegionsWorkflow(container).run({ input: [{ country_code: "in", provider_id: "tp_system" }] });

    const { data: [profile] } = await query.graph({ entity: "shipping_profile", fields: ["id"] });
    const { data: sets } = await query.graph({ entity: "fulfillment_set", fields: ["id", "service_zones.*"] });
    const zone = await fulfillment.createServiceZones({
      name: "India",
      fulfillment_set_id: sets[0].id,
      geo_zones: [{ type: "country", country_code: "in" }],
    });
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Standard Delivery (7–10 days)",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: zone.id,
          shipping_profile_id: profile.id,
          type: { label: "Standard", description: "Delivered in 7–10 days", code: "in-standard" },
          prices: [{ region_id: india.id, amount: 99 }, { currency_code: "inr", amount: 99 }],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
      ],
    });
    logger.info("Created India region, tax region and shipping");
  }
  void link;

  // ---------- Remove demo + previous COTTSON products ----------
  const { data: existing } = await query.graph({ entity: "product", fields: ["id", "handle", "metadata"] });
  const toDelete = existing
    .filter((p: { handle: string; metadata?: Record<string, unknown> | null }) =>
      ["t-shirt", "sweatshirt", "sweatpants", "shorts"].includes(p.handle) || p.metadata?.brand === "cottson")
    .map((p: { id: string }) => p.id);
  if (toDelete.length) {
    await deleteProductsWorkflow(container).run({ input: { ids: toDelete } });
    logger.info(`Removed ${toDelete.length} demo/old products`);
  }

  // ---------- Categories ----------
  const { data: cats } = await query.graph({ entity: "product_category", fields: ["id", "name"] });
  const needed = [...new Set(catalog.products.map((p) => p.category))].filter((n) => !cats.some((c: { name: string }) => c.name === n));
  if (needed.length) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: { product_categories: needed.map((name) => ({ name, is_active: true })) },
    });
    cats.push(...result);
  }

  // ---------- Shared options (Garment Color / Garment Size) ----------
  const allColors = [...new Set(catalog.products.flatMap((p) => p.colors))].map(colorName);
  const allSizes = [...new Set(catalog.products.flatMap((p) => p.sizes))];
  const { data: opts } = await query.graph({ entity: "product_option", fields: ["id", "title", "values.value"] });
  let colorOpt = opts.find((o: { title: string }) => o.title === "Garment Color");
  let sizeOpt = opts.find((o: { title: string }) => o.title === "Garment Size");
  if (!colorOpt || !sizeOpt) {
    const { result } = await createProductOptionsWorkflow(container).run({
      input: {
        product_options: [
          ...(!colorOpt ? [{ title: "Garment Color", values: allColors }] : []),
          ...(!sizeOpt ? [{ title: "Garment Size", values: allSizes }] : []),
        ],
      },
    });
    colorOpt ??= result.find((o) => o.title === "Garment Color");
    sizeOpt ??= result.find((o) => o.title === "Garment Size");
  }

  // ---------- Products ----------
  const { data: [profile] } = await query.graph({ entity: "shipping_profile", fields: ["id"] });
  await createProductsWorkflow(container).run({
    input: {
      products: catalog.products.map((p) => ({
        title: p.title,
        handle: p.slug,
        description: p.description,
        status: ProductStatus.PUBLISHED,
        category_ids: [cats.find((c: { name: string }) => c.name === p.category)!.id],
        shipping_profile_id: profile.id,
        thumbnail: `http://localhost:3000/products/${p.slug}/photo.jpg`,
        images: [{ url: `http://localhost:3000/products/${p.slug}/photo.jpg` }],
        metadata: {
          brand: "cottson",
          original_color: p.originalColor,
          color_ids: p.colors,
          pants_color_ids: p.pantsColors,
          min_bulk: p.minBulk,
        },
        options: [{ id: colorOpt!.id }, { id: sizeOpt!.id }],
        sales_channels: [{ id: store.default_sales_channel_id }],
        variants: p.colors.flatMap((c) =>
          p.sizes.map((s) => ({
            title: `${colorName(c)} / ${s}`,
            sku: `${p.slug}-${c}-${s}`.toUpperCase(),
            manage_inventory: false, // made to order
            options: { "Garment Color": colorName(c), "Garment Size": s },
            metadata: { color_id: c },
            prices: [{ amount: p.price, currency_code: "inr" }],
          }))
        ),
      })),
    },
  });
  logger.info(`Created ${catalog.products.length} COTTSON products`);

  // ---------- Publishable key for the storefront ----------
  const { data: keys } = await query.graph({ entity: "api_key", fields: ["token", "type"] });
  const pk = keys.find((k: { type: string }) => k.type === "publishable");
  logger.info(`Region id: ${india!.id}`);
  logger.info(`Publishable key: ${pk?.token}`);
}
