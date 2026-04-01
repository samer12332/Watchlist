import { z } from 'zod';

export const categoryGroupPayloadSchema = z.object({
  name: z.string().trim().min(1, 'Group name is required.').max(50, 'Group name is too long.'),
  color: z
    .union([
      z.string().trim().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color must be a valid hex value.'),
      z.null(),
    ])
    .optional()
    .transform((value) => value ?? null),
  description: z.union([z.string().trim().max(200), z.null()]).optional().transform((value) => value ?? null),
});
