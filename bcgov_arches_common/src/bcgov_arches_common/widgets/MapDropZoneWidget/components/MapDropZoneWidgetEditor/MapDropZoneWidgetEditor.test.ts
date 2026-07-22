import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import type { GeoJSONFeatureCollectionCardXNodeXWidgetData } from '@/bcgov_arches_common/datatypes/geojson-feature-collection/types.ts';
import type { FeatureCollection } from 'geojson';

// ---------------------------------------------------------------------------
// Module mocks — must be hoisted before the component import
// ---------------------------------------------------------------------------

vi.mock('@/bcgov_arches_common/widgets/MapDropZoneWidget/utils.ts', () => ({
    processFileGeometry: vi.fn(),
}));

// Predictable UUIDs: validate() always returns false so every feature gets a
// freshly generated id; v4() returns a sequential counter string.
let uuidCounter = 0;
vi.mock('uuid', () => ({
    v4: vi.fn(() => `uuid-${++uuidCounter}`),
    validate: vi.fn(() => false),
}));

import MapDropZoneWidgetEditor from './MapDropZoneWidgetEditor.vue';
import { processFileGeometry } from '@/bcgov_arches_common/widgets/MapDropZoneWidget/utils.ts';

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

// Plain objects avoid vue/one-component-per-file and vue/require-prop-types
// lint warnings that are triggered by defineComponent() in .ts test files.
// Renders the content slot with a no-op removeFileCallback so MapDropZone and
// FileList inside the slot are also mounted.
const FileUploadStub = {
    name: 'FileUpload',
    props: [
        'accept',
        'name',
        'modelValue',
        'multiple',
        'showCancelButton',
        'showUploadButton',
        'withCredentials',
        'customUpload',
    ],
    emits: ['select'],
    setup() {
        const removeFileCallback = vi.fn();
        return { removeFileCallback };
    },
    template:
        '<div class="file-upload-stub"><slot name="content" :remove-file-callback="removeFileCallback" /></div>',
};

const MapDropZoneStub = {
    name: 'MapDropZone',
    props: ['openFileChooser', 'cardXNodeXWidgetData'],
    template: '<div class="map-drop-zone-stub" />',
};

const FileListStub = {
    name: 'FileList',
    props: ['files'],
    emits: ['remove'],
    template: '<div class="file-list-stub" />',
};

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

/** Creates a minimal PrimeVue file object (File + objectURL). */
function makeMapFile(name = 'data.geojson') {
    return Object.assign(new File(['{}'], name, { type: 'application/json' }), {
        objectURL: `blob:http://localhost/${name}`,
    });
}

function mountEditor(propsOverride = {}) {
    return mount(MapDropZoneWidgetEditor, {
        props: {
            aliasedNodeData: undefined,
            nodeAlias: 'collection-location',
            cardXNodeXWidgetData: makeCardData(),
            ...propsOverride,
        },
        global: {
            stubs: {
                FileUpload: FileUploadStub,
                MapDropZone: MapDropZoneStub,
                FileList: FileListStub,
            },
        },
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MapDropZoneWidgetEditor', () => {
    beforeEach(() => {
        uuidCounter = 0;
        vi.clearAllMocks();
    });

    // -------------------------------------------------------------------------
    // Rendering
    // -------------------------------------------------------------------------

    describe('rendering', () => {
        it('mounts without throwing', () => {
            mountEditor();
        });

        it('renders the FileUpload component', () => {
            const wrapper = mountEditor();
            expect(wrapper.findComponent(FileUploadStub).exists()).toBe(true);
        });

        it('renders MapDropZone inside the content slot', () => {
            const wrapper = mountEditor();
            expect(wrapper.findComponent(MapDropZoneStub).exists()).toBe(true);
        });

        it('renders FileList inside the content slot', () => {
            const wrapper = mountEditor();
            expect(wrapper.findComponent(FileListStub).exists()).toBe(true);
        });
    });

    // -------------------------------------------------------------------------
    // File selection
    // -------------------------------------------------------------------------

    describe('onSelect', () => {
        it('emits update:value after a file is selected and processed', async () => {
            const geojson: FeatureCollection = {
                type: 'FeatureCollection',
                features: [
                    {
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: [0, 0] },
                        properties: {},
                    },
                ],
            };
            vi.mocked(processFileGeometry).mockResolvedValue(geojson);

            const wrapper = mountEditor();
            await wrapper
                .findComponent(FileUploadStub)
                .vm.$emit('select', { files: [makeMapFile()] });
            await flushPromises();

            expect(wrapper.emitted('update:value')).toBeTruthy();
        });

        it('assigns a uuid to features that lack a valid id', async () => {
            const geojson: FeatureCollection = {
                type: 'FeatureCollection',
                features: [
                    {
                        type: 'Feature',
                        // No id — validate() returns false so a new uuid is assigned
                        geometry: { type: 'Point', coordinates: [1, 2] },
                        properties: {},
                    },
                ],
            };
            vi.mocked(processFileGeometry).mockResolvedValue(geojson);

            const wrapper = mountEditor();
            await wrapper
                .findComponent(FileUploadStub)
                .vm.$emit('select', { files: [makeMapFile()] });
            await flushPromises();

            const emitted = wrapper.emitted('update:value') as any[][];
            const nodeValue = emitted[0][0].node_value as FeatureCollection;
            expect(nodeValue.features[0].id).toMatch(/^uuid-/);
        });

        it('accumulates features from multiple files', async () => {
            const makeGeojson = (id: string): FeatureCollection => ({
                type: 'FeatureCollection',
                features: [
                    {
                        type: 'Feature',
                        id,
                        geometry: { type: 'Point', coordinates: [0, 0] },
                        properties: {},
                    },
                ],
            });
            vi.mocked(processFileGeometry)
                .mockResolvedValueOnce(makeGeojson('f1'))
                .mockResolvedValueOnce(makeGeojson('f2'));

            const wrapper = mountEditor();
            // First selection
            await wrapper
                .findComponent(FileUploadStub)
                .vm.$emit('select', { files: [makeMapFile('a.geojson')] });
            await flushPromises();
            // Second selection
            await wrapper
                .findComponent(FileUploadStub)
                .vm.$emit('select', { files: [makeMapFile('b.geojson')] });
            await flushPromises();

            const emittedEvents = wrapper.emitted('update:value') as any[][];
            const lastEmit = emittedEvents[emittedEvents.length - 1][0];
            expect(lastEmit.node_value.features.length).toBeGreaterThanOrEqual(
                2,
            );
        });

        it('emits update:value with an empty feature list when processFileGeometry returns undefined', async () => {
            // onSelect calls emitUpdatedValue() unconditionally after processing
            // all files, so an emit always occurs — but no features are added.
            vi.mocked(processFileGeometry).mockResolvedValue(undefined);

            const wrapper = mountEditor();
            await wrapper.findComponent(FileUploadStub).vm.$emit('select', {
                files: [makeMapFile('unsupported.txt')],
            });
            await flushPromises();

            const emitted = wrapper.emitted('update:value') as any[][];
            expect(emitted).toBeTruthy();
            expect(emitted[0][0].node_value.features).toHaveLength(0);
        });
    });

    // -------------------------------------------------------------------------
    // File removal
    // -------------------------------------------------------------------------

    describe('onRemovePendingFile', () => {
        it('removes the file and its features when FileList emits remove', async () => {
            const geojson: FeatureCollection = {
                type: 'FeatureCollection',
                features: [
                    {
                        type: 'Feature',
                        id: 'feat-to-remove',
                        geometry: { type: 'Point', coordinates: [5, 5] },
                        properties: {},
                    },
                ],
            };
            vi.mocked(processFileGeometry).mockResolvedValue(geojson);

            const wrapper = mountEditor();
            await wrapper
                .findComponent(FileUploadStub)
                .vm.$emit('select', { files: [makeMapFile()] });
            await flushPromises();

            // Trigger removal of the first (index 0) pending file
            await wrapper
                .findComponent(FileListStub)
                .vm.$emit('remove', undefined, 0);

            const emittedEvents = wrapper.emitted('update:value') as any[][];
            const lastNodeValue = emittedEvents[emittedEvents.length - 1][0]
                .node_value as FeatureCollection;
            // The removed file's features should no longer be in node_value
            expect(
                lastNodeValue.features.some((f) => f.id === 'feat-to-remove'),
            ).toBe(false);
        });
    });
});
