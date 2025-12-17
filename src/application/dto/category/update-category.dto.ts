import { z } from 'zod';
import { Category, CategoryType } from '../../../domain/category/types/category.types';

export const updateCategorySchema: z.ZodType<
  Partial<Pick<Category, 'name' | 'description' | 'type'>>
> = z
  .object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').optional(),
    description: z
      .string()
      .min(1, 'Description must have at least 1 character')
      .max(255, 'Description must be less than 255 characters')
      .optional(),
    type: z.nativeEnum(CategoryType, {
      errorMap: () => ({ message: 'Type must be either "income" or "expense"' }),
    }).optional(),
  })
  .refine(
    (data) => typeof data.name === 'string' || typeof data.description === 'string' || typeof data.type === 'string',
    'Provide at least one field to update'
  );

export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;

