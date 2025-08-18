import { Router, Request, Response, NextFunction } from "express";
import { scrapingService } from "../services/scraper";
import { sendSuccess, sendValidationError } from "../utils/response";
import { SCRAPING } from "../config/app";
import Joi from "joi";

const router = Router();

// Validation schemas - uses configurable supported brands
const scrapeBrandSchema = Joi.object({
  brand: Joi.string()
    .valid(...SCRAPING.SUPPORTED_BRANDS)
    .required()
    .messages({
      "any.only": `Brand must be one of: ${SCRAPING.SUPPORTED_BRANDS.join(", ")}`,
    }),
});

// GET /api/v1/scrape/brands - Get available brands for scraping
router.get("/brands", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brands = await scrapingService.getAvailableBrands();
    sendSuccess(res, brands, "Available brands retrieved successfully");
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/scrape/brand/:brand - Start scraping for specific brand
router.post("/brand/:brand", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { brand } = req.params;

    // Validate brand
    const { error } = scrapeBrandSchema.validate({ brand });
    if (error) {
      sendValidationError(res, error.details[0].message);
      return;
    }

    // Start scraping in background (don't wait for completion)
    scrapingService
      .scrapeBrand(brand)
      .then((result) => {
        console.log(`Scraping completed for ${brand}:`, result);
      })
      .catch((error) => {
        console.error(`Scraping failed for ${brand}:`, error);
      });

    sendSuccess(res, { message: `Scraping started for ${brand}` }, "Scraping job started", 202);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/scrape/all - Start scraping for all brands
router.post("/all", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Start scraping in background (don't wait for completion)
    scrapingService
      .scrapeAllBrands()
      .then(() => {
        console.log("All brands scraping completed");
      })
      .catch((error) => {
        console.error("All brands scraping failed:", error);
      });

    sendSuccess(res, { message: "Scraping started for all brands" }, "Scraping jobs started", 202);
  } catch (error) {
    next(error);
  }
});

export default router;
