import AppError from "@/core/errors/AppError";
import { ensureUniqueSlug } from "@/lib/slug";
import { generateSku } from "@/lib/sku";
import { productSchema, productBulkActionSchema } from "@/schemas/admin-product";
import { calculateProductPrice } from "@/lib/jewellery/calculate-product-price";
import { calculateManualSellingPrice } from "@/lib/jewellery/manual-pricing";
import { variantLabel } from "@/lib/checkoutCore";
import { prisma } from "@/lib/prisma";

function decimalToNumber(value) {
  if (value === null || value === undefined) return null;
  return Number(value);
}

export function toProductDTO(product) {
  const avgRating = product.reviews?.length
    ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
    : 0;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    categoryId: product.categoryId,
    category: product.category
      ? {
          id: product.category.id,
          parentCategoryId: product.category.parentCategoryId,
          name: product.category.name,
          slug: product.category.slug,
          description: product.category.description,
          image: product.category.image,
          bannerImage: product.category.bannerImage,
          icon: product.category.icon,
          metaTitle: product.category.metaTitle,
          metaDescription: product.category.metaDescription,
          metaKeywords: product.category.metaKeywords,
          sortOrder: product.category.sortOrder,
          isFeatured: product.category.isFeatured,
          status: product.category.status,
          createdAt: product.category.createdAt,
          updatedAt: product.category.updatedAt,
          deletedAt: product.category.deletedAt,
        }
      : null,
    brandId: product.brandId,
    brand: product.brand
      ? {
          id: product.brand.id,
          name: product.brand.name,
          slug: product.brand.slug,
          logo: product.brand.logo,
        }
      : null,
    shortDescription: product.shortDescription,
    fullDescription: product.fullDescription,
    costPrice: decimalToNumber(product.costPrice),
    price: Number(product.price),
    compareAtPrice: decimalToNumber(product.compareAtPrice),
    grossPrice: decimalToNumber(product.compareAtPrice),
    pricingStrategy: product.pricingStrategy ?? "RATE_BASED",
    discountPercent: decimalToNumber(product.discountPercent),
    discountType: product.discountType,
    discountValue: decimalToNumber(product.discountValue),
    hasDiscount: product.hasDiscount,
    forCustomer: product.forCustomer,
    customerDiscountPercent: decimalToNumber(product.customerDiscountPercent),
    forDistributor: product.forDistributor,
    hasPointValue: product.hasPointValue,
    taxClass: product.taxClass,
    stock: product.stock,
    lowStockAlert: product.lowStockAlert,
    stockStatus: product.stockStatus,
    minimumOrderQuantity: product.minimumOrderQuantity,
    maximumOrderQuantity: product.maximumOrderQuantity,
    weight: decimalToNumber(product.weight),
    length: decimalToNumber(product.length),
    width: decimalToNumber(product.width),
    height: decimalToNumber(product.height),
    featuredImage: product.featuredImage,
    image: product.images?.[0]?.url ?? product.featuredImage,
    images: (product.images || []).map((image) => ({
      id: image.id,
      url: image.url,
      alt: image.alt,
      sortOrder: image.sortOrder,
    })),
    isFeatured: product.isFeatured,
    isBestSeller: product.isBestSeller,
    isNewArrival: product.isNewArrival,
    isOnSale: product.isOnSale,
    isTrending: product.isTrending,
    isSpecial: product.isSpecial,
    isWeekly: product.isWeekly,
    isFlash: product.isFlash,
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    metaKeywords: product.metaKeywords,
    warranty: product.warranty,
    tags: product.tags,
    colorway: product.colorway,
    status: product.status,
    publishedAt: product.publishedAt,
    labourCharge: Number(product.labourCharge ?? 0),
    makingCharge: Number(product.makingCharge ?? 0),
    otherCharge: Number(product.otherCharge ?? 0),
    markupType: product.markupType,
    markupValue: decimalToNumber(product.markupValue),
    pricingUpdatedAt: product.pricingUpdatedAt,
    materials: (product.materials || []).map((item) => ({
      id: item.id,
      material: item.material
        ? {
            id: item.material.id,
            name: item.material.name,
            code: item.material.code,
            type: item.material.type,
            unit: item.material.unit,
          }
        : null,
      purity: item.purity
        ? {
            id: item.purity.id,
            name: item.purity.name,
            code: item.purity.code,
            fineness: decimalToNumber(item.purity.fineness),
          }
        : null,
      quantity: Number(item.quantity),
      unit: item.unit,
      wastagePercent: decimalToNumber(item.wastagePercent),
      sortOrder: item.sortOrder,
    })),
    rating: Math.round(avgRating * 10) / 10,
    reviewCount: product.reviews?.length ?? 0,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export default class ProductService {
  constructor(productRepository) {
    this.productRepository = productRepository;
  }

  /**
   * Fetch customer products by IDs (e.g. for cart/wishlist sync)
   */
  async getProductsByIds(idList) {
    if (!idList || idList.length === 0) return [];
    const products = await this.productRepository.findByIds(idList);

    return products.map((product) => ({
      ...toProductDTO(product),
      variants: (product.variants || []).map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        price: variant.price !== null ? Number(variant.price) : null,
        compareAtPrice: variant.compareAtPrice !== null ? Number(variant.compareAtPrice) : null,
        costPrice: variant.costPrice !== null ? Number(variant.costPrice) : null,
        stock: variant.stockQuantity,
        lowStockAlert: variant.lowStockAlert,
        weight: variant.weight !== null ? Number(variant.weight) : null,
        image: variant.image,
        status: variant.status,
        label: variantLabel(variant),
        attributes: (variant.attributeValues || []).map((av) => ({
          id: av.attributeValue.id,
          value: av.attributeValue.value,
          slug: av.attributeValue.slug,
          colorHex: av.attributeValue.colorHex,
          attribute: {
            id: av.attributeValue.attribute.id,
            name: av.attributeValue.attribute.name,
            slug: av.attributeValue.attribute.slug,
            type: av.attributeValue.attribute.type,
          },
        })),
      })),
    }));
  }

  /**
   * Storefront product catalog listing
   */
  async getStorefrontProducts(searchParams) {
    const search = searchParams.get("search")?.trim();
    const category = searchParams.get("category");
    const brand = searchParams.get("brand");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const status = searchParams.get("status") || "PUBLISHED";
    const sort = searchParams.get("sort") ?? "featured";
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const requestedPageSize = Number(searchParams.get("pageSize") ?? 12);
    const pageSize = Math.min(48, Math.max(1, requestedPageSize));

    const where = {
      status,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { sku: { contains: search } },
            ],
          }
        : {}),
      ...(category ? { category: { slug: category } } : {}),
      ...(brand ? { brand: { slug: brand } } : {}),
      ...(minPrice || maxPrice
        ? {
            price: {
              ...(minPrice ? { gte: Number(minPrice) } : {}),
              ...(maxPrice ? { lte: Number(maxPrice) } : {}),
            },
          }
        : {}),
    };

    let orderBy;
    switch (sort) {
      case "price-asc":
        orderBy = { price: "asc" };
        break;
      case "price-desc":
        orderBy = { price: "desc" };
        break;
      case "newest":
        orderBy = { createdAt: "desc" };
        break;
      case "oldest":
        orderBy = { createdAt: "asc" };
        break;
      case "name-asc":
        orderBy = { name: "asc" };
        break;
      case "name-desc":
        orderBy = { name: "desc" };
        break;
      default:
        orderBy = [{ isFeatured: "desc" }, { createdAt: "desc" }];
        break;
    }

    const [products, total] = await Promise.all([
      this.productRepository.findPublishedProducts({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.productRepository.countPublishedProducts(where),
    ]);

    return {
      data: products.map((product) => toProductDTO(product)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Storefront product detail by slug
   */
  async getStorefrontProductBySlug(slug) {
    const product = await this.productRepository.findBySlug(slug);
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    const avgRating = product.reviews?.length
      ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
      : 0;

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      categoryId: product.categoryId,
      category: {
        ...product.category,
        image: product.category.image,
        bannerImage: product.category.bannerImage,
        icon: product.category.icon,
      },
      brandId: product.brandId,
      brand: product.brand
        ? {
            ...product.brand,
            logo: product.brand.logo,
          }
        : null,
      shortDescription: product.shortDescription,
      fullDescription: product.fullDescription,
      costPrice: decimalToNumber(product.costPrice),
      price: Number(product.price),
      compareAtPrice: decimalToNumber(product.compareAtPrice),
      grossPrice: decimalToNumber(product.compareAtPrice),
      pricingStrategy: product.pricingStrategy ?? "RATE_BASED",
      discountPercent: decimalToNumber(product.discountPercent),
      discountType: product.discountType,
      discountValue: decimalToNumber(product.discountValue),
      hasDiscount: product.hasDiscount,
      forCustomer: product.forCustomer,
      customerDiscountPercent: decimalToNumber(product.customerDiscountPercent),
      forDistributor: product.forDistributor,
      hasPointValue: product.hasPointValue,
      taxClass: product.taxClass,
      stock: product.stock,
      lowStockAlert: product.lowStockAlert,
      stockStatus: product.stockStatus,
      minimumOrderQuantity: product.minimumOrderQuantity,
      maximumOrderQuantity: product.maximumOrderQuantity,
      weight: decimalToNumber(product.weight),
      length: decimalToNumber(product.length),
      width: decimalToNumber(product.width),
      height: decimalToNumber(product.height),
      featuredImage: product.featuredImage,
      image: product.images[0]?.url ?? product.featuredImage,
      images: product.images.map((image) => ({
        id: image.id,
        url: image.url,
        alt: image.alt,
        sortOrder: image.sortOrder,
      })),
      isFeatured: product.isFeatured,
      isBestSeller: product.isBestSeller,
      isNewArrival: product.isNewArrival,
      isOnSale: product.isOnSale,
      isTrending: product.isTrending,
      isSpecial: product.isSpecial,
      isWeekly: product.isWeekly,
      isFlash: product.isFlash,
      metaTitle: product.metaTitle,
      metaDescription: product.metaDescription,
      metaKeywords: product.metaKeywords,
      warranty: product.warranty,
      tags: product.tags,
      colorway: product.colorway,
      status: product.status,
      publishedAt: product.publishedAt,
      labourCharge: Number(product.labourCharge ?? 0),
      makingCharge: Number(product.makingCharge ?? 0),
      otherCharge: Number(product.otherCharge ?? 0),
      markupType: product.markupType,
      markupValue: decimalToNumber(product.markupValue),
      pricingUpdatedAt: product.pricingUpdatedAt,
      materials: product.materials.map((item) => ({
        id: item.id,
        material: {
          id: item.material.id,
          name: item.material.name,
          code: item.material.code,
          type: item.material.type,
          unit: item.material.unit,
        },
        purity: item.purity
          ? {
              id: item.purity.id,
              name: item.purity.name,
              code: item.purity.code,
              fineness: decimalToNumber(item.purity.fineness),
            }
          : null,
        grossWeight: decimalToNumber(item.grossWeight),
        stoneMaterial: item.stoneMaterial
          ? {
              id: item.stoneMaterial.id,
              name: item.stoneMaterial.name,
              code: item.stoneMaterial.code,
              type: item.stoneMaterial.type,
              unit: item.stoneMaterial.unit,
            }
          : null,
        stoneWeight: decimalToNumber(item.stoneWeight),
        stoneGrossPrice: decimalToNumber(item.stoneGrossPrice),
        stoneDiscountPercent: decimalToNumber(item.stoneDiscountPercent),
        manualGrossPrice: decimalToNumber(item.manualGrossPrice),
        manualDiscountPercent: decimalToNumber(item.manualDiscountPercent),
        netWeight: decimalToNumber(item.netWeight),
        quantity: Number(item.quantity),
        unit: item.unit,
        wastagePercent: decimalToNumber(item.wastagePercent),
        sortOrder: item.sortOrder,
      })),
      variants: product.variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        price: variant.price !== null ? Number(variant.price) : null,
        compareAtPrice: variant.compareAtPrice !== null ? Number(variant.compareAtPrice) : null,
        costPrice: variant.costPrice !== null ? Number(variant.costPrice) : null,
        stock: variant.stockQuantity,
        lowStockAlert: variant.lowStockAlert,
        weight: variant.weight !== null ? Number(variant.weight) : null,
        image: variant.image,
        status: variant.status,
        label: variantLabel(variant),
        attributes: variant.attributeValues.map((av) => ({
          id: av.attributeValue.id,
          value: av.attributeValue.value,
          slug: av.attributeValue.slug,
          colorHex: av.attributeValue.colorHex,
          attribute: {
            id: av.attributeValue.attribute.id,
            name: av.attributeValue.attribute.name,
            slug: av.attributeValue.attribute.slug,
            type: av.attributeValue.attribute.type,
          },
        })),
      })),
      reviews: product.reviews.map((review) => ({
        id: review.id,
        userName: review.user?.name ?? "Customer",
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        createdAt: review.createdAt,
      })),
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: product.reviews.length,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  /**
   * Admin product list with pagination and search
   */
  async getAdminProducts(searchParams) {
    const search = searchParams.get("search")?.trim();
    const categoryIdParam = searchParams.get("categoryId");
    const brandIdParam = searchParams.get("brandId");
    const categoryId = categoryIdParam && !Number.isNaN(Number(categoryIdParam)) ? Number(categoryIdParam) : undefined;
    const brandId = brandIdParam && !Number.isNaN(Number(brandIdParam)) ? Number(brandIdParam) : undefined;
    const status = searchParams.get("status");
    const stockStatus = searchParams.get("stockStatus");
    const featured = searchParams.get("featured");
    const trashed = searchParams.get("trashed") === "true";

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
    const skip = (page - 1) * pageSize;

    const where = {
      deletedAt: trashed ? { not: null } : null,
      ...(categoryId ? { categoryId } : {}),
      ...(brandId ? { brandId } : {}),
      ...(status ? { status } : {}),
      ...(stockStatus ? { stockStatus } : {}),
      ...(featured === "true" ? { isFeatured: true } : {}),
      ...(search ? { OR: [{ name: { contains: search } }, { sku: { contains: search } }] } : {}),
    };

    const [products, total] = await Promise.all([
      this.productRepository.findAdminProducts({ where, skip, take: pageSize }),
      this.productRepository.countAdminProducts(where),
    ]);

    const data = products.map((p) => ({
      ...p,
      price: Number(p.price),
      costPrice: p.costPrice ? Number(p.costPrice) : null,
      compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
      grossPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
      pricingStrategy: p.pricingStrategy,
      discountPercent: p.discountPercent,
      labourCharge: Number(p.labourCharge),
      makingCharge: Number(p.makingCharge),
      otherCharge: Number(p.otherCharge),
      markupValue: p.markupValue ? Number(p.markupValue) : null,
    }));

    return { products: data, total, page, pageSize };
  }

  /**
   * Admin product detail by ID
   */
  async getAdminProductById(id) {
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      throw new AppError("Invalid product id", 400);
    }

    const product = await this.productRepository.findByIdWithAdminDetails(numId);
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    return {
      ...product,
      price: Number(product.price),
      costPrice: product.costPrice ? Number(product.costPrice) : null,
      compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
      grossPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
      pricingStrategy: product.pricingStrategy,
      discountPercent: product.discountPercent,
      discountValue: product.discountValue ? Number(product.discountValue) : null,
      weight: product.weight ? Number(product.weight) : null,
      length: product.length ? Number(product.length) : null,
      width: product.width ? Number(product.width) : null,
      height: product.height ? Number(product.height) : null,
      labourCharge: String(product.labourCharge ?? 0),
      makingCharge: String(product.makingCharge ?? 0),
      otherCharge: String(product.otherCharge ?? 0),
      markupType: product.markupType ?? "",
      markupValue: product.markupValue ? String(product.markupValue) : "",
      materials: product.materials.map((m) => ({
        id: m.id,
        materialId: m.materialId,
        purityId: m.purityId ?? "",
        grossWeight: m.grossWeight !== null && m.grossWeight !== undefined ? String(m.grossWeight) : "",
        stoneMaterialId: m.stoneMaterialId ?? "",
        stoneWeight: m.stoneWeight !== null && m.stoneWeight !== undefined ? String(m.stoneWeight) : "",
        stoneGrossPrice: m.stoneGrossPrice !== null && m.stoneGrossPrice !== undefined ? String(m.stoneGrossPrice) : "",
        stoneDiscountPercent: m.stoneDiscountPercent !== null && m.stoneDiscountPercent !== undefined ? String(m.stoneDiscountPercent) : "40",
        manualGrossPrice: m.manualGrossPrice !== null && m.manualGrossPrice !== undefined ? String(m.manualGrossPrice) : "",
        manualDiscountPercent: m.manualDiscountPercent !== null && m.manualDiscountPercent !== undefined ? String(m.manualDiscountPercent) : "40",
        netWeight: m.netWeight !== null && m.netWeight !== undefined ? String(m.netWeight) : "",
        quantity: String(m.quantity),
        unit: m.unit,
        wastagePercent: m.wastagePercent !== null && m.wastagePercent !== undefined ? String(m.wastagePercent) : "0",
        sortOrder: m.sortOrder,
      })),
      relatedIds: product.relationsFrom.filter((r) => r.type === "RELATED").map((r) => r.relatedId),
      crossSellIds: product.relationsFrom.filter((r) => r.type === "CROSS_SELL").map((r) => r.relatedId),
      upSellIds: product.relationsFrom.filter((r) => r.type === "UP_SELL").map((r) => r.relatedId),
    };
  }

  /**
   * Calculate jewellery pricing breakdown for quote/form
   */
  async calculateJewelleryPricing(payload) {
    const {
      materials = [],
      labourCharge = 0,
      makingCharge = 0,
      otherCharge = 0,
      markupType = "",
      markupValue = 0,
    } = payload;

    const emptyResult = {
      materialCost: 0,
      labourCharge: Number(labourCharge || 0),
      makingCharge: Number(makingCharge || 0),
      otherCharge: Number(otherCharge || 0),
      subtotal: Number(labourCharge || 0) + Number(makingCharge || 0) + Number(otherCharge || 0),
      markupType,
      markupValue: Number(markupValue || 0),
      markupAmount: 0,
      sellingPrice: Number(labourCharge || 0) + Number(makingCharge || 0) + Number(otherCharge || 0),
      materialBreakdown: [],
    };

    if (!Array.isArray(materials) || materials.length === 0) {
      return emptyResult;
    }

    const validMaterials = materials.filter((item) => typeof item.materialId === "string" && item.materialId.trim() !== "");
    if (validMaterials.length === 0) {
      return emptyResult;
    }

    const parsedMaterials = validMaterials.map((item) => ({
      id: item.id,
      materialId: String(item.materialId).trim(),
      purityId: item.purityId && String(item.purityId).trim() !== "" ? String(item.purityId).trim() : null,
      grossWeight: item.grossWeight !== null && item.grossWeight !== undefined && item.grossWeight !== "" ? Number(item.grossWeight) : null,
      stoneMaterialId: item.stoneMaterialId && String(item.stoneMaterialId).trim() !== "" ? String(item.stoneMaterialId).trim() : null,
      stoneWeight: item.stoneWeight !== null && item.stoneWeight !== undefined && item.stoneWeight !== "" ? Number(item.stoneWeight) : null,
      stoneGrossPrice: item.stoneGrossPrice !== null && item.stoneGrossPrice !== undefined && item.stoneGrossPrice !== "" ? Number(item.stoneGrossPrice) : null,
      stoneDiscountPercent: item.stoneDiscountPercent !== null && item.stoneDiscountPercent !== undefined && item.stoneDiscountPercent !== "" ? Number(item.stoneDiscountPercent) : null,
      manualGrossPrice: item.manualGrossPrice !== null && item.manualGrossPrice !== undefined && item.manualGrossPrice !== "" ? Number(item.manualGrossPrice) : null,
      manualDiscountPercent: item.manualDiscountPercent !== null && item.manualDiscountPercent !== undefined && item.manualDiscountPercent !== "" ? Number(item.manualDiscountPercent) : null,
      netWeight: item.netWeight !== null && item.netWeight !== undefined && item.netWeight !== "" ? Number(item.netWeight) : null,
      quantity: Number(item.quantity || 0),
      unit: item.unit,
      wastagePercent: item.wastagePercent !== null && item.wastagePercent !== undefined && item.wastagePercent !== "" ? Number(item.wastagePercent) : 0,
    }));

    return calculateProductPrice(
      parsedMaterials,
      Number(labourCharge || 0),
      Number(makingCharge || 0),
      Number(otherCharge || 0),
      markupType,
      Number(markupValue || 0)
    );
  }

  /**
   * Create product with validation and business pricing calculations
   */
  async createProduct(body) {
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    const data = parsed.data;
    const slug = await ensureUniqueSlug(prisma.product, data.slug || data.name);
    const sku = data.sku?.trim() || generateSku(data.name);

    let finalPrice = data.price ?? 0;
    let finalCostPrice = data.costPrice ?? null;
    let finalCompareAtPrice = data.compareAtPrice ?? null;
    let finalDiscountType = data.discountType ?? null;
    let finalDiscountValue = data.discountValue ?? null;
    let finalDiscountPercent = null;
    let finalHasDiscount = data.hasDiscount ?? false;
    let finalIsOnSale = data.isOnSale ?? false;
    let pricingUpdatedAt = null;

    if (data.pricingStrategy === "MANUAL_DISCOUNT") {
      const grossPrice = Number(data.grossPrice ?? data.compareAtPrice);
      const discountPercent = Number(data.discountPercent ?? 40);
      const calc = calculateManualSellingPrice(grossPrice, discountPercent);
      finalPrice = calc.sellingPrice;
      finalCompareAtPrice = calc.grossPrice;
      finalCostPrice = calc.grossPrice;
      finalDiscountPercent = discountPercent;
      finalDiscountType = "PERCENTAGE";
      finalDiscountValue = discountPercent;
      finalHasDiscount = true;
      finalIsOnSale = true;
      pricingUpdatedAt = new Date();
    } else if (data.materials && data.materials.length > 0) {
      const jewelleryPricing = await calculateProductPrice(
        data.materials.map((m) => ({
          materialId: m.materialId,
          purityId: m.purityId,
          grossWeight: m.grossWeight,
          stoneMaterialId: m.stoneMaterialId,
          stoneWeight: m.stoneWeight,
          stoneGrossPrice: m.stoneGrossPrice,
          stoneDiscountPercent: m.stoneDiscountPercent,
          manualGrossPrice: m.manualGrossPrice,
          manualDiscountPercent: m.manualDiscountPercent,
          netWeight: m.netWeight,
          quantity: m.quantity,
          unit: m.unit,
          wastagePercent: m.wastagePercent ?? 0,
        })),
        data.labourCharge ?? 0,
        data.makingCharge ?? 0,
        data.otherCharge ?? 0,
        data.markupType ?? "",
        data.markupValue ?? 0
      );

      finalPrice = jewelleryPricing.sellingPrice;
      finalCostPrice = jewelleryPricing.subtotal;

      if (jewelleryPricing.compareAtPrice) {
        finalCompareAtPrice = jewelleryPricing.compareAtPrice;
        finalHasDiscount = true;
        finalIsOnSale = true;
        finalDiscountPercent = jewelleryPricing.discountPercent;
      } else if (data.compareAtPrice && Number(data.compareAtPrice) > finalPrice) {
        finalCompareAtPrice = Number(data.compareAtPrice);
        finalHasDiscount = true;
        finalIsOnSale = true;
        finalDiscountPercent = Math.round(
          ((finalCompareAtPrice - finalPrice) / finalCompareAtPrice) * 100
        );
      }
      pricingUpdatedAt = new Date();
    }

    const productData = {
      name: data.name,
      slug,
      sku,
      categoryId: data.categoryId,
      brandId: data.brandId || null,
      shortDescription: data.shortDescription || null,
      fullDescription: data.fullDescription,
      pricingStrategy: data.pricingStrategy,
      discountPercent: finalDiscountPercent,
      costPrice: finalCostPrice,
      price: finalPrice,
      compareAtPrice: finalCompareAtPrice,
      discountType: finalDiscountType,
      discountValue: finalDiscountValue,
      hasDiscount: finalHasDiscount,
      taxClass: data.taxClass || null,
      stock: data.stock,
      lowStockAlert: data.lowStockAlert ?? null,
      stockStatus: data.stockStatus,
      minimumOrderQuantity: data.minimumOrderQuantity,
      maximumOrderQuantity: data.maximumOrderQuantity ?? null,
      weight: data.weight ?? null,
      length: data.length ?? null,
      width: data.width ?? null,
      height: data.height ?? null,
      featuredImage: data.featuredImage || data.images[0]?.url || null,
      isFeatured: data.isFeatured,
      isBestSeller: data.isBestSeller,
      isNewArrival: data.isNewArrival,
      isOnSale: finalIsOnSale,
      isTrending: data.isTrending,
      isSpecial: data.isSpecial,
      isWeekly: data.isWeekly,
      isFlash: data.isFlash,
      metaTitle: data.metaTitle || null,
      metaDescription: data.metaDescription || null,
      metaKeywords: data.metaKeywords || null,
      warranty: data.warranty || null,
      tags: data.tags,
      colorway: data.colorway,
      status: data.status,
      publishedAt: data.status === "PUBLISHED" ? new Date() : null,
      labourCharge: data.labourCharge ?? 0,
      makingCharge: data.makingCharge ?? 0,
      otherCharge: data.otherCharge ?? 0,
      markupType: data.markupType ?? null,
      markupValue: data.markupValue ?? null,
      pricingUpdatedAt,
    };

    const materialsData = data.materials.map((m, i) => ({
      materialId: m.materialId,
      purityId: m.purityId && m.purityId.trim() !== "" ? m.purityId : null,
      grossWeight: m.grossWeight !== null && m.grossWeight !== undefined ? m.grossWeight : null,
      stoneMaterialId: m.stoneMaterialId && m.stoneMaterialId.trim() !== "" ? m.stoneMaterialId : null,
      stoneWeight: m.stoneWeight !== null && m.stoneWeight !== undefined ? m.stoneWeight : null,
      stoneGrossPrice: m.stoneGrossPrice !== null && m.stoneGrossPrice !== undefined ? m.stoneGrossPrice : null,
      stoneDiscountPercent: m.stoneDiscountPercent !== null && m.stoneDiscountPercent !== undefined ? m.stoneDiscountPercent : null,
      manualGrossPrice: m.manualGrossPrice !== null && m.manualGrossPrice !== undefined ? m.manualGrossPrice : null,
      manualDiscountPercent: m.manualDiscountPercent !== null && m.manualDiscountPercent !== undefined ? m.manualDiscountPercent : null,
      netWeight: m.netWeight !== null && m.netWeight !== undefined ? m.netWeight : null,
      quantity: m.quantity,
      unit: m.unit,
      wastagePercent: m.wastagePercent ?? 0,
      sortOrder: m.sortOrder ?? i,
    }));

    const imagesData = data.images.map((img, i) => ({
      url: img.url,
      alt: img.alt,
      sortOrder: img.sortOrder ?? i,
    }));

    const relationsData = {
      relatedIds: data.relatedIds || [],
      crossSellIds: data.crossSellIds || [],
      upSellIds: data.upSellIds || [],
    };

    return this.productRepository.createWithDetails({
      productData,
      materialsData,
      imagesData,
      relationsData,
    });
  }

  /**
   * Update product with validation and business pricing calculations
   */
  async updateProduct(id, body) {
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      throw new AppError("Invalid product id", 400);
    }

    const existing = await this.productRepository.findById(numId);
    if (!existing) {
      throw new AppError("Product not found", 404);
    }

    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    const data = parsed.data;
    const desiredSlug = data.slug?.trim() || data.name;
    const slug = desiredSlug === existing.slug ? existing.slug : await ensureUniqueSlug(prisma.product, desiredSlug, numId);
    const sku = data.sku?.trim() || existing.sku;

    const wasPublished = existing.status === "PUBLISHED";
    const isPublished = data.status === "PUBLISHED";

    let finalPrice = data.price ?? Number(existing.price);
    let finalCostPrice = data.costPrice ?? (existing.costPrice ? Number(existing.costPrice) : null);
    let finalCompareAtPrice = data.compareAtPrice ?? existing.compareAtPrice;
    let finalDiscountType = data.discountType ?? existing.discountType;
    let finalDiscountValue = data.discountValue ?? existing.discountValue;
    let finalDiscountPercent = data.discountPercent ?? existing.discountPercent;
    let finalHasDiscount = data.hasDiscount ?? existing.hasDiscount;
    let finalIsOnSale = data.isOnSale ?? existing.isOnSale;
    let pricingUpdatedAt = existing.pricingUpdatedAt;

    if (data.pricingStrategy === "MANUAL_DISCOUNT") {
      const grossPrice = Number(data.grossPrice ?? data.compareAtPrice ?? existing.compareAtPrice);
      const discountPercent = Number(data.discountPercent ?? existing.discountPercent ?? 40);
      const calc = calculateManualSellingPrice(grossPrice, discountPercent);
      finalPrice = calc.sellingPrice;
      finalCompareAtPrice = calc.grossPrice;
      finalCostPrice = calc.grossPrice;
      finalDiscountPercent = discountPercent;
      finalDiscountType = "PERCENTAGE";
      finalDiscountValue = discountPercent;
      finalHasDiscount = true;
      finalIsOnSale = true;
      pricingUpdatedAt = new Date();
    } else if (data.pricingStrategy === "RATE_BASED" && data.materials && data.materials.length > 0) {
      const jewelleryPricing = await calculateProductPrice(
        data.materials.map((m) => ({
          materialId: m.materialId,
          purityId: m.purityId,
          grossWeight: m.grossWeight,
          stoneMaterialId: m.stoneMaterialId,
          stoneWeight: m.stoneWeight,
          stoneGrossPrice: m.stoneGrossPrice,
          stoneDiscountPercent: m.stoneDiscountPercent,
          manualGrossPrice: m.manualGrossPrice,
          manualDiscountPercent: m.manualDiscountPercent,
          netWeight: m.netWeight,
          quantity: m.quantity,
          unit: m.unit,
          wastagePercent: m.wastagePercent ?? 0,
        })),
        data.labourCharge ?? 0,
        data.makingCharge ?? 0,
        data.otherCharge ?? 0,
        data.markupType ?? "",
        data.markupValue ?? 0
      );

      finalPrice = jewelleryPricing.sellingPrice;
      finalCostPrice = jewelleryPricing.subtotal;

      if (jewelleryPricing.compareAtPrice) {
        finalCompareAtPrice = jewelleryPricing.compareAtPrice;
        finalHasDiscount = true;
        finalIsOnSale = true;
        finalDiscountPercent = jewelleryPricing.discountPercent;
      } else if (data.compareAtPrice && Number(data.compareAtPrice) > finalPrice) {
        finalCompareAtPrice = Number(data.compareAtPrice);
        finalHasDiscount = true;
        finalIsOnSale = true;
        finalDiscountPercent = Math.round(
          ((finalCompareAtPrice - finalPrice) / finalCompareAtPrice) * 100
        );
      } else {
        finalCompareAtPrice = null;
        finalHasDiscount = false;
        finalIsOnSale = false;
        finalDiscountPercent = null;
      }
      pricingUpdatedAt = new Date();
    }

    const productData = {
      name: data.name,
      slug,
      sku,
      categoryId: data.categoryId,
      brandId: data.brandId || null,
      shortDescription: data.shortDescription || null,
      fullDescription: data.fullDescription,
      pricingStrategy: data.pricingStrategy,
      discountPercent: finalDiscountPercent,
      costPrice: finalCostPrice,
      price: finalPrice,
      compareAtPrice: finalCompareAtPrice,
      discountType: finalDiscountType,
      discountValue: finalDiscountValue,
      hasDiscount: finalHasDiscount,
      taxClass: data.taxClass || null,
      stock: data.stock,
      lowStockAlert: data.lowStockAlert ?? null,
      stockStatus: data.stockStatus,
      minimumOrderQuantity: data.minimumOrderQuantity,
      maximumOrderQuantity: data.maximumOrderQuantity ?? null,
      weight: data.weight ?? null,
      length: data.length ?? null,
      width: data.width ?? null,
      height: data.height ?? null,
      featuredImage: data.featuredImage || data.images[0]?.url || null,
      isFeatured: data.isFeatured,
      isBestSeller: data.isBestSeller,
      isNewArrival: data.isNewArrival,
      isOnSale: finalIsOnSale,
      isTrending: data.isTrending,
      isSpecial: data.isSpecial,
      isWeekly: data.isWeekly,
      isFlash: data.isFlash,
      metaTitle: data.metaTitle || null,
      metaDescription: data.metaDescription || null,
      metaKeywords: data.metaKeywords || null,
      warranty: data.warranty || null,
      tags: data.tags,
      colorway: data.colorway,
      status: data.status,
      publishedAt: !wasPublished && isPublished ? new Date() : existing.publishedAt,
      labourCharge: data.labourCharge ?? 0,
      makingCharge: data.makingCharge ?? 0,
      otherCharge: data.otherCharge ?? 0,
      markupType: data.markupType ?? null,
      markupValue: data.markupValue ?? null,
      pricingUpdatedAt,
    };

    const materialsData = data.materials.map((m, i) => ({
      materialId: m.materialId,
      purityId: m.purityId && m.purityId.trim() !== "" ? m.purityId : null,
      grossWeight: m.grossWeight !== null && m.grossWeight !== undefined ? m.grossWeight : null,
      stoneMaterialId: m.stoneMaterialId && m.stoneMaterialId.trim() !== "" ? m.stoneMaterialId : null,
      stoneWeight: m.stoneWeight !== null && m.stoneWeight !== undefined ? m.stoneWeight : null,
      stoneGrossPrice: m.stoneGrossPrice !== null && m.stoneGrossPrice !== undefined ? m.stoneGrossPrice : null,
      stoneDiscountPercent: m.stoneDiscountPercent !== null && m.stoneDiscountPercent !== undefined ? m.stoneDiscountPercent : null,
      manualGrossPrice: m.manualGrossPrice !== null && m.manualGrossPrice !== undefined ? m.manualGrossPrice : null,
      manualDiscountPercent: m.manualDiscountPercent !== null && m.manualDiscountPercent !== undefined ? m.manualDiscountPercent : null,
      netWeight: m.netWeight !== null && m.netWeight !== undefined ? m.netWeight : null,
      quantity: m.quantity,
      unit: m.unit,
      wastagePercent: m.wastagePercent ?? 0,
      sortOrder: m.sortOrder ?? i,
    }));

    const imagesData = data.images.map((img, i) => ({
      url: img.url,
      alt: img.alt,
      sortOrder: img.sortOrder ?? i,
    }));

    const relationsData = {
      relatedIds: data.relatedIds || [],
      crossSellIds: data.crossSellIds || [],
      upSellIds: data.upSellIds || [],
    };

    return this.productRepository.updateWithDetails(numId, {
      productData,
      materialsData,
      imagesData,
      relationsData,
    });
  }

  /**
   * Cascade delete product
   */
  async deleteProduct(id) {
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      throw new AppError("Invalid product id", 400);
    }

    const existing = await this.productRepository.findById(numId);
    if (!existing) {
      throw new AppError("Product not found", 404);
    }

    await this.productRepository.deleteCascade(numId);
    return existing.name;
  }

  /**
   * Duplicate product
   */
  async duplicateProduct(id) {
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      throw new AppError("Invalid product id", 400);
    }

    const source = await this.productRepository.findById(numId);
    if (!source) {
      throw new AppError("Product not found", 404);
    }

    const slug = await ensureUniqueSlug(prisma.product, `${source.name}-copy`);
    const sku = generateSku(source.name);

    return this.productRepository.duplicate(numId, slug, sku);
  }

  /**
   * Restore soft-deleted product
   */
  async restoreProduct(id) {
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      throw new AppError("Invalid product id", 400);
    }

    const existing = await this.productRepository.findById(numId);
    if (!existing) {
      throw new AppError("Product not found", 404);
    }

    return this.productRepository.restore(numId);
  }

  /**
   * Execute bulk product actions
   */
  async handleBulkAction(body) {
    const parsed = productBulkActionSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    const { ids, action } = parsed.data;

    switch (action) {
      case "delete":
        await this.productRepository.bulkDelete(ids);
        break;
      case "restore":
        await this.productRepository.bulkUpdate(ids, { deletedAt: null });
        break;
      case "publish":
        await this.productRepository.bulkUpdate(ids, { status: "PUBLISHED", publishedAt: new Date() });
        break;
      case "unpublish":
        await this.productRepository.bulkUpdate(ids, { status: "DRAFT" });
        break;
      case "archive":
        await this.productRepository.bulkUpdate(ids, { status: "ARCHIVED" });
        break;
      case "feature":
        await this.productRepository.bulkUpdate(ids, { isFeatured: true });
        break;
      case "unfeature":
        await this.productRepository.bulkUpdate(ids, { isFeatured: false });
        break;
      default:
        throw new AppError("Unsupported bulk action", 400);
    }
  }
}
