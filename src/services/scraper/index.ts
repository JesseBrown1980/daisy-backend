import { WebScraper } from "./scraper";
import { ProductService } from "../productService";
import { CrawlJobService } from "../crawlJobService";
import { logger } from "../../utils/logger";
import { SCRAPING_CONFIGS } from "./config";
import { SCRAPING } from "../../config/app";
import { ValidationError } from "../../utils/AppError";

export class ScrapingService {
  private scraper: WebScraper;
  private productService: ProductService;
  private crawlJobService: CrawlJobService;

  constructor() {
    this.scraper = new WebScraper();
    this.productService = new ProductService();
    this.crawlJobService = new CrawlJobService();
  }

  async scrapeAllBrands(): Promise<void> {
    logger.info("Starting scraping job for all brands");

    const brands = Object.keys(SCRAPING_CONFIGS);
    const results = [];

    for (const brand of brands) {
      try {
        const result = await this.scrapeBrand(brand);
        results.push(result);
      } catch (error) {
        logger.error(`Failed to scrape brand ${brand}:`, error);
        results.push({
          brand,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          itemsScraped: 0,
          itemsSaved: 0,
        });
      }
    }

    await this.scraper.close();

    const totalScraped = results.reduce((sum, r) => sum + r.itemsScraped, 0);
    const totalSaved = results.reduce((sum, r) => sum + r.itemsSaved, 0);

    logger.info(`Scraping completed. Total scraped: ${totalScraped}, Total saved: ${totalSaved}`);
  }

  async scrapeBrand(brand: string): Promise<{
    brand: string;
    success: boolean;
    error?: string;
    message?: string;
    itemsScraped: number;
    itemsSaved: number;
  }> {
    logger.info(`Starting scraping job for brand: ${brand}`);

    // Validate brand is supported
    if (!SCRAPING.SUPPORTED_BRANDS.includes(brand as any)) {
      throw new ValidationError(
        `Unsupported brand: ${brand}. Supported brands: ${SCRAPING.SUPPORTED_BRANDS.join(", ")}`
      );
    }

    // Check if brand is temporarily disabled
    if (SCRAPING.DISABLED_BRANDS.includes(brand)) {
      logger.warn(`Skipping scraping for disabled brand: ${brand}`);
      return {
        brand,
        success: true,
        itemsScraped: 0,
        itemsSaved: 0,
        message: "Brand temporarily disabled",
      };
    }

    // Create crawl job record
    const crawlJob = await this.crawlJobService.createJob(brand);

    try {
      await this.crawlJobService.updateJobStatus(crawlJob.id, "RUNNING");

      // Scrape products
      const scrapedProducts = await this.scraper.scrapeProducts(brand);
      logger.info(`Scraped ${scrapedProducts.length} products from ${brand}`);

      // Save products to database
      let savedCount = 0;
      for (const product of scrapedProducts) {
        try {
          await this.productService.upsertProduct(product);
          savedCount++;
        } catch (error) {
          logger.error(`Failed to save product: ${product.name}`, error);
        }
      }

      // Update crawl job
      await this.crawlJobService.completeJob(crawlJob.id, scrapedProducts.length, savedCount);

      logger.info(`Completed scraping for ${brand}. Saved ${savedCount}/${scrapedProducts.length} products`);

      return {
        brand,
        success: true,
        itemsScraped: scrapedProducts.length,
        itemsSaved: savedCount,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`Error scraping brand ${brand}:`, error);

      // Update crawl job with error
      await this.crawlJobService.failJob(crawlJob.id, errorMessage);

      return {
        brand,
        success: false,
        error: errorMessage,
        itemsScraped: 0,
        itemsSaved: 0,
      };
    }
  }

  async getAvailableBrands(): Promise<string[]> {
    return [...SCRAPING.SUPPORTED_BRANDS];
  }
}

// Export singleton instance
export const scrapingService = new ScrapingService();

// CLI functionality
if (require.main === module) {
  const args = process.argv.slice(2);
  const brand = args[0];

  if (brand && brand !== "all") {
    scrapingService
      .scrapeBrand(brand)
      .then((result) => {
        console.log("Scraping result:", result);
        process.exit(result.success ? 0 : 1);
      })
      .catch((error) => {
        console.error("Scraping failed:", error);
        process.exit(1);
      });
  } else {
    scrapingService
      .scrapeAllBrands()
      .then(() => {
        console.log("All brands scraped successfully");
        process.exit(0);
      })
      .catch((error) => {
        console.error("Scraping failed:", error);
        process.exit(1);
      });
  }
}
