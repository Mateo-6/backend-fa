import { z } from 'zod';
import { User } from '../../../domain/user/types/user.types';

// The schema uses the same structure as User, ensuring consistency
export const createUserSchema: z.ZodType<User> = z.object({
  username: z.string().min(1, 'El nombre de usuario es requerido').max(100, 'El nombre de usuario debe tener menos de 100 caracteres'),
  name: z.string().min(1, 'El nombre es requerido').max(100, 'El nombre debe tener menos de 100 caracteres'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  phone: z.string().min(1, 'El teléfono es requerido').max(100, 'El teléfono debe tener menos de 100 caracteres'),
  email: z.string().email('Formato de email inválido'),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
