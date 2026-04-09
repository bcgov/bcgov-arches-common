import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Feature, FeatureCollection } from 'geojson';
import type { GeoJsonCardXNodeXWidgetData } from './types';

// Mock maplibre-gl before importing utils (which imports it at module level)
vi.mock('maplibre-gl', () => {
    const mockPopup = { setHTML: vi.fn().mockReturnThis() };
    const mockMarker = {
        setLngLat: vi.fn().mockReturnThis(),
        setPopup: vi.fn().mockReturnThis(),
    };
    return {
        default: {
            Marker: vi.fn(() => mockMarker),
            Popup: vi.fn(() => mockPopup),
        },
    };
});

import maplibregl from 'maplibre-gl';
import {
    buildLayersForFeature,
    getCentroidMarker,
    removeLayersUsingSource,
} from './utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const pointFeature = (): Feature => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [0, 0] },
    properties: {},
});

const lineFeature = (): Feature => ({
    type: 'Feature',
    geometry: {
        type: 'LineString',
        coordinates: [
            [0, 0],
            [1, 1],
        ],
    },
    properties: {},
});

const polygonFeature = (): Feature => ({
    type: 'Feature',
    geometry: {
        type: 'Polygon',
        coordinates: [
            [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 0],
            ],
        ],
    },
    properties: {},
});

const featureCollection = (features: Feature[]): FeatureCollection => ({
    type: 'FeatureCollection',
    features,
});

const sourceJson = (config = {}): GeoJsonCardXNodeXWidgetData =>
    ({
        node: { alias: 'test', isrequired: false, nodeid: 'n1', config },
    }) as GeoJsonCardXNodeXWidgetData;

// ---------------------------------------------------------------------------
// buildLayersForFeature
// ---------------------------------------------------------------------------

describe('buildLayersForFeature', () => {
    describe('geometry type detection', () => {
        it('returns a circle layer for a Point feature', () => {
            const layers = buildLayersForFeature(
                'src-1',
                pointFeature(),
                sourceJson(),
            );
            expect(layers).toHaveLength(1);
            expect(layers[0].type).toBe('circle');
            expect(layers[0].id).toContain('point');
        });

        it('returns halo + line layers for a LineString feature', () => {
            const layers = buildLayersForFeature(
                'src-2',
                lineFeature(),
                sourceJson(),
            );
            expect(layers).toHaveLength(2);
            const types = layers.map((l) => l.type);
            expect(types).toEqual(['line', 'line']);
            const ids = layers.map((l) => l.id);
            expect(ids.some((id) => id.includes('halo'))).toBe(true);
            expect(ids.some((id) => id.includes('line') && !id.includes('halo'))).toBe(true);
        });

        it('returns fill + outline layers for a Polygon feature', () => {
            const layers = buildLayersForFeature(
                'src-3',
                polygonFeature(),
                sourceJson(),
            );
            expect(layers).toHaveLength(2);
            const types = layers.map((l) => l.type);
            expect(types).toContain('fill');
            expect(types).toContain('line');
        });

        it('returns a fallback line layer for unknown geometry types', () => {
            const unknown: Feature = {
                type: 'Feature',
                geometry: { type: 'GeometryCollection', geometries: [] },
                properties: {},
            };
            const layers = buildLayersForFeature('src-4', unknown, sourceJson());
            expect(layers).toHaveLength(1);
            expect(layers[0].id).toContain('fallback');
        });

        it('returns all relevant layers for a mixed FeatureCollection', () => {
            const layers = buildLayersForFeature(
                'src-5',
                featureCollection([pointFeature(), lineFeature(), polygonFeature()]),
                sourceJson(),
            );
            const types = layers.map((l) => l.type);
            expect(types).toContain('circle');
            expect(types).toContain('fill');
            expect(types.filter((t) => t === 'line').length).toBeGreaterThanOrEqual(3);
        });
    });

    describe('source assignment', () => {
        it('assigns the provided id as the source on all layers', () => {
            const id = 'my-source-id';
            const layers = buildLayersForFeature(id, polygonFeature(), sourceJson());
            layers.forEach((l) => {
                expect((l as any).source).toBe(id);
            });
        });
    });

    describe('color and weight config', () => {
        it('applies custom lineColor from config', () => {
            const layers = buildLayersForFeature(
                'src',
                lineFeature(),
                sourceJson({ lineColor: 'rgba(0,255,0,0.5)' }),
            );
            const linePaint = (layers.find((l) => !l.id.includes('halo')) as any)
                ?.paint;
            expect(linePaint['line-color']).toBe('rgb(0, 255, 0)');
            expect(linePaint['line-opacity']).toBeCloseTo(0.5);
        });

        it('clamps negative weight to 0', () => {
            const layers = buildLayersForFeature(
                'src',
                lineFeature(),
                sourceJson({ weight: -10, haloWeight: -5 }),
            );
            const haloPaint = (layers.find((l) => l.id.includes('halo')) as any)
                ?.paint;
            expect(haloPaint['line-width']).toBe(0); // 0 + 0
        });

        it('uses default colors when config is empty', () => {
            const layers = buildLayersForFeature(
                'src',
                pointFeature(),
                sourceJson(),
            );
            const paint = (layers[0] as any).paint;
            // default pointColor is 'rgba(255,122,0,0.73)' → rgb(255, 122, 0)
            expect(paint['circle-color']).toBe('rgb(255, 122, 0)');
        });

        it('applies custom fillColor from config', () => {
            const layers = buildLayersForFeature(
                'src',
                polygonFeature(),
                sourceJson({ fillColor: '#ff0000' }),
            );
            const fill = (layers.find((l) => l.type === 'fill') as any)?.paint;
            expect(fill['fill-color']).toBe('#ff0000');
        });
    });

    describe('layer id naming', () => {
        it('includes the source id in all layer ids', () => {
            const layers = buildLayersForFeature(
                'abc-123',
                polygonFeature(),
                sourceJson(),
            );
            layers.forEach((l) => {
                expect(l.id).toContain('abc-123');
            });
        });
    });
});

// ---------------------------------------------------------------------------
// getCentroidMarker
// ---------------------------------------------------------------------------

describe('getCentroidMarker', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns a Marker configured with the amber colour', () => {
        getCentroidMarker([0, 0]);
        expect(maplibregl.Marker).toHaveBeenCalledWith({ color: '#d97706' });
    });

    it('calls setLngLat with the provided coordinates', () => {
        const marker = getCentroidMarker([-123, 49]);
        expect(marker.setLngLat).toHaveBeenCalledWith([-123, 49]);
    });

    it('uses the default popup text when none is provided', () => {
        getCentroidMarker([0, 0]);
        const popupInstance = (maplibregl.Popup as any).mock.results[0].value;
        expect(popupInstance.setHTML).toHaveBeenCalledWith(
            expect.stringContaining('Feature centroid'),
        );
    });

    it('uses a custom popup text when provided', () => {
        getCentroidMarker([0, 0], 'My location');
        const popupInstance = (maplibregl.Popup as any).mock.results[0].value;
        expect(popupInstance.setHTML).toHaveBeenCalledWith(
            expect.stringContaining('My location'),
        );
    });
});

// ---------------------------------------------------------------------------
// removeLayersUsingSource
// ---------------------------------------------------------------------------

describe('removeLayersUsingSource', () => {
    const makeMap = (layers: { id: string; source?: string }[]) => ({
        getStyle: vi.fn(() => ({ layers })),
        getLayer: vi.fn((id: string) => layers.find((l) => l.id === id)),
        removeLayer: vi.fn(),
        getSource: vi.fn((id: string) => (id === 'my-source' ? {} : undefined)),
        removeSource: vi.fn(),
    });

    it('removes layers that reference the given source', () => {
        const map = makeMap([
            { id: 'layer-a', source: 'my-source' },
            { id: 'layer-b', source: 'other-source' },
        ]);
        removeLayersUsingSource(map as any, 'my-source');
        expect(map.removeLayer).toHaveBeenCalledWith('layer-a');
        expect(map.removeLayer).not.toHaveBeenCalledWith('layer-b');
    });

    it('removes the source by default after removing layers', () => {
        const map = makeMap([{ id: 'layer-a', source: 'my-source' }]);
        removeLayersUsingSource(map as any, 'my-source');
        expect(map.removeSource).toHaveBeenCalledWith('my-source');
    });

    it('does not remove the source when removeSource is false', () => {
        const map = makeMap([{ id: 'layer-a', source: 'my-source' }]);
        removeLayersUsingSource(map as any, 'my-source', false);
        expect(map.removeSource).not.toHaveBeenCalled();
    });

    it('handles a map with no style gracefully', () => {
        const map = {
            getStyle: vi.fn(() => null),
            removeLayer: vi.fn(),
            getLayer: vi.fn(),
            getSource: vi.fn(),
            removeSource: vi.fn(),
        };
        expect(() =>
            removeLayersUsingSource(map as any, 'my-source'),
        ).not.toThrow();
        expect(map.removeLayer).not.toHaveBeenCalled();
    });

    it('handles a style with no layers gracefully', () => {
        const map = {
            getStyle: vi.fn(() => ({})),
            removeLayer: vi.fn(),
            getLayer: vi.fn(),
            getSource: vi.fn(),
            removeSource: vi.fn(),
        };
        expect(() =>
            removeLayersUsingSource(map as any, 'my-source'),
        ).not.toThrow();
    });

    it('skips a layer if getLayer returns falsy', () => {
        const map = {
            getStyle: vi.fn(() => ({
                layers: [{ id: 'layer-a', source: 'my-source' }],
            })),
            getLayer: vi.fn(() => undefined),
            removeLayer: vi.fn(),
            getSource: vi.fn(() => undefined),
            removeSource: vi.fn(),
        };
        removeLayersUsingSource(map as any, 'my-source');
        expect(map.removeLayer).not.toHaveBeenCalled();
    });
});
