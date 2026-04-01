import { z } from 'zod';

export const categoryPayloadSchema = z.object({
  name: z.string().trim().min(1, 'Category name is required.').max(50, 'Category name is too long.'),
  color: z
    .union([
      z.string().trim().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color must be a valid hex value.'),
      z.null(),
    ])
    .optional()
    .transform((value) => value ?? null),
  groupId: z.union([z.string().trim().min(1), z.null()]).optional().transform((value) => value ?? null),
});
