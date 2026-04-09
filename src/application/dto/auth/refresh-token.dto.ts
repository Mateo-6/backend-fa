import { z } from 'zod';

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'El refresh token es requerido'),
});

export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
