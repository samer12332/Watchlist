"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const async_handler_1 = require("../lib/async-handler");
const http_error_1 = require("../lib/http-error");
const category_group_1 = require("../models/category-group");
const category_1 = require("../models/category");
const category_group_2 = require("../validation/category-group");
const router = (0, express_1.Router)();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const findGroupByName = async (name, excludeId) => {
    const existing = await category_group_1.CategoryGroupModel.findOne({
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
router.get('/', (0, async_handler_1.asyncHandler)(async (_request, response) => {
    const groups = await category_group_1.CategoryGroupModel.find().sort({ name: 1 });
    response.json({ data: groups });
}));
router.post('/', (0, async_handler_1.asyncHandler)(async (request, response) => {
    const payload = category_group_2.categoryGroupPayloadSchema.parse(request.body);
    const duplicate = await findGroupByName(payload.name);
    if (duplicate) {
        throw new http_error_1.HttpError(409, 'A category group with that name already exists.');
    }
    const group = await category_group_1.CategoryGroupModel.create(payload);
    response.status(201).json({ data: group, message: 'Category group created.' });
}));
router.put('/:id', (0, async_handler_1.asyncHandler)(async (request, response) => {
    const payload = category_group_2.categoryGroupPayloadSchema.parse(request.body);
    const group = await category_group_1.CategoryGroupModel.findById(request.params.id);
    if (!group) {
        throw new http_error_1.HttpError(404, 'Category group not found.');
    }
    const duplicate = await findGroupByName(payload.name, group.id);
    if (duplicate) {
        throw new http_error_1.HttpError(409, 'A category group with that name already exists.');
    }
    group.name = payload.name;
    group.color = payload.color;
    group.description = payload.description;
    await group.save();
    response.json({ data: group, message: 'Category group updated.' });
}));
router.delete('/:id', (0, async_handler_1.asyncHandler)(async (request, response) => {
    const group = await category_group_1.CategoryGroupModel.findById(request.params.id);
    if (!group) {
        throw new http_error_1.HttpError(404, 'Category group not found.');
    }
    await category_1.CategoryModel.updateMany({ group: group._id }, { $set: { group: null } });
    await group.deleteOne();
    response.json({ message: 'Category group deleted.' });
}));
exports.default = router;
