<script setup lang="ts">
import BooleanCheckboxWidgetEditor from '@/bcgov_arches_common/widgets/BooleanCheckboxWidget/components/BooleanCheckboxWidgetEditor.vue';
import BooleanCheckboxWidgetViewer from '@/bcgov_arches_common/widgets/BooleanCheckboxWidget/components/BooleanCheckboxWidgetViewer.vue';

import { EDIT, VIEW } from '@/arches_vue_components/widgets/constants.ts';

import type { BooleanCardXNodeXWidgetData } from '@/arches_vue_components/types.ts';
import type { BooleanAliasedNodeData } from '@/arches_vue_components/datatypes/boolean/types.ts';
import type { WidgetMode } from '@/arches_vue_components/widgets/types.ts';

defineProps<{
    mode: WidgetMode;
    nodeAlias: string;
    graphSlug: string;
    cardXNodeXWidgetData: BooleanCardXNodeXWidgetData;
    aliasedNodeData: BooleanAliasedNodeData | null;
}>();

const emit = defineEmits<{
    'update:aliasedNodeData': [updatedValue: BooleanAliasedNodeData];
    'update:value': [updatedValue: boolean | null];
}>();

function onUpdateAliasedNodeData(updatedValue: BooleanAliasedNodeData) {
    emit('update:aliasedNodeData', updatedValue);
    emit('update:value', updatedValue.node_value);
}
</script>

<template>
    <BooleanCheckboxWidgetEditor
        v-if="mode === EDIT"
        :card-x-node-x-widget-data="cardXNodeXWidgetData"
        :aliased-node-data="aliasedNodeData"
        @update:aliased-node-data="onUpdateAliasedNodeData($event)" />
    <BooleanCheckboxWidgetViewer
        v-if="mode === VIEW"
        :card-x-node-x-widget-data="cardXNodeXWidgetData"
        :aliased-node-data="aliasedNodeData" />
</template>

<style scoped>
.widget {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: 100%;
}
</style>
