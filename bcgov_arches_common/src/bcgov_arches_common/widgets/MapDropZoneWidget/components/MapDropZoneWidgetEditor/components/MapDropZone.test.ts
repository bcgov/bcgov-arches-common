import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

// vue3-gettext is globally mocked in vitest.setup.mts

import MapDropZone from './MapDropZone.vue';

const CARD_DATA = {
    node: { alias: 'test-alias', nodeid: 'node-1' },
    config: {},
} as any;

function mountDropZone(openFileChooser = vi.fn()) {
    return mount(MapDropZone, {
        props: { openFileChooser, cardXNodeXWidgetData: CARD_DATA },
    });
}

describe('MapDropZone', () => {
    // ------------------------------------------------------------------
    // Accessibility / structure
    // ------------------------------------------------------------------

    it('sets the container id from the node alias', () => {
        const wrapper = mountDropZone();
        expect(wrapper.find('[role="button"]').attributes('id')).toBe(
            'test-alias',
        );
    });

    it('has role="button"', () => {
        const wrapper = mountDropZone();
        expect(wrapper.find('[role="button"]').attributes('role')).toBe(
            'button',
        );
    });

    it('has tabindex="0" so keyboard users can focus it', () => {
        const wrapper = mountDropZone();
        expect(wrapper.find('[role="button"]').attributes('tabindex')).toBe(
            '0',
        );
    });

    // ------------------------------------------------------------------
    // Content
    // ------------------------------------------------------------------

    it('renders the upload title text', () => {
        const wrapper = mountDropZone();
        expect(wrapper.find('.upload-title').text()).toBe(
            'Upload Spatial File',
        );
    });

    it('renders the upload subtitle mentioning supported file types', () => {
        const wrapper = mountDropZone();
        const subtitle = wrapper.find('.upload-subtitle').text();
        expect(subtitle).toContain('KML');
        expect(subtitle).toContain('GeoJSON');
        expect(subtitle).toContain('Shapefile');
    });

    // ------------------------------------------------------------------
    // Interaction: click / keyboard
    // ------------------------------------------------------------------

    it('calls openFileChooser when the container is clicked', async () => {
        const fn = vi.fn();
        const wrapper = mountDropZone(fn);
        await wrapper.find('[role="button"]').trigger('click');
        expect(fn).toHaveBeenCalledOnce();
    });

    it('calls openFileChooser when Enter is pressed', async () => {
        const fn = vi.fn();
        const wrapper = mountDropZone(fn);
        await wrapper.find('[role="button"]').trigger('keydown.enter');
        expect(fn).toHaveBeenCalledOnce();
    });

    it('calls openFileChooser when Space is pressed', async () => {
        const fn = vi.fn();
        const wrapper = mountDropZone(fn);
        await wrapper.find('[role="button"]').trigger('keydown.space');
        expect(fn).toHaveBeenCalledOnce();
    });

    it('does not call openFileChooser when other keys are pressed', async () => {
        const fn = vi.fn();
        const wrapper = mountDropZone(fn);
        await wrapper.find('[role="button"]').trigger('keydown.tab');
        expect(fn).toHaveBeenCalledTimes(0);
    });

    it('forwards different node aliases to the element id', () => {
        const wrapper = mount(MapDropZone, {
            props: {
                openFileChooser: vi.fn(),
                cardXNodeXWidgetData: {
                    node: { alias: 'different-alias', nodeid: 'node-2' },
                    config: {},
                } as any,
            },
        });
        expect(wrapper.find('[role="button"]').attributes('id')).toBe(
            'different-alias',
        );
    });
});
