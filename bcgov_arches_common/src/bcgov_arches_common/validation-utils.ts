export type FieldError = { type?: string; message: string };
// Zod reports errors with keys like "project_name.node_value.en.value". Want to flatten them at the top so they can
// be applied like $form.project_name.error.message
export function collapseFieldNames(
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
