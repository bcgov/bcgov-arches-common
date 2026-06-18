import { z } from 'zod';

export const DateValueSchema = z.object({
    display_value: z.string().nullish(),
    node_value: z.iso.date().nullish(),
    details: z.array(z.never()),
});

export const DateValueRequiredSchema = DateValueSchema.safeExtend({
    node_value: z.iso.date(),
});

const baseYearValidator = z
    .coerce.number().int().min(1000, { message: 'Year must be after 1000' }).max(2100, { message: 'Year must be before 2100' });

export const YearValueSchema = z.object({
    display_value: z.string().nullish(),
    node_value: baseYearValidator.nullable(),
    details: z.array(z.never()),
});

export const YearValueRequiredSchema = YearValueSchema.safeExtend({
    node_value: baseYearValidator,
});
