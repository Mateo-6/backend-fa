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
      .min(1, 'Username is required')
      .max(100, 'Username must be less than 100 characters')
      .optional(),
    name: z
      .string()
      .min(1, 'Name is required')
      .max(100, 'Name must be less than 100 characters')
      .optional(),
    phone: z
      .string()
      .min(1, 'Phone is required')
      .max(100, 'Phone must be less than 100 characters')
      .optional(),
    email: z.string().email('Invalid email format').optional(),
  })
  .refine(
    (data) =>
      typeof data.username === 'string' ||
      typeof data.name === 'string' ||
      typeof data.phone === 'string' ||
      typeof data.email === 'string',
    'Provide at least one field to update'
  );

export type UpdateUserDto = z.infer<typeof updateUserSchema>;

