import { Router, Request, Response, NextFunction } from "express";
import { ProductService } from "../services/productService";
import { ClosetService } from "../services/closetService";
import { cacheService } from "../services/cacheService";
import { CACHE_TTL } from "../config/app";
import { validateQuery } from "../middleware/validation";
import { sendSuccess, sendNotFound } from "../utils/response";
import Joi from "joi";

const router = Router();
const productService = new ProductService();
const closetService = new ClosetService();

// Validation schema for search - simplified to match frontend
const searchProductsSchema = Joi.object({
  query: Joi.string().trim().max(100).optional(),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20).optional(),
});

// GET /api/v1/products - Search products with caching
router.get("/", validateQuery(searchProductsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.query.query as string;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    // Generate cache key for search results
    const cacheKey = cacheService.generateKey("product_search", { query, page, limit });

    // Try to get from cache first
    let searchResult = cacheService.get(cacheKey);

    if (!searchResult) {
      // Cache miss - fetch from database
      searchResult = await productService.searchProducts(query, page, limit);

      // Cache with standard TTL
      cacheService.set(cacheKey, searchResult, CACHE_TTL);
    }

    sendSuccess(res, searchResult, "Products retrieved successfully");
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/products/:id/add-to-closet - Add product to closet
router.post("/:id/add-to-closet", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);

    if (!product) {
      sendNotFound(res, "Product not found");
      return;
    }

    // Create closet item from product
    const closetItemData = {
      name: product.name,
      brand: product.brand,
      category: product.category || "Tops",
      notes: `Added from ${product.source} - $${product.price}`,
    };

    const closetItem = await closetService.createItem(closetItemData, product.imageUrl);
    sendSuccess(res, closetItem, "Product added to closet successfully", 201);
  } catch (error) {
    next(error);
  }
});

export default router;
