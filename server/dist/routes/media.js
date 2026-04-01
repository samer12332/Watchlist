"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const async_handler_1 = require("../lib/async-handler");
const external_metadata_1 = require("../lib/external-metadata");
const http_error_1 = require("../lib/http-error");
const category_1 = require("../models/category");
const media_item_1 = require("../models/media-item");
const media_1 = require("../validation/media");
const router = (0, express_1.Router)();
const DEFAULT_PAGE_SIZE = 24;
const MIN_ALLOWED_RATING = 6.5;
const pickDefined = (value, fallback) => (value !== undefined ? value : fallback);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ensureUniqueMediaTitleForType = async (title, type, excludeId) => {
    const filters = {
        type,
        title: {
            $regex: `^${escapeRegex(title.trim())}$`,
            $options: 'i',
        },
    };
    if (excludeId) {
        filters._id = { $ne: new media_item_1.MediaObjectId(excludeId) };
    }
    const existing = await media_item_1.MediaItemModel.findOne(filters).select('_id title type');
    if (existing) {
        throw new http_error_1.HttpError(409, `A ${type} named "${title.trim()}" already exists.`);
    }
};
const ensureCategoriesExist = async (categoryIds) => {
    const uniqueIds = [...new Set(categoryIds)];
    if (uniqueIds.length === 0) {
        return uniqueIds;
    }
    const count = await category_1.CategoryModel.countDocuments({
        _id: {
            $in: uniqueIds,
        },
    });
    if (count !== uniqueIds.length) {
        throw new http_error_1.HttpError(400, 'One or more category ids are invalid.');
    }
    return uniqueIds;
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
const normalizeLikedForStatus = (status, liked) => {
    if (status === 'reviewed') {
        return false;
    }
    if (status === 'completed') {
        return liked === false ? null : liked;
    }
    return null;
};
const normalizeMediaDocument = (mediaItem) => {
    const normalizedStatus = getNormalizedStatus(mediaItem.status, mediaItem.liked);
    return {
        ...mediaItem,
        status: normalizedStatus,
        liked: normalizeLikedForStatus(normalizedStatus, mediaItem.liked ?? null),
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
const buildMediaDocumentPayload = async (payload, options) => {
    const normalizedStatus = getNormalizedStatus(payload.status, payload.liked);
    const normalizedLiked = normalizeLikedForStatus(normalizedStatus, payload.liked);
    const external = await (0, external_metadata_1.fetchExternalMetadata)({
        title: payload.title,
        type: payload.type,
        releaseYear: payload.releaseYear,
    });
    const enriched = (0, external_metadata_1.mergeExternalMetadata)({
        ...payload,
        status: normalizedStatus,
        liked: normalizedLiked,
    }, external, {
        force: options?.forceExternal ?? false,
    });
    if (enriched.rating !== null && enriched.rating < MIN_ALLOWED_RATING) {
        throw new http_error_1.HttpError(400, `Items rated below ${MIN_ALLOWED_RATING} cannot be added to the library.`);
    }
    return {
        ...enriched,
        status: normalizedStatus,
        liked: normalizedLiked,
        selectionCount: normalizedStatus === 'planned' ? enriched.selectionCount ?? 0 : 0,
    };
};
router.get('/', (0, async_handler_1.asyncHandler)(async (request, response) => {
    const query = media_1.mediaQuerySchema.parse(request.query);
    const filters = {};
    if (query.type) {
        filters.type = query.type;
    }
    if (query.categoryId) {
        filters.categories = new media_item_1.MediaObjectId(query.categoryId);
    }
    const statusFilters = buildStatusFilters(query.status);
    if (statusFilters) {
        Object.assign(filters, statusFilters);
    }
    if (query.search) {
        filters.title = {
            $regex: query.search,
            $options: 'i',
        };
    }
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const sort = (sortBy === 'title' ? { title: sortOrder } : { [sortBy]: sortOrder, title: 1 });
    const shouldPaginate = query.page !== undefined || query.pageSize !== undefined;
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const total = await media_item_1.MediaItemModel.countDocuments(filters);
    let mediaItemsQuery = media_item_1.MediaItemModel.find(filters).populate('categories').sort(sort);
    if (shouldPaginate) {
        mediaItemsQuery = mediaItemsQuery.skip((page - 1) * pageSize).limit(pageSize);
    }
    const mediaItems = await mediaItemsQuery;
    response.json({
        data: mediaItems.map((item) => normalizeMediaDocument(item.toJSON())),
        meta: shouldPaginate
            ? {
                total,
                page,
                pageSize,
                totalPages: Math.max(1, Math.ceil(total / pageSize)),
            }
            : {
                total,
            },
    });
}));
router.post('/sync-metadata', (0, async_handler_1.asyncHandler)(async (_request, response) => {
    if (!(0, external_metadata_1.hasExternalMetadataConfig)()) {
        throw new http_error_1.HttpError(400, 'OMDb and TMDb API keys are required for metadata sync.');
    }
    const mediaItems = (await media_item_1.MediaItemModel.find({}));
    let updated = 0;
    for (const mediaItem of mediaItems) {
        const external = await (0, external_metadata_1.fetchExternalMetadata)({
            title: mediaItem.title,
            type: mediaItem.type,
            releaseYear: mediaItem.releaseYear,
        });
        if (!external) {
            continue;
        }
        const merged = (0, external_metadata_1.mergeExternalMetadata)({
            rating: mediaItem.rating,
            releaseYear: mediaItem.releaseYear,
            posterUrl: mediaItem.posterUrl,
            totalSeasons: mediaItem.totalSeasons,
            totalEpisodes: mediaItem.totalEpisodes,
        }, external, { force: true });
        mediaItem.rating = merged.rating;
        mediaItem.releaseYear = merged.releaseYear;
        mediaItem.posterUrl = merged.posterUrl;
        mediaItem.totalSeasons = merged.totalSeasons;
        mediaItem.totalEpisodes = merged.totalEpisodes;
        await mediaItem.save();
        updated += 1;
    }
    response.json({
        data: {
            updated,
            total: mediaItems.length,
        },
        message: 'Media metadata sync completed.',
    });
}));
router.get('/:id', (0, async_handler_1.asyncHandler)(async (request, response) => {
    const mediaItem = await media_item_1.MediaItemModel.findById(request.params.id).populate('categories');
    if (!mediaItem) {
        throw new http_error_1.HttpError(404, 'Media item not found.');
    }
    response.json({
        data: normalizeMediaDocument(mediaItem.toJSON()),
    });
}));
router.post('/', (0, async_handler_1.asyncHandler)(async (request, response) => {
    const payload = media_1.mediaPayloadSchema.parse(request.body);
    const categoryIds = await ensureCategoriesExist(payload.categoryIds);
    await ensureUniqueMediaTitleForType(payload.title, payload.type);
    const mediaDocumentPayload = await buildMediaDocumentPayload({
        ...payload,
        categoryIds,
    });
    const mediaItem = await media_item_1.MediaItemModel.create({
        ...mediaDocumentPayload,
        categories: categoryIds,
    });
    await mediaItem.populate('categories');
    response.status(201).json({
        data: normalizeMediaDocument(mediaItem.toJSON()),
        message: 'Media item created.',
    });
}));
router.post('/:id/sync-metadata', (0, async_handler_1.asyncHandler)(async (request, response) => {
    if (!(0, external_metadata_1.hasExternalMetadataConfig)()) {
        throw new http_error_1.HttpError(400, 'OMDb and TMDb API keys are required for metadata sync.');
    }
    const mediaItem = (await media_item_1.MediaItemModel.findById(request.params.id));
    if (!mediaItem) {
        throw new http_error_1.HttpError(404, 'Media item not found.');
    }
    const external = await (0, external_metadata_1.fetchExternalMetadata)({
        title: mediaItem.title,
        type: mediaItem.type,
        releaseYear: mediaItem.releaseYear,
    });
    if (!external) {
        throw new http_error_1.HttpError(404, 'No external metadata match was found for this item.');
    }
    const merged = (0, external_metadata_1.mergeExternalMetadata)({
        rating: mediaItem.rating,
        releaseYear: mediaItem.releaseYear,
        posterUrl: mediaItem.posterUrl,
        totalSeasons: mediaItem.totalSeasons,
        totalEpisodes: mediaItem.totalEpisodes,
    }, external, { force: true });
    mediaItem.rating = merged.rating;
    mediaItem.releaseYear = merged.releaseYear;
    mediaItem.posterUrl = merged.posterUrl;
    mediaItem.totalSeasons = merged.totalSeasons;
    mediaItem.totalEpisodes = merged.totalEpisodes;
    await mediaItem.save();
    await mediaItem.populate('categories');
    response.json({
        data: normalizeMediaDocument(mediaItem.toJSON()),
        message: 'Media metadata synced.',
    });
}));
router.put('/:id', (0, async_handler_1.asyncHandler)(async (request, response) => {
    const mediaItem = (await media_item_1.MediaItemModel.findById(request.params.id));
    if (!mediaItem) {
        throw new http_error_1.HttpError(404, 'Media item not found.');
    }
    const partialPayload = media_1.mediaUpdatePayloadSchema.parse(request.body);
    const nextStatus = pickDefined(partialPayload.status, getNormalizedStatus(mediaItem.status, mediaItem.liked));
    const nextSelectionCount = nextStatus === 'planned' ? pickDefined(partialPayload.selectionCount, mediaItem.selectionCount ?? 0) : 0;
    const mergedPayload = media_1.mediaPayloadSchema.parse({
        title: pickDefined(partialPayload.title, mediaItem.title),
        type: pickDefined(partialPayload.type, mediaItem.type),
        status: nextStatus,
        rating: pickDefined(partialPayload.rating, mediaItem.rating),
        liked: pickDefined(partialPayload.liked, normalizeLikedForStatus(getNormalizedStatus(mediaItem.status, mediaItem.liked), mediaItem.liked)),
        selectionCount: nextSelectionCount,
        notes: pickDefined(partialPayload.notes, mediaItem.notes),
        releaseYear: pickDefined(partialPayload.releaseYear, mediaItem.releaseYear),
        posterUrl: pickDefined(partialPayload.posterUrl, mediaItem.posterUrl),
        totalSeasons: pickDefined(partialPayload.totalSeasons, mediaItem.totalSeasons),
        totalEpisodes: pickDefined(partialPayload.totalEpisodes, mediaItem.totalEpisodes),
        currentSeason: pickDefined(partialPayload.currentSeason, mediaItem.currentSeason),
        currentEpisode: pickDefined(partialPayload.currentEpisode, mediaItem.currentEpisode),
        categoryIds: pickDefined(partialPayload.categoryIds, mediaItem.categories.map((categoryId) => categoryId.toString())),
    });
    const categoryIds = await ensureCategoriesExist(mergedPayload.categoryIds);
    await ensureUniqueMediaTitleForType(mergedPayload.title, mergedPayload.type, String(request.params.id));
    const mediaDocumentPayload = await buildMediaDocumentPayload({
        ...mergedPayload,
        categoryIds,
    });
    mediaItem.title = mediaDocumentPayload.title;
    mediaItem.type = mediaDocumentPayload.type;
    mediaItem.status = mediaDocumentPayload.status;
    mediaItem.rating = mediaDocumentPayload.rating;
    mediaItem.liked = mediaDocumentPayload.liked;
    mediaItem.selectionCount = mediaDocumentPayload.selectionCount ?? 0;
    mediaItem.notes = mediaDocumentPayload.notes;
    mediaItem.releaseYear = mediaDocumentPayload.releaseYear;
    mediaItem.posterUrl = mediaDocumentPayload.posterUrl;
    mediaItem.totalSeasons = mediaDocumentPayload.totalSeasons;
    mediaItem.totalEpisodes = mediaDocumentPayload.totalEpisodes;
    mediaItem.currentSeason = mediaDocumentPayload.currentSeason;
    mediaItem.currentEpisode = mediaDocumentPayload.currentEpisode;
    mediaItem.categories = categoryIds.map((id) => new media_item_1.MediaObjectId(id));
    await mediaItem.save();
    await mediaItem.populate('categories');
    response.json({
        data: normalizeMediaDocument(mediaItem.toJSON()),
        message: 'Media item updated.',
    });
}));
router.post('/:id/select', (0, async_handler_1.asyncHandler)(async (request, response) => {
    const mediaItem = (await media_item_1.MediaItemModel.findById(request.params.id));
    if (!mediaItem) {
        throw new http_error_1.HttpError(404, 'Media item not found.');
    }
    if (mediaItem.status !== 'planned') {
        throw new http_error_1.HttpError(400, 'Only planned items can be selected for watching.');
    }
    mediaItem.selectionCount = Number(mediaItem.selectionCount ?? 0) + 1;
    if (mediaItem.selectionCount >= 3) {
        mediaItem.selectionCount = 3;
        mediaItem.status = 'reviewed';
        mediaItem.liked = false;
        mediaItem.rating = null;
    }
    await mediaItem.save();
    await mediaItem.populate('categories');
    response.json({
        data: normalizeMediaDocument(mediaItem.toJSON()),
        message: mediaItem.status === 'reviewed' ? 'Item moved to reviewed after the third selection.' : 'Item selection count updated.',
    });
}));
router.delete('/:id', (0, async_handler_1.asyncHandler)(async (request, response) => {
    const mediaItem = await media_item_1.MediaItemModel.findById(request.params.id);
    if (!mediaItem) {
        throw new http_error_1.HttpError(404, 'Media item not found.');
    }
    await mediaItem.deleteOne();
    response.json({
        message: 'Media item deleted.',
    });
}));
exports.default = router;
