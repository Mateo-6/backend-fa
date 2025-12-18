import { z } from 'zod';
import { Category, CategoryType } from '../../../domain/category/types/category.types';

export const updateCategorySchema: z.ZodType<
  Partial<Pick<Category, 'name' | 'description' | 'type'>>
> = z
  .object({
    name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre debe tener menos de 100 caracteres').optional(),
    description: z
      .string()
      .min(1, 'La descripción debe tener al menos 1 carácter')
      .max(255, 'La descripción debe tener menos de 255 caracteres')
      .optional(),
    type: z.nativeEnum(CategoryType, {
      errorMap: () => ({ message: 'El tipo debe ser "income" o "expense"' }),
    }).optional(),
  })
  .refine(
    (data) => typeof data.name === 'string' || typeof data.description === 'string' || typeof data.type === 'string',
    'Proporciona al menos un campo para actualizar'
  );

export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;

