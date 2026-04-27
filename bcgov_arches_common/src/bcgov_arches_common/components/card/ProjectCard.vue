<script setup lang="ts">
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import type { PropType } from 'vue';

const props = defineProps({
    // Cap - Data
    capPriority: { type: Boolean, default: false },
    capLabel: { type: String, default: '' },
    capDate: { type: String, default: '' },

    // Body - Body Titles
    icon: { type: String, default: '' },
    bodyTitle: { type: String, required: true },
    bodySubtitle1: { type: String, default: '' },
    bodySubtitle2: { type: String, default: '' },

    // Body - Main Content
    body1: { type: String, default: '' },
    body2: { type: String, default: '' },
    body3: { type: String, default: '' },
    body4: { type: String, default: '' },
    body5: { type: String, default: '' },

    // Footer Data
    footerDate: { type: String, default: '' },
    footerName: { type: String, default: '' },

    // Core Card Props
    class: { type: String, default: '' },
    route: { type: Object as PropType<RouteLocationRaw>, default: () => ({}) },
    searchQuery: { type: String, default: '' },

    // Urgency Level (0: None, 1: Yellow, 2: Orange, 3: Red)
    urgency: { type: Number, default: 0 },
});

// Maps the numeric urgency level to a specific CSS class
const urgencyClass = computed(() => {
    switch (props.urgency) {
        case 1:
            return 'urgency-level-1';
        case 2:
            return 'urgency-level-2';
        case 3:
            return 'urgency-level-3';
        default:
            return '';
    }
});

// Highlights search terms in the text
const highlightText = (text: string) => {
    if (!text) return '';
    if (!props.searchQuery) return text;

    const escapedQuery = props.searchQuery.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&',
    );
    const regex = new RegExp(`(${escapedQuery})(?![^<]*>)`, 'gi');

    return text.replace(regex, '<mark class="highlight">$1</mark>');
};

// Checks if the special "priority" keyword is actively being searched
const isPrioritySearched = computed(() => {
    return (
        props.capPriority &&
        props.searchQuery.toLowerCase().trim() === 'priority'
    );
});
</script>

<template>
    <router-link
        :to="props.route"
        class="project-card-link"
        :class="props.class">
        <div
            class="bcgov-custom-card"
            :class="urgencyClass">
            <div class="bcgov-card-cap">
                <div class="cap-left">
                    <i
                        v-if="props.capPriority"
                        class="fa-solid fa-star priority-star"
                        :class="{ 'star-highlighted': isPrioritySearched }">
                    </i>

                    <span v-html="highlightText(props.capLabel)"></span>
                </div>

                <div
                    v-if="props.capDate"
                    class="cap-date"
                    v-html="highlightText(props.capDate)"></div>
            </div>

            <div class="bcgov-card-body">
                <div class="title-grid">
                    <div
                        class="logo-area"
                        v-if="props.icon">
                        <img
                            v-if="
                                props.icon.includes('/') ||
                                props.icon.includes('.')
                            "
                            :src="props.icon"
                            alt="Project Icon"
                            class="body-icon-img" />
                        <i
                            v-else
                            :class="props.icon"
                            class="body-icon-class">
                        </i>
                    </div>

                    <div
                        class="main-content-area"
                        :class="{ 'no-icon': !props.icon }">
                        <p
                            class="project-title"
                            v-html="highlightText(props.bodyTitle)"></p>
                        <p
                            v-if="props.bodySubtitle1"
                            class="project-subtitle1"
                            v-html="highlightText(props.bodySubtitle1)"></p>
                        <p
                            v-if="props.bodySubtitle2"
                            class="project-subtitle2"
                            v-html="highlightText(props.bodySubtitle2)"></p>
                    </div>
                </div>

                <div class="body-lines">
                    <p
                        v-if="props.body1"
                        class="body-text"
                        v-html="highlightText(props.body1)"></p>
                    <p
                        v-if="props.body2"
                        class="body-text"
                        v-html="highlightText(props.body2)"></p>
                    <p
                        v-if="props.body3"
                        class="body-text"
                        v-html="highlightText(props.body3)"></p>
                    <p
                        v-if="props.body4"
                        class="body-text"
                        v-html="highlightText(props.body4)"></p>
                    <p
                        v-if="props.body5"
                        class="body-text"
                        v-html="highlightText(props.body5)"></p>
                </div>

                <div class="bcgov-card-footer">
                    <div
                        class="footer-left"
                        v-html="highlightText(props.footerDate)"></div>
                    <div
                        class="footer-right"
                        v-html="highlightText(props.footerName)"></div>
                </div>
            </div>
        </div>
    </router-link>
</template>

<style scoped>
.project-card-link {
    text-decoration: none;
    display: block;
    width: 275px;
    height: 275px;
    margin: 10px;
    box-sizing: border-box;
}

.bcgov-custom-card {
    font-family: 'BC Sans', 'Noto Sans', Verdana, Arial, sans-serif;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
    background-color: #ffffff;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: 100%;
    box-sizing: border-box;
    transition:
        box-shadow 0.2s ease,
        transform 0.2s ease;
}

.bcgov-custom-card.urgency-level-1 {
    outline: 3px solid #facc15;
    border: 2px solid #facc15;
}

.bcgov-custom-card.urgency-level-2 {
    outline: 3px solid #f97316;
    border: 2px solid #f97316;
}

.bcgov-custom-card.urgency-level-3 {
    outline: 3px solid #ff0000;
    border: 2px solid #ff0000;
}

.bcgov-custom-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
}

/* 2. CAP */
.bcgov-card-cap {
    background-color: #003366;
    color: #ffffff;
    padding: 0.5rem 0.75rem;
    font-weight: 500;
    font-size: 1.35rem;
    margin: 0;
    line-height: 1.2;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.cap-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.priority-star {
    font-size: 1.35rem;
    color: #facc15;
}

.cap-date {
    font-size: 1.1rem;
    font-weight: 400;
    opacity: 0.9;
}

/* 3. BODY LAYOUT */
.bcgov-card-body {
    padding: 1.15rem;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
}

.title-grid {
    display: grid;
    grid-template-columns: 55px 1fr;
    gap: 0.6rem;
    align-items: center;
}

.logo-area {
    display: flex;
    justify-content: center;
    align-items: flex-start;
}

.body-icon-img {
    max-width: 100%;
    height: auto;
}

.body-icon-class {
    font-size: 3rem;
    color: #003366;
}

/* MAIN TITLE BLOCK */
.main-content-area {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
}

.main-content-area.no-icon {
    grid-column: 1 / span 2;
}

.project-title {
    margin: 0 0 0.1rem 0;
    font-size: 1.6rem;
    line-height: 1.1;
    font-weight: 600;
    color: #2e51dd;
    word-break: break-word;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.project-subtitle1 {
    margin: 0;
    font-size: 1.2rem;
    color: #333333;
    font-weight: 500;
}

.project-subtitle2 {
    margin: 0;
    font-size: 1.1rem;
    color: #777777;
}

/* 4. BODY LINES */
.body-lines {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    margin-top: 1rem;
}

.body-text {
    margin: 0;
    font-size: 1.2rem;
    color: #444444;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.body-lines :deep(strong) {
    color: #000000;
    font-weight: 700;
    display: inline-block;
    width: 100px;
}

/* 5. FOOTER */
.bcgov-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: auto;
    padding-top: 0.5rem;
    font-size: 1.05rem;
}

.footer-left {
    color: #777777;
}

.footer-right {
    color: #333333;
    font-size: 1.3rem;
    max-width: 60%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: right;
}

/* Search term highlight */
:deep(.highlight) {
    background-color: #fef08a;
    color: #000000;
    border-radius: 2px;
    padding: 0 2px;
    font-weight: inherit;
}
.star-highlighted {
    background-color: #fef08a;
    border-radius: 2px;
    padding: 2px 4px;
}
</style>
