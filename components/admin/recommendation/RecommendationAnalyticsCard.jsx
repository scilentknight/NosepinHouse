"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Sparkles, TrendingUp, MousePointerClick, ShoppingCart, Percent } from "lucide-react";

export function RecommendationAnalyticsCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/admin/recommendations/analytics?days=30");
        if (!res.ok) throw new Error("Failed to load analytics");
        const json = await res.json();
        if (!cancelled && json.data) {
          setData(json.data);
        }
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-soft animate-pulse">
        <div className="h-5 w-48 rounded bg-gray-200 mb-4" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="h-16 rounded bg-gray-100" />
          <div className="h-16 rounded bg-gray-100" />
          <div className="h-16 rounded bg-gray-100" />
          <div className="h-16 rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, algorithmBalance, topEngagedProducts } = data;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-soft">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-600" />
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Hybrid Recommendation Engine Analytics
            </h2>
            <p className="text-xs text-gray-500">
              Real 30-day customer interaction & recommendation performance
            </p>
          </div>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
          Live Algorithm Active
        </span>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
            Total Interactions
          </div>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {summary.totalInteractions.toLocaleString()}
          </p>
          <p className="text-[10px] text-gray-400">Views, Carts, Orders, Reviews</p>
        </div>

        <div className="rounded-lg bg-gray-50 p-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MousePointerClick className="h-3.5 w-3.5 text-purple-600" />
            Recommendation Clicks
          </div>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {summary.recommendationClicks.toLocaleString()}
          </p>
          <p className="text-[10px] text-gray-400">From personalized carousels</p>
        </div>

        <div className="rounded-lg bg-gray-50 p-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Percent className="h-3.5 w-3.5 text-amber-600" />
            Click-Through Rate (CTR)
          </div>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {summary.clickThroughRate}%
          </p>
          <p className="text-[10px] text-gray-400">Clicks per 100 impressions</p>
        </div>

        <div className="rounded-lg bg-gray-50 p-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <ShoppingCart className="h-3.5 w-3.5 text-emerald-600" />
            Conversion Rate
          </div>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {summary.conversionRate}%
          </p>
          <p className="text-[10px] text-gray-400">Cart & purchase attribution</p>
        </div>
      </div>

      {/* Algorithm Weight Balance */}
      <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50/50 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-amber-900">Hybrid Formula Weight Balance</span>
          <span className="font-semibold text-amber-800">
            {algorithmBalance.contentBasedWeight}% CBF / {algorithmBalance.collaborativeWeight}% CF
          </span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-amber-200">
          <div
            className="h-full bg-gradient-to-r from-amber-600 to-amber-500"
            style={{ width: `${algorithmBalance.contentBasedWeight}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-amber-700">
          {algorithmBalance.description}
        </p>
      </div>

      {/* Top Engaged Recommended Products */}
      {topEngagedProducts && topEngagedProducts.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold text-gray-700 mb-2">
            Highest Engagement Recommended Pieces
          </h3>
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
            {topEngagedProducts.map((item) => (
              <div key={item.productId} className="flex items-center justify-between p-2.5 text-xs hover:bg-gray-50">
                <div className="flex items-center gap-2.5 min-w-0">
                  {item.image ? (
                    <div className="relative h-8 w-8 overflow-hidden rounded">
                      <Image src={item.image} alt="" fill sizes="32px" className="object-cover" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center text-[10px] text-gray-400">
                      NP
                    </div>
                  )}
                  <span className="truncate font-medium text-gray-800">
                    {item.name}
                  </span>
                </div>
                <span className="font-semibold text-primary-700 shrink-0 ml-2">
                  {item.clicks} clicks
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
