<script setup lang="ts">
import Card from 'primevue/card';
import type { RouteLocationRaw } from 'vue-router';
import type { PropType } from 'vue';

const props = defineProps({
    label: { type: String, default: '' },
    description: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    icon: { type: String, default: '' },
    class: { type: String, default: '' },
    route: { type: Object as PropType<RouteLocationRaw>, default: {} },
});
</script>
<template>
    <Card :class="props.class">
        <template #title>
            <p class="dashboard-card-title">
                {{ props.label }}
            </p>
        </template>
        <template #content>
            <div class="dashboard-card-content">
                <i
                    :class="props.icon"
                    class="dashboard-card-icon">
                </i>
            </div>
            <div class="dashboard-card-subtitle-container">
                <p class="dashboard-card-subtitle">
                    {{ props.subtitle }}
                </p>
            </div>
        </template>
        <template #footer>
            <router-link
                :to="props.route"
                class="card-router-link">
                <div class="dashboard-card-link">
                    <p class="dashboard-card-description">
                        {{ props.description }}
                    </p>
                </div>
            </router-link>
        </template>
    </Card>
</template>

<style scoped>
.card-router-link {
    text-decoration: none;
}
.dashboard-card.ipa {
    border: 1px solid #7847ce;
    border-radius: 0%;
    width: 275px;
    height: 250px;
    margin: 5px;
    text-align: center;
    background: #8bc3eb;
    color: #440ea2;
    opacity: 0.8;
}
.dashboard-card.ipa :deep(.p-card-body) {
    padding: 0rem;
}
.dashboard-card-description {
    margin-bottom: 0;
    padding-top: 0.75rem;
}
.dashboard-card.ipa:hover {
    background: #6da8d3;
}
.dashboard-card-title {
    font-weight: 500;
    color: #440ea2;
    text-align: center;
    overflow-wrap: break-word;
    margin-top: 1rem;
    font-size: 1rem;
}
.dashboard-card-icon {
    color: #fff;
    font-size: 1.8rem;
    line-height: 32px;
    padding: 1rem;
    margin-bottom: 3rem;
    width: 75px;
    height: 75px;
    text-align: center;
    padding: 18px;
    border-radius: 50%;
    background: #bfe0f7;
    border: 1px solid #454545;
}
.dashboard-card-description {
    height: 55px;
    width: 100%;
    font-weight: 600;
    border-top: 1px solid #7847ce;
    color: white;
    font-size: 0.7rem;
}
.dashboard-card-link {
    background: #2b4e6d;
}
.dashboard-card-link:hover {
    background: #4683b9;
}
.dashboard-card-footer {
    position: absolute;
    bottom: 0;
    width: 100%;
    color: white;
}
.dashboard-card.collection-event {
    border: solid thick rgba(50, 50, 50, 0.7);
}
.dashboard-card-content {
    max-height: 4rem;
}
.dashboard-card-subtitle-container {
    padding: 0px 5px;
}
.dashboard-card-subtitle {
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.7rem;
}
</style>
