"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const required = (value, name) => {
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
};
exports.env = {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 4000),
    mongoUri: required(process.env.MONGODB_URI, 'MONGODB_URI'),
    clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:3000',
    omdbApiKey: process.env.OMDB_API_KEY ?? null,
    tmdbReadAccessToken: process.env.TMDB_READ_ACCESS_TOKEN ?? null,
};
