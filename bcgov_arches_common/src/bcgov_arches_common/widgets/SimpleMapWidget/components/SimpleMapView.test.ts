import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import type { Feature } from 'geojson';
import type { MapData } from '@/bcgov_arches_common/datatypes/geojson-feature-collection/types.ts';
import type { GeoJSONFeatureCollectionValue } from '@/bcgov_arches_common/datatypes/geojson-feature-collection/types.ts';
import type { MapFileData } from '@/bcgov_arches_common/widgets/MapDropZoneWidget/types.ts';

// ---------------------------------------------------------------------------
// Hoisted mock state — accessible in both the mock factory and test bodies.
// ---------------------------------------------------------------------------

const mockMapInstance = vi.hoisted(() => ({
    on: vi.fn(),
    addControl: vi.fn(),
    addSource: vi.fn(),
    getSource: vi.fn(),
    addLayer: vi.fn(),
    getLayer: vi.fn(),
    removeLayer: vi.fn(),
    removeSource: vi.fn(),
    getStyle: vi.fn(),
    resize: vi.fn(),
    fitBounds: vi.fn(),
    flyTo: vi.fn(),
    getCanvas: vi.fn(),
    getZoom: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('maplibre-gl', () => ({
    default: {
        Map: vi.fn(() => mockMapInstance),
        NavigationControl: vi.fn(),
        ScaleControl: vi.fn(),
        AttributionControl: vi.fn(),
        Marker: vi.fn(() => ({
            setLngLat: vi.fn().mockReturnThis(),
            setPopup: vi.fn().mockReturnThis(),
            addTo: vi.fn().mockReturnThis(),
        })),
        Popup: vi.fn(() => ({ setHTML: vi.fn().mockReturnThis() })),
    },
}));

vi.mock('arches', () => ({
    default: { mapMarkers: [] },
}));

vi.mock('@turf/centroid', () => ({
    default: vi.fn(() => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-123.0, 49.0] },
        properties: {},
    })),
}));

vi.mock('@turf/bbox', () => ({
    default: vi.fn(() => [-124, 48, -122, 50]),
}));

vi.mock('@/bcgov_arches_common/widgets/SimpleMapWidget/utils.ts', () => ({
    buildLayersForFeature: vi.fn(() => []),
    removeLayersUsingSource: vi.fn(),
    getCentroidMarker: vi.fn(() => ({
        setLngLat: vi.fn().mockReturnThis(),
        setPopup: vi.fn().mockReturnThis(),
        addTo: vi.fn().mockReturnThis(),
    })),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import maplibregl from 'maplibre-gl';
import SimpleMapView from './SimpleMapView.vue';
import {
    buildLayersForFeature,
    removeLayersUsingSource,
    getCentroidMarker,
} from '@/bcgov_arches_common/widgets/SimpleMapWidget/utils.ts';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makePoint(lng = 0, lat = 0): Feature {
    return {
        type: 'Feature',
        id: `pt-${lng}-${lat}`,
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {},
    };
}

function makeMapData(): MapData {
    return {
        overlays: [],
        basemaps: [
            {
                addtomap: true,
                icon: '',
                id: 1,
                isoverlay: false,
                name: 'Basemap',
                title: 'Basemap',
                url: '',
                visible: true,
                source: {
                    id: 1,
                    name: 'basemap-src',
                    source: {
                        type: 'raster',
                        url: 'https://tiles.example.com/{z}/{x}/{y}.png',
                    },
                    source_json: '',
                },
                layerdefinitions: [
                    {
                        id: 'basemap-layer',
                        type: 'raster',
                        source: 'basemap-src',
                    },
                ],
            },
        ],
        default_bounds: { type: 'FeatureCollection', features: [] },
    };
}

function makeAliasedData(
    features: Feature[] = [],
    details: MapFileData[] = [],
): GeoJSONFeatureCollectionValue {
    return {
        display_value: '',
        node_value: { type: 'FeatureCollection', features },
        details,
    };
}

function makeFileData(sourceId: string, features: Feature[]): MapFileData {
    return {
        name: 'test.geojson',
        size: 100,
        type: 'application/json',
        url: `blob:${sourceId}`,
        file: new File([], 'test.geojson'),
        node_id: 'node-1',
        file_id: sourceId,
        geometrySourceId: sourceId,
        geometries: { type: 'FeatureCollection', features },
    };
}

const CARD_DATA = {
    node: { nodeid: 'node-1', alias: 'my-node', config: {} },
    config: {},
} as any;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Collects map event handlers registered via map.on() so tests can fire them.
const eventHandlers: Record<string, () => void> = {};

function mountView(props: Record<string, unknown> = {}) {
    return mount(SimpleMapView, {
        props: {
            graphSlug: 'my-graph',
            nodeAlias: 'my-node',
            cardXNodeXWidgetData: CARD_DATA,
            mapData: undefined,
            aliasedNodeData: undefined,
            ...props,
        },
    });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
    vi.clearAllMocks();

    // Clear captured event handlers from previous tests.
    Object.keys(eventHandlers).forEach((k) => delete eventHandlers[k]);

    mockMapInstance.on.mockImplementation((event: string, cb: () => void) => {
        eventHandlers[event] = cb;
    });
    mockMapInstance.getSource.mockReturnValue(null);
    mockMapInstance.getStyle.mockReturnValue({ layers: [] });
    mockMapInstance.getZoom.mockReturnValue(5);
    mockMapInstance.getCanvas.mockReturnValue({
        clientWidth: 800,
        clientHeight: 600,
        getBoundingClientRect: () => ({ bottom: 600 }),
    });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SimpleMapView', () => {
    // ------------------------------------------------------------------
    // Rendering
    // ------------------------------------------------------------------

    it('mounts without errors when mapData is undefined', () => {
        mountView();
    });

    it('mounts without errors when mapData is provided', () => {
        mountView({ mapData: makeMapData() });
    });

    it('renders the map container div', () => {
        const wrapper = mountView();
        expect(wrapper.find('.map').exists()).toBe(true);
    });

    it('renders the panel div', () => {
        const wrapper = mountView();
        expect(wrapper.find('.panel').exists()).toBe(true);
    });

    // ------------------------------------------------------------------
    // Map initialization
    // ------------------------------------------------------------------

    it('does not create a Map when mapData is undefined', () => {
        mountView({ mapData: undefined });
        expect(maplibregl.Map).not.toHaveBeenCalled();
    });

    it('creates a Map on mount when mapData is provided', () => {
        mountView({ mapData: makeMapData() });
        expect(maplibregl.Map).toHaveBeenCalledOnce();
    });

    it('passes the configured center to the Map constructor', () => {
        const cardData = {
            node: { nodeid: 'node-1', alias: 'my-node', config: {} },
            config: { centerX: -120, centerY: 50 },
        } as any;
        // null default_bounds skips the centroid() override in setupMap(), so the
        // map is constructed with defaultCenter from cardXNodeXWidgetData.config.
        const mapData = { ...makeMapData(), default_bounds: null as any };
        mountView({ mapData, cardXNodeXWidgetData: cardData });
        expect(maplibregl.Map).toHaveBeenCalledWith(
            expect.objectContaining({ center: [-120, 50] }),
        );
    });

    it('uses the default centre when no config centre is set', () => {
        // null default_bounds skips the centroid() override in setupMap().
        const mapData = { ...makeMapData(), default_bounds: null as any };
        mountView({ mapData });
        expect(maplibregl.Map).toHaveBeenCalledWith(
            expect.objectContaining({ center: [-123.1207, 49.2827] }),
        );
    });

    it('creates a Map when mapData is set after mount', async () => {
        const wrapper = mountView({ mapData: undefined });
        expect(maplibregl.Map).not.toHaveBeenCalled();

        await wrapper.setProps({ mapData: makeMapData() });
        await nextTick();

        expect(maplibregl.Map).toHaveBeenCalledOnce();
    });

    // ------------------------------------------------------------------
    // Load event
    // ------------------------------------------------------------------

    it('adds a NavigationControl on map load', async () => {
        mountView({ mapData: makeMapData() });
        eventHandlers['load']?.();
        await nextTick();
        expect(mockMapInstance.addControl).toHaveBeenCalledWith(
            expect.any(maplibregl.NavigationControl),
            'top-right',
        );
    });

    it('adds a ScaleControl on map load', async () => {
        mountView({ mapData: makeMapData() });
        eventHandlers['load']?.();
        await nextTick();
        expect(mockMapInstance.addControl).toHaveBeenCalledWith(
            expect.any(maplibregl.ScaleControl),
        );
    });

    it('adds an AttributionControl on map load', async () => {
        mountView({ mapData: makeMapData() });
        eventHandlers['load']?.();
        await nextTick();
        expect(mockMapInstance.addControl).toHaveBeenCalledWith(
            expect.any(maplibregl.AttributionControl),
        );
    });

    // ------------------------------------------------------------------
    // aliasedNodeData watcher — file detail tracking
    // ------------------------------------------------------------------

    it('adds a map source when a new file detail appears in aliasedNodeData', async () => {
        const wrapper = mountView({ mapData: makeMapData() });
        eventHandlers['load']?.();
        await nextTick();

        const detail = makeFileData('source-abc', [makePoint()]);
        await wrapper.setProps({
            aliasedNodeData: makeAliasedData([], [detail]),
        });
        await nextTick();

        expect(mockMapInstance.addSource).toHaveBeenCalledWith(
            'source-abc',
            expect.objectContaining({ type: 'geojson' }),
        );
    });

    it('calls buildLayersForFeature when a new file detail appears', async () => {
        const wrapper = mountView({ mapData: makeMapData() });
        eventHandlers['load']?.();
        await nextTick();

        const detail = makeFileData('source-abc', [makePoint()]);
        await wrapper.setProps({
            aliasedNodeData: makeAliasedData([], [detail]),
        });
        await nextTick();

        expect(buildLayersForFeature).toHaveBeenCalledWith(
            'source-abc',
            expect.anything(),
            expect.anything(),
        );
    });

    it('calls removeLayersUsingSource when a file detail is removed from aliasedNodeData', async () => {
        const wrapper = mountView({ mapData: makeMapData() });
        eventHandlers['load']?.();
        await nextTick();

        const mockSource = { setData: vi.fn() };
        mockMapInstance.getSource.mockImplementation((id: string) =>
            id === 'source-abc' ? mockSource : null,
        );

        const detail = makeFileData('source-abc', [makePoint()]);
        await wrapper.setProps({
            aliasedNodeData: makeAliasedData([], [detail]),
        });
        await nextTick();

        // Remove the detail
        await wrapper.setProps({ aliasedNodeData: makeAliasedData([], []) });
        await nextTick();

        expect(removeLayersUsingSource).toHaveBeenCalledWith(
            mockMapInstance,
            'source-abc',
            true,
        );
    });

    // ------------------------------------------------------------------
    // refitSignal
    // ------------------------------------------------------------------

    it('calls resize when refitSignal changes', async () => {
        const refitSignal = ref(0);
        mount(SimpleMapView, {
            props: {
                graphSlug: 'my-graph',
                nodeAlias: 'my-node',
                cardXNodeXWidgetData: CARD_DATA,
                mapData: makeMapData(),
                // An empty aliasedNodeData avoids the `.reduce()` on undefined
                // that occurs when the allGeometries computed runs with no prop.
                aliasedNodeData: makeAliasedData(),
            },
            global: {
                provide: { simpleMapConfig: { refitSignal } },
            },
        });

        eventHandlers['load']?.();
        await nextTick();

        mockMapInstance.resize.mockClear();
        refitSignal.value++;
        await nextTick();

        expect(mockMapInstance.resize).toHaveBeenCalledOnce();
    });

    it('calls fitBounds when refitSignal changes and there are features', async () => {
        const refitSignal = ref(0);
        mount(SimpleMapView, {
            props: {
                graphSlug: 'my-graph',
                nodeAlias: 'my-node',
                cardXNodeXWidgetData: CARD_DATA,
                mapData: makeMapData(),
                aliasedNodeData: makeAliasedData([makePoint()]),
            },
            global: {
                provide: { simpleMapConfig: { refitSignal } },
            },
        });

        eventHandlers['load']?.();
        await nextTick();

        mockMapInstance.fitBounds.mockClear();
        refitSignal.value++;
        await nextTick();

        expect(mockMapInstance.fitBounds).toHaveBeenCalledOnce();
    });

    // ------------------------------------------------------------------
    // markCentroid
    // ------------------------------------------------------------------

    it('creates a centroid marker on load when markCentroid is true and node features are present', async () => {
        mountView({
            mapData: makeMapData(),
            markCentroid: true,
            aliasedNodeData: makeAliasedData([makePoint()]),
        });

        eventHandlers['load']?.();
        await nextTick();

        expect(getCentroidMarker).toHaveBeenCalled();
    });

    it('does not create a centroid marker when markCentroid is false', async () => {
        mountView({
            mapData: makeMapData(),
            markCentroid: false,
            aliasedNodeData: makeAliasedData([makePoint()]),
        });

        eventHandlers['load']?.();
        await nextTick();

        expect(getCentroidMarker).not.toHaveBeenCalled();
    });

    // ------------------------------------------------------------------
    // Window resize listener
    // ------------------------------------------------------------------

    it('registers a window resize listener when the map is set up', () => {
        const addSpy = vi.spyOn(window, 'addEventListener');
        mountView({ mapData: makeMapData() });
        expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('removes the window resize listener when unmounted', () => {
        const removeSpy = vi.spyOn(window, 'removeEventListener');
        const wrapper = mountView({ mapData: makeMapData() });
        wrapper.unmount();
        expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    // ------------------------------------------------------------------
    // moveend event
    // ------------------------------------------------------------------

    it('updates the displayed zoom when moveend fires', async () => {
        const wrapper = mountView({ mapData: makeMapData() });
        mockMapInstance.getZoom.mockReturnValue(8.5);
        eventHandlers['moveend']?.();
        await nextTick();
        expect(wrapper.find('.coords').text()).toContain('8.5');
    });

    // ------------------------------------------------------------------
    // Load event — node features already present
    // ------------------------------------------------------------------

    it('adds a source for each node feature present when the map loads', async () => {
        mountView({
            mapData: makeMapData(),
            aliasedNodeData: makeAliasedData([makePoint()]),
        });
        eventHandlers['load']?.();
        await nextTick();
        expect(mockMapInstance.addSource).toHaveBeenCalledWith(
            'pt-0-0',
            expect.objectContaining({ type: 'geojson' }),
        );
    });

    it('calls buildLayersForFeature for each node feature present when the map loads', async () => {
        mountView({
            mapData: makeMapData(),
            aliasedNodeData: makeAliasedData([makePoint()]),
        });
        eventHandlers['load']?.();
        await nextTick();
        expect(buildLayersForFeature).toHaveBeenCalledWith(
            'pt-0-0',
            expect.anything(),
            expect.anything(),
        );
    });

    // ------------------------------------------------------------------
    // aliasedNodeData watcher — node_value-only changes (else branch)
    // ------------------------------------------------------------------

    it('adds a source for a new node feature that arrives without file-detail changes', async () => {
        const wrapper = mountView({ mapData: makeMapData() });
        eventHandlers['load']?.();
        await nextTick();
        mockMapInstance.addSource.mockClear();

        await wrapper.setProps({
            aliasedNodeData: makeAliasedData([makePoint()]),
        });
        await nextTick();

        expect(mockMapInstance.addSource).toHaveBeenCalledWith(
            'pt-0-0',
            expect.objectContaining({ type: 'geojson' }),
        );
    });

    it('removes the layer for a node feature that is removed from aliasedNodeData', async () => {
        const wrapper = mountView({ mapData: makeMapData() });
        eventHandlers['load']?.();
        await nextTick();

        // Add the node feature so it is tracked in addedNodeFeatureIds.
        await wrapper.setProps({
            aliasedNodeData: makeAliasedData([makePoint()]),
        });
        await nextTick();

        // Remove it — the watcher should call removeLayersUsingSource.
        await wrapper.setProps({ aliasedNodeData: makeAliasedData([]) });
        await nextTick();

        expect(removeLayersUsingSource).toHaveBeenCalledWith(
            mockMapInstance,
            'pt-0-0',
            true,
        );
    });

    // ------------------------------------------------------------------
    // markCentroid — update existing marker position
    // ------------------------------------------------------------------

    it('calls setLngLat on the existing centroid marker when geometry updates', async () => {
        const wrapper = mountView({
            mapData: makeMapData(),
            markCentroid: true,
            aliasedNodeData: makeAliasedData([makePoint()]),
        });

        // First load creates the centroid marker.
        eventHandlers['load']?.();
        await nextTick();

        // Adding a file detail triggers a second updateMapGeometries call,
        // which should hit the setLngLat branch instead of creating a new marker.
        const detail = makeFileData('source-xyz', [makePoint(1, 1)]);
        await wrapper.setProps({
            aliasedNodeData: makeAliasedData([makePoint()], [detail]),
        });
        await nextTick();

        const marker = vi.mocked(getCentroidMarker).mock.results[0].value;
        expect(marker.setLngLat).toHaveBeenCalled();
    });
});
