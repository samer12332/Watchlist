import { Router } from 'express';

import { asyncHandler } from '../lib/async-handler';
import { HttpError } from '../lib/http-error';
import { CategoryGroupModel } from '../models/category-group';
import { CategoryModel } from '../models/category';
import { MediaItemModel } from '../models/media-item';
import { categoryPayloadSchema } from '../validation/category';

const router = Router();

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findCategoryByName = async (name: string, excludeId?: string) => {
  const existing = await CategoryModel.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') },
  });

  if (!existing) {
    return null;
  }

  if (excludeId && existing.id === excludeId) {
    return null;
  }

  return existing;
};

const ensureGroupExists = async (groupId: string | null) => {
  if (!groupId) {
    return null;
  }

  const group = await CategoryGroupModel.findById(groupId);

  if (!group) {
    throw new HttpError(400, 'The selected category group does not exist.');
  }

  return group;
};

router.get(
  '/',
  asyncHandler(async (_request, response) => {
    const categories = await CategoryModel.find().populate('group').sort({ name: 1 });

    response.json({
      data: categories,
    });
  })
);

router.post(
  '/',
  asyncHandler(async (request, response) => {
    const payload = categoryPayloadSchema.parse(request.body);
    const duplicate = await findCategoryByName(payload.name);

    if (duplicate) {
      throw new HttpError(409, 'A category with that name already exists.');
    }

    const group = await ensureGroupExists(payload.groupId);

    const category = await CategoryModel.create({
      name: payload.name,
      color: payload.color,
      group: group?._id ?? null,
    });

    await category.populate('group');

    response.status(201).json({
      data: category,
      message: 'Category created.',
    });
  })
);

router.put(
  '/:id',
  asyncHandler(async (request, response) => {
    const payload = categoryPayloadSchema.parse(request.body);
    const category = await CategoryModel.findById(request.params.id);

    if (!category) {
      throw new HttpError(404, 'Category not found.');
    }

    const duplicate = await findCategoryByName(payload.name, category.id);

    if (duplicate) {
      throw new HttpError(409, 'A category with that name already exists.');
    }

    const group = await ensureGroupExists(payload.groupId);

    category.name = payload.name;
    category.color = payload.color;
    category.group = group?._id ?? null;
    await category.save();
    await category.populate('group');

    response.json({
      data: category,
      message: 'Category updated.',
    });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (request, response) => {
    const category = await CategoryModel.findById(request.params.id);

    if (!category) {
      throw new HttpError(404, 'Category not found.');
    }

    await MediaItemModel.updateMany(
      {
        categories: category._id,
      },
      {
        $pull: {
          categories: category._id,
        },
      }
    );

    await category.deleteOne();

    response.json({
      message: 'Category deleted.',
    });
  })
);

export default router;
