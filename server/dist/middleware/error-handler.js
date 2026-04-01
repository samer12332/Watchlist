"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const zod_1 = require("zod");
const http_error_1 = require("../lib/http-error");
const errorHandler = (error, _request, response, _next) => {
    if (error instanceof http_error_1.HttpError) {
        return response.status(error.statusCode).json({
            message: error.message,
            details: error.details,
        });
    }
    if (error instanceof zod_1.ZodError) {
        return response.status(400).json({
            message: 'Validation failed.',
            details: error.flatten(),
        });
    }
    if (error instanceof mongoose_1.default.Error.CastError) {
        return response.status(400).json({
            message: 'Invalid resource id.',
        });
    }
    if (error instanceof mongoose_1.default.Error.ValidationError) {
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
exports.errorHandler = errorHandler;
