import { z } from 'zod';

/**
 * Schema for validating login request data.
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Data Transfer Object for user login requests.
 */
export type LoginDto = z.infer<typeof loginSchema>;

