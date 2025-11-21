import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email format'),
  age: z.number().int('Age must be an integer').min(0, 'Age must be greater than or equal to 0').max(150, 'Age must be less than or equal to 150'),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
