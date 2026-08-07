import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

import BooleanCheckboxWidget from './BooleanCheckboxWidget.vue';
import { EDIT } from '@/arches_vue_components/widgets/constants.ts';

import type { BooleanCardXNodeXWidgetData } from '@/arches_vue_components/types.ts';

// arches-vue-components' GenericWidget binds to `update:aliasedNodeData` by name
// and routes it into GenericFormField for dirty/validation state. A rename here
// fails silently at runtime — the tile just never updates — so it is asserted.
const cardXNodeXWidgetData = {
    node: { config: { trueLabel: 'Yes', falseLabel: 'No' } },
} as BooleanCardXNodeXWidgetData;

// PrimeVue's real Checkbox needs the plugin installed; the contract under test
// is the emit, not PrimeVue's rendering.
const CheckboxStub = {
    name: 'Checkbox',
    template: '<input type="checkbox" />',
    emits: ['update:modelValue'],
};

function toggle(checked: boolean) {
    const wrapper = mount(BooleanCheckboxWidget, {
        props: {
            mode: EDIT,
            nodeAlias: 'is_approved',
            graphSlug: 'permit',
            cardXNodeXWidgetData,
            aliasedNodeData: null,
        },
        global: { stubs: { Checkbox: CheckboxStub } },
    });
    wrapper
        .findComponent({ name: 'Checkbox' })
        .vm.$emit('update:modelValue', checked);
    return wrapper;
}

describe('BooleanCheckboxWidget', () => {
    it('emits aliased node data under the name GenericWidget listens for', () => {
        const emitted = toggle(true).emitted('update:aliasedNodeData');

        expect(emitted).toHaveLength(1);
        expect(emitted![0][0]).toEqual({
            display_value: 'Yes',
            node_value: true,
            details: [],
        });
    });

    it('emits the bare node value alongside it', () => {
        expect(toggle(true).emitted('update:value')![0][0]).toBe(true);
        expect(toggle(false).emitted('update:value')![0][0]).toBe(false);
    });

    it('labels the display value from the widget config', () => {
        const emitted = toggle(false).emitted('update:aliasedNodeData');

        expect(emitted![0][0]).toMatchObject({ display_value: 'No' });
    });
});
