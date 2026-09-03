import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick, ref, shallowRef, type Ref } from 'vue';
import type { GeoJSONFeatureCollectionValue } from '@/bcgov_arches_common/datatypes/geojson-feature-collection/types.ts';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// Stub the child map view so maplibre-gl and turf are never imported.
vi.mock(
    '@/bcgov_arches_common/widgets/SimpleMapWidget/components/SimpleMapView.vue',
    () => ({
        default: {
            name: 'SimpleMapView',
            props: [
                'graphSlug',
                'nodeAlias',
                'mapData',
                'cardXNodeXWidgetData',
                'aliasedNodeData',
                'markCentroid',
                'useUtmCoords',
            ],
            template: '<div class="simple-map-view-stub" />',
        },
    }),
);

vi.mock('primevue/progressspinner', () => ({
    default: {
        name: 'ProgressSpinner',
        template: '<div class="progress-spinner-stub" />',
    },
}));

vi.mock('@/bcgov_arches_common/widgets/SimpleMapWidget/api.ts', () => ({
    fetchSystemMapData: vi.fn(),
}));

vi.mock('@/bcgov_arches_common/composables/useWidgetConfig.ts', () => ({
    useWidgetConfig: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import SimpleMapWidget from './SimpleMapWidget.vue';
import { fetchSystemMapData } from '@/bcgov_arches_common/widgets/SimpleMapWidget/api.ts';
import { useWidgetConfig } from '@/bcgov_arches_common/composables/useWidgetConfig.ts';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_MAP_DATA = {
    basemaps: [],
    overlays: [],
    default_bounds: { type: 'FeatureCollection', features: [] } as any,
};

function makeAliasedData(): GeoJSONFeatureCollectionValue {
    return {
        display_value: '',
        node_value: { type: 'FeatureCollection', features: [] },
        details: [],
    };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mountWidget(props: Record<string, unknown> = {}) {
    return mount(SimpleMapWidget, {
        props: {
            graphSlug: 'my-graph',
            nodeAlias: 'my-node',
            mode: 'view',
            aliasedNodeData: undefined,
            ...props,
        } as any,
    });
}

function findMapView(wrapper: ReturnType<typeof mountWidget>) {
    return wrapper.findComponent({ name: 'SimpleMapView' });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let mockConfig: Ref<any>;
let mockIsLoading: Ref<boolean>;
let mockError: Ref<Error | undefined>;

beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = shallowRef(undefined);
    mockIsLoading = ref(false);
    mockError = ref(undefined);

    vi.mocked(useWidgetConfig).mockReturnValue({
        config: mockConfig,
        isLoading: mockIsLoading,
        error: mockError,
    } as any);

    vi.mocked(fetchSystemMapData).mockResolvedValue(MOCK_MAP_DATA as any);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SimpleMapWidget', () => {
    // ------------------------------------------------------------------
    // Rendering
    // ------------------------------------------------------------------

    it('mounts without errors', async () => {
        mountWidget();
        await flushPromises();
    });

    it('renders MapView when mode is view', async () => {
        const wrapper = mountWidget({ mode: 'view' });
        await flushPromises();
        expect(findMapView(wrapper).exists()).toBe(true);
    });

    it('does not render MapView when mode is not view', async () => {
        const wrapper = mountWidget({ mode: 'edit' });
        await flushPromises();
        expect(findMapView(wrapper).exists()).toBe(false);
    });

    // ------------------------------------------------------------------
    // Loading state
    // ------------------------------------------------------------------

    it('shows a ProgressSpinner while map data is being fetched', async () => {
        vi.mocked(fetchSystemMapData).mockImplementation(
            () => new Promise(() => {}), // never resolves
        );
        const wrapper = mountWidget();
        await nextTick();
        expect(
            wrapper.findComponent({ name: 'ProgressSpinner' }).exists(),
        ).toBe(true);
    });

    it('hides the ProgressSpinner once map data has loaded', async () => {
        const wrapper = mountWidget();
        await flushPromises();
        expect(
            wrapper.findComponent({ name: 'ProgressSpinner' }).exists(),
        ).toBe(false);
    });

    it('shows a ProgressSpinner while widget config is loading', async () => {
        mockIsLoading.value = true;
        const wrapper = mountWidget();
        await nextTick();
        expect(
            wrapper.findComponent({ name: 'ProgressSpinner' }).exists(),
        ).toBe(true);
    });

    // ------------------------------------------------------------------
    // API call
    // ------------------------------------------------------------------

    it('fetches system map data on mount', async () => {
        mountWidget();
        await flushPromises();
        expect(vi.mocked(fetchSystemMapData)).toHaveBeenCalledOnce();
    });

    it('does not fetch map data a second time after it resolves', async () => {
        // The watchEffect early-returns when mapData.value is already set,
        // so a reactive re-run after the first fetch must not trigger a second call.
        mountWidget();
        await flushPromises();
        expect(vi.mocked(fetchSystemMapData)).toHaveBeenCalledOnce();
    });

    it('captures the error on configurationError when fetchSystemMapData throws', async () => {
        const err = new Error('Network error');
        vi.mocked(fetchSystemMapData).mockRejectedValue(err);
        mountWidget();
        await flushPromises();
        expect(mockError.value).toBe(err);
    });

    // ------------------------------------------------------------------
    // Props forwarded to MapView
    // ------------------------------------------------------------------

    it('passes graphSlug to MapView', async () => {
        const wrapper = mountWidget({ graphSlug: 'test-graph' });
        await flushPromises();
        expect(findMapView(wrapper).props('graphSlug')).toBe('test-graph');
    });

    it('passes nodeAlias to MapView', async () => {
        const wrapper = mountWidget({ nodeAlias: 'test-node' });
        await flushPromises();
        expect(findMapView(wrapper).props('nodeAlias')).toBe('test-node');
    });

    it('passes fetched mapData to MapView', async () => {
        const wrapper = mountWidget();
        await flushPromises();
        expect(findMapView(wrapper).props('mapData')).toEqual(MOCK_MAP_DATA);
    });

    it('passes aliasedNodeData to MapView', async () => {
        const aliasedData = makeAliasedData();
        const wrapper = mountWidget({ aliasedNodeData: aliasedData });
        await flushPromises();
        expect(findMapView(wrapper).props('aliasedNodeData')).toStrictEqual(
            aliasedData,
        );
    });

    it('passes the resolved widget config to MapView as cardXNodeXWidgetData', async () => {
        const resolvedConfig = {
            node: { nodeid: 'n1', alias: 'a', config: {} },
            config: {},
        } as any;
        mockConfig.value = resolvedConfig;
        const wrapper = mountWidget();
        await flushPromises();
        expect(findMapView(wrapper).props('cardXNodeXWidgetData')).toBe(
            resolvedConfig,
        );
    });

    it('passes useUtmCoords as false by default', async () => {
        const wrapper = mountWidget();
        await flushPromises();
        expect(findMapView(wrapper).props('useUtmCoords')).toBe(false);
    });

    it('passes useUtmCoords true when the prop is set', async () => {
        const wrapper = mountWidget({ useUtmCoords: true });
        await flushPromises();
        expect(findMapView(wrapper).props('useUtmCoords')).toBe(true);
    });

    // ------------------------------------------------------------------
    // simpleMapConfig injection
    // ------------------------------------------------------------------

    it('passes markCentroid as falsy when simpleMapConfig is not provided', async () => {
        const wrapper = mountWidget();
        await flushPromises();
        expect(findMapView(wrapper).props('markCentroid')).toBeFalsy();
    });

    it('passes markCentroid true when simpleMapConfig.showCentroidMarker is true', async () => {
        const wrapper = mount(SimpleMapWidget, {
            props: {
                graphSlug: 'my-graph',
                nodeAlias: 'my-node',
                mode: 'view',
                aliasedNodeData: undefined,
            } as any,
            global: {
                provide: {
                    simpleMapConfig: { showCentroidMarker: true },
                },
            },
        });
        await flushPromises();
        expect(findMapView(wrapper).props('markCentroid')).toBe(true);
    });
});
