import { env } from './config/env';
import { connectToDatabase } from './lib/db';
import { createApp } from './app';

const start = async () => {
  await connectToDatabase();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Server listening on http://localhost:${env.port}`);
  });
};

void start();
