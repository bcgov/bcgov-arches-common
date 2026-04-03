<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';
import type { PropType } from 'vue';

const props = defineProps({
    label: { type: String, default: '' },
    description: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    icon: { type: String, default: '' },
    class: { type: String, default: '' },
    route: { type: Object as PropType<RouteLocationRaw>, default: () => ({}) },
});
</script>

<template>
    <router-link
        :to="props.route"
        class="bcgov-theme-card-link"
        :class="props.class">
        <div class="bcgov-theme-card">
            <div
                v-if="props.icon"
                class="card-icon-column">
                <i :class="props.icon"></i>
            </div>

            <div class="card-text-column">
                <h3 class="theme-card-title">{{ props.label }}</h3>

                <p
                    v-if="props.description"
                    class="theme-card-description">
                    {{ props.description }}
                </p>
                <p
                    v-if="props.subtitle"
                    class="theme-card-subtitle">
                    {{ props.subtitle }}
                </p>
            </div>
        </div>
    </router-link>
</template>

<style scoped>
.bcgov-theme-card-link {
    text-decoration: none;
    display: block;
    width: 100%;
    max-width: 375px;
    margin: 10px;
}

.bcgov-theme-card {
    font-family: 'BC Sans', 'Noto Sans', Verdana, Arial, sans-serif;
    background-color: #ffffff;
    border-radius: 8px;
    padding: 1.5rem;
    min-height: 120px;
    display: flex;
    align-items: flex-start;
    gap: 1.25rem;
    border: 1px solid #e1e1e5;
    transition:
        background-color 0.2s ease,
        box-shadow 0.2s ease;
}

.bcgov-theme-card-link:hover .bcgov-theme-card {
    background-color: #f2f2f2;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.card-icon-column {
    flex-shrink: 0;
    color: #494949;
    font-size: 1.85rem;
    margin-top: 0.1rem;
}

.card-icon-column i {
    font-weight: 400 !important;
    color: #494949;
    font-size: 1.85rem;
    margin-top: 0.1rem;
}

.card-text-column {
    display: flex;
    flex-direction: column;
}

.theme-card-title {
    margin: 0 0 0.75rem 0;
    color: #1a5a96;
    font-size: 1.125rem;
    font-weight: 700;
    line-height: 1.2;
}

.theme-card-description {
    margin: 0;
    font-size: 1rem;
    color: #313132;
    line-height: 1.5;
}

.theme-card-subtitle {
    margin: 0.5rem 0 0 0;
    font-size: 0.875rem;
    color: #555555;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}
</style>
