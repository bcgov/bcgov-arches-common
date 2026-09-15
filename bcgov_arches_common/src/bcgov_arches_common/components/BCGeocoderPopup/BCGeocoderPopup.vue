<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import type { GeocoderFeature } from '@/bcgov_arches_common/composables/useBCGeocoder.ts';

defineProps<{
    results: GeocoderFeature[];
    loading?: boolean;
}>();

const emit = defineEmits<{
    select: [feature: GeocoderFeature];
    dismiss: [];
}>();

const containerRef = ref<HTMLElement | null>(null);

function handleClickOutside(event: MouseEvent) {
    if (
        containerRef.value &&
        !containerRef.value.contains(event.target as Node)
    ) {
        emit('dismiss');
    }
}

onMounted(() => document.addEventListener('click', handleClickOutside));
onBeforeUnmount(() =>
    document.removeEventListener('click', handleClickOutside),
);
</script>

<template>
    <div
        ref="containerRef"
        class="geocoder-container">
        <slot />
        <ul
            v-if="results.length > 0"
            class="geocoder-dropdown"
            :class="{ 'geocoder-loading': loading }">
            <li class="geocoder-dismiss-row">
                <button
                    type="button"
                    class="geocoder-close-btn"
                    aria-label="Close suggestions"
                    @mousedown.prevent="emit('dismiss')">
                    &#x2715;
                </button>
            </li>
            <li
                v-for="(feature, i) in results"
                :key="i"
                @mousedown.prevent="emit('select', feature)">
                {{ String(feature.properties.fullAddress ?? '') }}
            </li>
        </ul>
    </div>
</template>

<style scoped>
.geocoder-container {
    position: relative;
    width: 100%;
}

.geocoder-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 1000;
    background: #fff;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    list-style: none;
    margin: 2px 0 0;
    padding: 0;
    max-height: 220px;
    overflow-y: auto;
}

.geocoder-dropdown li {
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    font-size: 1.2rem;
    color: #374151;
    border-bottom: 1px solid #f3f4f6;
}

.geocoder-dropdown li:last-child {
    border-bottom: none;
}

.geocoder-dropdown li:hover {
    background: #f0f4ff;
    color: #1d4ed8;
}

.geocoder-dismiss-row {
    display: flex;
    justify-content: flex-end;
    padding: 0.25rem 0.5rem;
    border-bottom: 1px solid #e5e7eb;
}

.geocoder-dismiss-row:hover {
    background: none;
    color: inherit;
}

.geocoder-close-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    color: #6b7280;
    line-height: 1;
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
}

.geocoder-close-btn:hover {
    background: #f3f4f6;
    color: #374151;
}
</style>
