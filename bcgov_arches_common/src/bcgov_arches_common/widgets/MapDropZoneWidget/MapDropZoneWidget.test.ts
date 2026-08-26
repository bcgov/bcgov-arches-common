import { describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import type { FeatureCollection } from 'geojson';

import { EDIT, VIEW } from '@/arches_vue_components//widgets/constants.ts';
import type { GeoJSONFeatureCollectionValue } from '@/bcgov_arches_common/datatypes/geojson-feature-collection/types.ts';

import MapDropZoneWidget from './MapDropZoneWidget.vue';

// ---------------------------------------------------------------------------
// Stubs — heavy components with external dependencies
// ---------------------------------------------------------------------------

const EditorStub = {
    name: 'MapDropZoneWidgetEditor',
    props: ['aliasedNodeData', 'nodeAlias', 'cardXNodeXWidgetData'],
    emits: ['update:value'],
    template: '<div class="editor-stub" />',
};

const SimpleMapStub = {
    name: 'SimpleMap',
    props: [
        'graphSlug',
        'nodeAlias',
        'mode',
        'cardXNodeXWidgetData',
        'aliasedNodeData',
    ],
    template: '<div class="simple-map-stub" />',
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CARD_DATA = {
    node: { nodeid: 'node-id', alias: 'my-node' },
    config: {},
} as any;

function makeFC(...ids: string[]): FeatureCollection {
    return {
        type: 'FeatureCollection',
        features: ids.map((id) => ({
            type: 'Feature' as const,
            id,
            geometry: { type: 'Point' as const, coordinates: [0, 0] },
            properties: {},
        })),
    };
}

function makeNodeData(fc: FeatureCollection): GeoJSONFeatureCollectionValue {
    return { display_value: '', node_value: fc, details: [] };
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function mountWidget(props: Record<string, unknown> = {}) {
    return mount(MapDropZoneWidget, {
        props: {
            mode: EDIT,
            nodeAlias: 'my-node',
            graphSlug: 'test-graph',
            cardXNodeXWidgetData: CARD_DATA,
            aliasedNodeData: undefined,
            ...props,
        },
        global: {
            stubs: {
                MapDropZoneWidgetEditor: EditorStub,
                SimpleMap: SimpleMapStub,
            },
        },
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MapDropZoneWidget', () => {
    // ------------------------------------------------------------------
    // EDIT vs VIEW mode
    // ------------------------------------------------------------------

    it('renders the editor in EDIT mode', () => {
        const wrapper = mountWidget({ mode: EDIT });
        expect(wrapper.findComponent(EditorStub).exists()).toBe(true);
    });

    it('does not render the editor in VIEW mode', () => {
        const wrapper = mountWidget({ mode: VIEW });
        expect(wrapper.findComponent(EditorStub).exists()).toBe(false);
    });

    it('always renders SimpleMap regardless of mode', () => {
        const editWrapper = mountWidget({ mode: EDIT });
        const viewWrapper = mountWidget({ mode: VIEW });
        expect(editWrapper.findComponent(SimpleMapStub).exists()).toBe(true);
        expect(viewWrapper.findComponent(SimpleMapStub).exists()).toBe(true);
    });

    // ------------------------------------------------------------------
    // Props forwarding
    // ------------------------------------------------------------------

    it('passes nodeAlias to the editor', () => {
        const wrapper = mountWidget({ nodeAlias: 'special-alias' });
        expect(wrapper.findComponent(EditorStub).props('nodeAlias')).toBe(
            'special-alias',
        );
    });

    it('passes cardXNodeXWidgetData to the editor', () => {
        const wrapper = mountWidget();
        expect(
            wrapper.findComponent(EditorStub).props('cardXNodeXWidgetData'),
        ).toBe(CARD_DATA);
    });

    it('passes graphSlug to SimpleMap', () => {
        const wrapper = mountWidget({ graphSlug: 'my-graph' });
        expect(wrapper.findComponent(SimpleMapStub).props('graphSlug')).toBe(
            'my-graph',
        );
    });

    it('passes nodeAlias to SimpleMap', () => {
        const wrapper = mountWidget({ nodeAlias: 'map-alias' });
        expect(wrapper.findComponent(SimpleMapStub).props('nodeAlias')).toBe(
            'map-alias',
        );
    });

    it('always passes VIEW mode to SimpleMap', () => {
        const wrapper = mountWidget({ mode: EDIT });
        expect(wrapper.findComponent(SimpleMapStub).props('mode')).toBe(VIEW);
    });

    // ------------------------------------------------------------------
    // concatenatedAliasedNodeData — initial state
    // ------------------------------------------------------------------

    it('SimpleMap initially receives features from aliasedNodeData prop', () => {
        const fc = makeFC('prop-feat-1');
        const wrapper = mountWidget({ aliasedNodeData: makeNodeData(fc) });
        const mapData = wrapper
            .findComponent(SimpleMapStub)
            .props('aliasedNodeData') as GeoJSONFeatureCollectionValue;
        const ids = mapData.node_value!.features.map((f) => f.id);
        expect(ids).toContain('prop-feat-1');
    });

    it('SimpleMap initially has no extra features when aliasedNodeData is undefined', () => {
        const wrapper = mountWidget({ aliasedNodeData: undefined });
        const mapData = wrapper
            .findComponent(SimpleMapStub)
            .props('aliasedNodeData') as GeoJSONFeatureCollectionValue;
        expect(mapData.node_value!.features).toHaveLength(0);
    });

    // ------------------------------------------------------------------
    // concatenatedAliasedNodeData — after editor emits update:value
    // ------------------------------------------------------------------

    it('merges editor features with aliasedNodeData features for SimpleMap', async () => {
        const propFC = makeFC('prop-feat');
        const wrapper = mountWidget({ aliasedNodeData: makeNodeData(propFC) });

        const editorFC = makeFC('editor-feat');
        const editorValue: GeoJSONFeatureCollectionValue = {
            display_value: '',
            node_value: editorFC,
            details: [],
        };

        wrapper.findComponent(EditorStub).vm.$emit('update:value', editorValue);
        await flushPromises();

        const mapData = wrapper
            .findComponent(SimpleMapStub)
            .props('aliasedNodeData') as GeoJSONFeatureCollectionValue;
        const ids = mapData.node_value!.features.map((f) => f.id);
        expect(ids).toContain('prop-feat');
        expect(ids).toContain('editor-feat');
    });

    it('only includes editor features when aliasedNodeData is undefined', async () => {
        const wrapper = mountWidget({ aliasedNodeData: undefined });

        const editorFC = makeFC('file-feat-1', 'file-feat-2');
        wrapper.findComponent(EditorStub).vm.$emit('update:value', {
            display_value: '',
            node_value: editorFC,
            details: [],
        });
        await flushPromises();

        const mapData = wrapper
            .findComponent(SimpleMapStub)
            .props('aliasedNodeData') as GeoJSONFeatureCollectionValue;
        expect(mapData.node_value!.features).toHaveLength(2);
        const ids = mapData.node_value!.features.map((f) => f.id);
        expect(ids).toContain('file-feat-1');
        expect(ids).toContain('file-feat-2');
    });

    // ------------------------------------------------------------------
    // update:value event propagation
    // ------------------------------------------------------------------

    it('emits update:value when the editor fires update:value', async () => {
        const wrapper = mountWidget();
        const newValue: GeoJSONFeatureCollectionValue = {
            display_value: 'x',
            node_value: makeFC('f1'),
            details: [],
        };
        wrapper.findComponent(EditorStub).vm.$emit('update:value', newValue);
        await flushPromises();
        expect(wrapper.emitted('update:value')).toHaveLength(1);
    });

    it('emitted update:value carries the value from the editor', async () => {
        const wrapper = mountWidget();
        const newValue: GeoJSONFeatureCollectionValue = {
            display_value: 'test',
            node_value: makeFC('f1'),
            details: [],
        };
        wrapper.findComponent(EditorStub).vm.$emit('update:value', newValue);
        await flushPromises();
        expect(wrapper.emitted('update:value')![0][0]).toEqual(newValue);
    });
});
