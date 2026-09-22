import Link from "next/link";
import Image from "next/image";
import { type Product, assetUrl, formatPrice } from "@/lib/catalog";

/** Listing card: shows the original product photo. Color customization lives on the product page. */
export function ProductCard({ product }: { product: Product }) {
  return (
    <div className="group">
      <Link href={`/products/${product.slug}`} className="block overflow-hidden rounded-xl bg-muted">
        <Image
          src={assetUrl(product.slug, "photo.jpg")}
          alt={product.title}
          width={1080}
          height={1440}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="aspect-[3/4] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </Link>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <Link href={`/products/${product.slug}`} className="font-medium hover:underline">
            {product.title}
          </Link>
          <div className="text-sm text-muted-foreground">{product.category}</div>
        </div>
        <div className="font-medium">{formatPrice(product.price, product.currency)}</div>
      </div>
    </div>
  );
}
