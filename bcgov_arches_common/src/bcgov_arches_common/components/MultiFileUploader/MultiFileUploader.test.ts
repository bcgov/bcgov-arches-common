import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import MultiFileUploader from './MultiFileUploader.vue';

const fetchWidgetConfig = vi.fn();

vi.mock('@/arches_vue_components/stores/useWidgetConfigStore.ts', () => ({
    useWidgetConfigStore: () => ({ fetchWidgetConfig }),
}));

vi.mock(
    '@/arches_vue_components/generics/GenericWidget/GenericWidget.vue',
    () => ({
        default: {
            name: 'GenericWidget',
            template: '<div class="mock-generic-widget"></div>',
        },
    }),
);

const GenericWidgetStub = {
    name: 'GenericWidget',
    template: '<div class="mock-generic-widget"></div>',
};

const globalMountOptions = {
    stubs: { GenericWidget: GenericWidgetStub },
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

    const createWrapper = (propsOverrides = {}) => {
        return mount(MultiFileUploader, {
            props: { ...defaultProps, ...propsOverrides },
            global: globalMountOptions,
        });
    };

    beforeEach(() => {
        vi.clearAllMocks();
        fetchWidgetConfig.mockResolvedValue({
            node: { config: { maxFiles: 10 } },
            config: {},
        } as any);
    });

    describe('UI Rendering & State', () => {
        it('renders the "+ Add" button when addingNew is false', () => {
            const wrapper = createWrapper({ addingNew: false });
            expect(wrapper.text().includes('+ Add')).toBe(true);
            expect(wrapper.text().includes('Save Document')).toBe(false);
        });

        it('renders the "Save" button when addingNew is true', () => {
            const wrapper = createWrapper({ addingNew: true });
            expect(wrapper.text().includes('Save Document')).toBe(true);
            expect(wrapper.text().includes('+ Add')).toBe(false);
        });

        it('disables the Save button when disableAddOrSave is true', async () => {
            const wrapper = createWrapper({
                disableAddOrSave: true,
                addingNew: true,
            });
            const saveButton = wrapper.findComponent({ name: 'Button' });

            expect(saveButton.attributes('aria-disabled')).toBe('true');
        });

        it('shows the max limit message when items hit maxItems limit', async () => {
            fetchWidgetConfig.mockResolvedValueOnce({
                node: { config: { maxFiles: 2 } },
                config: {},
            } as any);

            const wrapper = createWrapper({
                addingNew: true,
                items: [{ aliased_data: {} }, { aliased_data: {} }],
            });

            await flushPromises();

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
            const wrapper = createWrapper({
                addingNew: false,
                currentNodeData: mockDocumentData,
            });
            expect(wrapper.find('.document-name').text()).toBe(
                'test-report.pdf',
            );
        });

        it('shows the document icon wrapper for PDFs', () => {
            const wrapper = createWrapper({
                addingNew: false,
                currentNodeData: mockDocumentData,
                iconClass: 'fa-file',
            });
            expect(wrapper.find('.document-icon-wrapper').exists()).toBe(true);
            expect(wrapper.find('.fa-file').exists()).toBe(true);
        });

        it('bypasses the icon wrapper and renders GenericWidget VIEW for images', () => {
            const wrapper = createWrapper({
                addingNew: false,
                currentNodeData: mockImageData,
            });
            expect(wrapper.find('.document-icon-wrapper').exists()).toBe(false);
            expect(wrapper.find('.mock-generic-widget').exists()).toBe(true);
        });
    });

    describe('Events & Emits', () => {
        it('emits "add-new" when the + Add button is clicked', async () => {
            const wrapper = createWrapper({ addingNew: false });
            await wrapper.findComponent({ name: 'Button' }).trigger('click');
            expect(wrapper.emitted('add-new')).toBeTruthy();
        });

        it('emits "save-item" when the Save button is clicked', async () => {
            const wrapper = createWrapper({ addingNew: true });
            await wrapper.findComponent({ name: 'Button' }).trigger('click');
            expect(wrapper.emitted('save-item')).toBeTruthy();
        });

        it('emits "select-item" and "delete-item" from the gallery placeholders', async () => {
            const wrapper = createWrapper({
                items: [
                    { aliased_data: { test_node: null } },
                    { aliased_data: { test_node: null } },
                ],
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
