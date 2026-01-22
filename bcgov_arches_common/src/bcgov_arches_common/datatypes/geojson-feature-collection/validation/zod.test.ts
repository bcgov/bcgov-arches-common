// geojson-feature-collection.zod.test.ts
import { describe, expect, it } from 'vitest';
import {
    GeoJSONFeatureCollectionSchema,
    GeoJSONFeatureCollectionValueSchema,
    PointGeometrySchema,
    PolygonGeometrySchema,
    LineStringGeometrySchema,
    GeoJSONFeatureSchema,
} from '@/bcgov_arches_common/datatypes/geojson-feature-collection/validation/zod'; // adjust the import path as needed

describe('GeoJSON Feature Collection Schemas', () => {
    // Valid test cases
    describe('Valid schemas', () => {
        it('should validate a feature collection with a point feature', () => {
            const validFeatureCollection = {
                type: 'FeatureCollection',
                features: [
                    {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [-122.4194, 37.7749],
                        },
                        properties: {
                            name: 'San Francisco',
                        },
                    },
                ],
            };

            const result = GeoJSONFeatureCollectionSchema.safeParse(
                validFeatureCollection,
            );
            expect(result.success).toBe(true);
        });

        it('should validate a feature collection with multiple geometry types', () => {
            const validFeatureCollection = {
                type: 'FeatureCollection',
                features: [
                    {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [-122.4194, 37.7749],
                        },
                        properties: {
                            name: 'Point Feature',
                        },
                    },
                    {
                        type: 'Feature',
                        geometry: {
                            type: 'LineString',
                            coordinates: [
                                [-122.4194, 37.7749],
                                [-123.4194, 38.7749],
                            ],
                        },
                        properties: {
                            name: 'LineString Feature',
                        },
                    },
                    {
                        type: 'Feature',
                        geometry: {
                            type: 'Polygon',
                            coordinates: [
                                [
                                    [-122.4194, 37.7749],
                                    [-123.4194, 37.7749],
                                    [-123.4194, 38.7749],
                                    [-122.4194, 38.7749],
                                    [-122.4194, 37.7749],
                                ],
                            ],
                        },
                        properties: {
                            name: 'Polygon Feature',
                        },
                    },
                ],
                bbox: [-123.4194, 37.7749, -122.4194, 38.7749],
            };

            const result = GeoJSONFeatureCollectionSchema.safeParse(
                validFeatureCollection,
            );
            expect(result.success).toBe(true);
        });

        it('should validate a feature collection with a null geometry', () => {
            const validFeatureCollection = {
                type: 'FeatureCollection',
                features: [
                    {
                        type: 'Feature',
                        geometry: null,
                        properties: {
                            name: 'Feature with null geometry',
                        },
                    },
                ],
            };

            const result = GeoJSONFeatureCollectionSchema.safeParse(
                validFeatureCollection,
            );
            expect(result.success).toBe(true);
        });

        it('should validate a GeoJSONFeatureCollectionValue', () => {
            const validFeatureCollectionValue = {
                display_value: 'Test Feature Collection',
                node_value: {
                    type: 'FeatureCollection',
                    features: [
                        {
                            type: 'Feature',
                            geometry: {
                                type: 'Point',
                                coordinates: [-122.4194, 37.7749],
                            },
                            properties: {
                                name: 'San Francisco',
                            },
                        },
                    ],
                },
                details: [],
            };

            const result = GeoJSONFeatureCollectionValueSchema.safeParse(
                validFeatureCollectionValue,
            );
            expect(result.success).toBe(true);
        });

        it('should validate a GeoJSONFeatureCollectionValue with null node_value', () => {
            const validFeatureCollectionValue = {
                display_value: 'Empty Feature Collection',
                node_value: null,
                details: [],
            };

            const result = GeoJSONFeatureCollectionValueSchema.safeParse(
                validFeatureCollectionValue,
            );
            expect(result.success).toBe(true);
        });
    });

    // Invalid test cases
    describe('Invalid schemas', () => {
        it('should reject a feature collection with wrong type', () => {
            const invalidFeatureCollection = {
                type: 'FeatureCollectionInvalid', // Wrong type
                features: [],
            };

            const result = GeoJSONFeatureCollectionSchema.safeParse(
                invalidFeatureCollection,
            );
            expect(result.success).toBe(false);
        });

        it('should reject a feature collection with invalid features array', () => {
            const invalidFeatureCollection = {
                type: 'FeatureCollection',
                features: 'not an array', // Should be an array
            };

            const result = GeoJSONFeatureCollectionSchema.safeParse(
                invalidFeatureCollection,
            );
            expect(result.success).toBe(false);
        });

        it('should reject a feature with wrong geometry type', () => {
            const invalidFeatureCollection = {
                type: 'FeatureCollection',
                features: [
                    {
                        type: 'Feature',
                        geometry: {
                            type: 'InvalidGeometry', // Invalid geometry type
                            coordinates: [-122.4194, 37.7749],
                        },
                        properties: {},
                    },
                ],
            };

            const result = GeoJSONFeatureCollectionSchema.safeParse(
                invalidFeatureCollection,
            );
            expect(result.success).toBe(false);
        });

        it('should reject a polygon with non-closed ring', () => {
            const invalidFeatureCollection = {
                type: 'FeatureCollection',
                features: [
                    {
                        type: 'Feature',
                        geometry: {
                            type: 'Polygon',
                            coordinates: [
                                [
                                    [-122.4194, 37.7749],
                                    [-123.4194, 37.7749],
                                    [-123.4194, 38.7749],
                                    [-122.4194, 38.7749],
                                    // Missing closing point that should be the same as first point
                                ],
                            ],
                        },
                        properties: {},
                    },
                ],
            };

            const result = GeoJSONFeatureCollectionSchema.safeParse(
                invalidFeatureCollection,
            );
            expect(result.success).toBe(false);
        });

        it('should reject a line string with fewer than 2 positions', () => {
            const invalidFeatureCollection = {
                type: 'FeatureCollection',
                features: [
                    {
                        type: 'Feature',
                        geometry: {
                            type: 'LineString',
                            coordinates: [
                                [-122.4194, 37.7749],
                                // Needs at least 2 positions
                            ],
                        },
                        properties: {},
                    },
                ],
            };

            const result = GeoJSONFeatureCollectionSchema.safeParse(
                invalidFeatureCollection,
            );
            expect(result.success).toBe(false);
        });

        it('should reject a position with invalid coordinates', () => {
            const invalidFeatureCollection = {
                type: 'FeatureCollection',
                features: [
                    {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [-122.4194], // Missing latitude
                        },
                        properties: {},
                    },
                ],
            };

            const result = GeoJSONFeatureCollectionSchema.safeParse(
                invalidFeatureCollection,
            );
            expect(result.success).toBe(false);
        });

        it('should reject a feature collection value with invalid structure', () => {
            const invalidFeatureCollectionValue = {
                display_value: 'Test Feature Collection',
                node_value: {
                    // Missing required 'type' field
                    features: [],
                },
                details: [],
            };

            const result = GeoJSONFeatureCollectionValueSchema.safeParse(
                invalidFeatureCollectionValue,
            );
            expect(result.success).toBe(false);
        });
    });

    // Individual schemas test cases
    describe('Individual schema components', () => {
        it('should validate a Point geometry', () => {
            const validPoint = {
                type: 'Point',
                coordinates: [-122.4194, 37.7749],
            };

            const result = PointGeometrySchema.safeParse(validPoint);
            expect(result.success).toBe(true);
        });

        it('should validate a LineString geometry', () => {
            const validLineString = {
                type: 'LineString',
                coordinates: [
                    [-122.4194, 37.7749],
                    [-123.4194, 38.7749],
                ],
            };

            const result = LineStringGeometrySchema.safeParse(validLineString);
            expect(result.success).toBe(true);
        });

        it('should validate a Polygon geometry', () => {
            const validPolygon = {
                type: 'Polygon',
                coordinates: [
                    [
                        [-122.4194, 37.7749],
                        [-123.4194, 37.7749],
                        [-123.4194, 38.7749],
                        [-122.4194, 38.7749],
                        [-122.4194, 37.7749],
                    ],
                ],
            };

            const result = PolygonGeometrySchema.safeParse(validPolygon);
            expect(result.success).toBe(true);
        });

        it('should validate a Feature', () => {
            const validFeature = {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-122.4194, 37.7749],
                },
                properties: {
                    name: 'San Francisco',
                },
            };

            const result = GeoJSONFeatureSchema.safeParse(validFeature);
            expect(result.success).toBe(true);
        });
    });
});
