import { z } from 'zod';
import { UserBase } from '../../../domain/user/types/user.types';

// The schema uses the same structure as UserBase, ensuring consistency
export const createUserSchema: z.ZodType<UserBase> = z.object({
  username: z.string().min(1, 'Username is required').max(100, 'Username must be less than 100 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  phone: z.string().min(1, 'Phone is required').max(100, 'Phone must be less than 100 characters'),
  email: z.string().email('Invalid email format'),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
