import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

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

import SimpleMapView from './SimpleMapView.vue';

function mountView(props: Record<string, unknown> = {}) {
    return mount(SimpleMapView, {
        props: {
            graphSlug: 'test-graph',
            nodeAlias: 'test-node',
            cardXNodeXWidgetData: undefined,
            mapData: null,
            aliasedNodeData: undefined,
            ...props,
        },
    });
}

describe('SimpleMapView useUtmCoords prop', () => {
    it('renders Lng/Lat coordinates by default', () => {
        const wrapper = mountView();
        const text = wrapper.find('.coords').text();
        expect(text.includes('Lng/Lat')).toBe(true);
        expect(text.includes('Boundary Centroid UTM')).toBe(false);
    });

    it('renders UTM coordinates when useUtmCoords is true', () => {
        const wrapper = mountView({ useUtmCoords: true });
        const text = wrapper.find('.coords').text();
        expect(text.includes('Boundary Centroid UTM')).toBe(true);
        expect(text.includes('Lng/Lat')).toBe(false);
    });
});
