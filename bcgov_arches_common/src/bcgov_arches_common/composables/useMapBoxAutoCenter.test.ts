import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defineComponent, h, inject, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';

import { useMapBoxAutoCenter } from './useMapBoxAutoCenter.ts';

import type { SimpleMapConfiguration } from '../widgets/SimpleMapWidget/types.ts';

// One fake observer per instance, so a test can fire a resize for chosen boxes
// and assert which elements are being watched.
const observers: FakeResizeObserver[] = [];

class FakeResizeObserver {
    observed = new Set<Element>();

    constructor(public callback: ResizeObserverCallback) {
        observers.push(this);
    }

    observe(element: Element) {
        this.observed.add(element);
    }

    unobserve(element: Element) {
        this.observed.delete(element);
    }

    disconnect() {
        this.observed.clear();
    }

    // contentRect only needs the height the composable reads.
    fire(entries: Array<{ target: Element; height: number }>) {
        this.callback(
            entries.map(({ target, height }) => ({
                target,
                contentRect: { height },
            })) as unknown as ResizeObserverEntry[],
            this as unknown as ResizeObserver,
        );
    }
}

vi.stubGlobal('ResizeObserver', FakeResizeObserver);

const frames: FrameRequestCallback[] = [];
vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frames.push(cb);
    return frames.length;
});
const runFrames = () => {
    const pending = frames.splice(0);
    pending.forEach((cb) => cb(0));
};

// A descendant sees the provided config; the provider itself would not.
let injected: SimpleMapConfiguration;
const Child = defineComponent({
    setup() {
        injected = inject('simpleMapConfig', {} as SimpleMapConfiguration);
        return () => h('span');
    },
});

// A host that renders one box per id, the way a v-for over map fields does.
const host = (config?: SimpleMapConfiguration) =>
    defineComponent({
        setup() {
            const ids = ref(['a', 'b']);
            useMapBoxAutoCenter('mapBoxes', config);
            return { ids };
        },
        render() {
            return h('div', [
                ...this.ids.map((id: string) =>
                    h('div', { ref: 'mapBoxes', ref_for: true, key: id }),
                ),
                h(Child),
            ]);
        },
    });

const mountHost = (config?: SimpleMapConfiguration) => {
    const wrapper = mount(host(config), { attachTo: document.body });
    return { wrapper, observer: observers[observers.length - 1] };
};

describe('useMapBoxAutoCenter', () => {
    beforeEach(() => {
        observers.length = 0;
        frames.length = 0;
    });

    it('observes every box the template rendered', async () => {
        const { wrapper, observer } = mountHost();
        await nextTick();

        expect(observer.observed.size).toBe(2);
        wrapper.unmount();
    });

    it('writes each box height onto the box as a pixel value', async () => {
        const { wrapper, observer } = mountHost();
        await nextTick();

        const [first, second] = [...observer.observed] as HTMLElement[];
        observer.fire([
            { target: first, height: 320 },
            { target: second, height: 120.6 },
        ]);

        expect(first.style.getPropertyValue('--map-height')).toBe('320px');
        expect(second.style.getPropertyValue('--map-height')).toBe('120.6px');
        wrapper.unmount();
    });

    it('provides a refit signal that bumps once per frame however many boxes resized', async () => {
        const { wrapper, observer } = mountHost();
        await nextTick();

        const signal = injected.refitSignal;
        expect(signal?.value).toBe(0);

        const boxes = [...observer.observed] as HTMLElement[];
        observer.fire(boxes.map((target) => ({ target, height: 200 })));
        observer.fire(boxes.map((target) => ({ target, height: 210 })));
        expect(signal?.value).toBe(0);

        runFrames();
        expect(signal?.value).toBe(1);

        // A later resize schedules a fresh frame rather than being swallowed.
        observer.fire([{ target: boxes[0], height: 220 }]);
        runFrames();
        expect(signal?.value).toBe(2);
        wrapper.unmount();
    });

    it('keeps a caller-supplied config alongside the signal', async () => {
        const { wrapper } = mountHost({ showCentroidMarker: true });
        await nextTick();

        expect(injected.showCentroidMarker).toBe(true);
        expect(injected.refitSignal).toBeDefined();
        wrapper.unmount();
    });

    it('stops observing when the component goes away', async () => {
        const { wrapper, observer } = mountHost();
        await nextTick();

        wrapper.unmount();
        expect(observer.observed.size).toBe(0);
    });
});
