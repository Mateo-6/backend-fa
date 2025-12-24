import { z } from 'zod';

/**
 * Schema for registering an Expo push token.
 * Validates that the token is a non-empty string.
 */
export const registerPushTokenSchema = z.object({
  token: z.string().min(1, 'El token es requerido'),
});

export type RegisterPushTokenDto = z.infer<typeof registerPushTokenSchema>;

