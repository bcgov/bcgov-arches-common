import type { AliasedTileData } from '@/arches_component_lab/types.ts';

export function formatFileLink(path: string): string {
    if (!path) return '';
    return `<a href="${path}" target="_blank" rel="noopener noreferrer">${path}</a>`;
}

export function expandDocumentRows<T extends AliasedTileData>(
    documents: T[],
    fieldName: string,
): T[] {
    const expandedRows: T[] = [];

    documents.forEach((doc, docIndex) => {
        const aliasedData = doc.aliased_data as Record<string, unknown>;
        const fieldData = aliasedData?.[fieldName] as
            | { display_value?: string; node_value?: unknown }
            | undefined;
        const pathValue = fieldData?.display_value || '';

        if (!pathValue || !pathValue.includes(' | ')) {
            expandedRows.push(doc);
            return;
        }

        const paths = pathValue
            .split(' | ')
            .map((p) => p.trim())
            .filter(Boolean);

        paths.forEach((path, pathIndex) => {
            expandedRows.push({
                ...doc,
                rowKey: `${doc.tileid || docIndex}-${pathIndex}`,
                aliased_data: {
                    ...aliasedData,
                    [fieldName]: {
                        ...fieldData,
                        display_value: path,
                    },
                },
            } as T);
        });
    });

    return expandedRows;
}

export function applyFileLinks<T extends AliasedTileData>(
    documents: T[],
    fieldName: string,
): T[] {
    return documents.map((doc) => {
        const aliasedData = doc.aliased_data as Record<string, unknown>;
        const fieldData = aliasedData?.[fieldName] as
            | { display_value?: string }
            | undefined;
        const pathValue = fieldData?.display_value || '';

        return {
            ...doc,
            aliased_data: {
                ...aliasedData,
                [fieldName]: {
                    ...fieldData,
                    display_value: formatFileLink(pathValue),
                },
            },
        } as T;
    });
}
