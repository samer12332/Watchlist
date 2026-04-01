"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const async_handler_1 = require("../lib/async-handler");
const http_error_1 = require("../lib/http-error");
const category_1 = require("../models/category");
const media_item_1 = require("../models/media-item");
const media_1 = require("../validation/media");
const router = (0, express_1.Router)();
const pickRandomDocument = async (count, finder) => {
    const randomIndex = Math.floor(Math.random() * count);
    return finder(randomIndex);
};
const getNormalizedStatus = (status, liked) => {
    if (status === 'reviewed') {
        return 'reviewed';
    }
    if (status === 'completed' && liked === false) {
        return 'reviewed';
    }
    if (status === 'planned' || status === 'watching' || status === 'suspended' || status === 'completed') {
        return status;
    }
    return 'planned';
};
const normalizeMediaDocument = (mediaItem) => {
    const normalizedStatus = getNormalizedStatus(mediaItem.status, mediaItem.liked);
    return {
        ...mediaItem,
        status: normalizedStatus,
        liked: normalizedStatus === 'reviewed' ? false : mediaItem.liked ?? null,
    };
};
const buildStatusFilters = (status) => {
    if (!status) {
        return undefined;
    }
    if (status === 'completed') {
        return {
            status: 'completed',
            liked: { $ne: false },
        };
    }
    if (status === 'reviewed') {
        return {
            $or: [{ status: 'reviewed' }, { status: 'completed', liked: false }],
        };
    }
    return { status };
};
router.get('/category', (0, async_handler_1.asyncHandler)(async (_request, response) => {
    const count = await category_1.CategoryModel.countDocuments();
    if (count === 0) {
        throw new http_error_1.HttpError(404, 'No categories available yet.');
    }
    const category = await pickRandomDocument(count, (skip) => category_1.CategoryModel.findOne().sort({ _id: 1 }).skip(skip));
    response.json({
        data: category,
    });
}));
router.get('/media', (0, async_handler_1.asyncHandler)(async (request, response) => {
    const query = media_1.mediaQuerySchema.parse(request.query);
    const buildFilters = (statusOverride) => {
        const filters = {};
        if (query.type) {
            filters.type = query.type;
        }
        if (query.categoryId) {
            filters.categories = new media_item_1.MediaObjectId(query.categoryId);
        }
        const statusFilters = buildStatusFilters(query.status ?? statusOverride);
        if (statusFilters) {
            Object.assign(filters, statusFilters);
        }
        return filters;
    };
    const preferredFilters = query.status ? buildFilters() : buildFilters('planned');
    let count = await media_item_1.MediaItemModel.countDocuments(preferredFilters);
    let filters = preferredFilters;
    if (!query.status && count === 0) {
        filters = buildFilters();
        count = await media_item_1.MediaItemModel.countDocuments(filters);
    }
    if (count === 0) {
        throw new http_error_1.HttpError(404, 'No media items match the selected filters.');
    }
    const mediaItem = await pickRandomDocument(count, (skip) => media_item_1.MediaItemModel.findOne(filters).populate('categories').sort({ _id: 1 }).skip(skip));
    response.json({
        data: mediaItem ? normalizeMediaDocument(mediaItem.toJSON()) : null,
    });
}));
exports.default = router;
