import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ProjectCard from './ProjectCard.vue';

// Stub router-link so tests don't need an installed vue-router.
// Only declare 'to' as a prop — leaving 'class' out keeps it in $attrs so
// Vue's fallthrough attribute inheritance applies it to the root <a> element.
const RouterLinkStub = {
    name: 'RouterLink',
    props: ['to'],
    template: '<a><slot /></a>',
};

function mountCard(props: Record<string, unknown> = {}) {
    return mount(ProjectCard, {
        props: { projectName: 'Default Project', ...props },
        global: { stubs: { RouterLink: RouterLinkStub } },
    });
}

describe('ProjectCard', () => {
    // ── Cap section ──────────────────────────────────────────────────────────

    it('renders capLabel in the cap-left span', () => {
        const wrapper = mountCard({ capLabel: 'Environment' });
        expect(wrapper.find('.cap-left span').text()).toBe('Environment');
    });

    it('renders an empty cap-left span when capLabel is not provided', () => {
        const wrapper = mountCard();
        expect(wrapper.find('.cap-left span').text()).toBe('');
    });

    it('shows the cap-date element when capDate is set', () => {
        const wrapper = mountCard({ capDate: '2024-01-15' });
        const capDate = wrapper.find('.cap-date');
        expect(capDate.exists()).toBe(true);
        expect(capDate.text()).toBe('2024-01-15');
    });

    it('does not render the cap-date element when capDate is empty', () => {
        const wrapper = mountCard({ capDate: '' });
        expect(wrapper.find('.cap-date').exists()).toBe(false);
    });

    // ── Priority star ────────────────────────────────────────────────────────

    it('shows the priority star when capPriority is true', () => {
        const wrapper = mountCard({ capPriority: true });
        expect(wrapper.find('i.priority-star').exists()).toBe(true);
    });

    it('does not show the priority star when capPriority is false', () => {
        const wrapper = mountCard({ capPriority: false });
        expect(wrapper.find('i.priority-star').exists()).toBe(false);
    });

    it('adds star-highlighted class when capPriority is true and searchQuery is "priority"', () => {
        const wrapper = mountCard({
            capPriority: true,
            searchQuery: 'priority',
        });
        expect(wrapper.find('i.priority-star').classes()).toContain(
            'star-highlighted',
        );
    });

    it('does not add star-highlighted when capPriority is true but searchQuery differs', () => {
        const wrapper = mountCard({
            capPriority: true,
            searchQuery: 'other',
        });
        expect(
            wrapper
                .find('i.priority-star')
                .classes()
                .includes('star-highlighted'),
        ).toBe(false);
    });

    // ── Body title block ─────────────────────────────────────────────────────

    it('renders bodyTitle in .bodyTitle', () => {
        const wrapper = mountCard({ bodyTitle: 'Coastal Restoration' });
        expect(wrapper.find('.bodyTitle').text()).toBe('Coastal Restoration');
    });

    it('shows .bodySubtitle1 when bodySubtitle1 is set', () => {
        const wrapper = mountCard({ bodySubtitle1: 'PROJ-001' });
        const el = wrapper.find('.bodySubtitle1');
        expect(el.exists()).toBe(true);
        expect(el.text()).toBe('PROJ-001');
    });

    it('does not render .bodySubtitle1 when bodySubtitle1 is empty', () => {
        const wrapper = mountCard({ bodySubtitle1: '' });
        expect(wrapper.find('.bodySubtitle1').exists()).toBe(false);
    });

    it('shows .bodySubtitle2 when bodySubtitle2 is set', () => {
        const wrapper = mountCard({ bodySubtitle2: 'Forestry' });
        const el = wrapper.find('.bodySubtitle2');
        expect(el.exists()).toBe(true);
        expect(el.text()).toBe('Forestry');
    });

    it('does not render .bodySubtitle2 when bodySubtitle2 is empty', () => {
        const wrapper = mountCard({ bodySubtitle2: '' });
        expect(wrapper.find('.bodySubtitle2').exists()).toBe(false);
    });

    // ── Icon ─────────────────────────────────────────────────────────────────

    it('renders an <img> when icon contains a "/"', () => {
        const wrapper = mountCard({ icon: '/images/logo.png' });
        expect(wrapper.find('.logo-area img.body-icon-img').exists()).toBe(
            true,
        );
        expect(wrapper.find('.logo-area i.body-icon-class').exists()).toBe(
            false,
        );
    });

    it('renders an <img> when icon contains a "."', () => {
        const wrapper = mountCard({ icon: 'logo.svg' });
        expect(wrapper.find('.logo-area img.body-icon-img').exists()).toBe(
            true,
        );
    });

    it('renders an <i> element when icon is a CSS class string', () => {
        const wrapper = mountCard({ icon: 'fa-solid fa-tree' });
        const icon = wrapper.find('i.body-icon-class');
        expect(icon.exists()).toBe(true);
        expect(icon.classes()).toContain('fa-solid');
        expect(icon.classes()).toContain('fa-tree');
    });

    it('does not render the logo-area when icon is empty', () => {
        const wrapper = mountCard({ icon: '' });
        expect(wrapper.find('.logo-area').exists()).toBe(false);
    });

    it('applies no-icon class to main-content-area when icon is empty', () => {
        const wrapper = mountCard({ icon: '' });
        expect(wrapper.find('.main-content-area').classes()).toContain(
            'no-icon',
        );
    });

    it('does not apply no-icon class when icon is provided', () => {
        const wrapper = mountCard({ icon: 'fa-solid fa-star' });
        expect(
            wrapper.find('.main-content-area').classes().includes('no-icon'),
        ).toBe(false);
    });

    // ── Body lines ───────────────────────────────────────────────────────────

    it('renders body1 through body5 when all are set', () => {
        const wrapper = mountCard({
            body1: 'Line one',
            body2: 'Line two',
            body3: 'Line three',
            body4: 'Line four',
            body5: 'Line five',
        });
        const lines = wrapper.findAll('.body-lines .body-text');
        expect(lines).toHaveLength(5);
        expect(lines[0].text()).toBe('Line one');
        expect(lines[4].text()).toBe('Line five');
    });

    it('only renders body lines that have content', () => {
        const wrapper = mountCard({ body1: 'Only this', body2: '' });
        const lines = wrapper.findAll('.body-lines .body-text');
        expect(lines).toHaveLength(1);
        expect(lines[0].text()).toBe('Only this');
    });

    it('renders no body-text elements when all body props are empty', () => {
        const wrapper = mountCard();
        expect(wrapper.findAll('.body-lines .body-text')).toHaveLength(0);
    });

    // ── Footer ───────────────────────────────────────────────────────────────

    it('renders footerDate in .footer-left', () => {
        const wrapper = mountCard({ footerDate: 'Jan 2024' });
        expect(wrapper.find('.footer-left').text()).toBe('Jan 2024');
    });

    it('renders footerName in .footer-right', () => {
        const wrapper = mountCard({ footerName: 'Jane Doe' });
        expect(wrapper.find('.footer-right').text()).toBe('Jane Doe');
    });

    // ── Urgency classes ──────────────────────────────────────────────────────

    it('applies no urgency class by default', () => {
        const wrapper = mountCard();
        const classes = wrapper.find('.bcgov-custom-card').classes();
        expect(classes.includes('urgency-level-1')).toBe(false);
        expect(classes.includes('urgency-level-2')).toBe(false);
        expect(classes.includes('urgency-level-3')).toBe(false);
    });

    it('applies urgency-level-1 class when urgency is 1', () => {
        const wrapper = mountCard({ urgency: 1 });
        expect(wrapper.find('.bcgov-custom-card').classes()).toContain(
            'urgency-level-1',
        );
    });

    it('applies urgency-level-2 class when urgency is 2', () => {
        const wrapper = mountCard({ urgency: 2 });
        expect(wrapper.find('.bcgov-custom-card').classes()).toContain(
            'urgency-level-2',
        );
    });

    it('applies urgency-level-3 class when urgency is 3', () => {
        const wrapper = mountCard({ urgency: 3 });
        expect(wrapper.find('.bcgov-custom-card').classes()).toContain(
            'urgency-level-3',
        );
    });

    // ── Search highlighting ───────────────────────────────────────────────────

    it('wraps matching search terms in a highlight mark', () => {
        const wrapper = mountCard({
            projectName: 'Coastal Restoration',
            searchQuery: 'Coastal',
        });
        expect(wrapper.find('.project-name').element.innerHTML).toContain(
            '<mark class="highlight">Coastal</mark>',
        );
    });

    it('does not add highlight marks when searchQuery is empty', () => {
        const wrapper = mountCard({
            projectName: 'Coastal Restoration',
            searchQuery: '',
        });
        expect(
            wrapper.find('.project-name').element.innerHTML.includes('<mark'),
        ).toBe(false);
    });

    it('highlights capLabel when searchQuery matches', () => {
        const wrapper = mountCard({
            capLabel: 'Environment',
            searchQuery: 'Env',
        });
        expect(wrapper.find('.cap-left span').element.innerHTML).toContain(
            '<mark class="highlight">Env</mark>',
        );
    });

    it('highlights capDate when searchQuery matches', () => {
        const wrapper = mountCard({
            capDate: '2024-01-15',
            searchQuery: '2024',
        });
        expect(wrapper.find('.cap-date').element.innerHTML).toContain(
            '<mark class="highlight">2024</mark>',
        );
    });

    it('highlights body text when searchQuery matches', () => {
        const wrapper = mountCard({
            body1: 'Active project',
            searchQuery: 'Active',
        });
        expect(
            wrapper.find('.body-lines .body-text').element.innerHTML,
        ).toContain('<mark class="highlight">Active</mark>');
    });

    // ── class prop ───────────────────────────────────────────────────────────

    it('applies the class prop to the router-link element', () => {
        const wrapper = mountCard({ class: 'my-custom-class' });
        expect(wrapper.find('a').classes()).toContain('my-custom-class');
    });
});
