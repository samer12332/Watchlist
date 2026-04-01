import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';

import { HttpError } from '../lib/http-error';

export const errorHandler = (
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction
) => {
  if (error instanceof HttpError) {
    return response.status(error.statusCode).json({
      message: error.message,
      details: error.details,
    });
  }

  if (error instanceof ZodError) {
    return response.status(400).json({
      message: 'Validation failed.',
      details: error.flatten(),
    });
  }

  if (error instanceof mongoose.Error.CastError) {
    return response.status(400).json({
      message: 'Invalid resource id.',
    });
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return response.status(400).json({
      message: 'Validation failed.',
      details: error.errors,
    });
  }

  console.error(error);

  return response.status(500).json({
    message: 'Something went wrong.',
  });
};
