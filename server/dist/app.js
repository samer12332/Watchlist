"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const env_1 = require("./config/env");
const error_handler_1 = require("./middleware/error-handler");
const category_groups_1 = __importDefault(require("./routes/category-groups"));
const categories_1 = __importDefault(require("./routes/categories"));
const media_1 = __importDefault(require("./routes/media"));
const random_1 = __importDefault(require("./routes/random"));
const createApp = () => {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)({
        origin: env_1.env.clientOrigin,
    }));
    app.use(express_1.default.json());
    app.get('/api/health', (_request, response) => {
        response.json({
            status: 'ok',
        });
    });
    app.use('/api/category-groups', category_groups_1.default);
    app.use('/api/categories', categories_1.default);
    app.use('/api/media', media_1.default);
    app.use('/api/random', random_1.default);
    app.use(error_handler_1.errorHandler);
    return app;
};
exports.createApp = createApp;
