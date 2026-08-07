<script setup lang="ts">
import Checkbox from 'primevue/checkbox';
import { useGettext } from 'vue3-gettext';

import type { BooleanCardXNodeXWidgetData } from '@/arches_vue_components/types.ts';
import type { BooleanAliasedNodeData } from '@/arches_vue_components/datatypes/boolean/types.ts';

const { $gettext } = useGettext();

const { cardXNodeXWidgetData, aliasedNodeData } = defineProps<{
    cardXNodeXWidgetData: BooleanCardXNodeXWidgetData;
    aliasedNodeData: BooleanAliasedNodeData | null;
}>();

const emit = defineEmits<{
    (
        event: 'update:aliasedNodeData',
        updatedValue: BooleanAliasedNodeData,
    ): void;
}>();

function getDisplayValue(value: boolean | null | undefined): string {
    if (value === true) {
        return cardXNodeXWidgetData.node.config.trueLabel || $gettext('True');
    } else if (value === false) {
        return cardXNodeXWidgetData.node.config.falseLabel || $gettext('False');
    } else {
        return '';
    }
}

function onUpdateModelValue(updatedValue: boolean | null) {
    emit('update:aliasedNodeData', {
        display_value: getDisplayValue(updatedValue),
        node_value: updatedValue,
        details: [],
    });
}
</script>

<template>
    <Checkbox
        :binary="true"
        fluid="true"
        :true-value="true"
        :false-value="false"
        :model-value="aliasedNodeData?.node_value?.toString() || ''"
        @update:model-value="onUpdateModelValue($event)">
    </Checkbox>
</template>
