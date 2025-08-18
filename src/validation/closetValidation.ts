import Joi from "joi";
import { CLOTHING_CATEGORIES } from "../types";
import { VALIDATION } from "../config/app";

export const createClosetItemSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(VALIDATION.CLOSET_ITEM.NAME_MIN)
    .max(VALIDATION.CLOSET_ITEM.NAME_MAX)
    .required()
    .messages({
      "string.empty": "Name is required",
      "string.min": `Name must be at least ${VALIDATION.CLOSET_ITEM.NAME_MIN} character long`,
      "string.max": `Name must be less than ${VALIDATION.CLOSET_ITEM.NAME_MAX} characters long`,
    }),
  brand: Joi.string()
    .trim()
    .min(VALIDATION.CLOSET_ITEM.BRAND_MIN)
    .max(VALIDATION.CLOSET_ITEM.BRAND_MAX)
    .required()
    .messages({
      "string.empty": "Brand is required",
      "string.min": `Brand must be at least ${VALIDATION.CLOSET_ITEM.BRAND_MIN} character long`,
      "string.max": `Brand must be less than ${VALIDATION.CLOSET_ITEM.BRAND_MAX} characters long`,
    }),
  category: Joi.string()
    .valid(...CLOTHING_CATEGORIES)
    .required()
    .messages({
      "any.only": `Category must be one of: ${CLOTHING_CATEGORIES.join(", ")}`,
    }),
});

export const updateClosetItemSchema = Joi.object({
  name: Joi.string().trim().min(VALIDATION.CLOSET_ITEM.NAME_MIN).max(VALIDATION.CLOSET_ITEM.NAME_MAX).optional(),
  brand: Joi.string().trim().min(VALIDATION.CLOSET_ITEM.BRAND_MIN).max(VALIDATION.CLOSET_ITEM.BRAND_MAX).optional(),
  category: Joi.string()
    .valid(...CLOTHING_CATEGORIES)
    .optional(),
}).min(1);

export const searchClosetItemsSchema = Joi.object({
  q: Joi.string().trim().min(1).max(VALIDATION.SEARCH.QUERY_MAX).optional(),
  sortBy: Joi.string().valid("newest", "brand-az", "category").optional().messages({
    "any.only": "sortBy must be one of: newest, brand-az, category",
  }),
});
