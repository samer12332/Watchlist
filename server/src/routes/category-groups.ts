import { Router } from 'express';

import { asyncHandler } from '../lib/async-handler';
import { HttpError } from '../lib/http-error';
import { CategoryGroupModel } from '../models/category-group';
import { CategoryModel } from '../models/category';
import { categoryGroupPayloadSchema } from '../validation/category-group';

const router = Router();

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findGroupByName = async (name: string, excludeId?: string) => {
  const existing = await CategoryGroupModel.findOne({
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

router.get(
  '/',
  asyncHandler(async (_request, response) => {
    const groups = await CategoryGroupModel.find().sort({ name: 1 });
    response.json({ data: groups });
  })
);

router.post(
  '/',
  asyncHandler(async (request, response) => {
    const payload = categoryGroupPayloadSchema.parse(request.body);
    const duplicate = await findGroupByName(payload.name);

    if (duplicate) {
      throw new HttpError(409, 'A category group with that name already exists.');
    }

    const group = await CategoryGroupModel.create(payload);
    response.status(201).json({ data: group, message: 'Category group created.' });
  })
);

router.put(
  '/:id',
  asyncHandler(async (request, response) => {
    const payload = categoryGroupPayloadSchema.parse(request.body);
    const group = await CategoryGroupModel.findById(request.params.id);

    if (!group) {
      throw new HttpError(404, 'Category group not found.');
    }

    const duplicate = await findGroupByName(payload.name, group.id);

    if (duplicate) {
      throw new HttpError(409, 'A category group with that name already exists.');
    }

    group.name = payload.name;
    group.color = payload.color;
    group.description = payload.description;
    await group.save();

    response.json({ data: group, message: 'Category group updated.' });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (request, response) => {
    const group = await CategoryGroupModel.findById(request.params.id);

    if (!group) {
      throw new HttpError(404, 'Category group not found.');
    }

    await CategoryModel.updateMany({ group: group._id }, { $set: { group: null } });
    await group.deleteOne();

    response.json({ message: 'Category group deleted.' });
  })
);

export default router;
