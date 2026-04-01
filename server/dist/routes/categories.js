"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const async_handler_1 = require("../lib/async-handler");
const http_error_1 = require("../lib/http-error");
const category_group_1 = require("../models/category-group");
const category_1 = require("../models/category");
const media_item_1 = require("../models/media-item");
const category_2 = require("../validation/category");
const router = (0, express_1.Router)();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const findCategoryByName = async (name, excludeId) => {
    const existing = await category_1.CategoryModel.findOne({
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
const ensureGroupExists = async (groupId) => {
    if (!groupId) {
        return null;
    }
    const group = await category_group_1.CategoryGroupModel.findById(groupId);
    if (!group) {
        throw new http_error_1.HttpError(400, 'The selected category group does not exist.');
    }
    return group;
};
router.get('/', (0, async_handler_1.asyncHandler)(async (_request, response) => {
    const categories = await category_1.CategoryModel.find().populate('group').sort({ name: 1 });
    response.json({
        data: categories,
    });
}));
router.post('/', (0, async_handler_1.asyncHandler)(async (request, response) => {
    const payload = category_2.categoryPayloadSchema.parse(request.body);
    const duplicate = await findCategoryByName(payload.name);
    if (duplicate) {
        throw new http_error_1.HttpError(409, 'A category with that name already exists.');
    }
    const group = await ensureGroupExists(payload.groupId);
    const category = await category_1.CategoryModel.create({
        name: payload.name,
        color: payload.color,
        group: group?._id ?? null,
    });
    await category.populate('group');
    response.status(201).json({
        data: category,
        message: 'Category created.',
    });
}));
router.put('/:id', (0, async_handler_1.asyncHandler)(async (request, response) => {
    const payload = category_2.categoryPayloadSchema.parse(request.body);
    const category = await category_1.CategoryModel.findById(request.params.id);
    if (!category) {
        throw new http_error_1.HttpError(404, 'Category not found.');
    }
    const duplicate = await findCategoryByName(payload.name, category.id);
    if (duplicate) {
        throw new http_error_1.HttpError(409, 'A category with that name already exists.');
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
}));
router.delete('/:id', (0, async_handler_1.asyncHandler)(async (request, response) => {
    const category = await category_1.CategoryModel.findById(request.params.id);
    if (!category) {
        throw new http_error_1.HttpError(404, 'Category not found.');
    }
    await media_item_1.MediaItemModel.updateMany({
        categories: category._id,
    }, {
        $pull: {
            categories: category._id,
        },
    });
    await category.deleteOne();
    response.json({
        message: 'Category deleted.',
    });
}));
exports.default = router;
