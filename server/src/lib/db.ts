import mongoose from 'mongoose';

import { env } from '../config/env';

let isConnected = false;

export const connectToDatabase = async () => {
  if (isConnected) {
    return mongoose.connection;
  }

  await mongoose.connect(env.mongoUri);
  isConnected = true;

  return mongoose.connection;
};
