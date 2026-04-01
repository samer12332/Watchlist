"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryPayloadSchema = void 0;
const zod_1 = require("zod");
exports.categoryPayloadSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1, 'Category name is required.').max(50, 'Category name is too long.'),
    color: zod_1.z
        .union([
        zod_1.z.string().trim().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color must be a valid hex value.'),
        zod_1.z.null(),
    ])
        .optional()
        .transform((value) => value ?? null),
    groupId: zod_1.z.union([zod_1.z.string().trim().min(1), zod_1.z.null()]).optional().transform((value) => value ?? null),
});
