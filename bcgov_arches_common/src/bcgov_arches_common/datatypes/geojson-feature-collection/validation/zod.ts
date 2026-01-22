import { z } from 'zod';

export const GeoJSONPositionSchema = z
    .array(z.number())
    .refine((arr) => arr.length >= 2 && arr.length <= 4, {
        message:
            'Position must have 2-4 coordinates (longitude, latitude, [altitude], [m])',
    });

export const GeoJSONGeometryTypeSchema = z.enum([
    'Point',
    'LineString',
    'Polygon',
    'MultiPoint',
    'MultiLineString',
    'MultiPolygon',
    'GeometryCollection',
]);

export const PointGeometrySchema = z.object({
    type: z.literal('Point'),
    coordinates: GeoJSONPositionSchema,
});

export const LineStringGeometrySchema = z.object({
    type: z.literal('LineString'),
    coordinates: z.array(GeoJSONPositionSchema).min(2),
});

export const PolygonGeometrySchema = z.object({
    type: z.literal('Polygon'),
    coordinates: z
        .array(
            // Each ring is an array of positions
            z
                .array(GeoJSONPositionSchema)
                .refine(
                    (ring) => ring.length >= 4, // First and last positions are the same
                    {
                        message:
                            'Polygon rings must have at least 4 positions (first and last positions are equal)',
                    },
                )
                .refine(
                    (ring) =>
                        JSON.stringify(ring[0]) ===
                        JSON.stringify(ring[ring.length - 1]),
                    {
                        message:
                            'First and last positions in a polygon ring must be the same',
                    },
                ),
        )
        .min(1), // At least one ring (exterior)
});

export const MultiPointGeometrySchema = z.object({
    type: z.literal('MultiPoint'),
    coordinates: z.array(GeoJSONPositionSchema),
});

export const MultiLineStringGeometrySchema = z.object({
    type: z.literal('MultiLineString'),
    coordinates: z.array(z.array(GeoJSONPositionSchema).min(2)),
});

export const MultiPolygonGeometrySchema = z.object({
    type: z.literal('MultiPolygon'),
    coordinates: z.array(
        z
            .array(
                z
                    .array(GeoJSONPositionSchema)
                    .refine((ring) => ring.length >= 4, {
                        message: 'Polygon rings must have at least 4 positions',
                    })
                    .refine(
                        (ring) =>
                            JSON.stringify(ring[0]) ===
                            JSON.stringify(ring[ring.length - 1]),
                        {
                            message:
                                'First and last positions in a polygon ring must be the same',
                        },
                    ),
            )
            .min(1),
    ),
});

const GeoJSONGeometrySchema = z.discriminatedUnion('type', [
    PointGeometrySchema,
    LineStringGeometrySchema,
    PolygonGeometrySchema,
    MultiPointGeometrySchema,
    MultiLineStringGeometrySchema,
    MultiPolygonGeometrySchema,
]);

export const GeometryCollectionSchema = z.object({
    type: z.literal('GeometryCollection'),
    geometries: z.array(GeoJSONGeometrySchema),
});

const GeoJSONGeometryWithCollectionSchema = z.union([
    GeoJSONGeometrySchema,
    GeometryCollectionSchema,
]);

export const GeoJSONFeatureSchema = z.object({
    type: z.literal('Feature'),
    geometry: GeoJSONGeometryWithCollectionSchema.nullable(),
    properties: z.record(z.string(), z.any()).nullable(),
    id: z.union([z.string(), z.number()]).optional(),
});

export const GeoJSONFeatureCollectionSchema = z.object({
    type: z.literal('FeatureCollection'),
    features: z.array(GeoJSONFeatureSchema),
    bbox: z.array(z.number()).optional(),
});

export type GeoJSONFeatureCollection = z.infer<
    typeof GeoJSONFeatureCollectionSchema
>;

export const GeoJSONFeatureCollectionValueSchema = z.object({
    display_value: z.string(),
    node_value: GeoJSONFeatureCollectionSchema.nullable(),
    details: z.array(z.object()),
});

export type GeoJSONFeatureCollectionValue = z.infer<
    typeof GeoJSONFeatureCollectionValueSchema
>;

export const validateFeatureCollection = (data: unknown) => {
    try {
        const result = GeoJSONFeatureCollectionSchema.parse(data);
        console.log('Valid FeatureCollection:', result.type);
        console.log('Features count:', result.features.length);
        return { valid: true, data: result };
    } catch (error) {
        console.error('Invalid FeatureCollection:', error);
        return { valid: false, error };
    }
};
