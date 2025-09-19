export type FieldError = { type?: string; message: string };
// Zod reports errors with keys like "project_name.node_value.en.value". Want to flatten them at the top so they can
// be applied like $form.project_name.error.message
function collapseFieldNames(
    nestedErrors: Record<string, FieldError[]>,
    options: { dedupe?: boolean; aggregate?: boolean } = {
        dedupe: true,
        aggregate: false,
    },
): Record<string, FieldError[]> {
    const out: Record<string, FieldError[]> = {};

    for (const [path, errs] of Object.entries(nestedErrors)) {
        const top = path.split('.')[0]; // "project_name"

        if (!errs?.length) continue;
        if (!out[top]) out[top] = [];
        if (options.aggregate) {
            // push all messages (optionally dedupe)
            for (const e of errs) {
                if (
                    !options.dedupe ||
                    !out[top].some((x) => x.message === e.message)
                ) {
                    out[top].push({ type: e.type, message: e.message });
                }
            }
        } else {
            // keep only the first nested error for a concise summary
            const first = errs[0];

            if (
                !options.dedupe ||
                !out[top].some((x) => x.message === first.message)
            ) {
                out[top].push({ type: first.type, message: first.message });
            }
        }
    }

    return out;
}
export function getFlattenResolver(baseZodResolver: (values: any) => any) {
    return async (values: any) => {
        // Run Zod first
        const base = (await baseZodResolver(values)) || {};
        const rawErrors = { ...(base.errors ?? {}) } as Record<
            string,
            Array<{ type?: string; message: string }>
        >;
        const errors = collapseFieldNames(rawErrors);
        // Return just the errors bag; PrimeVue derives $form.*.invalid from this
        return { errors };
    };
}
