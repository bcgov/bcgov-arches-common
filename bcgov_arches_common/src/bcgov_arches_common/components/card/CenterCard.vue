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
        class="card-router-link"
        :class="props.class">
        <div class="bcgov-custom-card">
            <div class="bcgov-card-header">
                {{ props.label }}
            </div>

            <div class="bcgov-card-body">
                <div class="content-wrapper">
                    <i
                        v-if="props.icon"
                        :class="props.icon"
                        class="stack-icon"></i>
                    <div class="text-content">
                        <p
                            v-if="props.description"
                            class="description">
                            {{ props.description }}
                        </p>
                        <p
                            v-if="props.subtitle"
                            class="subtitle">
                            {{ props.subtitle }}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </router-link>
</template>

<style scoped>
.card-router-link {
    text-decoration: none;
    display: block;
    width: 300px;
    margin: 10px;
}

.bcgov-custom-card {
    /* Adding BC Sans as the primary font */
    font-family: 'BC Sans', 'Noto Sans', Verdana, Arial, sans-serif;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
    background-color: #ffffff;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 150px;
    transition:
        box-shadow 0.2s ease,
        transform 0.2s ease;
}

.bcgov-custom-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
}

.bcgov-card-header {
    background-color: #385a8a;
    color: #ffffff;
    padding: 0.5rem 1.25rem;
    /* Reduced from 700 to 500 for a medium, less heavy look */
    font-weight: 500;
    font-size: 1.1rem;
    margin: 0;
    line-height: 1.3;
    text-align: center;
}

.bcgov-card-body {
    padding: 1.25rem;
    color: #333333;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.content-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    height: 100%;
}

.stack-icon {
    font-size: 2.2rem;
    color: #385a8a;
}

.text-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.35rem;
}

.description {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.4;
    color: #333333;
}

.subtitle {
    margin: 0;
    font-size: 0.85rem;
    color: #666666;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}
</style>
