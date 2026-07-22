import { describe, it, expect } from 'vitest';
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import MapDropZoneWidget from './MapDropZoneWidget.vue';
import { EDIT, VIEW } from '@/arches_component_lab/widgets/constants.ts';
import type { GeoJSONFeatureCollectionCardXNodeXWidgetData } from '@/bcgov_arches_common/datatypes/geojson-feature-collection/types.ts';
import type { GeoJSONFeatureCollectionValue } from '@/bcgov_arches_common/datatypes/geojson-feature-collection/types.ts';
import type { Feature } from 'geojson';

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

const MapDropZoneWidgetEditorStub = defineComponent({
    name: 'MapDropZoneWidgetEditor',
    props: ['aliasedNodeData', 'nodeAlias', 'cardXNodeXWidgetData'],
    emits: ['update:value'],
    template: '<div class="editor-stub" />',
});

const SimpleMapStub = defineComponent({
    name: 'SimpleMap',
    props: [
        'graphSlug',
        'nodeAlias',
        'mode',
        'cardXNodeXWidgetData',
        'aliasedNodeData',
    ],
    template: '<div class="simplemap-stub" />',
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeCardData = (): GeoJSONFeatureCollectionCardXNodeXWidgetData => ({
    card: {
        name: '',
        sortorder: 0,
        cardid: 'c1',
        nodegroup_id: 'ng1',
        nodes: [],
    },
    config: {
        defaultValue: null,
        basemap: '',
        bearing: 0,
        centerX: 0,
        centerY: 0,
        defaultValueType: '',
        featureColor: '',
        featureLineWidth: 1,
        featurePointSize: 3,
        geocodePlaceholder: '',
        geocodeProvider: '',
        geocoderVisible: true,
        geometryTypes: [],
        label: '',
        maxZoom: 20,
        minZoom: 0,
        overlayConfigs: [],
        overlayOpacity: 1,
        pitch: 0,
        rerender: false,
        zoom: 10,
    },
    id: 'w1',
    label: '',
    node: {
        alias: 'collection-location',
        isrequired: false,
        nodeid: 'node-id-1',
        datatype: 'geojson-feature-collection',
        config: {},
    },
    sortorder: 0,
    visible: true,
    widget: { widgetid: 'w1', component: 'MapDropZoneWidget' },
});

const makeFeature = (id: string): Feature => ({
    type: 'Feature',
    id,
    geometry: { type: 'Point', coordinates: [0, 0] },
    properties: {},
});

const makeNodeData = (features: Feature[]): GeoJSONFeatureCollectionValue => ({
    display_value: '',
    node_value: { type: 'FeatureCollection', features },
    details: [],
});

function mountWidget(
    propsOverride: Partial<{
        mode: string;
        aliasedNodeData: GeoJSONFeatureCollectionValue | undefined;
    }> = {},
) {
    return mount(MapDropZoneWidget, {
        props: {
            mode: EDIT,
            nodeAlias: 'collection-location',
            graphSlug: 'collection-event',
            cardXNodeXWidgetData: makeCardData(),
            aliasedNodeData: undefined,
            ...propsOverride,
        },
        global: {
            stubs: {
                MapDropZoneWidgetEditor: MapDropZoneWidgetEditorStub,
                SimpleMap: SimpleMapStub,
            },
        },
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MapDropZoneWidget', () => {
    // -------------------------------------------------------------------------
    // Mode-dependent rendering
    // -------------------------------------------------------------------------

    describe('mode-dependent rendering', () => {
        it('renders the editor in EDIT mode', () => {
            const wrapper = mountWidget({ mode: EDIT });
            expect(
                wrapper.findComponent(MapDropZoneWidgetEditorStub).exists(),
            ).toBe(true);
        });

        it('does not render the editor in VIEW mode', () => {
            const wrapper = mountWidget({ mode: VIEW });
            expect(
                wrapper.findComponent(MapDropZoneWidgetEditorStub).exists(),
            ).toBe(false);
        });

        it('always renders SimpleMap in EDIT mode', () => {
            const wrapper = mountWidget({ mode: EDIT });
            expect(wrapper.findComponent(SimpleMapStub).exists()).toBe(true);
        });

        it('always renders SimpleMap in VIEW mode', () => {
            const wrapper = mountWidget({ mode: VIEW });
            expect(wrapper.findComponent(SimpleMapStub).exists()).toBe(true);
        });

        it('always passes VIEW mode to SimpleMap regardless of the widget mode', () => {
            const wrapper = mountWidget({ mode: EDIT });
            expect(wrapper.findComponent(SimpleMapStub).props('mode')).toBe(
                VIEW,
            );
        });
    });

    // -------------------------------------------------------------------------
    // concatenatedAliasedNodeData
    // -------------------------------------------------------------------------

    describe('concatenatedAliasedNodeData passed to SimpleMap', () => {
        it('is an empty FeatureCollection when no data is provided', () => {
            const wrapper = mountWidget({ aliasedNodeData: undefined });
            const nodeValue = wrapper
                .findComponent(SimpleMapStub)
                .props('aliasedNodeData').node_value;
            expect(nodeValue.type).toBe('FeatureCollection');
            expect(nodeValue.features).toEqual([]);
        });

        it('includes features from the aliasedNodeData prop', () => {
            const feature = makeFeature('existing-1');
            const wrapper = mountWidget({
                aliasedNodeData: makeNodeData([feature]),
            });
            const features = wrapper
                .findComponent(SimpleMapStub)
                .props('aliasedNodeData').node_value.features;
            expect(features).toContainEqual(feature);
        });

        it('includes features received from the editor via update:value', async () => {
            const uploadedFeature = makeFeature('uploaded-1');
            const wrapper = mountWidget();

            await wrapper
                .findComponent(MapDropZoneWidgetEditorStub)
                .vm.$emit('update:value', makeNodeData([uploadedFeature]));

            const features = wrapper
                .findComponent(SimpleMapStub)
                .props('aliasedNodeData').node_value.features;
            expect(features).toContainEqual(uploadedFeature);
        });

        it('merges features from both the prop and the editor upload', async () => {
            const existingFeature = makeFeature('existing-1');
            const uploadedFeature = makeFeature('uploaded-1');

            const wrapper = mountWidget({
                aliasedNodeData: makeNodeData([existingFeature]),
            });

            await wrapper
                .findComponent(MapDropZoneWidgetEditorStub)
                .vm.$emit('update:value', makeNodeData([uploadedFeature]));

            const features = wrapper
                .findComponent(SimpleMapStub)
                .props('aliasedNodeData').node_value.features;
            expect(features).toHaveLength(2);
            expect(features).toContainEqual(existingFeature);
            expect(features).toContainEqual(uploadedFeature);
        });
    });

    // -------------------------------------------------------------------------
    // Event propagation
    // -------------------------------------------------------------------------

    describe('event propagation', () => {
        it('re-emits update:value from the editor to the parent', async () => {
            const newValue = makeNodeData([makeFeature('f1')]);
            const wrapper = mountWidget();

            await wrapper
                .findComponent(MapDropZoneWidgetEditorStub)
                .vm.$emit('update:value', newValue);

            expect(wrapper.emitted('update:value')).toBeTruthy();
            expect(wrapper.emitted('update:value')![0][0]).toEqual(newValue);
        });
    });
});
