import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';

// ---------------------------------------------------------------------------
// MapLibre mock — must be declared before the component import
// ---------------------------------------------------------------------------

// vi.hoisted ensures these variables are initialised before vi.mock factories run.
const { MockMap, mockMapInstance, mapEventHandlers, mockCanvas } = vi.hoisted(
    () => {
        // Collect event handlers so tests can trigger them directly.
        const mapEventHandlers: Record<
            string,
            (...args: unknown[]) => unknown
        > = {};

        const mockCanvas = {
            width: 700,
            height: 550,
            toDataURL: vi.fn(() => 'data:image/png;base64,MOCK_SNAPSHOT'),
        };

        const mockMapInstance = {
            on: vi.fn(
                (event: string, handler: (...args: unknown[]) => unknown) => {
                    mapEventHandlers[event] = handler;
                },
            ),
            addControl: vi.fn(),
            getCanvas: vi.fn(() => mockCanvas),
            getZoom: vi.fn(() => 5),
            fitBounds: vi.fn(),
            getSource: vi.fn(() => undefined),
            addSource: vi.fn(),
            addLayer: vi.fn(),
            getStyle: vi.fn(() => ({ layers: [] })),
            resize: vi.fn(),
        };

        // Typed with one argument so mock.calls[0][0] is Record<string, unknown>.
        const MockMap = vi.fn(
            (_opts: Record<string, unknown>) => mockMapInstance,
        );

        return { MockMap, mockMapInstance, mapEventHandlers, mockCanvas };
    },
);

vi.mock('maplibre-gl', () => ({
    default: {
        Map: MockMap,
        NavigationControl: vi.fn(),
        ScaleControl: vi.fn(),
        AttributionControl: vi.fn(),
        Marker: vi.fn(() => ({
            setLngLat: vi.fn().mockReturnThis(),
            setPopup: vi.fn().mockReturnThis(),
            addTo: vi.fn(),
        })),
        Popup: vi.fn(() => ({ setHTML: vi.fn().mockReturnThis() })),
    },
}));

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));

vi.mock('@/bcgov_arches_common/widgets/SimpleMap/utils.ts', () => ({
    buildLayersForFeature: vi.fn(() => []),
    removeLayersUsingSource: vi.fn(),
    getCentroidMarker: vi.fn(() => ({
        setLngLat: vi.fn().mockReturnThis(),
        addTo: vi.fn(),
    })),
}));

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MapConstructorOptions = {
    container: HTMLElement;
    center: [number, number];
    zoom: number;
    attributionControl: boolean;
    canvasContextAttributes: {
        preserveDrawingBuffer: boolean;
        antialias: boolean;
        powerPreference: string;
    };
};

// ---------------------------------------------------------------------------
// Component import — after mocks
// ---------------------------------------------------------------------------

import SimpleMapView from './SimpleMapView.vue';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeMapData = () => ({
    basemaps: [
        {
            addtomap: true,
            source: {
                name: 'test-basemap',
                source: {
                    type: 'raster',
                    tiles: ['https://example.com/{z}/{x}/{y}.png'],
                    tileSize: 256,
                },
            },
            layerdefinitions: [],
        },
    ],
    default_bounds: null,
    overlays: [],
});

const makeAliasedNodeData = () => ({
    node_value: { type: 'FeatureCollection', features: [] },
    display_value: '',
    details: [],
});

const baseProps = {
    graphSlug: 'heritage_site',
    nodeAlias: 'spatial_data',
    cardXNodeXWidgetData: undefined,
    mapData: undefined,
    aliasedNodeData: makeAliasedNodeData(),
};

function mountView(props: Record<string, unknown> = {}) {
    return mount(SimpleMapView, {
        props: { ...baseProps, ...props } as any,
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SimpleMapView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.keys(mapEventHandlers).forEach(
            (k) => delete mapEventHandlers[k],
        );
        mockCanvas.width = 700;
        mockCanvas.height = 550;
        mockCanvas.toDataURL.mockReturnValue(
            'data:image/png;base64,MOCK_SNAPSHOT',
        );
    });

    // -------------------------------------------------------------------------
    // Rendering
    // -------------------------------------------------------------------------

    describe('rendering', () => {
        it('binds graphSlug as data-graph-slug on the root element', () => {
            const wrapper = mountView();
            expect(
                wrapper.find('.map-wrap').attributes('data-graph-slug'),
            ).toBe('heritage_site');
        });

        it('binds nodeAlias as data-node-alias on the root element', () => {
            const wrapper = mountView();
            expect(
                wrapper.find('.map-wrap').attributes('data-node-alias'),
            ).toBe('spatial_data');
        });

        it('renders the map container div', () => {
            const wrapper = mountView();
            expect(wrapper.find('.map').exists()).toBe(true);
        });

        it('renders the print snapshot img without a src when no snapshot exists', () => {
            const wrapper = mountView();
            const img = wrapper.find('.map-print-snapshot');
            expect(img.exists()).toBe(true);
            expect(img.attributes('src')).toBeUndefined();
        });
    });

    // -------------------------------------------------------------------------
    // setupMap
    // -------------------------------------------------------------------------

    describe('setupMap', () => {
        it('does not instantiate Map when mapData is not provided', () => {
            mountView({ mapData: undefined });
            expect(vi.mocked(MockMap)).not.toHaveBeenCalled();
        });

        it('instantiates Map when mapData is provided on mount', () => {
            mountView({ mapData: makeMapData() });
            expect(MockMap).toHaveBeenCalledTimes(1);
        });

        it('passes the map container element as the container option', () => {
            const wrapper = mountView({ mapData: makeMapData() });
            const options = MockMap.mock
                .calls[0][0] as unknown as MapConstructorOptions;
            expect(options.container).toBe(wrapper.find('.map').element);
        });

        it('registers load, moveend, and idle event handlers', () => {
            mountView({ mapData: makeMapData() });
            expect(mockMapInstance.on).toHaveBeenCalledWith(
                'load',
                expect.anything(),
            );
            expect(mockMapInstance.on).toHaveBeenCalledWith(
                'moveend',
                expect.anything(),
            );
            expect(mockMapInstance.on).toHaveBeenCalledWith(
                'idle',
                expect.anything(),
            );
        });
    });

    // -------------------------------------------------------------------------
    // preserveDrawingBuffer prop
    // -------------------------------------------------------------------------

    describe('preserveDrawingBuffer prop', () => {
        it('passes false by default when prop is not provided', () => {
            mountView({ mapData: makeMapData() });
            const { canvasContextAttributes } = MockMap.mock
                .calls[0][0] as unknown as MapConstructorOptions;
            expect(canvasContextAttributes.preserveDrawingBuffer).toBe(false);
        });

        it('passes true when preserveDrawingBuffer prop is true', () => {
            mountView({ mapData: makeMapData(), preserveDrawingBuffer: true });
            const { canvasContextAttributes } = MockMap.mock
                .calls[0][0] as unknown as MapConstructorOptions;
            expect(canvasContextAttributes.preserveDrawingBuffer).toBe(true);
        });

        it('passes false when preserveDrawingBuffer prop is explicitly false', () => {
            mountView({ mapData: makeMapData(), preserveDrawingBuffer: false });
            const { canvasContextAttributes } = MockMap.mock
                .calls[0][0] as unknown as MapConstructorOptions;
            expect(canvasContextAttributes.preserveDrawingBuffer).toBe(false);
        });
    });

    // -------------------------------------------------------------------------
    // mapSnapshot — idle event
    // -------------------------------------------------------------------------

    describe('mapSnapshot (idle event)', () => {
        it('sets src on the snapshot img when idle fires with a valid canvas', async () => {
            const wrapper = mountView({ mapData: makeMapData() });
            mapEventHandlers['idle']?.();
            await wrapper.vm.$nextTick();
            expect(wrapper.find('.map-print-snapshot').attributes('src')).toBe(
                'data:image/png;base64,MOCK_SNAPSHOT',
            );
        });

        it('does not set src when canvas width is 0', async () => {
            const wrapper = mountView({ mapData: makeMapData() });
            mockCanvas.width = 0;
            mapEventHandlers['idle']?.();
            await wrapper.vm.$nextTick();
            expect(
                wrapper.find('.map-print-snapshot').attributes('src'),
            ).toBeUndefined();
        });

        it('does not set src when canvas height is 0', async () => {
            const wrapper = mountView({ mapData: makeMapData() });
            mockCanvas.height = 0;
            mapEventHandlers['idle']?.();
            await wrapper.vm.$nextTick();
            expect(
                wrapper.find('.map-print-snapshot').attributes('src'),
            ).toBeUndefined();
        });

        it('updates the snapshot src when idle fires again after map changes', async () => {
            const wrapper = mountView({ mapData: makeMapData() });

            mockCanvas.toDataURL.mockReturnValue(
                'data:image/png;base64,SNAPSHOT_V1',
            );
            mapEventHandlers['idle']?.();
            await wrapper.vm.$nextTick();
            expect(wrapper.find('.map-print-snapshot').attributes('src')).toBe(
                'data:image/png;base64,SNAPSHOT_V1',
            );

            mockCanvas.toDataURL.mockReturnValue(
                'data:image/png;base64,SNAPSHOT_V2',
            );
            mapEventHandlers['idle']?.();
            await wrapper.vm.$nextTick();
            expect(wrapper.find('.map-print-snapshot').attributes('src')).toBe(
                'data:image/png;base64,SNAPSHOT_V2',
            );
        });
    });

    // -------------------------------------------------------------------------
    // defaultCenter
    // -------------------------------------------------------------------------

    describe('defaultCenter', () => {
        it('uses Vancouver coordinates when cardXNodeXWidgetData has no center config', () => {
            mountView({
                mapData: makeMapData(),
                cardXNodeXWidgetData: undefined,
            });
            const { center } = MockMap.mock
                .calls[0][0] as unknown as MapConstructorOptions;
            expect(center).toEqual([-123.1207, 49.2827]);
        });

        it('uses centerX/centerY from cardXNodeXWidgetData config when both are provided', () => {
            const cardXNodeXWidgetData = {
                config: { centerX: -120, centerY: 50 },
            };
            mountView({ mapData: makeMapData(), cardXNodeXWidgetData });
            const { center } = MockMap.mock
                .calls[0][0] as unknown as MapConstructorOptions;
            expect(center).toEqual([-120, 50]);
        });

        it('falls back to Vancouver when only centerX is provided', () => {
            const cardXNodeXWidgetData = { config: { centerX: -120 } };
            mountView({ mapData: makeMapData(), cardXNodeXWidgetData });
            const { center } = MockMap.mock
                .calls[0][0] as unknown as MapConstructorOptions;
            expect(center).toEqual([-123.1207, 49.2827]);
        });

        it('falls back to Vancouver when only centerY is provided', () => {
            const cardXNodeXWidgetData = { config: { centerY: 50 } };
            mountView({ mapData: makeMapData(), cardXNodeXWidgetData });
            const { center } = MockMap.mock
                .calls[0][0] as unknown as MapConstructorOptions;
            expect(center).toEqual([-123.1207, 49.2827]);
        });
    });

    // -------------------------------------------------------------------------
    // mapCentre display
    // -------------------------------------------------------------------------

    describe('mapCentre panel display', () => {
        it('shows default Vancouver coordinates in the panel when no geometry is present', () => {
            const wrapper = mountView();
            const text = wrapper.find('.coords').text();
            expect(text).toContain('-123.120700');
            expect(text).toContain('49.282700');
        });
    });
});
