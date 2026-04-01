import type { NextApiRequest, NextApiResponse } from 'next';

import { createApp } from '@/server/src/app';
import { connectToDatabase } from '@/server/src/lib/db';

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

const app = createApp();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await connectToDatabase();
  return app(req, res);
}