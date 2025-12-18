import { z } from 'zod';
import { User } from '../../../domain/user/types/user.types';

/**
 * Schema for updating a user.
 * All fields are optional, but at least one field must be provided.
 */
export const updateUserSchema: z.ZodType<
  Partial<Pick<User, 'username' | 'name' | 'phone' | 'email'>>
> = z
  .object({
    username: z
      .string()
      .min(1, 'El nombre de usuario es requerido')
      .max(100, 'El nombre de usuario debe tener menos de 100 caracteres')
      .optional(),
    name: z
      .string()
      .min(1, 'El nombre es requerido')
      .max(100, 'El nombre debe tener menos de 100 caracteres')
      .optional(),
    phone: z
      .string()
      .min(1, 'El teléfono es requerido')
      .max(100, 'El teléfono debe tener menos de 100 caracteres')
      .optional(),
    email: z.string().email('Formato de email inválido').optional(),
  })
  .refine(
    (data) =>
      typeof data.username === 'string' ||
      typeof data.name === 'string' ||
      typeof data.phone === 'string' ||
      typeof data.email === 'string',
    'Proporciona al menos un campo para actualizar'
  );

export type UpdateUserDto = z.infer<typeof updateUserSchema>;

