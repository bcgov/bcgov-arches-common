<script setup lang="ts">
import Card from 'primevue/card';

const props = defineProps({
    label: { type: String, default: '' },
    description: { type: String, default: '' },
    icon: { type: String, default: '' },
    class: { type: String, default: '' },
    routeName: { type: String, default: '' },
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
            <i
                :class="props.icon"
                class="dashboard-card-icon">
            </i>
        </template>
        <template #footer>
            <router-link
                :to="{ name: props.routeName }"
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
.dashboard-card {
    min-width: 33%;
}
.card-router-link {
    text-decoration: none;
}
.dashboard-card.ipa {
    border: 1px solid #7847ce;
    border-radius: 0%;
    max-width: 275px;
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
}
.dashboard-card-icon {
    color: #fff;
    font-size: 2.8rem;
    line-height: 32px;
    padding: 1rem;
    margin-bottom: 3rem;
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
</style>
