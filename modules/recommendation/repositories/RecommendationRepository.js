import { prisma } from "@/lib/prisma";

export default class RecommendationRepository {
  /**
   * Fetch all active, published, and in-stock products with rich features.
   */
  async getEligibleProducts() {
    return prisma.product.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        stockStatus: "IN_STOCK",
        stock: { gt: 0 },
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true, parentCategoryId: true },
        },
        brand: {
          select: { id: true, name: true, slug: true },
        },
        materials: {
          include: {
            material: { select: { id: true, name: true, code: true, type: true } },
            purity: { select: { id: true, name: true, code: true } },
          },
        },
        variants: {
          where: { status: "ACTIVE", deletedAt: null },
          include: {
            attributeValues: {
              include: {
                attributeValue: {
                  include: { attribute: true },
                },
              },
            },
          },
        },
        reviews: {
          where: { status: "APPROVED" },
          select: { rating: true, comment: true },
        },
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
      },
    });
  }

  /**
   * Fetch a single product with full relational details.
   */
  async getProductById(id) {
    return prisma.product.findFirst({
      where: {
        id: Number(id),
        status: "PUBLISHED",
        deletedAt: null,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true, parentCategoryId: true },
        },
        brand: {
          select: { id: true, name: true, slug: true },
        },
        materials: {
          include: {
            material: { select: { id: true, name: true, code: true, type: true } },
            purity: { select: { id: true, name: true, code: true } },
          },
        },
        variants: {
          where: { status: "ACTIVE", deletedAt: null },
          include: {
            attributeValues: {
              include: {
                attributeValue: {
                  include: { attribute: true },
                },
              },
            },
          },
        },
        reviews: {
          where: { status: "APPROVED" },
          select: { rating: true, comment: true },
        },
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
      },
    });
  }

  /**
   * Fetch user interaction history across both ProductInteraction and existing tables
   * (OrderItem, CartItem, WishlistItem, Review).
   */
  async getUserInteractions(userId, sessionId) {
    const numericUserId = userId ? Number(userId) : null;
    const interactionsMap = new Map();

    const addInteraction = (productId, weight, eventType, timestamp) => {
      if (!productId) return;
      const pid = Number(productId);
      const existing = interactionsMap.get(pid) || {
        productId: pid,
        totalWeight: 0,
        highestWeight: 0,
        eventCount: 0,
        lastEvent: eventType,
        lastTimestamp: timestamp || new Date(),
      };

      existing.totalWeight += weight;
      if (weight > existing.highestWeight) {
        existing.highestWeight = weight;
      }
      existing.eventCount += 1;
      if (timestamp && (!existing.lastTimestamp || timestamp > existing.lastTimestamp)) {
        existing.lastTimestamp = timestamp;
        existing.lastEvent = eventType;
      }
      interactionsMap.set(pid, existing);
    };

    // 1. Fetch from ProductInteraction table
    const whereConditions = [];
    if (numericUserId) {
      whereConditions.push({ userId: numericUserId });
    }
    if (sessionId) {
      whereConditions.push({ sessionId });
    }

    if (whereConditions.length > 0) {
      const dbInteractions = await prisma.productInteraction.findMany({
        where: { OR: whereConditions },
        orderBy: { createdAt: "desc" },
      });

      for (const interaction of dbInteractions) {
        addInteraction(
          interaction.productId,
          interaction.weight,
          interaction.eventType,
          interaction.createdAt
        );
      }
    }

    // 2. Fetch from existing OrderItems (Purchases = 5.0)
    if (numericUserId) {
      const orders = await prisma.order.findMany({
        where: { userId: numericUserId, status: { not: "CANCELLED" } },
        include: { items: { select: { productId: true } } },
      });

      for (const order of orders) {
        for (const item of order.items) {
          if (item.productId) {
            addInteraction(item.productId, 5.0, "PURCHASE", order.placedAt);
          }
        }
      }

      // 3. Fetch from existing CartItems (Cart = 4.0)
      const cart = await prisma.cart.findUnique({
        where: { userId: numericUserId },
        include: { items: { select: { productId: true } } },
      });

      if (cart && cart.items) {
        for (const item of cart.items) {
          if (item.productId) {
            addInteraction(item.productId, 4.0, "CART_ADD", new Date());
          }
        }
      }

      // 4. Fetch from existing WishlistItems (Wishlist = 3.0)
      const wishlist = await prisma.wishlist.findUnique({
        where: { userId: numericUserId },
        include: { items: { select: { productId: true, createdAt: true } } },
      });

      if (wishlist && wishlist.items) {
        for (const item of wishlist.items) {
          if (item.productId) {
            addInteraction(item.productId, 3.0, "WISHLIST_ADD", item.createdAt);
          }
        }
      }

      // 5. Fetch from Reviews (Rating = rating value, e.g. 1-5)
      const reviews = await prisma.review.findMany({
        where: { userId: numericUserId },
        select: { productId: true, rating: true, createdAt: true },
      });

      for (const rev of reviews) {
        if (rev.productId) {
          addInteraction(rev.productId, Number(rev.rating), "RATING", rev.createdAt);
        }
      }
    }

    // Format & apply logarithmic saturation capping to prevent score inflation
    const result = [];
    for (const item of interactionsMap.values()) {
      // Saturated weight: base is highest single action, plus logarithmic increment for repetitions, capped at 5.0
      const saturatedScore = Math.min(
        5.0,
        Math.max(item.highestWeight, item.highestWeight * (1 + 0.2 * Math.log(item.eventCount)))
      );
      result.push({
        ...item,
        score: saturatedScore,
      });
    }

    return result.sort((a, b) => b.score - a.score);
  }

  /**
   * Fetch complete User-Item interaction matrix for Collaborative Filtering.
   * Returns a Map<userId, Map<productId, score>>
   */
  async getAllUserInteractionMatrix() {
    const matrix = new Map(); // userId -> Map<productId, score>

    const setMatrixScore = (userId, productId, weight) => {
      const uId = Number(userId);
      const pId = Number(productId);
      if (!uId || !pId) return;

      if (!matrix.has(uId)) {
        matrix.set(uId, new Map());
      }
      const userMap = matrix.get(uId);
      const current = userMap.get(pId) || 0;
      // Combine with upper limit of 5.0
      userMap.set(pId, Math.min(5.0, Math.max(current, weight)));
    };

    // 1. From ProductInteraction table
    const interactions = await prisma.productInteraction.findMany({
      where: { userId: { not: null } },
      select: { userId: true, productId: true, weight: true },
    });
    for (const inter of interactions) {
      setMatrixScore(inter.userId, inter.productId, inter.weight);
    }

    // 2. From Orders (weight = 5.0)
    const orders = await prisma.order.findMany({
      where: { status: { not: "CANCELLED" } },
      select: { userId: true, items: { select: { productId: true } } },
    });
    for (const order of orders) {
      for (const item of order.items) {
        if (item.productId) {
          setMatrixScore(order.userId, item.productId, 5.0);
        }
      }
    }

    // 3. From Carts (weight = 4.0)
    const carts = await prisma.cart.findMany({
      select: { userId: true, items: { select: { productId: true } } },
    });
    for (const cart of carts) {
      for (const item of cart.items) {
        if (item.productId) {
          setMatrixScore(cart.userId, item.productId, 4.0);
        }
      }
    }

    // 4. From Wishlists (weight = 3.0)
    const wishlists = await prisma.wishlist.findMany({
      select: { userId: true, items: { select: { productId: true } } },
    });
    for (const wl of wishlists) {
      for (const item of wl.items) {
        if (item.productId) {
          setMatrixScore(wl.userId, item.productId, 3.0);
        }
      }
    }

    // 5. From Reviews (weight = rating)
    const reviews = await prisma.review.findMany({
      select: { userId: true, productId: true, rating: true },
    });
    for (const rev of reviews) {
      if (rev.productId) {
        setMatrixScore(rev.userId, rev.productId, Number(rev.rating));
      }
    }

    return matrix;
  }

  /**
   * Log an interaction event to ProductInteraction table.
   */
  async recordInteraction({ userId, sessionId, productId, eventType, weight, metadata }) {
    return prisma.productInteraction.create({
      data: {
        userId: userId ? Number(userId) : null,
        sessionId: sessionId || null,
        productId: Number(productId),
        eventType,
        weight: Number(weight),
        metadata: metadata || null,
      },
    });
  }

  /**
   * Check for duplicate recent views to avoid inflating interactions.
   */
  async findRecentInteraction(userId, sessionId, productId, eventType, windowMs = 600000) {
    const since = new Date(Date.now() - windowMs);
    const conditions = [];

    if (userId) {
      conditions.push({ userId: Number(userId) });
    }
    if (sessionId) {
      conditions.push({ sessionId });
    }

    if (conditions.length === 0) return null;

    return prisma.productInteraction.findFirst({
      where: {
        productId: Number(productId),
        eventType,
        createdAt: { gte: since },
        OR: conditions,
      },
    });
  }

  /**
   * Associate guest interactions with user ID upon login.
   */
  async mergeGuestInteractions(sessionId, userId) {
    if (!sessionId || !userId) return;

    return prisma.productInteraction.updateMany({
      where: { sessionId, userId: null },
      data: { userId: Number(userId) },
    });
  }

  /**
   * Get Bestsellers based on purchase frequency.
   */
  async getBestsellers(limit = 8) {
    const items = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        productId: { not: null },
        order: { status: { not: "CANCELLED" } },
      },
      _count: { productId: true },
      _sum: { quantity: true },
      orderBy: { _count: { productId: "desc" } },
      take: limit * 2,
    });

    const productIds = items.map((i) => i.productId).filter(Boolean);

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        status: "PUBLISHED",
        deletedAt: null,
        stockStatus: "IN_STOCK",
        stock: { gt: 0 },
      },
      include: {
        category: true,
        images: { take: 1 },
        reviews: { select: { rating: true } },
      },
    });

    // If less than requested limit, backfill with isBestSeller flag or featured
    if (products.length < limit) {
      const backfill = await prisma.product.findMany({
        where: {
          id: { notIn: products.map((p) => p.id) },
          status: "PUBLISHED",
          deletedAt: null,
          stockStatus: "IN_STOCK",
          stock: { gt: 0 },
          OR: [{ isBestSeller: true }, { isFeatured: true }],
        },
        take: limit - products.length,
        include: {
          category: true,
          images: { take: 1 },
          reviews: { select: { rating: true } },
        },
      });
      products.push(...backfill);
    }

    return products.slice(0, limit);
  }

  /**
   * Get Trending products based on recent views, carts, and wishlists.
   */
  async getTrending(limit = 8, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const interactions = await prisma.productInteraction.groupBy({
      by: ["productId"],
      where: {
        createdAt: { gte: since },
        eventType: { in: ["VIEW", "CART_ADD", "WISHLIST_ADD", "PURCHASE"] },
      },
      _sum: { weight: true },
      _count: { productId: true },
      orderBy: { _sum: { weight: "desc" } },
      take: limit * 2,
    });

    const productIds = interactions.map((i) => i.productId);

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        status: "PUBLISHED",
        deletedAt: null,
        stockStatus: "IN_STOCK",
        stock: { gt: 0 },
      },
      include: {
        category: true,
        images: { take: 1 },
        reviews: { select: { rating: true } },
      },
    });

    // Fall back to isTrending flag if interactions are sparse
    if (products.length < limit) {
      const backfill = await prisma.product.findMany({
        where: {
          id: { notIn: products.map((p) => p.id) },
          status: "PUBLISHED",
          deletedAt: null,
          stockStatus: "IN_STOCK",
          stock: { gt: 0 },
          isTrending: true,
        },
        take: limit - products.length,
        include: {
          category: true,
          images: { take: 1 },
          reviews: { select: { rating: true } },
        },
      });
      products.push(...backfill);
    }

    return products.slice(0, limit);
  }

  /**
   * Analytics queries.
   */
  async getAnalytics(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalInteractions,
      interactionsByType,
      recommendationClicks,
      topRecommendedInteractions,
      recentInteractionsByDay,
    ] = await Promise.all([
      prisma.productInteraction.count({ where: { createdAt: { gte: since } } }),
      prisma.productInteraction.groupBy({
        by: ["eventType"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
      prisma.productInteraction.count({
        where: { eventType: "RECOMMENDATION_CLICK", createdAt: { gte: since } },
      }),
      prisma.productInteraction.groupBy({
        by: ["productId"],
        where: {
          eventType: "RECOMMENDATION_CLICK",
          createdAt: { gte: since },
        },
        _count: { _all: true },
        orderBy: { _count: { productId: "desc" } },
        take: 5,
      }),
      prisma.productInteraction.findMany({
        where: { createdAt: { gte: since } },
        select: { eventType: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const productDetails = topRecommendedInteractions.length
      ? await prisma.product.findMany({
          where: { id: { in: topRecommendedInteractions.map((t) => t.productId) } },
          select: { id: true, name: true, slug: true, featuredImage: true },
        })
      : [];

    return {
      totalInteractions,
      interactionsByType,
      recommendationClicks,
      topRecommendedInteractions: topRecommendedInteractions.map((t) => {
        const prod = productDetails.find((p) => p.id === t.productId);
        return {
          productId: t.productId,
          clicks: t._count._all,
          name: prod?.name || "Product #" + t.productId,
          slug: prod?.slug || "",
          image: prod?.featuredImage || null,
        };
      }),
      recentInteractionsByDay,
    };
  }
}
