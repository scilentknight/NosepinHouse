const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
  "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't",
  "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have",
  "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself",
  "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is",
  "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself",
  "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours",
  "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should",
  "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them",
  "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've",
  "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we",
  "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where",
  "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
  "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves",
]);

/**
 * Tokenize a text string into normalized terms.
 */
function tokenize(text) {
  if (!text || typeof text !== "string") return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Compute cosine similarity between two numeric sparse/dense feature maps (Objects or Maps).
 * Similarity(A, B) = (A · B) / (||A|| * ||B||)
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB) return 0;

  const entriesA = vecA instanceof Map ? Array.from(vecA.entries()) : Object.entries(vecA);
  const getB = vecB instanceof Map ? (k) => vecB.get(k) : (k) => vecB[k];

  let dotProduct = 0;
  let normA = 0;

  for (const [key, valA] of entriesA) {
    normA += valA * valA;
    const valB = getB(key);
    if (valB) {
      dotProduct += valA * valB;
    }
  }

  if (normA === 0) return 0;

  let normB = 0;
  const valuesB = vecB instanceof Map ? vecB.values() : Object.values(vecB);
  for (const valB of valuesB) {
    normB += valB * valB;
  }

  if (normB === 0) return 0;

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator > 0 ? dotProduct / denominator : 0;
}

export default class ContentBasedFilteringService {
  constructor() {
    this.cachedCorpus = null;
    this.cachedVectors = new Map(); // productId -> featureMap
    this.idfMap = new Map();
    this.lastBuilt = 0;
    this.CACHE_TTL = 300000; // 5 minutes cache
  }

  /**
   * Builds feature representations for all eligible products.
   */
  buildProductFeatures(products) {
    const docCount = products.length;
    if (docCount === 0) return new Map();

    // 1. Calculate Document Frequency (DF) for TF-IDF
    const docFrequency = new Map();
    const productTokens = new Map();

    for (const product of products) {
      const textParts = [
        product.name,
        product.shortDescription || "",
        product.metaKeywords || "",
      ];

      // Include tags if present
      if (Array.isArray(product.tags)) {
        textParts.push(product.tags.join(" "));
      } else if (typeof product.tags === "string") {
        textParts.push(product.tags);
      }

      const tokens = tokenize(textParts.join(" "));
      const uniqueTokens = new Set(tokens);
      productTokens.set(product.id, tokens);

      for (const token of uniqueTokens) {
        docFrequency.set(token, (docFrequency.get(token) || 0) + 1);
      }
    }

    // 2. Compute IDF for each token
    this.idfMap.clear();
    for (const [token, df] of docFrequency.entries()) {
      // Smoothed IDF
      const idf = Math.log(1 + docCount / (1 + df));
      this.idfMap.set(token, idf);
    }

    // 3. Min/Max price for normalization
    const prices = products.map((p) => Number(p.price) || 0);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    // 4. Build feature vector per product
    const vectors = new Map();

    for (const product of products) {
      const vec = new Map();

      // Feature A: Category (Weight: 3.0)
      if (product.categoryId) {
        vec.set(`cat_${product.categoryId}`, 3.0);
        if (product.category?.slug) {
          vec.set(`cat_slug_${product.category.slug}`, 1.5);
        }
      }

      // Feature B: Brand (Weight: 2.0)
      if (product.brandId) {
        vec.set(`brand_${product.brandId}`, 2.0);
      }

      // Feature C: Materials & Purities (Weight: 2.5)
      if (Array.isArray(product.materials)) {
        for (const pm of product.materials) {
          if (pm.material?.type) {
            vec.set(`mat_type_${pm.material.type.toLowerCase()}`, 2.5);
          }
          if (pm.material?.code) {
            vec.set(`mat_code_${pm.material.code.toLowerCase()}`, 2.0);
          }
          if (pm.purity?.code) {
            vec.set(`purity_${pm.purity.code.toLowerCase()}`, 2.0);
          }
        }
      }

      // Feature D: Colorway / Attributes (Weight: 1.5)
      if (product.colorway) {
        vec.set(`color_${product.colorway.toLowerCase()}`, 1.5);
      }

      // Variant attribute values
      if (Array.isArray(product.variants)) {
        for (const variant of product.variants) {
          if (Array.isArray(variant.attributeValues)) {
            for (const av of variant.attributeValues) {
              const val = av.attributeValue?.value?.toLowerCase();
              if (val) {
                vec.set(`attr_${val}`, 1.2);
              }
            }
          }
        }
      }

      // Feature E: Textual TF-IDF (Weight: 1.0)
      const tokens = productTokens.get(product.id) || [];
      const termFrequency = new Map();
      for (const t of tokens) {
        termFrequency.set(t, (termFrequency.get(t) || 0) + 1);
      }

      for (const [token, count] of termFrequency.entries()) {
        const tf = count / (tokens.length || 1);
        const idf = this.idfMap.get(token) || 1.0;
        vec.set(`text_${token}`, tf * idf * 1.5);
      }

      // Feature F: Normalized Price bucket (Weight: 1.0)
      const normPrice = (Number(product.price) - minPrice) / priceRange;
      vec.set("feat_price", normPrice * 1.0);

      vectors.set(product.id, vec);
    }

    this.cachedVectors = vectors;
    this.lastBuilt = Date.now();
    return vectors;
  }

  /**
   * Get or build vectors for a product list with in-memory caching.
   */
  getOrBuildVectors(products) {
    if (this.cachedVectors.size > 0 && Date.now() - this.lastBuilt < this.CACHE_TTL) {
      return this.cachedVectors;
    }
    return this.buildProductFeatures(products);
  }

  /**
   * Compute Content-Based recommendations for a specific user.
   * userInteractions: Array of { productId, score }
   * products: Array of eligible Product objects
   */
  getRecommendationsForUser(userInteractions, products, topK = 10) {
    if (!userInteractions || userInteractions.length === 0 || !products || products.length === 0) {
      return [];
    }

    const vectors = this.getOrBuildVectors(products);

    // Build User Profile Vector: weighted centroid of interacted items
    const userProfile = new Map();
    let totalInteractionWeight = 0;
    const interactedProductIds = new Set();

    for (const interaction of userInteractions) {
      const pid = Number(interaction.productId);
      interactedProductIds.add(pid);
      const productVec = vectors.get(pid);
      if (!productVec) continue;

      const weight = Number(interaction.score) || 1.0;
      totalInteractionWeight += weight;

      for (const [key, value] of productVec.entries()) {
        userProfile.set(key, (userProfile.get(key) || 0) + value * weight);
      }
    }

    if (totalInteractionWeight === 0 || userProfile.size === 0) {
      return [];
    }

    // Normalize user profile vector
    for (const [key, val] of userProfile.entries()) {
      userProfile.set(key, val / totalInteractionWeight);
    }

    // Compute similarity for candidate products that user hasn't heavily interacted with
    const recommendations = [];

    for (const product of products) {
      // Don't recommend products the user already bought/strongly interacted with
      if (interactedProductIds.has(product.id)) continue;

      const productVec = vectors.get(product.id);
      if (!productVec) continue;

      const rawSim = cosineSimilarity(userProfile, productVec);
      // Normalized between 0 and 1
      const cbfScore = Math.max(0, Math.min(1, Number(rawSim.toFixed(4))));

      if (cbfScore > 0.01) {
        recommendations.push({
          productId: product.id,
          product,
          cbfScore,
          reason: this.explainCBF(userProfile, productVec, product),
        });
      }
    }

    return recommendations.sort((a, b) => b.cbfScore - a.cbfScore).slice(0, topK);
  }

  /**
   * Compute Item-to-Item similar products (for Product Detail page).
   */
  getSimilarProducts(targetProductId, products, limit = 6) {
    const vectors = this.getOrBuildVectors(products);
    const targetVec = vectors.get(Number(targetProductId));

    if (!targetVec) return [];

    const similar = [];

    for (const product of products) {
      if (product.id === Number(targetProductId)) continue;

      const candidateVec = vectors.get(product.id);
      if (!candidateVec) continue;

      const rawSim = cosineSimilarity(targetVec, candidateVec);
      const cbfScore = Math.max(0, Math.min(1, Number(rawSim.toFixed(4))));

      if (cbfScore > 0.05) {
        similar.push({
          productId: product.id,
          product,
          similarity: cbfScore,
          reason: this.explainItemSimilarity(targetVec, candidateVec, product),
        });
      }
    }

    return similar.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  }

  /**
   * Explain CBF recommendation for user.
   */
  explainCBF(userProfile, productVec, product) {
    if (product.category?.name) {
      return `Similar to jewellery you explored in ${product.category.name}`;
    }
    if (product.materials?.[0]?.material?.name) {
      return `Crafted with ${product.materials[0].material.name} matching your preferences`;
    }
    return "Recommended based on your browsing style and attributes";
  }

  /**
   * Explain item-to-item similarity.
   */
  explainItemSimilarity(targetVec, candidateVec, product) {
    if (product.category?.name) {
      return `Similar piece in ${product.category.name}`;
    }
    return "Similar design and material";
  }
}
