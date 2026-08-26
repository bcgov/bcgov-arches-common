import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

import BooleanCheckboxWidget from './BooleanCheckboxWidget.vue';
import { EDIT } from '@/arches_vue_components/widgets/constants.ts';

import type { BooleanAliasedNodeData } from '@/arches_vue_components/datatypes/boolean/types.ts';
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
    props: ['modelValue'],
    template: '<input type="checkbox" />',
    emits: ['update:modelValue'],
};

function mountWidget(
    props: { aliasedNodeData?: BooleanAliasedNodeData | null } = {},
) {
    return mount(BooleanCheckboxWidget, {
        props: {
            mode: EDIT,
            nodeAlias: 'is_approved',
            graphSlug: 'permit',
            cardXNodeXWidgetData,
            aliasedNodeData: null,
            ...props,
        },
        global: { stubs: { Checkbox: CheckboxStub } },
    });
}

function toggle(checked: boolean) {
    const wrapper = mountWidget();
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

    // Without this, GenericWidget leaves the widget behind a skeleton forever:
    // it renders the slot under v-show="isWidgetInitialized".
    it('emits initialized on mount so GenericWidget reveals the widget', () => {
        const emitted = mountWidget({
            aliasedNodeData: {
                display_value: 'Yes',
                node_value: true,
                details: [],
            },
        }).emitted('initialized');

        expect(emitted).toHaveLength(1);
        expect(emitted![0][0]).toMatchObject({ node_value: true });
    });

    it('checks the box for a stored true and clears it for a stored false', () => {
        const modelValue = (nodeValue: boolean) =>
            mountWidget({
                aliasedNodeData: {
                    display_value: '',
                    node_value: nodeValue,
                    details: [],
                },
            })
                .findComponent({ name: 'Checkbox' })
                .props('modelValue');

        expect(modelValue(true)).toBe(true);
        expect(modelValue(false)).toBe(false);
    });
});
