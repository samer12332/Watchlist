import dotenv from 'dotenv';

dotenv.config();

const required = (value: string | undefined, name: string) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  mongoUri: required(process.env.MONGODB_URI, 'MONGODB_URI'),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:3000',
  omdbApiKey: process.env.OMDB_API_KEY ?? null,
  tmdbReadAccessToken: process.env.TMDB_READ_ACCESS_TOKEN ?? null,
};
