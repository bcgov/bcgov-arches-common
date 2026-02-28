<script setup lang="ts">
import BooleanCheckboxWidgetEditor from '@/bcgov_arches_common/widgets/BooleanCheckboxWidget/components/BooleanCheckboxWidgetEditor.vue';
import BooleanCheckboxWidgetViewer from '@/bcgov_arches_common/widgets/BooleanCheckboxWidget/components/BooleanCheckboxWidgetViewer.vue';

import { EDIT, VIEW } from '@/arches_component_lab/widgets/constants.ts';

import type { BooleanCardXNodeXWidgetData } from '@/arches_component_lab/types.ts';
import type { BooleanValue } from '@/arches_component_lab/datatypes/boolean/types.ts';
import type { WidgetMode } from '@/arches_component_lab/widgets/types.ts';

defineProps<{
    mode: WidgetMode;
    nodeAlias: string;
    graphSlug: string;
    cardXNodeXWidgetData: BooleanCardXNodeXWidgetData;
    aliasedNodeData: BooleanValue | null;
    shouldEmitSimplifiedValue?: boolean;
}>();

const emit = defineEmits(['update:value']);
</script>

<template>
    <BooleanCheckboxWidgetEditor
        v-if="mode === EDIT"
        :card-x-node-x-widget-data="cardXNodeXWidgetData"
        :aliased-node-data="aliasedNodeData"
        :should-emit-simplified-value="shouldEmitSimplifiedValue"
        @update:value="emit('update:value', $event)" />
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
