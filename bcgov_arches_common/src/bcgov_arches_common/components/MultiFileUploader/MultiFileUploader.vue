<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import GenericWidget from '@/arches_vue_components/generics/GenericWidget/GenericWidget.vue';
import { EDIT, VIEW } from '@/arches_vue_components/widgets/constants.ts';
import { useWidgetConfig } from '@/bcgov_arches_common/composables/useWidgetConfig.ts';
import type { AliasedNodeData } from '@/arches_vue_components/types.ts';

const props = withDefaults(
    defineProps<{
        addingNew: boolean;
        disableAddOrSave: boolean;
        graphSlug: string;
        nodeAlias: string;
        currentNodeData: AliasedNodeData | null;
        items: Array<{ aliased_data: Record<string, AliasedNodeData> }>;
        selectedIndex: number;
        itemTypeLabel?: string;
        iconClass?: string;
    }>(),
    {
        itemTypeLabel: 'Document',
        iconClass: 'fa-file',
    },
);

const { config: resolvedConfig } = useWidgetConfig(
    () => props.graphSlug,
    () => props.nodeAlias,
);

const maxItems = computed(() => {
    const widgetConfig = resolvedConfig.value?.config as
        Record<string, unknown> | undefined;
    const nodeConfig = resolvedConfig.value?.node?.config as
        Record<string, unknown> | undefined;

    return (nodeConfig?.maxFiles ?? widgetConfig?.maxFiles ?? 10) as number;
});

const itemsCount = computed(() => props.items?.length || 0);
const hasUnsavedFile = computed(() => Boolean(props.currentNodeData));

const emit = defineEmits<{
    (e: 'file-updated', value: AliasedNodeData): void;
    (e: 'clear-pending'): void;
    (e: 'add-new'): void;
    (e: 'save-item'): void;
    (e: 'delete-item', index: number): void;
    (e: 'select-item', index: number): void;
}>();

const getFileName = (fileData: AliasedNodeData | null): string => {
    const defaultName = props.itemTypeLabel || 'File';
    if (!fileData) return defaultName;

    const typedData = fileData;
    const fileArray = typedData.node_value as Array<
        Record<string, unknown>
    > | null;

    if (fileArray && fileArray.length > 0) {
        const firstFile = fileArray[0];
        const fileName =
            (firstFile.name as string) || (firstFile.file as File)?.name;

        if (fileName) return fileName;
    }

    if (typedData.display_value) {
        try {
            const parsed = JSON.parse(typedData.display_value) as Array<
                Record<string, unknown>
            >;
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name) {
                return parsed[0].name as string;
            }
        } catch (error) {
            console.warn('Failed to parse file display_value:', error);
            return typedData.display_value || defaultName;
        }
    }

    return defaultName;
};

const isImage = (fileData: AliasedNodeData | null): boolean => {
    if (!fileData) return false;

    const typedData = fileData;
    const fileArray = typedData.node_value as Array<
        Record<string, unknown>
    > | null;

    let firstFile: Record<string, unknown> | undefined;

    if (fileArray && fileArray.length > 0) {
        firstFile = fileArray[0];
    } else if (typedData.display_value) {
        try {
            const parsed = JSON.parse(typedData.display_value);
            if (Array.isArray(parsed) && parsed.length > 0) {
                firstFile = parsed[0] as Record<string, unknown>;
            }
        } catch (error) {
            console.warn('Failed to parse file display_value:', error);
        }
    }

    if (!firstFile) return false;

    const fileType =
        (firstFile.type as string) || (firstFile.file as File)?.type || '';
    const fileName =
        (firstFile.name as string) || (firstFile.file as File)?.name || '';

    return (
        fileType.startsWith('image/') ||
        /\.(jpeg|jpg|gif|png|webp|bmp|svg)$/i.test(fileName)
    );
};
</script>

<template>
    <div class="flex flex-row flex-nowrap uploader-layout">
        <div class="uploader-container">
            <div
                v-if="itemsCount >= maxItems && !hasUnsavedFile && addingNew"
                class="max-limit-message">
                <i class="fa fa-ban limit-icon"></i>
                <div>
                    Maximum of {{ maxItems }} {{ itemTypeLabel.toLowerCase() }}s
                    reached.
                </div>
                <div class="limit-subtext">
                    Please delete a {{ itemTypeLabel.toLowerCase() }} to add
                    more.
                </div>
            </div>

            <GenericWidget
                v-else-if="!hasUnsavedFile && addingNew"
                :key="selectedIndex"
                :graph-slug="graphSlug"
                :node-alias="nodeAlias"
                :should-show-label="false"
                :mode="EDIT"
                :aliased-node-data="currentNodeData"
                @update:value="
                    emit('file-updated', $event as AliasedNodeData)
                " />

            <div
                v-else
                class="pending-doc-preview">
                <GenericWidget
                    v-if="isImage(currentNodeData)"
                    :key="`view-${selectedIndex}`"
                    :graph-slug="graphSlug"
                    :node-alias="nodeAlias"
                    :should-show-label="false"
                    :mode="VIEW"
                    :aliased-node-data="currentNodeData" />
                <div
                    v-else
                    class="document-icon-wrapper">
                    <i
                        class="fa-regular document-icon"
                        :class="iconClass"></i>
                    <span
                        class="document-name"
                        :title="getFileName(currentNodeData)">
                        {{ getFileName(currentNodeData) }}
                    </span>
                </div>
                <Button
                    v-if="addingNew"
                    :label="`Remove / Change ${itemTypeLabel}`"
                    icon="fa fa-times"
                    @click="emit('clear-pending')" />
            </div>
        </div>

        <div class="placeholders">
            <div>
                <Button
                    v-if="!addingNew && itemsCount < maxItems"
                    label="+ Add"
                    class="inline-block"
                    @click="emit('add-new')" />
                <Button
                    v-if="addingNew && itemsCount < maxItems"
                    class="inline-block"
                    :aria-disabled="disableAddOrSave"
                    :disabled="disableAddOrSave"
                    :tooltip="`Save the new ${itemTypeLabel.toLowerCase()} before adding another`"
                    @click="emit('save-item')">
                    <i class="fa fa-save mr-2"></i>
                    Save {{ itemTypeLabel }}
                </Button>
            </div>

            <div class="flex flex-row doc-placeholders">
                <div
                    v-for="(item, index) in items"
                    :key="index"
                    :data-selected="index === selectedIndex"
                    class="doc-placeholder"
                    @click="emit('select-item', index)">
                    <div
                        class="fa fa-remove doc-delete-icon"
                        :tooltip="`Remove ${itemTypeLabel}`"
                        @click.stop="emit('delete-item', index)"></div>
                    <div class="document-icon-wrapper-small">
                        <GenericWidget
                            v-if="isImage(item.aliased_data[nodeAlias])"
                            :graph-slug="graphSlug"
                            :mode="VIEW"
                            :should-show-label="false"
                            :node-alias="nodeAlias"
                            :aliased-node-data="item.aliased_data[nodeAlias]" />
                        <template v-else>
                            <i
                                class="fa-regular document-icon-small"
                                :class="iconClass"></i>
                            <span
                                class="document-name-small"
                                :title="
                                    getFileName(item.aliased_data[nodeAlias])
                                ">
                                {{ getFileName(item.aliased_data[nodeAlias]) }}
                            </span>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.uploader-layout {
    display: flex;
    gap: 1.5rem;
    flex-direction: row;
    align-items: start;
    flex-wrap: nowrap;
}

.uploader-container {
    width: 300px;
    min-height: 200px;
}

.max-limit-message {
    width: 100%;
    height: 100%;
    min-height: 200px;
    background: #f8f9fa;
    border: 2px dashed #dee2e6;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #495057;
    font-weight: 600;
}

.limit-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    color: #aaa;
}

.limit-subtext {
    font-size: 0.8em;
    color: #666;
}

.pending-doc-preview {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

/* image previews */
.pending-doc-preview :deep(img) {
    max-width: 100%;
    max-height: 250px;
    object-fit: contain;
    border-radius: 4px;
}

.document-icon-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    background: #f8f9fa;
    border: 1px solid #ddd;
    border-radius: 4px;
    text-align: center;
}

.document-icon {
    font-size: 3.5rem;
    color: #6c757d;
    margin-bottom: 0.75rem;
}

.document-name {
    font-size: 0.9rem;
    color: #495057;
    font-weight: 500;
    word-break: break-all;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.doc-placeholders {
    flex-flow: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
    display: flex;
    flex-direction: row;
}

.doc-placeholder {
    max-width: 125px;
    min-width: 125px;
    height: 125px;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    transition: all 0.2s ease;
}

.doc-placeholder:hover {
    border-color: #adb5bd;
    background: #e9ecef;
}

.document-icon-wrapper-small {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
}

/* thumbnail images */
.document-icon-wrapper-small :deep(img) {
    max-width: 100%;
    max-height: 100px;
    object-fit: cover;
    border-radius: 4px;
}

.document-icon-small {
    font-size: 2.25rem;
    color: #6c757d;
    margin-bottom: 0.5rem;
}

.document-name-small {
    font-size: 0.75rem;
    color: #495057;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
}

.doc-delete-icon {
    position: absolute;
    top: 0.25rem;
    right: 0.25rem;
    color: #dc3545;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 50%;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.doc-delete-icon:hover {
    background: #dc3545;
    color: white;
}

.doc-placeholder[data-selected='false'] {
    opacity: 0.6;
}
.doc-placeholder[data-selected='true'] {
    border-color: #007bff;
    box-shadow: 0 0 0 1px #007bff;
}
</style>
