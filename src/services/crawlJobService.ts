import { prisma } from "../lib/prisma";
import { CrawlJob } from "../types";
import { logger } from "../utils/logger";

export class CrawlJobService {
  async createJob(source: string): Promise<CrawlJob> {
    try {
      const job = await prisma.crawlJob.create({
        data: {
          source,
          status: "PENDING",
        },
      });

      logger.info(`Created crawl job for source: ${source} (${job.id})`);
      return job;
    } catch (error) {
      logger.error(`Error creating crawl job for source ${source}:`, error);
      throw new Error("Failed to create crawl job");
    }
  }

  async updateJobStatus(id: string, status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED"): Promise<void> {
    try {
      await prisma.crawlJob.update({
        where: { id },
        data: {
          status,
          startedAt: status === "RUNNING" ? new Date() : undefined,
        },
      });

      logger.info(`Updated crawl job ${id} status to: ${status}`);
    } catch (error) {
      logger.error(`Error updating crawl job ${id} status:`, error);
      throw new Error("Failed to update crawl job status");
    }
  }

  async completeJob(id: string, itemsFound: number, itemsSaved: number): Promise<void> {
    try {
      await prisma.crawlJob.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          itemsFound,
          itemsSaved,
        },
      });

      logger.info(`Completed crawl job ${id}: ${itemsSaved}/${itemsFound} items saved`);
    } catch (error) {
      logger.error(`Error completing crawl job ${id}:`, error);
      throw new Error("Failed to complete crawl job");
    }
  }

  async failJob(id: string, error: string): Promise<void> {
    try {
      await prisma.crawlJob.update({
        where: { id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          error,
        },
      });

      logger.info(`Failed crawl job ${id}: ${error}`);
    } catch (error) {
      logger.error(`Error failing crawl job ${id}:`, error);
      throw new Error("Failed to fail crawl job");
    }
  }

  async cleanupOldJobs(daysOld: number = 7): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await prisma.crawlJob.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
          status: {
            in: ["COMPLETED", "FAILED"],
          },
        },
      });

      logger.info(`Cleaned up ${result.count} old crawl jobs (older than ${daysOld} days)`);
      return result.count;
    } catch (error) {
      logger.error("Error cleaning up old crawl jobs:", error);
      throw new Error("Failed to cleanup old crawl jobs");
    }
  }
}
