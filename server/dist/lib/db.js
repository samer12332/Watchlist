"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToDatabase = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("../config/env");
let isConnected = false;
const connectToDatabase = async () => {
    if (isConnected) {
        return mongoose_1.default.connection;
    }
    await mongoose_1.default.connect(env_1.env.mongoUri);
    isConnected = true;
    return mongoose_1.default.connection;
};
exports.connectToDatabase = connectToDatabase;
