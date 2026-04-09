import { z } from 'zod';

export const toggleGmfExemptSchema = z.object({
  is_exempt: z.boolean({ message: 'El campo is_exempt debe ser un booleano' }),
});

export type ToggleGmfExemptDto = z.infer<typeof toggleGmfExemptSchema>;
