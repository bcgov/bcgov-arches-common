<script setup lang="ts">
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import type { ColumnDefinition } from '@/bcgov_arches_common/components/StandardDataTable/types.ts';
import type { AliasedTileDataWithAudit } from '@/bcgov_arches_common/types.ts';
import { EDIT_LOG_FIELDS } from '@/bcgov_arches_common/constants.ts';
import {
    getNodeDisplayValue,
    labelize,
} from '@/bcgov_arches_common/datatypes/utils.ts';
import { computed } from 'vue';

const { title, columnDefinitions, tableData, initialSortFieldIndex } =
    defineProps<{
        title?: string;
        columnDefinitions: ColumnDefinition[];
        tableData: AliasedTileDataWithAudit[];
        initialSortFieldIndex?: number;
    }>();

const AUDIT_FIELDS = Object.values(EDIT_LOG_FIELDS) as string[];

const isAuditField = (field: string): field is typeof EDIT_LOG_FIELDS[keyof typeof EDIT_LOG_FIELDS] => {
    return AUDIT_FIELDS.includes(field);
};

const isSortable = (col: ColumnDefinition) => {
    return col.sortable ?? true;
};

const tableTitle = computed(() => {
    return title ?? '';
});

const initialSortField = computed(() => {
    const colDef = columnDefinitions[initialSortFieldIndex ?? 0];
    if (!colDef) return '';

    return isAuditField(colDef.field)
        ? `audit.${colDef.field}`
        : `aliased_data.${colDef.field}.display_value`;
});

const getSortField = (field: string): string => {
    return isAuditField(field)
        ? `audit.${field}`
        : `aliased_data.${field}.display_value`;
};

const getCellValue = (row: AliasedTileDataWithAudit, field: string): string => {
    // Check for audit fields
    if (isAuditField(field)) {
        const auditValue = row.audit?.[field as keyof typeof row.audit];
        if (auditValue) return auditValue;
    }

    // Fall back to aliased_data
    return getNodeDisplayValue(row, field);
};

const columnTitle = function (colDef: ColumnDefinition) {
    return colDef.label ?? labelize(colDef.field);
};
</script>

<template>
    <dl v-if="(tableData?.length ?? 0) > 0">
        <dt v-if="tableTitle">{{ tableTitle }}</dt>
        <dd>
            <DataTable
                :value="tableData"
                data-key="tileid"
                responsive-layout="scroll"
                :sort-field="initialSortField"
                :sort-order="-1">
                <Column
                    v-for="col in columnDefinitions"
                    :key="col.field"
                    :header="columnTitle(col)"
                    :field="getSortField(col.field)"
                    :sortable="isSortable(col)">
                    <template #body="slotProps">
                        {{ getCellValue(slotProps.data, col.field) }}
                    </template>
                </Column>
            </DataTable>
        </dd>
    </dl>
</template>
