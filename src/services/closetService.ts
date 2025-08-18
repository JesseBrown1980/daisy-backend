import { prisma } from "../lib/prisma";
import { ClosetItem, CreateClosetItemDto, UpdateClosetItemDto } from "../types";
import { logger } from "../utils/logger";
import { NotFoundError, ValidationError, InternalServerError } from "../utils/AppError";

export class ClosetService {
  private getSortOptions(sortBy?: string) {
    if (!sortBy) {
      return { createdAt: "desc" as const };
    }

    switch (sortBy) {
      case "newest":
        return { createdAt: "desc" as const };
      case "brand-az":
        return { brand: "asc" as const };
      case "category":
        return { category: "asc" as const };
      default:
        return { createdAt: "desc" as const };
    }
  }

  async getAllItems(sortBy?: string): Promise<ClosetItem[]> {
    try {
      const items = await prisma.closetItem.findMany({
        orderBy: this.getSortOptions(sortBy),
      });
      return items;
    } catch (error) {
      logger.error("Error fetching closet items:", error);
      throw new Error("Failed to fetch closet items");
    }
  }

  async getItemById(id: string): Promise<ClosetItem> {
    try {
      if (!id || typeof id !== "string") {
        throw new ValidationError("Valid item ID is required");
      }

      const item = await prisma.closetItem.findUnique({
        where: { id },
      });

      if (!item) {
        throw new NotFoundError("Closet item");
      }

      return item;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error(`Error fetching closet item ${id}:`, error);
      throw new InternalServerError("Failed to fetch closet item");
    }
  }

  async createItem(data: CreateClosetItemDto, imageUrl?: string): Promise<ClosetItem> {
    try {
      // Validate required fields
      if (!data.name?.trim()) {
        throw new ValidationError("Item name is required");
      }
      if (!data.brand?.trim()) {
        throw new ValidationError("Item brand is required");
      }
      if (!data.category?.trim()) {
        throw new ValidationError("Item category is required");
      }

      const item = await prisma.closetItem.create({
        data: {
          name: data.name.trim(),
          brand: data.brand.trim(),
          category: data.category.trim(),
          imageUrl: imageUrl || "/uploads/placeholder-image.svg",
        },
      });

      logger.info(`Created closet item: ${item.name} (${item.id})`);
      return item;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error("Error creating closet item:", error);
      throw new InternalServerError("Failed to create closet item");
    }
  }

  async deleteItem(id: string): Promise<void> {
    try {
      await prisma.closetItem.delete({
        where: { id },
      });
      logger.info(`Deleted closet item: ${id}`);
    } catch (error) {
      logger.error(`Error deleting closet item ${id}:`, error);
      throw new Error("Failed to delete closet item");
    }
  }

  async searchItems(query: string, sortBy?: string): Promise<ClosetItem[]> {
    try {
      const items = await prisma.closetItem.findMany({
        where: {
          OR: [{ name: { contains: query } }, { brand: { contains: query } }, { category: { contains: query } }],
        },
        orderBy: this.getSortOptions(sortBy),
      });
      return items;
    } catch (error) {
      logger.error(`Error searching closet items with query "${query}":`, error);
      throw new Error("Failed to search closet items");
    }
  }
}
