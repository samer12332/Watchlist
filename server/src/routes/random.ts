import { Router } from 'express';

import { asyncHandler } from '../lib/async-handler';
import { HttpError } from '../lib/http-error';
import { CategoryModel } from '../models/category';
import { MediaItemModel, MediaObjectId } from '../models/media-item';
import { mediaQuerySchema } from '../validation/media';

const router = Router();

type MediaStatus = 'planned' | 'watching' | 'suspended' | 'completed' | 'reviewed';

const pickRandomDocument = async <T>(count: number, finder: (skip: number) => Promise<T | null>) => {
  const randomIndex = Math.floor(Math.random() * count);
  return finder(randomIndex);
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

const normalizeMediaDocument = <T extends Record<string, any>>(mediaItem: T) => {
  const normalizedStatus = getNormalizedStatus(mediaItem.status, mediaItem.liked);

  return {
    ...mediaItem,
    status: normalizedStatus,
    liked: normalizedStatus === 'reviewed' ? false : mediaItem.liked ?? null,
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

router.get(
  '/category',
  asyncHandler(async (_request, response) => {
    const count = await CategoryModel.countDocuments();

    if (count === 0) {
      throw new HttpError(404, 'No categories available yet.');
    }

    const category = await pickRandomDocument(count, (skip) => CategoryModel.findOne().sort({ _id: 1 }).skip(skip));

    response.json({
      data: category,
    });
  })
);

router.get(
  '/media',
  asyncHandler(async (request, response) => {
    const query = mediaQuerySchema.parse(request.query);
    const buildFilters = (statusOverride?: MediaStatus) => {
      const filters: Record<string, unknown> = {};

      if (query.type) {
        filters.type = query.type;
      }

      if (query.categoryId) {
        filters.categories = new MediaObjectId(query.categoryId);
      }

      const statusFilters = buildStatusFilters((query.status as MediaStatus | undefined) ?? statusOverride);
      if (statusFilters) {
        Object.assign(filters, statusFilters);
      }

      return filters;
    };

    const preferredFilters = query.status ? buildFilters() : buildFilters('planned');
    let count = await MediaItemModel.countDocuments(preferredFilters);
    let filters = preferredFilters;

    if (!query.status && count === 0) {
      filters = buildFilters();
      count = await MediaItemModel.countDocuments(filters);
    }

    if (count === 0) {
      throw new HttpError(404, 'No media items match the selected filters.');
    }

    const mediaItem = await pickRandomDocument(count, (skip) =>
      MediaItemModel.findOne(filters).populate('categories').sort({ _id: 1 }).skip(skip)
    );

    response.json({
      data: mediaItem ? normalizeMediaDocument(mediaItem.toJSON()) : null,
    });
  })
);

export default router;
