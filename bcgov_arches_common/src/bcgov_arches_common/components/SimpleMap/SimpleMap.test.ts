import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

vi.mock('maplibre-gl', () => ({
    default: {
        Map: vi.fn(),
        NavigationControl: vi.fn(),
        ScaleControl: vi.fn(),
        AttributionControl: vi.fn(),
        Marker: vi.fn(),
        Popup: vi.fn(),
    },
}));

vi.mock('@/bcgov_arches_common/components/SimpleMap/api.ts', () => ({
    fetchSystemMapData: vi.fn().mockResolvedValue({
        basemaps: [],
        default_bounds: null,
    }),
}));

vi.mock('@/arches_component_lab/generics/GenericWidget/api.ts', () => ({
    fetchCardXNodeXWidgetData: vi.fn().mockResolvedValue({}),
}));

import SimpleMap from './SimpleMap.vue';
import { VIEW } from '@/arches_component_lab/widgets/constants.ts';

const MapViewStub = {
    name: 'MapView',
    props: [
        'graphSlug',
        'nodeAlias',
        'mapData',
        'cardXNodeXWidgetData',
        'aliasedNodeData',
        'useUtmCoords',
    ],
    template: '<div class="map-view-stub" />',
};

async function mountMap(props: Record<string, unknown> = {}) {
    const wrapper = mount(SimpleMap, {
        props: {
            graphSlug: 'test-graph',
            nodeAlias: 'test-node',
            mode: VIEW,
            cardXNodeXWidgetData: undefined,
            aliasedNodeData: undefined,
            ...props,
        },
        global: {
            stubs: {
                MapView: MapViewStub,
                ProgressSpinner: true,
            },
        },
    });
    await flushPromises();
    return wrapper;
}

describe('SimpleMap useUtmCoords prop', () => {
    it('defaults useUtmCoords to false on the child MapView', async () => {
        const wrapper = await mountMap();
        const mapView = wrapper.findComponent(MapViewStub);
        expect(mapView.exists()).toBe(true);
        expect(mapView.props('useUtmCoords')).toBe(false);
    });

    it('forwards useUtmCoords to true to the child MapView', async () => {
        const wrapper = await mountMap({ useUtmCoords: true });
        const mapView = wrapper.findComponent(MapViewStub);
        expect(mapView.exists()).toBe(true);
        expect(mapView.props('useUtmCoords')).toBe(true);
    });
});
