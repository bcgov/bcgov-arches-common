import { ref, shallowRef, toValue, watchEffect } from 'vue';
import { useWidgetConfigStore } from '@/arches_vue_components/stores/useWidgetConfigStore.ts';

import type { MaybeRefOrGetter } from 'vue';
import type { CardXNodeXWidgetData } from '@/arches_vue_components/types.ts';

// The same block GenericWidget.vue inlines upstream. Drop this if
// arches-vue-components ever exposes it as a composable.
export function useWidgetConfig<T extends CardXNodeXWidgetData>(
    graphSlug: MaybeRefOrGetter<string>,
    nodeAlias: MaybeRefOrGetter<string>,
    initialConfig?: T,
) {
    const config = shallowRef<T | undefined>(initialConfig);
    const isLoading = ref(false);
    const error = ref<Error>();

    watchEffect(async () => {
        if (config.value) {
            return;
        }

        isLoading.value = true;

        try {
            config.value = (await useWidgetConfigStore().fetchWidgetConfig(
                toValue(graphSlug),
                toValue(nodeAlias),
            )) as T;
        } catch (caught) {
            console.error(caught);
            error.value = caught as Error;
        } finally {
            isLoading.value = false;
        }
    });

    return { config, isLoading, error };
}
