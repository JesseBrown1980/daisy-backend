import { PrismaClient } from "@prisma/client";
import { IS_DEVELOPMENT, DATABASE } from "../config/app";
import { logger } from "../utils/logger";

declare global {
  var __prisma: PrismaClient | undefined;
}

// Prevent multiple instances of Prisma Client in development
const prisma =
  globalThis.__prisma ||
  new PrismaClient({
    log: DATABASE.LOG_QUERIES ? ["query", "error", "warn"] : ["error"],
  });

if (IS_DEVELOPMENT) {
  globalThis.__prisma = prisma;
}

// Handle graceful shutdown
process.on("beforeExit", async () => {
  logger.info("Disconnecting from database...");
  await prisma.$disconnect();
});

export { prisma };
