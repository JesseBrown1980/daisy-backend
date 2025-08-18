import { prisma } from "../lib/prisma";
import { Product, SearchFilters, SearchResult, ScrapedProduct } from "../types";
import { logger } from "../utils/logger";
import { ValidationError, InternalServerError, NotFoundError } from "../utils/AppError";
import { PRODUCT_SERVICE } from "../config/app";

import { Prisma } from "@prisma/client";

interface ProductCacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string; // Cache key
}

export class ProductService {
  private static readonly MAX_SEARCH_LIMIT = PRODUCT_SERVICE.MAX_SEARCH_LIMIT;

  /**
   * Simple search products with text query and pagination - matches frontend API
   */
  async searchProducts(query?: string, page: number = 1, limit: number = 20): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      // Validate inputs
      if (page < 1) {
        throw new ValidationError("Page must be greater than 0");
      }

      if (limit < 1 || limit > ProductService.MAX_SEARCH_LIMIT) {
        throw new ValidationError(`Limit must be between 1 and ${ProductService.MAX_SEARCH_LIMIT}`);
      }

      const skip = (page - 1) * limit;

      // Build where clause for text search
      const where: Prisma.ProductWhereInput = {};

      if (query?.trim()) {
        const sanitizedQuery = query.trim().substring(0, 100); // Limit query length
        where.OR = [
          { name: { contains: sanitizedQuery } },
          { brand: { contains: sanitizedQuery } },
          { category: { contains: sanitizedQuery } },
          { description: { contains: sanitizedQuery } },
        ];
      }

      // Execute search with pagination
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          orderBy: [{ lastCrawled: "desc" }, { createdAt: "desc" }],
          skip,
          take: limit,
          select: {
            id: true,
            name: true,
            brand: true,
            price: true,
            currency: true,
            imageUrl: true,
            productUrl: true,
            category: true,
            description: true,
            inStock: true,
            source: true,
            lastCrawled: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.product.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        products,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error("Error in simple product search:", {
        error,
        query,
        page,
        limit,
        executionTimeMs: executionTime,
      });

      if (error instanceof ValidationError) {
        throw error;
      }

      throw new InternalServerError("Failed to search products");
    }
  }

  /**
   * Get product by ID with validation
   */
  async getProductById(id: string): Promise<Product> {
    try {
      // Validate ID format (basic CUID validation)
      if (!id || typeof id !== "string" || id.length < 10) {
        throw new ValidationError("Invalid product ID format");
      }

      const product = await prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        throw new NotFoundError("Product");
      }

      return product;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }

      logger.error(`Error fetching product ${id}:`, error);
      throw new InternalServerError("Failed to fetch product");
    }
  }

  /**
   * Upsert product with validation and optimization
   */
  async upsertProduct(scrapedProduct: ScrapedProduct): Promise<Product> {
    try {
      // Validate scraped product data
      this.validateScrapedProduct(scrapedProduct);

      // Normalize source name consistently
      const normalizedSource = this.normalizeSourceName(scrapedProduct.brand);

      // Use original image URL directly - no local processing needed
      const finalImageUrl = scrapedProduct.imageUrl;

      const product = await prisma.product.upsert({
        where: { productUrl: scrapedProduct.productUrl },
        update: {
          name: scrapedProduct.name.trim(),
          price: scrapedProduct.price,
          imageUrl: finalImageUrl,
          lastCrawled: new Date(),
        },
        create: {
          name: scrapedProduct.name.trim(),
          brand: scrapedProduct.brand.trim(),
          price: scrapedProduct.price,
          currency: "USD", // Default currency
          imageUrl: finalImageUrl,
          productUrl: scrapedProduct.productUrl,
          source: normalizedSource,
          inStock: true, // Default to in stock
          lastCrawled: new Date(),
        },
      });

      logger.debug("Product upserted successfully", {
        productId: product.id,
        productUrl: product.productUrl,
        source: product.source,
        imageUrl: finalImageUrl,
      });

      return product;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      logger.error("Error upserting product:", {
        error,
        productUrl: scrapedProduct?.productUrl,
        productName: scrapedProduct?.name,
      });
      throw new InternalServerError("Failed to save product");
    }
  }

  /**
   * Validate scraped product data - only required fields per requirements
   */
  private validateScrapedProduct(product: ScrapedProduct): void {
    if (!product) {
      throw new ValidationError("Product data is required");
    }

    if (!product.name?.trim()) {
      throw new ValidationError("Product name is required");
    }

    if (!product.brand?.trim()) {
      throw new ValidationError("Product brand is required");
    }

    if (!product.productUrl?.trim()) {
      throw new ValidationError("Product URL is required");
    }

    if (!product.imageUrl?.trim()) {
      throw new ValidationError("Product image URL is required");
    }

    if (typeof product.price !== "number" || product.price < 0) {
      throw new ValidationError("Product price must be a non-negative number");
    }

    // Validate URL formats
    try {
      new URL(product.productUrl);
      new URL(product.imageUrl);
    } catch {
      throw new ValidationError("Invalid URL format in product data");
    }
  }

  /**
   * Normalize source name for consistency
   */
  private normalizeSourceName(brand: string): string {
    return brand.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  /**
   * Delete old products with validation and batch processing
   */
  async deleteOldProducts(daysOld: number = 30): Promise<{
    deletedCount: number;
    processedBatches: number;
  }> {
    try {
      // Validate input
      if (daysOld < 1) {
        throw new ValidationError("Days old must be at least 1");
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // First, count how many products will be deleted
      const totalToDelete = await prisma.product.count({
        where: {
          lastCrawled: {
            lt: cutoffDate,
          },
        },
      });

      if (totalToDelete === 0) {
        logger.info("No old products found to delete");
        return { deletedCount: 0, processedBatches: 0 };
      }

      let totalDeleted = 0;
      let batchCount = 0;

      while (totalDeleted < totalToDelete) {
        const batch = await prisma.product.deleteMany({
          where: {
            lastCrawled: {
              lt: cutoffDate,
            },
          },
          // Note: SQLite doesn't support LIMIT in DELETE, but Prisma handles batching
        });

        totalDeleted += batch.count;
        batchCount++;

        // Break if no more records to delete
        if (batch.count === 0) {
          break;
        }

        logger.debug(`Deleted batch ${batchCount}: ${batch.count} products`);

        // Small delay between batches to reduce database load
        if (totalDeleted < totalToDelete) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      logger.info(`Deleted ${totalDeleted} old products (older than ${daysOld} days) in ${batchCount} batches`);

      return { deletedCount: totalDeleted, processedBatches: batchCount };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      logger.error("Error deleting old products:", error);
      throw new InternalServerError("Failed to delete old products");
    }
  }
}
