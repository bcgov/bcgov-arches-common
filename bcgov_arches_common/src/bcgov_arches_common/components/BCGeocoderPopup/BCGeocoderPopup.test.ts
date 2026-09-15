import { describe, it, expect, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import BCGeocoderPopup from './BCGeocoderPopup.vue';
import type { GeocoderFeature } from '@/bcgov_arches_common/composables/useBCGeocoder.ts';

function makeFeature(fullAddress: string): GeocoderFeature {
    return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-123.3, 48.4] },
        properties: {
            fullAddress,
            civicNumber: '100',
            streetName: 'Fort',
            streetType: 'St',
            streetDirection: '',
            localityName: 'Victoria',
        },
    };
}

function mountPopup(
    results: GeocoderFeature[] = [],
    loading = false,
    slotContent = '<span class="slot-child">input</span>',
) {
    return mount(BCGeocoderPopup, {
        props: { results, loading },
        slots: { default: slotContent },
    });
}

describe('BCGeocoderPopup', () => {
    // ------------------------------------------------------------------
    // Slot rendering
    // ------------------------------------------------------------------

    it('renders the default slot content', () => {
        const wrapper = mountPopup();
        expect(wrapper.find('.slot-child').exists()).toBe(true);
    });

    it('wraps content in a geocoder-container div', () => {
        const wrapper = mountPopup();
        expect(wrapper.find('.geocoder-container').exists()).toBe(true);
    });

    // ------------------------------------------------------------------
    // Dropdown visibility
    // ------------------------------------------------------------------

    it('does not render the dropdown list when results is empty', () => {
        const wrapper = mountPopup([]);
        expect(wrapper.find('.geocoder-dropdown').exists()).toBe(false);
    });

    it('renders the dropdown list when results are provided', () => {
        const wrapper = mountPopup([makeFeature('100 Fort St, Victoria, BC')]);
        expect(wrapper.find('.geocoder-dropdown').exists()).toBe(true);
    });

    it('renders one result item per result', () => {
        const results = [
            makeFeature('100 Fort St, Victoria, BC'),
            makeFeature('200 Fort St, Victoria, BC'),
            makeFeature('300 Fort St, Victoria, BC'),
        ];
        const wrapper = mountPopup(results);
        expect(wrapper.findAll('.geocoder-result')).toHaveLength(3);
    });

    it('renders a dismiss row alongside result items', () => {
        const wrapper = mountPopup([makeFeature('100 Fort St')]);
        expect(wrapper.find('.geocoder-dismiss-row').exists()).toBe(true);
        expect(wrapper.findAll('li')).toHaveLength(2); // dismiss row + 1 result
    });

    // ------------------------------------------------------------------
    // List item content
    // ------------------------------------------------------------------

    it('displays the fullAddress property in each result item', () => {
        const results = [
            makeFeature('100 Fort St, Victoria, BC'),
            makeFeature('200 Yates St, Victoria, BC'),
        ];
        const wrapper = mountPopup(results);
        const items = wrapper.findAll('.geocoder-result');
        expect(items[0].text()).toBe('100 Fort St, Victoria, BC');
        expect(items[1].text()).toBe('200 Yates St, Victoria, BC');
    });

    it('renders empty string when fullAddress is absent', () => {
        const feature: GeocoderFeature = {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [0, 0] },
            properties: {},
        };
        const wrapper = mountPopup([feature]);
        expect(wrapper.find('.geocoder-result').text()).toBe('');
    });

    // ------------------------------------------------------------------
    // Loading class
    // ------------------------------------------------------------------

    it('applies geocoder-loading class to dropdown when loading is true', () => {
        const wrapper = mountPopup([makeFeature('100 Fort St')], true);
        expect(wrapper.find('.geocoder-dropdown').classes()).toContain(
            'geocoder-loading',
        );
    });

    it('does not apply geocoder-loading class when loading is false', () => {
        const wrapper = mountPopup([makeFeature('100 Fort St')], false);
        expect(
            wrapper
                .find('.geocoder-dropdown')
                .classes()
                .includes('geocoder-loading'),
        ).toBe(false);
    });

    // ------------------------------------------------------------------
    // select event emission
    // ------------------------------------------------------------------

    it('emits select with the correct feature on mousedown', async () => {
        const feature = makeFeature('100 Fort St, Victoria, BC');
        const wrapper = mountPopup([feature]);

        await wrapper.find('.geocoder-result').trigger('mousedown');

        expect(wrapper.emitted('select')).toBeTruthy();
        expect(wrapper.emitted('select')![0]).toEqual([feature]);
    });

    it('emits select with the second feature when the second item is clicked', async () => {
        const first = makeFeature('100 Fort St');
        const second = makeFeature('200 Yates St');
        const wrapper = mountPopup([first, second]);

        const items = wrapper.findAll('.geocoder-result');
        await items[1].trigger('mousedown');

        expect(wrapper.emitted('select')![0]).toEqual([second]);
    });

    it('emits select once per mousedown', async () => {
        const wrapper = mountPopup([makeFeature('100 Fort St')]);
        await wrapper.find('.geocoder-result').trigger('mousedown');
        await wrapper.find('.geocoder-result').trigger('mousedown');
        expect(wrapper.emitted('select')).toHaveLength(2);
    });

    // ------------------------------------------------------------------
    // dismiss event emission
    // ------------------------------------------------------------------

    it('emits dismiss when the close button is clicked', async () => {
        const wrapper = mountPopup([makeFeature('100 Fort St')]);

        await wrapper.find('.geocoder-close-btn').trigger('mousedown');

        expect(wrapper.emitted('dismiss')).toBeTruthy();
        expect(wrapper.emitted('select')).toBeFalsy();
    });

    it('does not render a close button when results is empty', () => {
        const wrapper = mountPopup([]);
        expect(wrapper.find('.geocoder-close-btn').exists()).toBe(false);
    });

    // ------------------------------------------------------------------
    // click-outside dismiss (handleClickOutside / onBeforeUnmount)
    // ------------------------------------------------------------------

    it('emits dismiss when a click occurs outside the container', async () => {
        const wrapper = mount(BCGeocoderPopup, {
            props: { results: [makeFeature('100 Fort St')] },
            attachTo: document.body,
        });

        const outside = document.createElement('div');
        document.body.appendChild(outside);
        outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await nextTick();

        expect(wrapper.emitted('dismiss')).toBeTruthy();

        outside.remove();
        wrapper.unmount();
    });

    it('does not emit dismiss when a click occurs inside the container', async () => {
        const wrapper = mount(BCGeocoderPopup, {
            props: { results: [makeFeature('100 Fort St')] },
            attachTo: document.body,
        });

        wrapper.element.dispatchEvent(
            new MouseEvent('click', { bubbles: true }),
        );
        await nextTick();

        expect(wrapper.emitted('dismiss')).toBeFalsy();

        wrapper.unmount();
    });

    it('removes the document click listener on unmount', () => {
        const spy = vi.spyOn(document, 'removeEventListener');
        const wrapper = mountPopup([]);

        wrapper.unmount();

        expect(spy).toHaveBeenCalledWith('click', expect.any(Function));
        spy.mockRestore();
    });
});
