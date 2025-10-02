import { z } from 'zod';

const ResourceInstanceReferenceSchema = z.object({
    resourceId: z.string().uuidv4(),
    ontologyProperty: z.string().nullable(),
    resourceXresourceId: z.string().nullable(),
    inverseOntologyProperty: z.string().nullable(),
});

const ResourceInstanceValueDetailsSchema = z.object({
    display_value: z.string(),
    resource_id: z.string().uuidv4(),
});

export const ResourceInstanceValueSchema = z.object({
    display_value: z.string(),
    node_value: ResourceInstanceReferenceSchema.nullable(),
    details: z.array(ResourceInstanceValueDetailsSchema),
});

export const ResourceInstanceValueRequiredSchema =
    ResourceInstanceValueSchema.safeExtend({
        node_value: ResourceInstanceReferenceSchema,
    });
