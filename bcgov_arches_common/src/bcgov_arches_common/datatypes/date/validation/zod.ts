import { z } from 'zod';

export const DateValueRequiredSchema = z.object({
    display_value: z.string().nullish(),
    node_value: z.iso.date(),
});

export const DateValueSchema = DateValueRequiredSchema.extend({
    node_value: z.iso.date().nullish(),
});
