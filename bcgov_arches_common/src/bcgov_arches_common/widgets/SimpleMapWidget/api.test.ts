import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock(
    '@/bcgov_arches_common/datatypes/geojson-feature-collection/api.ts',
    () => ({
        fetchMapData: vi.fn(),
    }),
);

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { fetchSystemMapData } from './api.ts';
import { fetchMapData } from '@/bcgov_arches_common/datatypes/geojson-feature-collection/api.ts';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DEFAULT_BOUNDS = {
    type: 'FeatureCollection' as const,
    features: [],
};

function makeSource(name: string) {
    return {
        id: 1,
        name,
        source: { type: 'raster', url: `https://example.com/${name}` },
        source_json: '{}',
    };
}

function makeLayer(
    name: string,
    isoverlay: boolean,
    sourceName: string | undefined,
    sortorder?: number,
) {
    return {
        activated: true,
        addtomap: true,
        icon: '',
        id: Math.random(),
        isoverlay,
        layerdefinitions: sourceName
            ? [{ id: `${name}-layer`, type: 'raster', source: sourceName }]
            : [{ id: `${name}-layer`, type: 'raster' }],
        name,
        title: name,
        url: '',
        visible: true,
        sortorder,
    };
}

function makeMultiSourceLayer(
    name: string,
    isoverlay: boolean,
    sourceNames: (string | undefined)[],
) {
    return {
        activated: true,
        addtomap: true,
        icon: '',
        id: Math.random(),
        isoverlay,
        layerdefinitions: sourceNames.map((sourceName, i) =>
            sourceName
                ? { id: `${name}-layer-${i}`, type: 'fill', source: sourceName }
                : { id: `${name}-layer-${i}`, type: 'background' },
        ),
        name,
        title: name,
        url: '',
        visible: true,
        sortorder: undefined,
    };
}

function makeRawMapData(
    layers: ReturnType<typeof makeLayer>[],
    sources: ReturnType<typeof makeSource>[],
) {
    return {
        default_bounds: DEFAULT_BOUNDS,
        map_layers: layers,
        map_sources: sources,
    };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
    vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('fetchSystemMapData', () => {
    // ------------------------------------------------------------------
    // Happy path
    // ------------------------------------------------------------------

    it('returns an object with overlays, basemaps, and default_bounds', async () => {
        vi.mocked(fetchMapData).mockResolvedValue(makeRawMapData([], []));

        const result = await fetchSystemMapData();

        expect(result).toMatchObject({
            overlays: [],
            basemaps: [],
            default_bounds: DEFAULT_BOUNDS,
        });
    });

    it('separates overlay layers from basemap layers', async () => {
        const overlay = makeLayer('my-overlay', true, undefined);
        const basemap = makeLayer('my-basemap', false, undefined);
        vi.mocked(fetchMapData).mockResolvedValue(
            makeRawMapData([overlay, basemap], []),
        );

        const result = await fetchSystemMapData();

        expect(result!.overlays).toHaveLength(1);
        expect(result!.overlays[0].name).toBe('my-overlay');
        expect(result!.basemaps).toHaveLength(1);
        expect(result!.basemaps[0].name).toBe('my-basemap');
    });

    it('passes through default_bounds from the raw API response', async () => {
        const bounds = {
            type: 'FeatureCollection' as const,
            features: [
                {
                    type: 'Feature' as const,
                    geometry: {
                        type: 'Point' as const,
                        coordinates: [-123, 49],
                    },
                    properties: {},
                },
            ],
        };
        vi.mocked(fetchMapData).mockResolvedValue({
            ...makeRawMapData([], []),
            default_bounds: bounds,
        });

        const result = await fetchSystemMapData();

        expect(result!.default_bounds).toEqual(bounds);
    });

    // ------------------------------------------------------------------
    // Source attachment
    // ------------------------------------------------------------------

    it('attaches the matching MapSource to a layer when layerdefinitions[0].source matches', async () => {
        const source = makeSource('wms-tiles');
        const layer = makeLayer('tiles-layer', false, 'wms-tiles');
        vi.mocked(fetchMapData).mockResolvedValue(
            makeRawMapData([layer], [source]),
        );

        const result = await fetchSystemMapData();

        expect(result!.basemaps[0].source).toEqual(source);
    });

    it('does not attach a source when layerdefinitions[0].source has no match in map_sources', async () => {
        const source = makeSource('other-source');
        const layer = makeLayer('tiles-layer', false, 'wms-tiles');
        vi.mocked(fetchMapData).mockResolvedValue(
            makeRawMapData([layer], [source]),
        );

        const result = await fetchSystemMapData();

        expect(result!.basemaps[0].source).toBeUndefined();
    });

    it('does not attach a source when the layer has no source in its layerdefinitions', async () => {
        const source = makeSource('wms-tiles');
        const layer = makeLayer('tiles-layer', false, undefined);
        vi.mocked(fetchMapData).mockResolvedValue(
            makeRawMapData([layer], [source]),
        );

        const result = await fetchSystemMapData();

        expect(result!.basemaps[0].source).toBeUndefined();
    });

    it('populates sources array for a single-source layer', async () => {
        const source = makeSource('wms-tiles');
        const layer = makeLayer('tiles-layer', false, 'wms-tiles');
        vi.mocked(fetchMapData).mockResolvedValue(
            makeRawMapData([layer], [source]),
        );

        const result = await fetchSystemMapData();

        expect(result!.basemaps[0].sources).toEqual([source]);
    });

    it('populates sources array for a multi-source layer', async () => {
        const src1 = makeSource('main-source');
        const src2 = makeSource('hillshade-source');
        // first layer is a background (no source), then two sources
        const layer = makeMultiSourceLayer('bc-basemap', false, [
            undefined,
            'main-source',
            'hillshade-source',
            'main-source', // duplicate — should be deduplicated
        ]);
        vi.mocked(fetchMapData).mockResolvedValue(
            makeRawMapData([layer], [src1, src2]),
        );

        const result = await fetchSystemMapData();

        expect(result!.basemaps[0].sources).toHaveLength(2);
        expect(result!.basemaps[0].sources).toEqual(
            expect.arrayContaining([src1, src2]),
        );
    });

    it('does not set source (singular) when a layer has multiple sources', async () => {
        const src1 = makeSource('main-source');
        const src2 = makeSource('hillshade-source');
        const layer = makeMultiSourceLayer('bc-basemap', false, [
            'main-source',
            'hillshade-source',
        ]);
        vi.mocked(fetchMapData).mockResolvedValue(
            makeRawMapData([layer], [src1, src2]),
        );

        const result = await fetchSystemMapData();

        expect(result!.basemaps[0].source).toBeUndefined();
    });

    it('skips layer definitions whose source is not in map_sources', async () => {
        const src = makeSource('known-source');
        const layer = makeMultiSourceLayer('bc-basemap', false, [
            'known-source',
            'unknown-source',
        ]);
        vi.mocked(fetchMapData).mockResolvedValue(
            makeRawMapData([layer], [src]),
        );

        const result = await fetchSystemMapData();

        expect(result!.basemaps[0].sources).toHaveLength(1);
        expect(result!.basemaps[0].sources![0]).toEqual(src);
    });

    it('does not set source when the first layer has no source but later layers do (multi-source case)', async () => {
        const src1 = makeSource('main-source');
        const src2 = makeSource('overlay-source');
        const layer = makeMultiSourceLayer('bc-basemap', false, [
            undefined,
            'main-source',
            'overlay-source',
        ]);
        vi.mocked(fetchMapData).mockResolvedValue(
            makeRawMapData([layer], [src1, src2]),
        );

        const result = await fetchSystemMapData();

        // Multiple sources → source (singular) should not be set
        expect(result!.basemaps[0].source).toBeUndefined();
        expect(result!.basemaps[0].sources).toHaveLength(2);
    });

    // ------------------------------------------------------------------
    // Sorting
    // ------------------------------------------------------------------

    it('sorts overlays by sortorder descending', async () => {
        const a = makeLayer('low', true, undefined, 1);
        const b = makeLayer('high', true, undefined, 10);
        const c = makeLayer('mid', true, undefined, 5);
        vi.mocked(fetchMapData).mockResolvedValue(
            makeRawMapData([a, b, c], []),
        );

        const result = await fetchSystemMapData();

        expect(result!.overlays.map((l) => l.name)).toEqual([
            'high',
            'mid',
            'low',
        ]);
    });

    it('sorts basemaps by sortorder descending', async () => {
        const a = makeLayer('low', false, undefined, 1);
        const b = makeLayer('high', false, undefined, 10);
        vi.mocked(fetchMapData).mockResolvedValue(makeRawMapData([a, b], []));

        const result = await fetchSystemMapData();

        expect(result!.basemaps.map((l) => l.name)).toEqual(['high', 'low']);
    });

    it('treats a missing sortorder as 0 when sorting', async () => {
        const withOrder = makeLayer('ordered', true, undefined, 5);
        const withoutOrder = makeLayer('unordered', true, undefined, undefined);
        vi.mocked(fetchMapData).mockResolvedValue(
            makeRawMapData([withoutOrder, withOrder], []),
        );

        const result = await fetchSystemMapData();

        expect(result!.overlays.map((l) => l.name)).toEqual([
            'ordered',
            'unordered',
        ]);
    });

    // ------------------------------------------------------------------
    // Error handling
    // ------------------------------------------------------------------

    it('returns undefined when fetchMapData throws', async () => {
        vi.mocked(fetchMapData).mockRejectedValue(new Error('Network error'));

        const result = await fetchSystemMapData();

        expect(result).toBeUndefined();
    });
});
