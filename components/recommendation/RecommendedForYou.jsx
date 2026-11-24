"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { ProductCard } from "@/components/product/ProductCard";
import { getOrCreateSessionId, trackRecommendationClick } from "./ProductViewTracker";

export function RecommendedForYou({ title = "Recommended For You", subtitle = "Curated exclusively based on your style and customer favourites", limit = 8 }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const sid = getOrCreateSessionId();
        const res = await fetch(`/api/recommendations/personalized?limit=${limit}`, {
          headers: sid ? { "x-session-id": sid } : {},
        });
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

  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <section className="w-full bg-[#fbf6ee] py-14 sm:py-20 border-t border-[#e8ddd2]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-[#e8ddd2] pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.28em] text-[#937902]">
              <Sparkles className="h-3.5 w-3.5 text-[#937902]" />
              Personalized Curation
            </div>
            <h2 className="mt-2 font-serif text-3xl text-[#381c19] sm:text-4xl">
              {title}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-[#6f625d]">
              {subtitle}
            </p>
          </div>
          <Link
            href="/jewellery"
            className="shrink-0 text-xs font-medium uppercase tracking-[0.18em] text-[#783f35] underline-offset-4 hover:underline"
          >
            Explore Collection
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-[#e8ddd2] bg-white p-4">
                <div className="aspect-square w-full rounded-xl bg-gray-200" />
                <div className="mt-4 h-4 w-3/4 rounded bg-gray-200" />
                <div className="mt-2 h-4 w-1/2 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <div
                key={product.id}
                onClick={() => trackRecommendationClick(product.id, product.strategy)}
                className="relative flex flex-col"
              >
                {product.reason && (
                  <div className="mb-1.5 truncate text-[11px] font-medium text-[#783f35]/90 bg-[#783f35]/5 rounded px-2 py-0.5" title={product.reason}>
                    ✨ {product.reason}
                  </div>
                )}
                <ProductCard
                  product={product}
                  className="h-full border border-[#e8ddd2] bg-white rounded-xl shadow-soft transition-all duration-300 hover:shadow-md"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
