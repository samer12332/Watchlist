"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryGroupPayloadSchema = void 0;
const zod_1 = require("zod");
exports.categoryGroupPayloadSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1, 'Group name is required.').max(50, 'Group name is too long.'),
    color: zod_1.z
        .union([
        zod_1.z.string().trim().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color must be a valid hex value.'),
        zod_1.z.null(),
    ])
        .optional()
        .transform((value) => value ?? null),
    description: zod_1.z.union([zod_1.z.string().trim().max(200), zod_1.z.null()]).optional().transform((value) => value ?? null),
});
