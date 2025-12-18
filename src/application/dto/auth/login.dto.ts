import { z } from 'zod';

/**
 * Schema for validating login request data.
 */
export const loginSchema = z.object({
  email: z.string().email('Formato de email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

/**
 * Data Transfer Object for user login requests.
 */
export type LoginDto = z.infer<typeof loginSchema>;

