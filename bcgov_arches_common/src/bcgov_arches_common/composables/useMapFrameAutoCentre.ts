import { onBeforeUnmount, provide, ref, useTemplateRef, watch } from 'vue';
import _ from 'underscore';

import type { SimpleMapConfiguration } from '@/bcgov_arches_common/widgets/SimpleMapWidget/types.ts';

// Sizes the map widget inside a caller-sized box: put the ref name on the box
// and give it a height. The widget's map div reads --map-height and defaults to
// 550px, which overflows a shorter box, and a percentage collapses against the
// widget's own auto-height wrappers. Resizing keeps the old centre and zoom, so
// the signal tells every map below the caller to re-fit once laid out.
// How long the box must hold still before the map refits.
const REFIT_QUIET_MS = 1000;

export const useMapFrameAutoCentre = (
    refName = 'mapBoxes',
    config: SimpleMapConfiguration = {},
    quietMs = REFIT_QUIET_MS,
) => {
    const mapBoxes = useTemplateRef<HTMLElement[]>(refName);
    const refitSignal = ref(0);

    provide('simpleMapConfig', { ...config, refitSignal });

    // Refit once the box has held still, not on every frame of a drag.
    const scheduleRefit = _.debounce(() => refitSignal.value++, quietMs);

    const boxObserver = new ResizeObserver((entries) => {
        entries.forEach((entry) =>
            (entry.target as HTMLElement).style.setProperty(
                '--map-height',
                `${entry.contentRect.height}px`,
            ),
        );
        scheduleRefit();
    });

    const observed = new Set<HTMLElement>();
    watch(mapBoxes, (boxes) => {
        const current = new Set(boxes ?? []);
        observed.forEach((box) => {
            if (!current.has(box)) {
                boxObserver.unobserve(box);
                observed.delete(box);
            }
        });
        current.forEach((box) => {
            if (!observed.has(box)) {
                boxObserver.observe(box);
                observed.add(box);
            }
        });
    });

    onBeforeUnmount(() => {
        scheduleRefit.cancel();
        boxObserver.disconnect();
    });

    return mapBoxes;
};
