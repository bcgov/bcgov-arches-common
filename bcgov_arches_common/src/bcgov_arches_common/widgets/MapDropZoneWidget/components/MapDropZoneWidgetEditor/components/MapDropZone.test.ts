import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import MapDropZone from './MapDropZone.vue';
import type { CardXNodeXWidgetData } from '@/arches_component_lab/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCardData(alias = 'my-node'): CardXNodeXWidgetData {
    return {
        card: {
            name: '',
            sortorder: 0,
            cardid: 'c1',
            nodegroup_id: 'ng1',
            nodes: [],
        },
        config: { defaultValue: null },
        id: 'w1',
        label: '',
        node: {
            alias,
            isrequired: false,
            nodeid: 'n1',
            datatype: 'geojson-feature-collection',
            config: {},
        },
        sortorder: 0,
        visible: true,
        widget: { widgetid: 'w1', component: 'MapDropZoneWidget' },
    };
}

function mountDropZone(alias = 'my-node', openFileChooser = vi.fn()) {
    return mount(MapDropZone, {
        props: { openFileChooser, cardXNodeXWidgetData: makeCardData(alias) },
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MapDropZone', () => {
    // -------------------------------------------------------------------------
    // Accessibility
    // -------------------------------------------------------------------------

    describe('accessibility attributes', () => {
        it('sets the container id to the node alias', () => {
            const wrapper = mountDropZone('collection-location');
            expect(wrapper.find('#collection-location').exists()).toBe(true);
        });

        it('has role="button" on the container', () => {
            const wrapper = mountDropZone();
            expect(wrapper.find('.upload-container').attributes('role')).toBe(
                'button',
            );
        });

        it('has tabindex="0" on the container', () => {
            const wrapper = mountDropZone();
            expect(
                wrapper.find('.upload-container').attributes('tabindex'),
            ).toBe('0');
        });

        it('sets aria-hidden on the decorative icon', () => {
            const wrapper = mountDropZone();
            expect(
                wrapper.find('i.pi-cloud-upload').attributes('aria-hidden'),
            ).toBe('true');
        });
    });

    // -------------------------------------------------------------------------
    // User interaction
    // -------------------------------------------------------------------------

    describe('user interaction', () => {
        it('calls openFileChooser when the container is clicked', async () => {
            const openFileChooser = vi.fn();
            const wrapper = mountDropZone('my-node', openFileChooser);
            await wrapper.find('.upload-container').trigger('click');
            expect(openFileChooser).toHaveBeenCalledTimes(1);
        });

        it('calls openFileChooser when Enter is pressed', async () => {
            const openFileChooser = vi.fn();
            const wrapper = mountDropZone('my-node', openFileChooser);
            await wrapper
                .find('.upload-container')
                .trigger('keydown', { key: 'Enter' });
            expect(openFileChooser).toHaveBeenCalledTimes(1);
        });

        it('calls openFileChooser when Space is pressed', async () => {
            const openFileChooser = vi.fn();
            const wrapper = mountDropZone('my-node', openFileChooser);
            await wrapper
                .find('.upload-container')
                .trigger('keydown', { key: ' ' });
            expect(openFileChooser).toHaveBeenCalledTimes(1);
        });

        it('does not call openFileChooser for other keys', async () => {
            const openFileChooser = vi.fn();
            const wrapper = mountDropZone('my-node', openFileChooser);
            await wrapper
                .find('.upload-container')
                .trigger('keydown', { key: 'Tab' });
            expect(openFileChooser).toHaveBeenCalledTimes(0);
        });
    });

    // -------------------------------------------------------------------------
    // Content
    // -------------------------------------------------------------------------

    describe('content', () => {
        it('renders the upload title text', () => {
            const wrapper = mountDropZone();
            expect(wrapper.find('.upload-title').text()).toBe(
                'Upload Spatial File',
            );
        });

        it('renders the upload subtitle mentioning supported formats', () => {
            const wrapper = mountDropZone();
            const subtitle = wrapper.find('.upload-subtitle').text();
            expect(subtitle).toContain('KML');
            expect(subtitle).toContain('GeoJSON');
            expect(subtitle).toContain('Shapefile');
        });

        it('renders the cloud upload icon', () => {
            const wrapper = mountDropZone();
            expect(wrapper.find('i.pi-cloud-upload').exists()).toBe(true);
        });
    });
});
