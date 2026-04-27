import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import DashboardCard from './card.vue';

// Stub PrimeVue Card so tests don't need the full PrimeVue plugin.
// Renders all three named slots so inner content is accessible.
const CardStub = {
    name: 'Card',
    template: `
        <div class="p-card">
            <div class="p-card-title"><slot name="title" /></div>
            <div class="p-card-content"><slot name="content" /></div>
            <div class="p-card-footer"><slot name="footer" /></div>
        </div>
    `,
};

// Stub router-link so tests don't need an installed vue-router.
// Only declare 'to' as a prop — leaving 'class' out keeps it in $attrs so
// Vue's fallthrough attribute inheritance applies it to the root <a> element.
const RouterLinkStub = {
    name: 'RouterLink',
    props: ['to'],
    template: '<a><slot /></a>',
};

function mountCard(props: Record<string, unknown> = {}) {
    return mount(DashboardCard, {
        props,
        global: { stubs: { Card: CardStub, RouterLink: RouterLinkStub } },
    });
}

describe('card (DashboardCard)', () => {
    // ── Title ─────────────────────────────────────────────────────────────────

    it('renders the label in .dashboard-card-title', () => {
        const wrapper = mountCard({ label: 'My Dashboard' });
        expect(wrapper.find('.dashboard-card-title').text()).toBe(
            'My Dashboard',
        );
    });

    it('renders an empty title when label is not provided', () => {
        const wrapper = mountCard();
        expect(wrapper.find('.dashboard-card-title').text()).toBe('');
    });

    // ── Subtitle ──────────────────────────────────────────────────────────────

    it('renders the subtitle in .dashboard-card-subtitle', () => {
        const wrapper = mountCard({ subtitle: 'Project overview' });
        expect(wrapper.find('.dashboard-card-subtitle').text()).toBe(
            'Project overview',
        );
    });

    it('renders an empty subtitle when subtitle is not provided', () => {
        const wrapper = mountCard();
        expect(wrapper.find('.dashboard-card-subtitle').text()).toBe('');
    });

    // ── Description ───────────────────────────────────────────────────────────

    it('renders the description in .dashboard-card-description', () => {
        const wrapper = mountCard({ description: 'Click to view details' });
        expect(wrapper.find('.dashboard-card-description').text()).toBe(
            'Click to view details',
        );
    });

    it('renders an empty description when description is not provided', () => {
        const wrapper = mountCard();
        expect(wrapper.find('.dashboard-card-description').text()).toBe('');
    });

    // ── Icon ──────────────────────────────────────────────────────────────────

    it('applies icon prop classes to the dashboard-card-icon element', () => {
        const wrapper = mountCard({ icon: 'fa-solid fa-chart-bar' });
        const icon = wrapper.find('i.dashboard-card-icon');
        expect(icon.exists()).toBe(true);
        expect(icon.classes()).toContain('fa-solid');
        expect(icon.classes()).toContain('fa-chart-bar');
    });

    it('renders the icon element even when icon prop is empty', () => {
        const wrapper = mountCard({ icon: '' });
        expect(wrapper.find('i.dashboard-card-icon').exists()).toBe(true);
    });

    // ── class prop ────────────────────────────────────────────────────────────

    it('passes the class prop to the Card root element', () => {
        const wrapper = mountCard({ class: 'ipa' });
        expect(wrapper.find('.p-card').classes()).toContain('ipa');
    });

    // ── Footer / router-link ──────────────────────────────────────────────────

    it('renders the router-link in the footer with the card-router-link class', () => {
        const wrapper = mountCard();
        const link = wrapper.find('a.card-router-link');
        expect(link.exists()).toBe(true);
    });

    it('renders all content together correctly', () => {
        const wrapper = mountCard({
            label: 'Resources',
            subtitle: 'All items',
            description: 'Go to resources',
            icon: 'fa-solid fa-folder',
        });
        expect(wrapper.find('.dashboard-card-title').text()).toBe('Resources');
        expect(wrapper.find('.dashboard-card-subtitle').text()).toBe(
            'All items',
        );
        expect(wrapper.find('.dashboard-card-description').text()).toBe(
            'Go to resources',
        );
        expect(wrapper.find('i.dashboard-card-icon').classes()).toContain(
            'fa-folder',
        );
    });
});
