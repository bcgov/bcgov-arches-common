import type { AliasedTileDataWithAudit } from '@/bcgov_arches_common/types.ts';

export type ColumnDefinition = {
    field: string;
    displayFunction?: (
        row: AliasedTileDataWithAudit,
        fieldName: string,
    ) => string;
    label?: string;
    sortable?: boolean;
    visible?: boolean | (() => boolean);
    isHtml?: boolean;
};
