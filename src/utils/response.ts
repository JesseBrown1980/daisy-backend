import { Response } from 'express';
import { ApiResponse, ApiError } from '../types';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  status: number = 200
): Response<ApiResponse<T>> => {
  return res.status(status).json({
    data,
    status,
    message,
  });
};

export const sendError = (
  res: Response,
  message: string,
  status: number = 500,
  code?: string
): Response<ApiError> => {
  return res.status(status).json({
    message,
    status,
    code,
  });
};

export const sendValidationError = (
  res: Response,
  message: string = 'Validation failed'
): Response<ApiError> => {
  return sendError(res, message, 400, 'VALIDATION_ERROR');
};

export const sendNotFound = (
  res: Response,
  message: string = 'Resource not found'
): Response<ApiError> => {
  return sendError(res, message, 404, 'NOT_FOUND');
};
