import { Request, Response } from 'express';
import { sendNotFound } from '../utils/response';

export const notFoundHandler = (req: Request, res: Response): void => {
  sendNotFound(res, `Route ${req.method} ${req.originalUrl} not found`);
};
