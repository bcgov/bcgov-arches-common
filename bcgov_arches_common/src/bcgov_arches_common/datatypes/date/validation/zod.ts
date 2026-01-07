import { z } from 'zod';

export const DateValueSchema = z.object({
    display_value: z.string().nullish(),
    node_value: z.iso.date().nullish(),
    details: z.array(z.never()),
});

export const DateValueRequiredSchema = DateValueSchema.safeExtend({
    node_value: z.iso.date(),
});
