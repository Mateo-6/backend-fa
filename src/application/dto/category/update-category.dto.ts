import { z } from 'zod';
import { Category, CategoryType } from '../../../domain/category/types/category.types';

export const updateCategorySchema: z.ZodType<
  Partial<Pick<Category, 'name' | 'description' | 'type' | 'color' | 'icon'>>
> = z
  .object({
    name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre debe tener menos de 100 caracteres').optional(),
    description: z
      .string()
      .min(1, 'La descripción debe tener al menos 1 carácter')
      .max(255, 'La descripción debe tener menos de 255 caracteres')
      .optional(),
    type: z.nativeEnum(CategoryType, {
      message: 'El tipo debe ser "income", "expense" o "transfer"',
    }).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color inválido').nullable().optional(),
    icon: z.string().max(60, 'Nombre de icono inválido').nullable().optional(),
  })
  .refine(
    (data) =>
      typeof data.name === 'string' ||
      typeof data.description === 'string' ||
      typeof data.type === 'string' ||
      data.color !== undefined ||
      data.icon !== undefined,
    'Proporciona al menos un campo para actualizar'
  );

export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;

