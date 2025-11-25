import { z } from 'zod';
import { Category } from '../../../domain/category/types/category.types';

export const createCategorySchema: z.ZodType<
  Pick<Category, 'name' | 'description' | 'userId'>
> = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z
    .string()
    .min(1, 'Description must have at least 1 character')
    .max(255, 'Description must be less than 255 characters')
    .optional(),
  userId: z.string().min(1, 'User identifier is required'),
});

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;

