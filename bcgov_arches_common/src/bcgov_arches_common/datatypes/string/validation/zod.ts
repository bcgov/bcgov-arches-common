import { z } from 'zod';

/* Internal StringValue types */
/* @todo - Make languanges configurable */
// const languages = ['en'];
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

export const StringValueSchema = z.object({
    display_value: z.string(),
    node_value: StringNodeValueSchema,
});

export const StringValueRequiredSchema = z.object({
    display_value: z.string(),
    node_value: StringNodeValueRequiredSchema,
});

export function getStringValueSchema(maxLength: number = 0) {
    const nodeSchema = !maxLength
        ? StringNodeValueSchema
        : StringNodeValueSchema.safeExtend({
              en: LanguageValueSchema.safeExtend({
                  value: z
                      .string()
                      .max(maxLength, {
                          message: `Maximum length is ${maxLength} characters`,
                      })
                      .nullable(),
              }),
          });

    return StringValueSchema.safeExtend({
        node_value: nodeSchema,
    });
}

export function getStringValueRequiredSchema(maxLength: number = 0) {
    const nodeSchema = !maxLength
        ? StringNodeValueRequiredSchema
        : StringNodeValueRequiredSchema.safeExtend({
              en: LanguageValueSchema.safeExtend({
                  value: z
                      .string()
                      .min(1, { message: 'Value is required.' })
                      .max(maxLength, {
                          message: `Maximum length is ${maxLength} characters`,
                      })
                      .nullable(),
              }),
          });

    return StringValueRequiredSchema.safeExtend({
        node_value: nodeSchema,
    });
}
