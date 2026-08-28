<script setup lang="ts">
import { ref, watchEffect, onUnmounted } from 'vue';
import uuid from 'uuid';

import FileUpload from 'primevue/fileupload';

import MapDropZone from '@/bcgov_arches_common/widgets/MapDropZoneWidget/components/MapDropZoneWidgetEditor/components/MapDropZone.vue';

import type { FileReference } from '@/arches_vue_components/datatypes/file-list/types.ts';
import type { GeoJSONFeatureCollectionCardXNodeXWidgetData } from '@/bcgov_arches_common/datatypes/geojson-feature-collection/types.ts';
import type {
    MapFileData,
    PrimeVueMapFile,
} from '@/bcgov_arches_common/widgets/MapDropZoneWidget/types.ts';
import type { FeatureCollection, Feature } from 'geojson';
import { processFileGeometry } from '@/bcgov_arches_common/widgets/MapDropZoneWidget/utils.ts';
import type { GeoJSONFeatureCollectionValue } from '@/bcgov_arches_common/datatypes/geojson-feature-collection/types.ts';
import FileList from '@/arches_vue_components/widgets/FileListWidget/components/FileListWidgetEditor/components/FileList.vue';

const { aliasedNodeData, nodeAlias, cardXNodeXWidgetData } = defineProps<{
    aliasedNodeData: GeoJSONFeatureCollectionValue | undefined;
    nodeAlias: string;
    cardXNodeXWidgetData: GeoJSONFeatureCollectionCardXNodeXWidgetData;
}>();

const emit = defineEmits<{
    (
        event: 'update:aliasedNodeData',
        updatedValue: GeoJSONFeatureCollectionValue,
    ): void;
}>();

const fileUploadRef = ref<InstanceType<typeof FileUpload> | null>(null);

const savedFiles = ref<FileReference[]>([]);
const pendingFiles = ref<MapFileData[]>([]);

const allowedFileTypes = ref();
const currentValues = ref();
// const acceptedFiles = cardXNodeXWidgetData.config.acceptedFiles;
const acceptedFiles = '';

watchEffect(() => {
    allowedFileTypes.value = acceptedFiles != '' ? acceptedFiles : null;

    if (
        aliasedNodeData &&
        aliasedNodeData.node_value?.features &&
        aliasedNodeData.node_value.features.length > 0
    ) {
        currentValues.value = aliasedNodeData.node_value;

        // if (aliasedNodeData.node_value) {
        //     savedFiles.value = aliasedNodeData.node_value.map((file) => {
        //         return {
        //             ...file,
        //             node_id: cardXNodeXWidgetData.node.nodeid,
        //         };
        //     });
        // } else {
        //     savedFiles.value = [];
        // }
    }
});

function emitUpdatedValue() {
    const allFiles = [
        ...savedFiles.value,
        ...pendingFiles.value,
    ] as FileReference[];
    const newValue = {
        display_value: JSON.stringify(allFiles),
        node_value: nodeValue.value,
        details: [...pendingFiles.value],
    };
    emit('update:aliasedNodeData', newValue);
}

const nodeValue = ref({
    type: 'FeatureCollection',
    features: [] as Feature[],
} satisfies FeatureCollection);

const warningMessage = ref<string | null>(null);
let warningTimer: ReturnType<typeof setTimeout> | null = null;

function showWarning(message: string) {
    warningMessage.value = message;
    if (warningTimer) clearTimeout(warningTimer);
    warningTimer = setTimeout(() => {
        warningMessage.value = null;
        warningTimer = null;
    }, 5000);
}

onUnmounted(() => {
    if (warningTimer) clearTimeout(warningTimer);
});

async function onSelect(event: { files: PrimeVueMapFile[] }): Promise<void> {
    const results = await Promise.all(
        event.files.map((file) =>
            processFileGeometry(file).then((geometries) => ({
                file,
                geometries,
            })),
        ),
    );
    // Process results after ALL promises are resolved
    let anyGeometries = false;
    for (const { file, geometries } of results) {
        if (!geometries) continue;
        anyGeometries = true;

        const geometrySourceId = uuid.generate();

        // Arches does not support GeometryCollection — expand each such feature
        // into one Feature per contained geometry before storing.
        geometries.features = geometries.features.flatMap((feature) => {
            if (feature.geometry?.type !== 'GeometryCollection')
                return [feature];
            return feature.geometry.geometries.map((geom) => ({
                ...feature,
                geometry: geom,
            }));
        });

        // Ensure each feature has an id
        geometries.features = geometries.features.map((feature) => {
            return feature?.id ? feature : { ...feature, id: uuid.generate() };
        });

        pendingFiles.value = [
            ...pendingFiles.value,
            {
                name: file.name,
                size: file.size,
                type: file.type,
                url: file.objectURL,
                file,
                node_id: cardXNodeXWidgetData.node.nodeid, // or cardXNodeXWidgetData.value…
                file_id: geometrySourceId,
                geometrySourceId,
                geometries: geometries as FeatureCollection,
            },
        ];

        nodeValue.value.features = [
            ...(aliasedNodeData?.node_value?.features ?? []),
            ...nodeValue.value.features,
            ...geometries.features,
        ];
    }

    // for (const file of event.files) {
    //     processFileGeometry(file).then(
    //         (geometries: FeatureCollection | undefined) => {
    //             if (geometries) {
    //                 // This sets geometry id for each feature if it doesn't already exist
    //                 geometries.features = geometries.features.map((feature) => {
    //                     return feature?.id
    //                         ? feature
    //                         : { ...feature, id: uuid.generate() };
    //                 });
    //                 pendingFiles.value.push({
    //                     name: file.name,
    //                     size: file.size,
    //                     type: file.type,
    //                     url: file.objectURL,
    //                     file: file,
    //                     node_id: cardXNodeXWidgetData.node.nodeid,
    //                     geometrySourceId: uuid.generate(),
    //                     geometries: geometries as FeatureCollection,
    //                 });
    //                 nodeValue.value.features = [
    //                     ...nodeValue.value.features,
    //                     ...geometries.features,
    //                 ];
    //             }
    //         },
    //     );
    // }

    if (anyGeometries) {
        emitUpdatedValue();
    } else {
        showWarning(
            'No valid geometry was found in the selected file(s). ' +
                'Supported formats: .geojson, .json, .kml, .shp, .zip',
        );
    }
}

function onRemovePendingFile(
    fileIndex: number,
    removeFileCallback: (index: number) => void,
): void {
    removeFileCallback(fileIndex);
    const fileToRemove = pendingFiles.value[fileIndex];
    const geometriesIdsToRemove = fileToRemove.geometries.features.map(
        (feature) => feature.id,
    );
    pendingFiles.value.splice(fileIndex, 1);
    pendingFiles.value = [...pendingFiles.value];
    nodeValue.value.features = nodeValue.value.features.filter(
        (feature) => !geometriesIdsToRemove.includes(feature.id),
    );
    emitUpdatedValue();
}

function openFileChooser(): void {
    // @ts-expect-error FileUpload does not have a type definition for $el
    const rootElement = fileUploadRef.value?.$el;
    rootElement?.querySelector('input[type="file"]')?.click();
}
</script>

<template>
    <FileUpload
        ref="fileUploadRef"
        :accept="allowedFileTypes"
        :name="nodeAlias"
        :model-value="aliasedNodeData?.node_value"
        :multiple="true"
        :show-cancel-button="false"
        :show-upload-button="false"
        :with-credentials="true"
        :custom-upload="true"
        @select="onSelect($event)">
        <template #content="{ removeFileCallback }">
            <MapDropZone
                :card-x-node-x-widget-data="cardXNodeXWidgetData"
                :open-file-chooser="openFileChooser" />
            <FileList
                :files="pendingFiles as unknown as FileReference[]"
                @remove="
                    (_fileReference, fileIndex) =>
                        onRemovePendingFile(fileIndex, removeFileCallback)
                " />
        </template>
    </FileUpload>
    <Transition name="map-drop-zone-warning">
        <div
            v-if="warningMessage"
            class="map-drop-zone-warning"
            role="alert">
            <span>{{ warningMessage }}</span>
            <button
                class="map-drop-zone-warning-dismiss"
                @click="warningMessage = null">
                ×
            </button>
        </div>
    </Transition>
</template>

<style scoped>
:deep(.p-fileupload-header) {
    display: none;
}
:deep(.p-fileupload-content) {
    padding: 0;
}

.map-drop-zone-warning {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-top: 0.5rem;
    padding: 0.5rem 0.75rem;
    background-color: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 4px;
    color: #664d03;
    font-size: 0.875rem;
}

.map-drop-zone-warning-dismiss {
    flex-shrink: 0;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.1rem;
    line-height: 1;
    color: inherit;
    padding: 0;
}

.map-drop-zone-warning-enter-active {
    transition: opacity 0.2s ease;
}
.map-drop-zone-warning-leave-active {
    transition: opacity 0.6s ease;
}
.map-drop-zone-warning-enter-from,
.map-drop-zone-warning-leave-to {
    opacity: 0;
}
</style>
