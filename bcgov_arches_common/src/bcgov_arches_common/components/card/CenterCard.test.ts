import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CenterCard from './CenterCard.vue';

// Stub router-link so tests don't need an installed vue-router.
// Only declare 'to' as a prop — leaving 'class' out keeps it in $attrs so
// Vue's fallthrough attribute inheritance applies it to the root <a> element.
const RouterLinkStub = {
    name: 'RouterLink',
    props: ['to'],
    template: '<a><slot /></a>',
};

function mountCard(props: Record<string, unknown> = {}) {
    return mount(CenterCard, {
        props,
        global: { stubs: { RouterLink: RouterLinkStub } },
    });
}

describe('CenterCard', () => {
    it('renders the label in the card header', () => {
        const wrapper = mountCard({ label: 'My Resource' });
        expect(wrapper.find('.bcgov-card-header').text()).toBe('My Resource');
    });

    it('renders an empty header when label is not provided', () => {
        const wrapper = mountCard();
        expect(wrapper.find('.bcgov-card-header').text()).toBe('');
    });

    it('renders description when the description prop is set', () => {
        const wrapper = mountCard({ description: 'Some description text' });
        const desc = wrapper.find('.description');
        expect(desc.exists()).toBe(true);
        expect(desc.text()).toBe('Some description text');
    });

    it('does not render the description element when description is empty', () => {
        const wrapper = mountCard({ description: '' });
        expect(wrapper.find('.description').exists()).toBe(false);
    });

    it('renders subtitle when the subtitle prop is set', () => {
        const wrapper = mountCard({ subtitle: 'A subtitle' });
        const sub = wrapper.find('.subtitle');
        expect(sub.exists()).toBe(true);
        expect(sub.text()).toBe('A subtitle');
    });

    it('does not render the subtitle element when subtitle is empty', () => {
        const wrapper = mountCard({ subtitle: '' });
        expect(wrapper.find('.subtitle').exists()).toBe(false);
    });

    it('renders the icon element with the correct class when icon prop is set', () => {
        const wrapper = mountCard({ icon: 'fa-solid fa-star' });
        const icon = wrapper.find('i.stack-icon');
        expect(icon.exists()).toBe(true);
        expect(icon.classes()).toContain('fa-solid');
        expect(icon.classes()).toContain('fa-star');
    });

    it('does not render an icon element when icon prop is empty', () => {
        const wrapper = mountCard({ icon: '' });
        expect(wrapper.find('i.stack-icon').exists()).toBe(false);
    });

    it('applies the class prop to the router-link element', () => {
        const wrapper = mountCard({ class: 'custom-class' });
        expect(wrapper.find('a').classes()).toContain('custom-class');
    });

    it('renders both description and subtitle together', () => {
        const wrapper = mountCard({
            description: 'Desc text',
            subtitle: 'Sub text',
        });
        expect(wrapper.find('.description').text()).toBe('Desc text');
        expect(wrapper.find('.subtitle').text()).toBe('Sub text');
    });
});
