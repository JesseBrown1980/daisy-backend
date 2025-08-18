import * as cron from "node-cron";
import { scrapingService } from "./scraper";
import { CrawlJobService } from "./crawlJobService";
import { ProductService } from "./productService";
import { logger } from "../utils/logger";
import { SCRAPING, CLEANUP } from "../config/app";

const crawlJobService = new CrawlJobService();
const productService = new ProductService();

export const startCronJobs = (): void => {
  const intervalHours = SCRAPING.INTERVAL_HOURS;

  // Schedule scraping job - runs every X hours (default 24)
  const cronExpression = `0 */${intervalHours} * * *`;

  logger.info(`Scheduling scraping job to run every ${intervalHours} hours (${cronExpression})`);

  cron.schedule(
    cronExpression,
    async () => {
      logger.info("Starting scheduled scraping job");

      try {
        await scrapingService.scrapeAllBrands();
        logger.info("Scheduled scraping job completed successfully");
      } catch (error) {
        logger.error("Scheduled scraping job failed:", error);
      }
    },
    {
      scheduled: true,
      timezone: "America/New_York", // Adjust timezone as needed
    }
  );

  // Schedule cleanup job - runs daily at 2 AM
  cron.schedule(
    "0 2 * * *",
    async () => {
      logger.info("Starting scheduled cleanup job");

      try {
        const [deletedJobs, deletedProducts] = await Promise.all([
          crawlJobService.cleanupOldJobs(CLEANUP.OLD_JOBS_DAYS),
          productService.deleteOldProducts(CLEANUP.OLD_PRODUCTS_DAYS),
        ]);

        logger.info(`Cleanup completed: ${deletedJobs} jobs, ${deletedProducts} products deleted`);
      } catch (error) {
        logger.error("Scheduled cleanup job failed:", error);
      }
    },
    {
      scheduled: true,
      timezone: "America/New_York",
    }
  );

  logger.info("All cron jobs scheduled successfully");
};
