export default class DashboardService {
  constructor(dashboardRepository) {
    this.dashboardRepository = dashboardRepository;
  }

  _startOfLocalDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  _shiftDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  _dateKey(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  _money(value) {
    return Number(value ?? 0);
  }

  _summarise(orders) {
    const revenue = orders.reduce((sum, o) => sum + this._money(o.total), 0);
    return { revenue, orders: orders.length };
  }

  async getDashboardData(rangeDays) {
    const todayStart = this._startOfLocalDay();
    const tomorrow = this._shiftDays(todayStart, 1);
    const yesterdayStart = this._shiftDays(todayStart, -1);
    const rangeStart = this._shiftDays(todayStart, -(rangeDays - 1));
    const prevRangeStart = this._shiftDays(rangeStart, -rangeDays);

    const [
      lifetimeAgg, lifetimeOrderCount, customerCount, newCustomers,
      publishedProducts, draftProducts, statusGroups, paymentGroups,
      pendingReviews, returnRequested, processingOrders, recentOrders,
      rangeOrders, prevRangeOrders, todayOrders, yesterdayOrders,
      rangeItems, wishlistGroups, stockCandidates, codUnpaid,
    ] = await this.dashboardRepository.getStats({ rangeStart, prevRangeStart, todayStart, tomorrow, yesterdayStart });

    const byDay = new Map();
    for (let i = 0; i < rangeDays; i++) {
      byDay.set(this._dateKey(this._shiftDays(rangeStart, i)), { revenue: 0, orders: 0 });
    }
    for (const order of rangeOrders) {
      const key = this._dateKey(order.placedAt);
      const bucket = byDay.get(key);
      if (!bucket) continue;
      bucket.revenue += this._money(order.total);
      bucket.orders += 1;
    }

    const productMap = new Map();
    const categoryMap = new Map();
    for (const item of rangeItems) {
      const line = this._money(item.price) * item.quantity;
      const key = item.productId ?? item.name;
      const current = productMap.get(key) ?? {
        productId: item.productId,
        name: item.name,
        slug: item.product?.slug ?? null,
        image: item.product?.featuredImage || item.image || null,
        quantity: 0,
        revenue: 0,
      };
      current.quantity += item.quantity;
      current.revenue += line;
      productMap.set(key, current);

      const categoryName = item.product?.category?.name ?? "Uncategorised";
      const cat = categoryMap.get(categoryName) ?? { name: categoryName, revenue: 0, units: 0 };
      cat.revenue += line;
      cat.units += item.quantity;
      categoryMap.set(categoryName, cat);
    }

    const topProducts = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
    const categoryRevenue = Array.from(categoryMap.values()).sort((a, b) => b.revenue - a.revenue);

    const wishlistIds = wishlistGroups.map((g) => g.productId);
    const wishlistProducts = wishlistIds.length
      ? await this.dashboardRepository.findProductsByIds(wishlistIds)
      : [];
    const wishlistById = new Map(wishlistProducts.map((p) => [p.id, p]));
    const wishlistHeat = wishlistGroups.map((g) => {
      const product = wishlistById.get(g.productId);
      return {
        productId: g.productId,
        name: product?.name ?? "Removed piece",
        slug: product?.slug ?? null,
        image: product?.featuredImage ?? null,
        saves: g._count._all,
      };
    });

    const lowStock = stockCandidates
      .filter((p) => p.stockStatus === "OUT_OF_STOCK" || p.stock <= (p.lowStockAlert ?? 5))
      .slice(0, 8)
      .map((p) => ({
        id: p.id, name: p.name, sku: p.sku, slug: p.slug, stock: p.stock,
        alert: p.lowStockAlert ?? 5, image: p.featuredImage, out: p.stockStatus === "OUT_OF_STOCK" || p.stock <= 0,
      }));

    const statusCount = (key) => statusGroups.find((g) => g.status === key)?._count._all ?? 0;
    const today = this._summarise(todayOrders);
    const yesterday = this._summarise(yesterdayOrders);
    const range = this._summarise(rangeOrders);
    const previous = this._summarise(prevRangeOrders);
    const lifetimeRevenue = this._money(lifetimeAgg._sum.total);

    return {
      rangeDays,
      kpis: {
        todayRevenue: today.revenue, todayOrders: today.orders,
        yesterdayRevenue: yesterday.revenue, yesterdayOrders: yesterday.orders,
        rangeRevenue: range.revenue, rangeOrders: range.orders,
        rangeAov: range.orders ? range.revenue / range.orders : 0,
        prevRangeRevenue: previous.revenue, prevRangeOrders: previous.orders,
        lifetimeRevenue, lifetimeOrders: lifetimeOrderCount,
        lifetimeAov: lifetimeOrderCount ? lifetimeRevenue / lifetimeOrderCount : 0,
        customers: customerCount, newCustomers, publishedProducts, draftProducts,
      },
      work: {
        processing: statusCount("PROCESSING"), shipped: statusCount("SHIPPED"),
        delivered: statusCount("DELIVERED"), returned: statusCount("RETURNED"),
        cancelled: statusCount("CANCELLED"), codUnpaid, returnRequested,
        pendingReviews, lowStock: lowStock.length, outOfStock: lowStock.filter((p) => p.out).length,
      },
      revenueByDay: Array.from(byDay.entries()).map(([date, value]) => ({ date, revenue: value.revenue, orders: value.orders })),
      paymentMix: paymentGroups.map((g) => ({ method: g.paymentMethod, orders: g._count._all, revenue: this._money(g._sum.total) })),
      ordersByStatus: statusGroups.map((g) => ({ status: g.status, count: g._count._all })),
      categoryRevenue, topProducts, wishlistHeat, lowStock,
      packingQueue: processingOrders.map((o) => ({
        id: o.id, orderNumber: o.orderNumber, customer: o.fullName, total: this._money(o.total),
        paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus, placedAt: o.placedAt, itemCount: o._count.items,
      })),
      recentOrders: recentOrders.map((o) => ({
        id: o.id, orderNumber: o.orderNumber, customer: o.fullName, status: o.status,
        paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus, total: this._money(o.total),
        placedAt: o.placedAt, itemCount: o._count.items,
      })),
    };
  }
}
