"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = void 0;
const asyncHandler = (handler) => (request, response, next) => {
    void handler(request, response, next).catch(next);
};
exports.asyncHandler = asyncHandler;
