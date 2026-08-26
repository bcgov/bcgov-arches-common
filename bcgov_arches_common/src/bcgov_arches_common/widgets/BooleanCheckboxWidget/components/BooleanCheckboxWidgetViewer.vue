<script setup lang="ts">
import type { BooleanAliasedNodeData } from '@/arches_vue_components/datatypes/boolean/types';

defineProps<{
    aliasedNodeData: BooleanAliasedNodeData | null;
}>();
</script>

<template>
    <div>{{ aliasedNodeData?.display_value }}</div>
</template>
