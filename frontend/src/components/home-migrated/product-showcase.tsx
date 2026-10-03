"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowRight } from "lucide-react";

const CATEGORIES = ["ALL", "POLOS", "T-SHIRTS", "SHIRTS", "JACKETS", "HOODIES"] as const;

interface ProductItem {
  id: number;
  name: string;
  category: "POLOS" | "T-SHIRTS" | "SHIRTS" | "JACKETS" | "HOODIES";
  badge?: string;
  feature: string;
  image: string;
}

const products: ProductItem[] = [
  {
    id: 1,
    name: "Classic Corporate Polo",
    category: "POLOS",
    badge: "Popular Product",
    feature: "240 GSM Pique · MOQ 25 pcs",
    image: "https://ik.imagekit.io/qiap0iq38/COTTSON/03_1.jpg",
  },
  {
    id: 2,
    name: "Round Neck Team T-Shirt",
    category: "T-SHIRTS",
    badge: "Popular Product",
    feature: "100% Combed Cotton · MOQ 30 pcs",
    image: "https://ik.imagekit.io/qiap0iq38/COTTSON/05_1.jpg",
  },
  {
    id: 3,
    name: "Executive Oxford Shirt",
    category: "SHIRTS",
    badge: "Popular Product",
    feature: "Wrinkle-Resistant Cotton · MOQ 25 pcs",
    image: "https://ik.imagekit.io/qiap0iq38/COTTSON/08_1.jpg",
  },
  {
    id: 4,
    name: "Custom Corporate Jacket",
    category: "JACKETS",
    badge: "Popular Product",
    feature: "Micro-Fleece Lined · MOQ 20 pcs",
    image: "https://ik.imagekit.io/qiap0iq38/COTTSON/13_1.jpg",
  },
  {
    id: 5,
    name: "Signature Pique Polo",
    category: "POLOS",
    feature: "Breathable Cotton · MOQ 25 pcs",
    image: "https://ik.imagekit.io/qiap0iq38/COTTSON/02_1.jpg",
  },
  {
    id: 6,
    name: "Heavyweight Team Tee",
    category: "T-SHIRTS",
    feature: "240 GSM Luxury Feel · MOQ 30 pcs",
    image: "https://ik.imagekit.io/qiap0iq38/COTTSON/09_1.jpg",
  },
  {
    id: 7,
    name: "Tailored Formal Shirt",
    category: "SHIRTS",
    feature: "Giza Cotton Blend · MOQ 25 pcs",
    image: "https://ik.imagekit.io/qiap0iq38/COTTSON/07_1.jpg",
  },
  {
    id: 8,
    name: "Team Pullover Hoodie",
    category: "HOODIES",
    badge: "Popular Product",
    feature: "380 GSM Heavy Fleece · MOQ 20 pcs",
    image: "https://ik.imagekit.io/qiap0iq38/COTTSON/12_1.jpg",
  },
];

function getOptimizedProductImage(url: string, width = 500) {
  if (!url || typeof url !== "string") return url;
  if (url.includes("ik.imagekit.io") && !url.includes("tr=")) {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}tr=w-${width},q-80,f-auto`;
  }
  return url;
}

function ProductCard({ product }: { product: ProductItem }) {
  return (
    <Link
      href="/products"
      className="
        group relative flex flex-col justify-between
        overflow-hidden rounded-2xl
        border border-slate-200/90 bg-white
        p-2.5 sm:p-3.5
        transition-all duration-300
        hover:-translate-y-1 hover:border-[#113858]/30
        hover:shadow-xl hover:shadow-[#113858]/6
      "
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-[#F0F4F7]">
        <img
          src={getOptimizedProductImage(product.image, 500)}
          alt={product.name}
          loading="lazy"
          decoding="async"
          draggable="false"
          className="
            h-full w-full object-cover object-top
            transition-transform duration-500 ease-out
            group-hover:scale-105
          "
        />
      </div>

      <div className="flex flex-1 flex-col justify-between pt-3 pb-0.5 px-0.5 sm:px-1">
        <div>
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-[#607487]">
            {product.category}
          </p>

          <h3
            className="
              mt-1
              text-[13.5px] sm:text-[16px]
              font-bold leading-snug tracking-tight
              text-[#113858]
              transition-colors duration-200
              group-hover:text-[#1d5b8c]
            "
          >
            {product.name}
          </h3>

          <p className="mt-1 text-[11px] sm:text-[12px] text-[#607487] line-clamp-1">
            {product.feature}
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
          <span
            className="
              text-[11px] sm:text-[12px]
              font-semibold text-[#113858]
              transition-colors duration-200
              group-hover:text-[#1d5b8c]
            "
          >
            Inquire for Team
          </span>

          <div
            className="
              flex h-6 w-6 sm:h-7 sm:w-7
              items-center justify-center
              rounded-full bg-slate-100
              text-[#113858]
              transition-all duration-300
              group-hover:bg-[#113858] group-hover:text-white
              group-hover:translate-x-0.5
            "
          >
            <ArrowUpRight size={13} strokeWidth={2.2} />
          </div>
        </div>
      </div>
    </Link>
  );
}

export function ProductShowcase() {
  const [activeCategory, setActiveCategory] = useState<string>("ALL");

  const filteredProducts =
    activeCategory === "ALL"
      ? products
      : products.filter((p) => p.category === activeCategory);

  return (
    <section
      id="products"
      className="
        relative w-full
        border-y border-slate-100
        bg-[#F8FAFC]
        py-16 sm:py-20 lg:py-24
      "
    >
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[760px] text-center">
          <p className="text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.22em] text-[#607487]">
            OUR COLLECTION
          </p>

          <h2
            className="
              mt-3
              text-[30px] sm:text-[38px] md:text-[44px]
              font-bold leading-[1.12]
              tracking-[-0.025em] text-[#113858]
            "
          >
            Explore Our Collection
            <span className="block mt-1 text-[17px] sm:text-[22px] md:text-[25px] font-normal text-[#607487]">
              Corporate apparel made to represent your brand.
            </span>
          </h2>

          <p
            className="
              mx-auto mt-4 max-w-[620px]
              text-[13px] sm:text-[14px]
              leading-relaxed text-[#607487]
            "
          >
            From everyday team essentials to premium corporate wear, our products
            can be customized with your colours, logo and identity to create
            clothing your team is proud to wear.
          </p>
        </div>

        <div className="mt-8 sm:mt-10 flex justify-center">
          <div
            className="
              flex max-w-full items-center gap-1.5 sm:gap-2
              overflow-x-auto px-2 py-1.5
              scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
            "
          >
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`
                    shrink-0 rounded-full px-4 sm:px-5 py-2
                    text-[11px] sm:text-[12px] font-semibold tracking-[0.08em] uppercase
                    transition-all duration-200 cursor-pointer
                    ${
                      isActive
                        ? "bg-[#113858] !text-white text-white shadow-sm shadow-[#113858]/20"
                        : "bg-white text-[#607487] hover:text-[#113858] hover:bg-slate-100 border border-slate-200/90"
                    }
                  `}
                  style={isActive ? { color: "#ffffff" } : {}}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="
            mt-10 sm:mt-12
            grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4
            gap-3.5 sm:gap-5 lg:gap-6
          "
        >
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-12 sm:mt-14 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
          {activeCategory !== "ALL" && (
            <button
              type="button"
              onClick={() => setActiveCategory("ALL")}
              className="
                inline-flex h-[46px] items-center justify-center gap-2
                rounded-full border border-slate-300 bg-white px-6
                text-[12px] sm:text-[13px] font-semibold !text-[#113858] text-[#113858]
                transition-all duration-200 hover:bg-slate-50 hover:border-[#113858]/30
                cursor-pointer
              "
              style={{ color: "#113858" }}
            >
              View All Categories
            </button>
          )}

          <Link
            href="/studio"
            className="
              inline-flex h-[48px] items-center justify-center gap-2
              rounded-full bg-[#113858] px-7
              text-[13px] sm:text-[14px] font-semibold !text-white text-white
              shadow-sm shadow-[#113858]/20
              transition-all duration-300
              hover:-translate-y-0.5 hover:bg-[#0b243a] hover:!text-white hover:text-white hover:shadow-md
            "
            style={{ color: "#ffffff" }}
          >
            <span className="!text-white text-white" style={{ color: "#ffffff" }}>
              Customize the Clothes
            </span>
            <ArrowRight size={15} strokeWidth={2} className="!text-white text-white" style={{ color: "#ffffff" }} />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default ProductShowcase;
