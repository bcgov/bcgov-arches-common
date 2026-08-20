import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import type { FeatureCollection } from 'geojson';

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any imports of the mocked modules.
// ---------------------------------------------------------------------------

vi.mock('@/bcgov_arches_common/widgets/MapDropZoneWidget/utils.ts', () => ({
    processFileGeometry: vi.fn(),
}));

vi.mock('uuid', () => ({
    default: { generate: vi.fn().mockReturnValue('generated-uuid') },
}));

import MapDropZoneWidgetEditor from './MapDropZoneWidgetEditor.vue';
import { processFileGeometry } from '@/bcgov_arches_common/widgets/MapDropZoneWidget/utils.ts';
import type { PrimeVueMapFile } from '@/bcgov_arches_common/widgets/MapDropZoneWidget/types.ts';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const POINT_FC: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            id: 'existing-id',
            geometry: { type: 'Point', coordinates: [0, 0] },
            properties: {},
        },
    ],
};

const FC_NO_ID: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [1, 2] },
            properties: {},
        },
    ],
};

const GEOMETRY_COLLECTION_FC: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            id: 'gc-feat',
            geometry: {
                type: 'GeometryCollection',
                geometries: [
                    { type: 'Point', coordinates: [0, 0] },
                    {
                        type: 'LineString',
                        coordinates: [
                            [0, 0],
                            [1, 1],
                        ],
                    },
                ],
            },
            properties: { source: 'gc' },
        },
    ],
};

const CARD_DATA = {
    node: { nodeid: 'node-123', alias: 'my-node' },
    config: {},
} as any;

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

// FileUpload renders its #content slot so MapDropZone and FileList are mounted.
const FileUploadStub = {
    name: 'FileUpload',
    emits: ['select'],
    template: `<div class="p-fileupload"><slot name="content" :remove-file-callback="() => {}" /></div>`,
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
// Helpers
// ---------------------------------------------------------------------------

function makePrimeVueFile(name: string): PrimeVueMapFile {
    return Object.assign(new File(['content'], name), {
        objectURL: `blob:${name}`,
    });
}

function mountEditor(props: Record<string, unknown> = {}) {
    return mount(MapDropZoneWidgetEditor, {
        props: {
            nodeAlias: 'my-node',
            aliasedNodeData: undefined,
            cardXNodeXWidgetData: CARD_DATA,
            ...props,
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

async function triggerSelect(
    wrapper: ReturnType<typeof mountEditor>,
    files: PrimeVueMapFile[],
) {
    wrapper.findComponent({ name: 'FileUpload' }).vm.$emit('select', { files });
    await flushPromises();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MapDropZoneWidgetEditor', () => {
    beforeEach(() => {
        vi.mocked(processFileGeometry).mockReset();
        vi.mocked(processFileGeometry).mockResolvedValue(undefined);
    });

    // ------------------------------------------------------------------
    // Rendering
    // ------------------------------------------------------------------

    it('mounts without errors', () => {
        mountEditor();
    });

    it('renders the MapDropZone child component', () => {
        const wrapper = mountEditor();
        expect(wrapper.findComponent(MapDropZoneStub).exists()).toBe(true);
    });

    it('renders the FileList child component', () => {
        const wrapper = mountEditor();
        expect(wrapper.findComponent(FileListStub).exists()).toBe(true);
    });

    // ------------------------------------------------------------------
    // File selection — processFileGeometry integration
    // ------------------------------------------------------------------

    it('calls processFileGeometry once per selected file', async () => {
        const wrapper = mountEditor();
        const files = [makePrimeVueFile('a.json'), makePrimeVueFile('b.json')];
        await triggerSelect(wrapper, files);
        expect(processFileGeometry).toHaveBeenCalledTimes(2);
    });

    it('passes each File object to processFileGeometry', async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(POINT_FC);
        const wrapper = mountEditor();
        const file = makePrimeVueFile('map.geojson');
        await triggerSelect(wrapper, [file]);
        expect(processFileGeometry).toHaveBeenCalledWith(file);
    });

    it('does not emit update:value when processFileGeometry returns undefined', async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(undefined);
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('bad.csv')]);
        expect(wrapper.emitted('update:value')).toBeUndefined();
    });

    // ------------------------------------------------------------------
    // update:value event structure
    // ------------------------------------------------------------------

    it('emits update:value after a successful file selection', async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(POINT_FC);
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('map.geojson')]);
        expect(wrapper.emitted('update:value')).toHaveLength(1);
    });

    it('emitted node_value is a FeatureCollection', async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(POINT_FC);
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('map.geojson')]);
        const emitted = wrapper.emitted('update:value')![0][0] as any;
        expect(emitted.node_value.type).toBe('FeatureCollection');
    });

    it('emitted node_value contains the features from processFileGeometry', async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(POINT_FC);
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('map.geojson')]);
        const emitted = wrapper.emitted('update:value')![0][0] as any;
        expect(emitted.node_value.features).toHaveLength(1);
        expect(emitted.node_value.features[0].id).toBe('existing-id');
    });

    it('emitted details contains the pending file entry', async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(POINT_FC);
        const wrapper = mountEditor();
        const file = makePrimeVueFile('map.geojson');
        await triggerSelect(wrapper, [file]);
        const emitted = wrapper.emitted('update:value')![0][0] as any;
        expect(emitted.details).toHaveLength(1);
        expect(emitted.details[0].name).toBe('map.geojson');
    });

    it('pending file entry includes node_id from cardXNodeXWidgetData', async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(POINT_FC);
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('map.geojson')]);
        const emitted = wrapper.emitted('update:value')![0][0] as any;
        expect(emitted.details[0].node_id).toBe('node-123');
    });

    // ------------------------------------------------------------------
    // Feature ID assignment
    // ------------------------------------------------------------------

    it('keeps existing IDs on features that already have one', async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(POINT_FC);
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('map.geojson')]);
        const emitted = wrapper.emitted('update:value')![0][0] as any;
        expect(emitted.node_value.features[0].id).toBe('existing-id');
    });

    it('assigns a generated ID to features that have no id', async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(FC_NO_ID);
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('map.geojson')]);
        const emitted = wrapper.emitted('update:value')![0][0] as any;
        expect(emitted.node_value.features[0].id).toBe('generated-uuid');
    });

    // ------------------------------------------------------------------
    // GeometryCollection expansion
    // ------------------------------------------------------------------

    it('expands a GeometryCollection feature into individual features', async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(
            GEOMETRY_COLLECTION_FC,
        );
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('shapes.kml')]);
        const emitted = wrapper.emitted('update:value')![0][0] as any;
        // One GC feature with 2 geometries → 2 individual features
        expect(emitted.node_value.features).toHaveLength(2);
    });

    it('expanded features have the concrete geometry types, not GeometryCollection', async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(
            GEOMETRY_COLLECTION_FC,
        );
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('shapes.kml')]);
        const emitted = wrapper.emitted('update:value')![0][0] as any;
        const types = emitted.node_value.features.map(
            (f: any) => f.geometry.type,
        );
        expect(types).toContain('Point');
        expect(types).toContain('LineString');
        expect(types.includes('GeometryCollection')).toBe(false);
    });

    it('expanded features inherit non-geometry properties from the parent feature', async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(
            GEOMETRY_COLLECTION_FC,
        );
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('shapes.kml')]);
        const emitted = wrapper.emitted('update:value')![0][0] as any;
        for (const feature of emitted.node_value.features) {
            expect(feature.properties.source).toBe('gc');
        }
    });

    it('non-GeometryCollection features pass through unchanged', async () => {
        const mixedFC: FeatureCollection = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    id: 'point-1',
                    geometry: { type: 'Point', coordinates: [5, 6] },
                    properties: {},
                },
                {
                    type: 'Feature',
                    id: 'gc-1',
                    geometry: {
                        type: 'GeometryCollection',
                        geometries: [
                            { type: 'Point', coordinates: [7, 8] },
                            { type: 'Point', coordinates: [9, 10] },
                        ],
                    },
                    properties: {},
                },
            ],
        };
        vi.mocked(processFileGeometry).mockResolvedValue(mixedFC);
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('mixed.kml')]);
        const emitted = wrapper.emitted('update:value')![0][0] as any;
        // 1 Point + 1 GC(2 geoms) → 3 total
        expect(emitted.node_value.features).toHaveLength(3);
    });

    // ------------------------------------------------------------------
    // File removal
    // ------------------------------------------------------------------

    it("removes the file's features from node_value when the file is removed", async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(POINT_FC);
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('map.geojson')]);

        // Confirm the feature is present after selection
        const beforeRemove = wrapper.emitted('update:value')![0][0] as any;
        expect(beforeRemove.node_value.features).toHaveLength(1);

        // Trigger removal of file at index 0
        wrapper.findComponent(FileListStub).vm.$emit('remove', null, 0);
        await flushPromises();

        const afterRemove = wrapper.emitted('update:value')![1][0] as any;
        expect(afterRemove.node_value.features).toHaveLength(0);
    });

    it('emits update:value again after file removal', async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(POINT_FC);
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('map.geojson')]);

        wrapper.findComponent(FileListStub).vm.$emit('remove', null, 0);
        await flushPromises();

        expect(wrapper.emitted('update:value')).toHaveLength(2);
    });

    it('keeps features from other files when only one file is removed', async () => {
        const fc1: FeatureCollection = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    id: 'feat-A',
                    geometry: { type: 'Point', coordinates: [0, 0] },
                    properties: {},
                },
            ],
        };
        const fc2: FeatureCollection = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    id: 'feat-B',
                    geometry: { type: 'Point', coordinates: [1, 1] },
                    properties: {},
                },
            ],
        };

        vi.mocked(processFileGeometry)
            .mockResolvedValueOnce(fc1)
            .mockResolvedValueOnce(fc2);

        const wrapper = mountEditor();
        await triggerSelect(wrapper, [
            makePrimeVueFile('a.geojson'),
            makePrimeVueFile('b.geojson'),
        ]);

        // Remove the first file (feat-A)
        wrapper.findComponent(FileListStub).vm.$emit('remove', null, 0);
        await flushPromises();

        const afterRemove = wrapper.emitted('update:value')![1][0] as any;
        const ids = afterRemove.node_value.features.map((f: any) => f.id);
        expect(ids.includes('feat-A')).toBe(false);
        expect(ids).toContain('feat-B');
    });
});
