"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ShoppingBag } from "lucide-react";
import { ProductImage } from "@/components/product/ProductImage";
import { formatPrice } from "@/lib/format";
import { trackRecommendationClick } from "./ProductViewTracker";

export function CartRecommendations({ limit = 3 }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/recommendations/bestsellers?limit=${limit}`);
        if (!res.ok) throw new Error("Failed to load");
        const json = await res.json();
        if (!cancelled && Array.isArray(json.data)) {
          setProducts(json.data);
        }
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  if (!loading && products.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[#e8ddd2] bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[#937902]" />
        <h3 className="text-sm font-semibold text-gray-900">
          Frequently Paired With Your Bag
        </h3>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="h-16 w-16 rounded-lg bg-gray-100" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 w-3/4 rounded bg-gray-100" />
                <div className="h-4 w-1/3 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.slug}`}
              onClick={() => trackRecommendationClick(product.id, "CART_RECOMMENDATION")}
              className="group flex items-center gap-3 rounded-xl border border-gray-100 p-2.5 transition-colors hover:bg-[#fbf6ee]"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                <ProductImage
                  src={product.featuredImage}
                  alt={product.name}
                  colorway={product.colorway}
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-xs font-semibold text-gray-900 group-hover:text-primary-700">
                  {product.name}
                </h4>
                <p className="mt-0.5 text-xs font-bold text-primary-700">
                  {formatPrice(product.price)}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-primary-50 p-2 text-primary-700 group-hover:bg-primary-100">
                <ShoppingBag className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
