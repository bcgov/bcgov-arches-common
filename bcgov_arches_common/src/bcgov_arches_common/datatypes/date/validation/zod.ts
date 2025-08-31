import { z } from 'zod';

export const DateValueRequiredSchema = z.object({
    display_value: z.string().nullish(),
    node_value: z.iso.date(),
});

export const DateValueSchema = DateValueRequiredSchema.safeExtend({
    node_value: z.iso.date().nullish(),
});
