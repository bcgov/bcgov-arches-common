import { z } from 'zod';
import { CollectionItemSchema } from '@/bcgov_arches_common/datatypes/concept/validation/zod.ts';

export const ConceptListValueSchema = z.object({
    display_value: z.string(),
    node_value: z.array(z.uuidv4()),
    details: z.array(CollectionItemSchema),
});

export const ConceptListValueRequiredSchema = ConceptListValueSchema.safeExtend(
    {
        node_value: z
            .array(z.uuidv4())
            .min(1, { message: 'Value is required.' }),
    },
);
