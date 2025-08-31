import { z } from 'zod';

const CollectionItemSchema = z.object({
    key: z.string(),
    label: z.string(),
    conceptid: z.string(),
    sortOrder: z.string().nullish(),
    get children() {
        return z.array(CollectionItemSchema);
    },
});

const ConceptValueSchema = z.object({
    display_value: z.string(),
    node_value: z.string().uuidv4(),
    details: z.array(CollectionItemSchema),
});

const ConceptValueRequiredSchema = ConceptValueSchema.safeExtend({
    node_value: z.string().uuidv4().min(1),
});
