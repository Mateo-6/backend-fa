import { z } from 'zod';
import { Category, CategoryType } from '../../../domain/category/types/category.types';

export const createCategorySchema: z.ZodType<
  Pick<Category, 'name' | 'description' | 'type'>
> = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre debe tener menos de 100 caracteres'),
  description: z
    .string()
    .min(1, 'La descripción debe tener al menos 1 carácter')
    .max(255, 'La descripción debe tener menos de 255 caracteres')
    .optional(),
  type: z.nativeEnum(CategoryType, {
    message: 'El tipo debe ser "income", "expense" o "transfer"',
  }),
});

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;

