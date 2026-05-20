import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const mapState = vi.hoisted(() => ({
    loadCb: null as null | (() => void),
    hasImage: vi.fn(() => false),
}));

vi.mock('maplibre-gl', () => ({
    default: {
        Map: vi.fn(() => ({
            on: (event: string, cb: () => void) => {
                if (event === 'load') mapState.loadCb = cb;
            },
            addControl: vi.fn(),
            hasImage: mapState.hasImage,
            addImage: vi.fn(),
        })),
        NavigationControl: vi.fn(),
        ScaleControl: vi.fn(),
        AttributionControl: vi.fn(),
        Marker: vi.fn(),
        Popup: vi.fn(),
    },
}));

vi.mock('arches', () => ({
    default: { mapMarkers: [{ name: 'marker-a', url: '/a.png' }] },
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

    it('loads arches map markers on map load', () => {
        mountView({
            mapData: {
                basemaps: [
                    {
                        addtomap: true,
                        source: { name: 'osm', source: { type: 'raster' } },
                        layerdefinitions: [],
                    },
                ],
                default_bounds: null,
            },
        });
        mapState.loadCb?.();
        expect(mapState.hasImage).toHaveBeenCalledWith('marker-a');
    });
});
