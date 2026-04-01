import { Router } from 'express';

import { asyncHandler } from '../lib/async-handler';
import { fetchExternalMetadata, hasExternalMetadataConfig, mergeExternalMetadata } from '../lib/external-metadata';
import { HttpError } from '../lib/http-error';
import { CategoryModel } from '../models/category';
import { MediaItemModel, MediaObjectId } from '../models/media-item';
import { mediaPayloadSchema, mediaQuerySchema, mediaUpdatePayloadSchema } from '../validation/media';

const router = Router();
const DEFAULT_PAGE_SIZE = 24;
const MIN_ALLOWED_RATING = 6.5;

const sanitizeSyncedRating = (rating: number | null) => (rating !== null && rating < MIN_ALLOWED_RATING ? null : rating);


type MediaStatus = 'planned' | 'watching' | 'suspended' | 'completed' | 'reviewed';

type MediaPayloadLike = {
  title: string;
  type: 'movie' | 'series';
  status: MediaStatus;
  rating: number | null;
  liked: boolean | null;
  isBookmarked?: boolean;
  ageCertification?: string | null;
  isAdult?: boolean;
  keywords?: string[];
  overview?: string | null;
  selectionCount?: number;
  notes?: string | null;
  releaseYear: number | null;
  posterUrl: string | null;
  totalSeasons: number | null;
  totalEpisodes: number | null;
  currentSeason: number | null;
  currentEpisode: number | null;
  categoryIds: string[];
};

const pickDefined = <T>(value: T | undefined, fallback: T) => (value !== undefined ? value : fallback);
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ensureUniqueMediaTitleForType = async (title: string, type: 'movie' | 'series', excludeId?: string) => {
  const filters: Record<string, unknown> = {
    type,
    title: {
      $regex: `^${escapeRegex(title.trim())}$`,
      $options: 'i',
    },
  };

  if (excludeId) {
    filters._id = { $ne: new MediaObjectId(excludeId) };
  }

  const existing = await MediaItemModel.findOne(filters).select('_id title type');

  if (existing) {
    throw new HttpError(409, `A ${type} named "${title.trim()}" already exists.`);
  }
};

const ensureCategoriesExist = async (categoryIds: string[]) => {
  const uniqueIds = [...new Set(categoryIds)];

  if (uniqueIds.length === 0) {
    return uniqueIds;
  }

  const count = await CategoryModel.countDocuments({
    _id: {
      $in: uniqueIds,
    },
  });

  if (count !== uniqueIds.length) {
    throw new HttpError(400, 'One or more category ids are invalid.');
  }

  return uniqueIds;
};

const getNormalizedStatus = (status: unknown, liked: unknown): MediaStatus => {
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

const normalizeLikedForStatus = (status: MediaStatus, liked: boolean | null) => {
  if (status === 'reviewed') {
    return false;
  }

  if (status === 'completed') {
    return liked === false ? null : liked;
  }

  return null;
};

const normalizeMediaDocument = <T extends Record<string, any>>(mediaItem: T) => {
  const normalizedStatus = getNormalizedStatus(mediaItem.status, mediaItem.liked);

  return {
    ...mediaItem,
    status: normalizedStatus,
    liked: normalizeLikedForStatus(normalizedStatus, mediaItem.liked ?? null),
    isBookmarked: Boolean(mediaItem.isBookmarked),
    ageCertification: mediaItem.ageCertification ?? null,
    isAdult: Boolean(mediaItem.isAdult),
    keywords: Array.isArray(mediaItem.keywords) ? mediaItem.keywords : [],
    overview: mediaItem.overview ?? null,
  };
};

const buildStatusFilters = (status?: MediaStatus) => {
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

const buildMediaDocumentPayload = async <T extends MediaPayloadLike>(payload: T, options?: { forceExternal?: boolean }) => {
  const normalizedStatus = getNormalizedStatus(payload.status, payload.liked);
  const normalizedLiked = normalizeLikedForStatus(normalizedStatus, payload.liked);

  const external = await fetchExternalMetadata({
    title: payload.title,
    type: payload.type,
    releaseYear: payload.releaseYear,
  });

  const enriched = mergeExternalMetadata(
    {
      ...payload,
      status: normalizedStatus,
      liked: normalizedLiked,
      isBookmarked: payload.isBookmarked ?? false,
      ageCertification: payload.ageCertification ?? null,
      isAdult: payload.isAdult ?? false,
      keywords: payload.keywords ?? [],
      overview: payload.overview ?? null,
    },
    external,
    {
      force: options?.forceExternal ?? false,
    }
  );

  if (enriched.rating !== null && enriched.rating < MIN_ALLOWED_RATING) {
    throw new HttpError(400, `Items rated below ${MIN_ALLOWED_RATING} cannot be added to the library.`);
  }

  return {
    ...enriched,
    status: normalizedStatus,
    liked: normalizedLiked,
    selectionCount: normalizedStatus === 'planned' ? enriched.selectionCount ?? 0 : 0,
  };
};

router.get(
  '/',
  asyncHandler(async (request, response) => {
    const query = mediaQuerySchema.parse(request.query);
    const filters: Record<string, unknown> = {};

    if (query.type) {
      filters.type = query.type;
    }

    if (query.categoryId) {
      filters.categories = new MediaObjectId(query.categoryId);
    }

    const statusFilters = buildStatusFilters(query.status as MediaStatus | undefined);
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
    const sort = (sortBy === 'title' ? { title: sortOrder } : { [sortBy]: sortOrder, title: 1 }) as Record<string, 1 | -1>;

    const shouldPaginate = query.page !== undefined || query.pageSize !== undefined;
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const total = await MediaItemModel.countDocuments(filters);

    let mediaItemsQuery = MediaItemModel.find(filters).populate('categories').sort(sort as any);

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
  })
);

router.post(
  '/sync-metadata',
  asyncHandler(async (_request, response) => {
    if (!hasExternalMetadataConfig()) {
      throw new HttpError(400, 'OMDb and TMDb API keys are required for metadata sync.');
    }

    const mediaItems = (await MediaItemModel.find({})) as any[];
    let updated = 0;

    for (const mediaItem of mediaItems) {
      const external = await fetchExternalMetadata({
        title: mediaItem.title as string,
        type: mediaItem.type as 'movie' | 'series',
        releaseYear: mediaItem.releaseYear as number | null | undefined,
      });

      if (!external) {
        continue;
      }

      const merged = mergeExternalMetadata(
        {
          rating: mediaItem.rating as number | null,
          releaseYear: mediaItem.releaseYear as number | null,
          posterUrl: mediaItem.posterUrl as string | null,
          totalSeasons: mediaItem.totalSeasons as number | null,
          totalEpisodes: mediaItem.totalEpisodes as number | null,
          ageCertification: mediaItem.ageCertification as string | null,
          isAdult: Boolean(mediaItem.isAdult),
          keywords: Array.isArray(mediaItem.keywords) ? (mediaItem.keywords as string[]) : [],
          overview: mediaItem.overview as string | null,
        },
        external,
        { force: true }
      );

      mediaItem.rating = sanitizeSyncedRating(merged.rating);
      mediaItem.releaseYear = merged.releaseYear;
      mediaItem.posterUrl = merged.posterUrl;
      mediaItem.totalSeasons = merged.totalSeasons;
      mediaItem.totalEpisodes = merged.totalEpisodes;
      mediaItem.ageCertification = merged.ageCertification;
      mediaItem.isAdult = merged.isAdult;
      mediaItem.keywords = merged.keywords;
      mediaItem.overview = merged.overview;
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
  })
);

router.get(
  '/:id',
  asyncHandler(async (request, response) => {
    const mediaItem = await MediaItemModel.findById(request.params.id).populate('categories');

    if (!mediaItem) {
      throw new HttpError(404, 'Media item not found.');
    }

    response.json({
      data: normalizeMediaDocument(mediaItem.toJSON()),
    });
  })
);

router.post(
  '/',
  asyncHandler(async (request, response) => {
    const payload = mediaPayloadSchema.parse(request.body);
    const categoryIds = await ensureCategoriesExist(payload.categoryIds);
    await ensureUniqueMediaTitleForType(payload.title, payload.type);

    const mediaDocumentPayload = await buildMediaDocumentPayload({
      ...payload,
      categoryIds,
    });

    const mediaItem = await MediaItemModel.create({
      ...mediaDocumentPayload,
      categories: categoryIds,
    });

    await mediaItem.populate('categories');

    response.status(201).json({
      data: normalizeMediaDocument(mediaItem.toJSON()),
      message: 'Media item created.',
    });
  })
);

router.post(
  '/:id/sync-metadata',
  asyncHandler(async (request, response) => {
    if (!hasExternalMetadataConfig()) {
      throw new HttpError(400, 'OMDb and TMDb API keys are required for metadata sync.');
    }

    const mediaItem = (await MediaItemModel.findById(request.params.id)) as any;

    if (!mediaItem) {
      throw new HttpError(404, 'Media item not found.');
    }

    const external = await fetchExternalMetadata({
      title: mediaItem.title as string,
      type: mediaItem.type as 'movie' | 'series',
      releaseYear: mediaItem.releaseYear as number | null | undefined,
    });

    if (!external) {
      throw new HttpError(404, 'No external metadata match was found for this item.');
    }

    const merged = mergeExternalMetadata(
      {
        rating: mediaItem.rating as number | null,
        releaseYear: mediaItem.releaseYear as number | null,
        posterUrl: mediaItem.posterUrl as string | null,
        totalSeasons: mediaItem.totalSeasons as number | null,
        totalEpisodes: mediaItem.totalEpisodes as number | null,
        ageCertification: mediaItem.ageCertification as string | null,
        isAdult: Boolean(mediaItem.isAdult),
        keywords: Array.isArray(mediaItem.keywords) ? (mediaItem.keywords as string[]) : [],
        overview: mediaItem.overview as string | null,
      },
      external,
      { force: true }
    );

    mediaItem.rating = sanitizeSyncedRating(merged.rating);
    mediaItem.releaseYear = merged.releaseYear;
    mediaItem.posterUrl = merged.posterUrl;
    mediaItem.totalSeasons = merged.totalSeasons;
    mediaItem.totalEpisodes = merged.totalEpisodes;
    mediaItem.ageCertification = merged.ageCertification;
    mediaItem.isAdult = merged.isAdult;
    mediaItem.keywords = merged.keywords;
    mediaItem.overview = merged.overview;

    await mediaItem.save();
    await mediaItem.populate('categories');

    response.json({
      data: normalizeMediaDocument(mediaItem.toJSON()),
      message: 'Media metadata synced.',
    });
  })
);

router.put(
  '/:id',
  asyncHandler(async (request, response) => {
    const mediaItem = (await MediaItemModel.findById(request.params.id)) as any;

    if (!mediaItem) {
      throw new HttpError(404, 'Media item not found.');
    }

    const partialPayload = mediaUpdatePayloadSchema.parse(request.body);
    const nextStatus = pickDefined(partialPayload.status, getNormalizedStatus(mediaItem.status, mediaItem.liked));
    const nextSelectionCount = nextStatus === 'planned' ? pickDefined(partialPayload.selectionCount, mediaItem.selectionCount ?? 0) : 0;

    const mergedPayload = mediaPayloadSchema.parse({
      title: pickDefined(partialPayload.title, mediaItem.title),
      type: pickDefined(partialPayload.type, mediaItem.type),
      status: nextStatus,
      rating: pickDefined(partialPayload.rating, mediaItem.rating),
      liked: pickDefined(
        partialPayload.liked,
        normalizeLikedForStatus(getNormalizedStatus(mediaItem.status, mediaItem.liked), mediaItem.liked)
      ),
      isBookmarked: pickDefined(partialPayload.isBookmarked, Boolean(mediaItem.isBookmarked)),
      selectionCount: nextSelectionCount,
      notes: pickDefined(partialPayload.notes, mediaItem.notes),
      releaseYear: pickDefined(partialPayload.releaseYear, mediaItem.releaseYear),
      posterUrl: pickDefined(partialPayload.posterUrl, mediaItem.posterUrl),
      totalSeasons: pickDefined(partialPayload.totalSeasons, mediaItem.totalSeasons),
      totalEpisodes: pickDefined(partialPayload.totalEpisodes, mediaItem.totalEpisodes),
      currentSeason: pickDefined(partialPayload.currentSeason, mediaItem.currentSeason),
      currentEpisode: pickDefined(partialPayload.currentEpisode, mediaItem.currentEpisode),
      categoryIds: pickDefined(
        partialPayload.categoryIds,
        (mediaItem.categories as Array<{ toString: () => string }>).map((categoryId) => categoryId.toString())
      ),
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
    mediaItem.isBookmarked = mediaDocumentPayload.isBookmarked ?? false;
    mediaItem.ageCertification = mediaDocumentPayload.ageCertification;
    mediaItem.isAdult = mediaDocumentPayload.isAdult;
    mediaItem.keywords = mediaDocumentPayload.keywords;
    mediaItem.overview = mediaDocumentPayload.overview;
    mediaItem.selectionCount = mediaDocumentPayload.selectionCount ?? 0;
    mediaItem.notes = mediaDocumentPayload.notes;
    mediaItem.releaseYear = mediaDocumentPayload.releaseYear;
    mediaItem.posterUrl = mediaDocumentPayload.posterUrl;
    mediaItem.totalSeasons = mediaDocumentPayload.totalSeasons;
    mediaItem.totalEpisodes = mediaDocumentPayload.totalEpisodes;
    mediaItem.currentSeason = mediaDocumentPayload.currentSeason;
    mediaItem.currentEpisode = mediaDocumentPayload.currentEpisode;
    mediaItem.categories = categoryIds.map((id) => new MediaObjectId(id));

    await mediaItem.save();
    await mediaItem.populate('categories');

    response.json({
      data: normalizeMediaDocument(mediaItem.toJSON()),
      message: 'Media item updated.',
    });
  })
);

router.post(
  '/:id/select',
  asyncHandler(async (request, response) => {
    const mediaItem = (await MediaItemModel.findById(request.params.id)) as any;

    if (!mediaItem) {
      throw new HttpError(404, 'Media item not found.');
    }

    if (mediaItem.status !== 'planned') {
      throw new HttpError(400, 'Only planned items can be selected for watching.');
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
  })
);

router.delete(
  '/:id',
  asyncHandler(async (request, response) => {
    const mediaItem = await MediaItemModel.findById(request.params.id);

    if (!mediaItem) {
      throw new HttpError(404, 'Media item not found.');
    }

    await mediaItem.deleteOne();

    response.json({
      message: 'Media item deleted.',
    });
  })
);

export default router;






