import cors from 'cors';
import express from 'express';

import { env } from './config/env';
import { errorHandler } from './middleware/error-handler';
import categoryGroupsRouter from './routes/category-groups';
import categoriesRouter from './routes/categories';
import mediaRouter from './routes/media';
import randomRouter from './routes/random';

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: env.clientOrigin,
    })
  );
  app.use(express.json());

  app.get('/api/health', (_request, response) => {
    response.json({
      status: 'ok',
    });
  });

  app.use('/api/category-groups', categoryGroupsRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/media', mediaRouter);
  app.use('/api/random', randomRouter);

  app.use(errorHandler);

  return app;
};
