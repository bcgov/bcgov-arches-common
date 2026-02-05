import { z } from 'zod';
import { htmlToPlainText } from '@/bcgov_arches_common/datatypes/string/validation/utils.ts';

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
        : StringNodeValueRequiredSchema.extend({
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

    return StringValueRequiredSchema.extend({
        node_value: nodeSchema,
    });
}

export function getRichTextValueSchema(maxLength: number = 0) {
    const nodeSchema = !maxLength
        ? StringNodeValueSchema
        : StringNodeValueSchema.safeExtend({
              en: LanguageValueSchema.safeExtend({
                  value: z
                      .string()
                      .refine(
                          (value: string) =>
                              htmlToPlainText(value).length <= maxLength,
                          {
                              message: `Maximum length is ${maxLength} characters`,
                          },
                      )
                      .nullable(),
              }),
          });

    return StringValueSchema.safeExtend({
        node_value: nodeSchema,
    });
}

export function getRichTextValueRequiredSchema(maxLength: number = 0) {
    const nodeSchema = !maxLength
        ? StringNodeValueRequiredSchema
        : StringNodeValueRequiredSchema.extend({
              en: LanguageValueSchema.safeExtend({
                  value: z
                      .string()
                      .refine((value: string) => value !== '', {
                          message: 'Value is required.',
                      })
                      .refine(
                          (value: string) =>
                              htmlToPlainText(value).length <= maxLength,
                          {
                              message: `Maximum length is ${maxLength} characters`,
                          },
                      )
                      .nullable(),
              }),
          });

    return StringValueRequiredSchema.extend({
        node_value: nodeSchema,
    });
}

export function getBCPostalCodeSchema() {
    return StringValueSchema.refine(
        function (val: any) {
            const str = val?.display_value || '';
            if (!str) return true;
            return /^[A-Z]\d[A-Z] \d[A-Z]\d$/.test(str);
        },
        {
            message: 'Invalid format. Please use A1B 2C3',
        },
    );
}

export function formatBCPostalCode(value: string): string {
    const raw = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (raw.length > 3) {
        return (raw.slice(0, 3) + ' ' + raw.slice(3, 6)).slice(0, 7);
    }
    return raw.slice(0, 3);
}
