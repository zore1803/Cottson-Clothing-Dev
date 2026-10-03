"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface ResourceProduct {
  name: string;
  image: string;
  spec: string;
}

const products: Record<string, ResourceProduct[]> = {
  shirts: [
    {
      name: "Classic Formal Shirt",
      image: "https://ik.imagekit.io/qiap0iq38/COTTSON/08_1.jpg",
      spec: "100% Giza Cotton · Wrinkle-Resistant",
    },
    {
      name: "Premium Oxford Shirt",
      image: "https://ik.imagekit.io/qiap0iq38/COTTSON/07_1.jpg",
      spec: "Executive Oxford Weave · Custom Collar",
    },
    {
      name: "Corporate Poplin Shirt",
      image: "https://ik.imagekit.io/qiap0iq38/COTTSON/08_1.jpg",
      spec: "Breathable Lightweight Poplin · All Day Comfort",
    },
    {
      name: "Tailored Executive Shirt",
      image: "https://ik.imagekit.io/qiap0iq38/COTTSON/07_1.jpg",
      spec: "Structured Fit · Premium Mother-of-Pearl Buttons",
    },
  ],

  tshirts: [
    {
      name: "Classic Crewneck Team Tee",
      image: "https://ik.imagekit.io/qiap0iq38/COTTSON/05_1.jpg",
      spec: "180 GSM Bio-Washed Combed Cotton",
    },
    {
      name: "Heavyweight Boxy Tee",
      image: "https://ik.imagekit.io/qiap0iq38/COTTSON/09_1.jpg",
      spec: "240 GSM Luxury Weight Cotton",
    },
    {
      name: "Everyday Corporate Tee",
      image: "https://ik.imagekit.io/qiap0iq38/COTTSON/05_1.jpg",
      spec: "Pre-Shrunk Ring-Spun Cotton",
    },
    {
      name: "Event & Exhibition Tee",
      image: "https://ik.imagekit.io/qiap0iq38/COTTSON/09_1.jpg",
      spec: "High-Density Screen Printing Friendly",
    },
  ],

  polos: [
    {
      name: "Classic Corporate Polo",
      image: "https://ik.imagekit.io/qiap0iq38/COTTSON/03_1.jpg",
      spec: "240 GSM Honeycomb Pique · Ribbed Collar",
    },
    {
      name: "Signature Pique Polo",
      image: "https://ik.imagekit.io/qiap0iq38/COTTSON/02_1.jpg",
      spec: "Mercerised Cotton Finish · Dual Contrast Tipping",
    },
    {
      name: "Executive Performance Polo",
      image: "https://ik.imagekit.io/qiap0iq38/COTTSON/03_1.jpg",
      spec: "Moisture-Wicking Blend · Anti-Pilling",
    },
    {
      name: "Everyday Team Polo",
      image: "https://ik.imagekit.io/qiap0iq38/COTTSON/02_1.jpg",
      spec: "Reinforced Placket · Custom Embroidered Logo",
    },
  ],

  jackets: [
    {
      name: "Corporate Bomber Jacket",
      image: "https://ik.imagekit.io/qiap0iq38/COTTSON/13_1.jpg",
      spec: "Water-Resistant Outer · Micro-Fleece Lined",
    },
    {
      name: "Lightweight Executive Windbreaker",
      image: "https://ik.imagekit.io/qiap0iq38/COTTSON/13_1.jpg",
      spec: "Breathable Shell · Storm Flap & Secure Pockets",
    },
    {
      name: "Team Pullover Hoodie",
      image: "https://ik.imagekit.io/qiap0iq38/COTTSON/12_1.jpg",
      spec: "380 GSM Heavy Cotton Fleece",
    },
    {
      name: "Full-Zip Corporate Fleece",
      image: "https://ik.imagekit.io/qiap0iq38/COTTSON/13_1.jpg",
      spec: "Thermal Retaining Fabric · Clean Minimalist Cut",
    },
  ],
};

const categories = [
  { id: "shirts", label: "Shirts" },
  { id: "tshirts", label: "T-Shirts" },
  { id: "polos", label: "Polos" },
  { id: "jackets", label: "Jackets" },
];

export function ProductsSwitch() {
  const [activeCategory, setActiveCategory] = useState("shirts");
  const activeProducts = products[activeCategory] || [];

  return (
    <section className="bg-white px-6 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-[1380px]">
        {/* Category Switcher */}
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-full border border-[#113858]/10 bg-white p-2 sm:mx-auto sm:w-fit">
          {categories.map((category) => {
            const isActive = activeCategory === category.id;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className={`
                  rounded-full
                  border
                  px-5 py-2.5
                  text-[12px]
                  font-semibold
                  transition-all duration-300
                  cursor-pointer
                  sm:px-7 sm:py-3
                  ${
                    isActive
                      ? "border-[#113858] bg-[#113858] text-white shadow-md shadow-[#113858]/20"
                      : "border-transparent bg-transparent text-[#607487] hover:text-[#113858] hover:bg-slate-100"
                  }
                `}
              >
                {category.label}
              </button>
            );
          })}
        </div>

        {/* Products Grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {activeProducts.map((product, index) => (
            <div
              key={`${activeCategory}-${index}`}
              className="
                group
                flex flex-col justify-between
                overflow-hidden
                rounded-[24px]
                border border-[#113858]/[0.08]
                bg-[#F8FAFC]
                p-3.5
                transition-all duration-300
                hover:-translate-y-1
                hover:border-[#113858]/25
                hover:shadow-[0_16px_40px_rgba(17,56,88,0.08)]
              "
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-white">
                <img
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  className="
                    h-full
                    w-full
                    object-cover
                    transition-transform duration-500
                    group-hover:scale-105
                  "
                />
              </div>

              <div className="flex flex-1 flex-col justify-between p-3.5 pt-4">
                <div>
                  <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-[#113858]">
                    {product.name}
                  </h3>
                  <p className="mt-1.5 text-[12px] leading-[1.6] text-[#607487]">
                    {product.spec}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-200/60 pt-3">
                  <Link
                    href="/products"
                    className="text-[12px] font-semibold text-[#113858] transition-colors hover:text-[#1d5b8c]"
                  >
                    View Specifications
                  </Link>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#113858] shadow-xs transition-colors group-hover:bg-[#113858] group-hover:text-white">
                    <ArrowUpRight size={13} strokeWidth={2.2} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ProductsSwitch;
