import { Router, Request, Response, NextFunction } from "express";
import { ClosetService } from "../services/closetService";
import { validate, validateQuery } from "../middleware/validation";
import { upload, cleanupFile } from "../middleware/upload";
import { sendSuccess, sendNotFound, sendError } from "../utils/response";
import {
  createClosetItemSchema,
  updateClosetItemSchema,
  searchClosetItemsSchema,
} from "../validation/closetValidation";
import { CreateClosetItemDto, UpdateClosetItemDto } from "../types";

const router = Router();
const closetService = new ClosetService();

// GET /api/v1/closet - Get all closet items
router.get("/", validateQuery(searchClosetItemsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, sortBy } = req.query as {
      q?: string;
      sortBy?: string;
    };

    let items;

    if (q) {
      items = await closetService.searchItems(q, sortBy);
    } else {
      items = await closetService.getAllItems(sortBy);
    }

    sendSuccess(res, items, "Closet items retrieved successfully");
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/closet - Create new closet item
router.post("/", upload.single("image"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate the request body after multer has processed it
    const { error } = createClosetItemSchema.validate(req.body, { abortEarly: false });

    if (error) {
      // Clean up uploaded file if validation fails
      if (req.file) {
        cleanupFile(req.file.path);
      }
      const errorMessage = error.details.map((detail) => detail.message).join(", ");
      sendError(res, errorMessage, 400);
      return;
    }

    const data: CreateClosetItemDto = req.body;
    let imageUrl: string | undefined;

    // Use uploaded image directly if provided
    if (req.file) {
      // Convert to relative URL path - ensure we only get the filename
      const fileName = req.file.filename;
      imageUrl = `/uploads/${fileName}`;
    }

    const item = await closetService.createItem(data, imageUrl);
    sendSuccess(res, item, "Closet item created successfully", 201);
  } catch (error) {
    // Cleanup uploaded file if creation fails
    if (req.file) {
      cleanupFile(req.file.path);
    }
    next(error);
  }
});

// DELETE /api/v1/closet/:id - Delete closet item
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if item exists
    const existingItem = await closetService.getItemById(id);
    if (!existingItem) {
      sendNotFound(res, "Closet item not found");
      return;
    }

    await closetService.deleteItem(id);
    sendSuccess(res, null, "Closet item deleted successfully");
  } catch (error) {
    next(error);
  }
});

export default router;
