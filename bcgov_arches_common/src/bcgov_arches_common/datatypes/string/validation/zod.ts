import { z } from 'zod';

/* Internal StringValue types */
const languages = ['en'];
const LanguageValueSchema = z.object({
    value: z.string().nullable(),
    direction: z.enum(['ltr', 'rtl']),
});
const StringNodeValueSchema = z.looseObject({ en: LanguageValueSchema });

const StringNodeValueRequiredSchema = z.looseObject({
    en: LanguageValueSchema.safeExtend({
        value: z.string().min(1, { message: 'Value is required.' }),
    }),
});
/* END Internal StringValue types */

export const StringValueSchema = z.object({
    display_value: z.string(),
    node_value: StringNodeValueSchema,
});

export const StringValueRequiredSchema = z.object({
    display_value: z.string(),
    node_value: StringNodeValueRequiredSchema,
});
