"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaQuerySchema = exports.mediaUpdatePayloadSchema = exports.mediaPayloadSchema = void 0;
const zod_1 = require("zod");
const nullableString = zod_1.z.union([zod_1.z.string().trim(), zod_1.z.null()]).optional().transform((value) => value ?? null);
const nullablePositiveInt = zod_1.z
    .union([zod_1.z.number().int().min(1), zod_1.z.null()])
    .optional()
    .transform((value) => value ?? null);
const nullableRating = zod_1.z
    .union([zod_1.z.number().min(6.5, 'Rating must be at least 6.5.').max(10), zod_1.z.null()])
    .optional()
    .transform((value) => value ?? null);
const nullableBoolean = zod_1.z.union([zod_1.z.boolean(), zod_1.z.null()]).optional().transform((value) => value ?? null);
const selectionCountSchema = zod_1.z.number().int().min(0).optional();
const mediaPayloadBaseSchema = zod_1.z.object({
    title: zod_1.z.string().trim().min(1, 'Title is required.').max(200, 'Title is too long.'),
    type: zod_1.z.enum(['movie', 'series']),
    status: zod_1.z.enum(['planned', 'watching', 'suspended', 'completed', 'reviewed']),
    rating: nullableRating,
    liked: nullableBoolean,
    selectionCount: selectionCountSchema,
    notes: nullableString,
    releaseYear: zod_1.z
        .union([zod_1.z.number().int().min(1800).max(3000), zod_1.z.null()])
        .optional()
        .transform((value) => value ?? null),
    posterUrl: zod_1.z
        .union([zod_1.z.string().trim().url('Poster URL must be a valid URL.'), zod_1.z.null()])
        .optional()
        .transform((value) => value ?? null),
    totalSeasons: nullablePositiveInt,
    totalEpisodes: nullablePositiveInt,
    currentSeason: nullablePositiveInt,
    currentEpisode: nullablePositiveInt,
    categoryIds: zod_1.z.array(zod_1.z.string().trim().min(1)).default([]),
});
exports.mediaPayloadSchema = mediaPayloadBaseSchema.superRefine((value, context) => {
    if (value.rating !== null && !['completed', 'reviewed'].includes(value.status)) {
        context.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['rating'],
            message: 'Rating is only allowed for completed or reviewed items.',
        });
    }
    if (value.liked !== null && !['completed', 'reviewed'].includes(value.status)) {
        context.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['liked'],
            message: 'Review preference is only allowed for completed or reviewed items.',
        });
    }
    if ((value.selectionCount ?? 0) > 0 && value.status !== 'planned') {
        context.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['selectionCount'],
            message: 'Selection count is only tracked for planned items.',
        });
    }
    if (value.type === 'movie') {
        const seriesFields = [
            'totalSeasons',
            'totalEpisodes',
            'currentSeason',
            'currentEpisode',
        ];
        for (const field of seriesFields) {
            if (value[field] !== null) {
                context.addIssue({
                    code: zod_1.z.ZodIssueCode.custom,
                    path: [field],
                    message: 'Series fields are only allowed for series items.',
                });
            }
        }
    }
    if (value.currentEpisode !== null && value.currentSeason === null) {
        context.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['currentSeason'],
            message: 'Current season is required when current episode is provided.',
        });
    }
    if (value.totalSeasons !== null &&
        value.currentSeason !== null &&
        value.currentSeason > value.totalSeasons) {
        context.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['currentSeason'],
            message: 'Current season cannot exceed total seasons.',
        });
    }
    if (value.totalEpisodes !== null &&
        value.currentEpisode !== null &&
        value.currentEpisode > value.totalEpisodes) {
        context.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['currentEpisode'],
            message: 'Current episode cannot exceed total episodes.',
        });
    }
});
exports.mediaUpdatePayloadSchema = mediaPayloadBaseSchema.partial();
exports.mediaQuerySchema = zod_1.z.object({
    type: zod_1.z.enum(['movie', 'series']).optional(),
    status: zod_1.z.enum(['planned', 'watching', 'suspended', 'completed', 'reviewed']).optional(),
    categoryId: zod_1.z.string().trim().optional(),
    search: zod_1.z.string().trim().optional(),
    sortBy: zod_1.z.enum(['title', 'rating', 'createdAt']).optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional(),
    page: zod_1.z.coerce.number().int().min(1).optional(),
    pageSize: zod_1.z.coerce.number().int().min(1).max(100).optional(),
});
