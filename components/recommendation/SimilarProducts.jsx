"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { ProductCard } from "@/components/product/ProductCard";
import { trackRecommendationClick } from "./ProductViewTracker";

export function SimilarProducts({ productId, title = "Similar Pieces You'll Love", limit = 4 }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/recommendations/similar/${productId}?limit=${limit}`);
        if (!res.ok) throw new Error("Failed to load similar products");
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
  }, [productId, limit]);

  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 border-t border-gray-100 pt-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-700">
            <Sparkles className="h-3.5 w-3.5" />
            Content Match
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
            {title}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Selected based on matching metal, purity, and craftsmanship.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-4">
              <div className="aspect-square w-full rounded-xl bg-gray-200" />
              <div className="mt-4 h-4 w-3/4 rounded bg-gray-200" />
              <div className="mt-2 h-4 w-1/3 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <div
              key={product.id}
              onClick={() => trackRecommendationClick(product.id, "SIMILAR_ATTRIBUTES")}
              className="flex flex-col"
            >
              {product.reason && (
                <div className="mb-1.5 truncate text-[11px] font-medium text-primary-700 bg-primary-50 rounded px-2 py-0.5">
                  {product.reason}
                </div>
              )}
              <ProductCard
                product={product}
                className="h-full border border-gray-100 bg-white rounded-2xl shadow-soft"
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
