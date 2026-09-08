import { describe, it, expect } from 'vitest';
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

    it('renders one list item per result', () => {
        const results = [
            makeFeature('100 Fort St, Victoria, BC'),
            makeFeature('200 Fort St, Victoria, BC'),
            makeFeature('300 Fort St, Victoria, BC'),
        ];
        const wrapper = mountPopup(results);
        expect(wrapper.findAll('li')).toHaveLength(3);
    });

    // ------------------------------------------------------------------
    // List item content
    // ------------------------------------------------------------------

    it('displays the fullAddress property in each list item', () => {
        const results = [
            makeFeature('100 Fort St, Victoria, BC'),
            makeFeature('200 Yates St, Victoria, BC'),
        ];
        const wrapper = mountPopup(results);
        const items = wrapper.findAll('li');
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
        expect(wrapper.find('li').text()).toBe('');
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

        await wrapper.find('li').trigger('mousedown');

        expect(wrapper.emitted('select')).toBeTruthy();
        expect(wrapper.emitted('select')![0]).toEqual([feature]);
    });

    it('emits select with the second feature when the second item is clicked', async () => {
        const first = makeFeature('100 Fort St');
        const second = makeFeature('200 Yates St');
        const wrapper = mountPopup([first, second]);

        const items = wrapper.findAll('li');
        await items[1].trigger('mousedown');

        expect(wrapper.emitted('select')![0]).toEqual([second]);
    });

    it('emits select once per mousedown', async () => {
        const wrapper = mountPopup([makeFeature('100 Fort St')]);
        await wrapper.find('li').trigger('mousedown');
        await wrapper.find('li').trigger('mousedown');
        expect(wrapper.emitted('select')).toHaveLength(2);
    });
});
