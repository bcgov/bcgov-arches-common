import type { CardXNodeXWidgetData } from '@/arches_component_lab/types.ts';
import type { AllowableWidgetOverrides } from '@/bcgov_arches_common/generics/types.ts';

export function mergeCardXNodeXWidgetData(
    base: CardXNodeXWidgetData,
    overrides: Partial<AllowableWidgetOverrides>,
): CardXNodeXWidgetData {
    return mergeOverrides(base, overrides);
}

function mergeOverrides<
    T extends object,
    U extends Partial<Record<keyof T, any>>,
>(base: T, overrides: U): T {
    // Shallow merge for simplicity; can be extended to deep merge if needed
    const result = { ...base };

    for (const key in overrides) {
        if (key in base) {
            const overrideVal = overrides[key];
            const baseVal = (base as any)[key];

            // Simple deep merge for nested objects
            if (
                typeof baseVal === 'object' &&
                baseVal !== null &&
                typeof overrideVal === 'object' &&
                overrideVal !== null
            ) {
                (result as any)[key] = mergeOverrides(baseVal, overrideVal);
            } else if (overrideVal !== undefined) {
                (result as any)[key] = overrideVal;
            }
        } else {
            // Extra keys are silently ignored — or throw an error if desired
            console.warn(`Ignoring unknown key "${key}"`);
        }
    }

    return result;
}
