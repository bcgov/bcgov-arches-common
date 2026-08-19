import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MultiFileUploader from './MultiFileUploader.vue';

const GenericWidgetStub = {
    name: 'GenericWidget',
    template: '<div class="mock-generic-widget"></div>',
};

describe('MultiFileUploader.vue', () => {
    const defaultProps = {
        graphSlug: 'test_graph',
        nodeAlias: 'test_node',
        currentNodeData: null,
        items: [],
        selectedIndex: 0,
        addingNew: false,
        disableAddOrSave: false,
    };

    describe('UI Rendering & State', () => {
        it('renders the "+ Add" button when addingNew is false', () => {
            const wrapper = mount(MultiFileUploader, {
                props: { ...defaultProps, addingNew: false },
                global: { stubs: { GenericWidget: GenericWidgetStub } },
            });
            expect(wrapper.text()).toContain('+ Add');
            expect(wrapper.text()).not.toContain('Save Document');
        });

        it('renders the "Save" button when addingNew is true', () => {
            const wrapper = mount(MultiFileUploader, {
                props: { ...defaultProps, addingNew: true },
                global: { stubs: { GenericWidget: GenericWidgetStub } },
            });
            expect(wrapper.text()).toContain('Save Document');
            expect(wrapper.text()).not.toContain('+ Add');
        });

        it('disables the Save button when disableAddOrSave is true', async () => {
            const wrapper = mount(MultiFileUploader, {
                props: {
                    ...defaultProps,
                    disableAddOrSave: true,
                    addingNew: true,
                },
                global: { stubs: { GenericWidget: GenericWidgetStub } },
            });
            const saveButton = wrapper.findComponent({ name: 'Button' });

            expect(saveButton.attributes('aria-disabled')).toBe('true');
        });

        it('shows the max limit message when items hit maxItems limit', () => {
            const wrapper = mount(MultiFileUploader, {
                props: {
                    ...defaultProps,
                    addingNew: true,
                    maxItems: 2,
                    items: [{ aliased_data: {} }, { aliased_data: {} }],
                },
                global: { stubs: { GenericWidget: GenericWidgetStub } },
            });
            expect(wrapper.find('.max-limit-message').exists()).toBe(true);
            expect(wrapper.text()).toContain('Maximum of 2 documents reached');
        });
    });

    describe('File Name & Image Parsing Logic', () => {
        const mockDocumentData = {
            node_value: [{ name: 'test-report.pdf', type: 'application/pdf' }],
        };

        const mockImageData = {
            node_value: [{ name: 'site-photo.jpg', type: 'image/jpeg' }],
        };

        it('extracts and displays the correct file name for documents', () => {
            const wrapper = mount(MultiFileUploader, {
                props: {
                    ...defaultProps,
                    addingNew: false,
                    currentNodeData: mockDocumentData,
                },
                global: { stubs: { GenericWidget: GenericWidgetStub } },
            });
            expect(wrapper.find('.document-name').text()).toBe(
                'test-report.pdf',
            );
        });

        it('shows the document icon wrapper for PDFs', () => {
            const wrapper = mount(MultiFileUploader, {
                props: {
                    ...defaultProps,
                    addingNew: false,
                    currentNodeData: mockDocumentData,
                    iconClass: 'fa-file',
                },
                global: { stubs: { GenericWidget: GenericWidgetStub } },
            });
            expect(wrapper.find('.document-icon-wrapper').exists()).toBe(true);
            expect(wrapper.find('.fa-file').exists()).toBe(true);
        });

        it('bypasses the icon wrapper and renders GenericWidget VIEW for images', () => {
            const wrapper = mount(MultiFileUploader, {
                props: {
                    ...defaultProps,
                    addingNew: false,
                    currentNodeData: mockImageData,
                },
                global: { stubs: { GenericWidget: GenericWidgetStub } },
            });
            expect(wrapper.find('.document-icon-wrapper').exists()).toBe(false);
            expect(wrapper.find('.mock-generic-widget').exists()).toBe(true);
        });
    });

    describe('Events & Emits', () => {
        it('emits "add-new" when the + Add button is clicked', async () => {
            const wrapper = mount(MultiFileUploader, {
                props: { ...defaultProps, addingNew: false },
                global: { stubs: { GenericWidget: GenericWidgetStub } },
            });
            await wrapper.findComponent({ name: 'Button' }).trigger('click');
            expect(wrapper.emitted('add-new')).toBeTruthy();
        });

        it('emits "save-item" when the Save button is clicked', async () => {
            const wrapper = mount(MultiFileUploader, {
                props: { ...defaultProps, addingNew: true },
                global: { stubs: { GenericWidget: GenericWidgetStub } },
            });
            await wrapper.findComponent({ name: 'Button' }).trigger('click');
            expect(wrapper.emitted('save-item')).toBeTruthy();
        });

        it('emits "select-item" and "delete-item" from the gallery placeholders', async () => {
            const wrapper = mount(MultiFileUploader, {
                props: {
                    ...defaultProps,
                    items: [
                        { aliased_data: { test_node: null } },
                        { aliased_data: { test_node: null } },
                    ],
                },
                global: { stubs: { GenericWidget: GenericWidgetStub } },
            });

            const placeholders = wrapper.findAll('.doc-placeholder');
            expect(placeholders.length).toBe(2);

            await placeholders[1].trigger('click');
            expect(wrapper.emitted('select-item')?.[0]).toEqual([1]);

            await placeholders[0].find('.doc-delete-icon').trigger('click');
            expect(wrapper.emitted('delete-item')?.[0]).toEqual([0]);
        });
    });
});
