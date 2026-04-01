import { z } from 'zod';

const nullableString = z.union([z.string().trim(), z.null()]).optional().transform((value) => value ?? null);
const nullablePositiveInt = z
  .union([z.number().int().min(1), z.null()])
  .optional()
  .transform((value) => value ?? null);
const nullableRating = z
  .union([z.number().min(6.5, 'Rating must be at least 6.5.').max(10), z.null()])
  .optional()
  .transform((value) => value ?? null);
const nullableBoolean = z.union([z.boolean(), z.null()]).optional().transform((value) => value ?? null);
const selectionCountSchema = z.number().int().min(0).optional();

const mediaPayloadBaseSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(200, 'Title is too long.'),
  type: z.enum(['movie', 'series']),
  status: z.enum(['planned', 'watching', 'suspended', 'completed', 'reviewed']),
  rating: nullableRating,
  liked: nullableBoolean,
  isBookmarked: z.boolean().optional().default(false),
  selectionCount: selectionCountSchema,
  notes: nullableString,
  releaseYear: z
    .union([z.number().int().min(1800).max(3000), z.null()])
    .optional()
    .transform((value) => value ?? null),
  posterUrl: z
    .union([z.string().trim().url('Poster URL must be a valid URL.'), z.null()])
    .optional()
    .transform((value) => value ?? null),
  totalSeasons: nullablePositiveInt,
  totalEpisodes: nullablePositiveInt,
  currentSeason: nullablePositiveInt,
  currentEpisode: nullablePositiveInt,
  categoryIds: z.array(z.string().trim().min(1)).default([]),
});

export const mediaPayloadSchema = mediaPayloadBaseSchema.superRefine((value, context) => {
  if (value.rating !== null && !['completed', 'reviewed'].includes(value.status)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['rating'],
      message: 'Rating is only allowed for completed or reviewed items.',
    });
  }

  if (value.liked !== null && !['completed', 'reviewed'].includes(value.status)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['liked'],
      message: 'Review preference is only allowed for completed or reviewed items.',
    });
  }

  if ((value.selectionCount ?? 0) > 0 && value.status !== 'planned') {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['selectionCount'],
      message: 'Selection count is only tracked for planned items.',
    });
  }

  if (value.type === 'movie') {
    const seriesFields: Array<keyof typeof value> = [
      'totalSeasons',
      'totalEpisodes',
      'currentSeason',
      'currentEpisode',
    ];

    for (const field of seriesFields) {
      if (value[field] !== null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: 'Series fields are only allowed for series items.',
        });
      }
    }
  }

  if (value.currentEpisode !== null && value.currentSeason === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['currentSeason'],
      message: 'Current season is required when current episode is provided.',
    });
  }

  if (
    value.totalSeasons !== null &&
    value.currentSeason !== null &&
    value.currentSeason > value.totalSeasons
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['currentSeason'],
      message: 'Current season cannot exceed total seasons.',
    });
  }

  if (
    value.totalEpisodes !== null &&
    value.currentEpisode !== null &&
    value.currentEpisode > value.totalEpisodes
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['currentEpisode'],
      message: 'Current episode cannot exceed total episodes.',
    });
  }
});

export const mediaUpdatePayloadSchema = mediaPayloadBaseSchema.partial();

export const mediaQuerySchema = z.object({
  type: z.enum(['movie', 'series']).optional(),
  status: z.enum(['planned', 'watching', 'suspended', 'completed', 'reviewed']).optional(),
  categoryId: z.string().trim().optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(['title', 'rating', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
