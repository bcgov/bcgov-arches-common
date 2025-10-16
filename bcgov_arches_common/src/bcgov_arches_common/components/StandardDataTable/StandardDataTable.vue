<script setup lang="ts">
import DOMPurify from 'dompurify';
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

const isAuditField = (
    field: string,
): field is (typeof EDIT_LOG_FIELDS)[keyof typeof EDIT_LOG_FIELDS] => {
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

const sanitizeHtml = (html: string): string => {
    return DOMPurify.sanitize(html);
};

const columnTitle = function (colDef: ColumnDefinition) {
    return colDef.label ?? labelize(colDef.field);
};

const visibleColumns = computed(() =>
    columnDefinitions.filter(
        (col) => typeof col.visible === 'undefined' || col.visible,
    ),
);
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
                    v-for="col in visibleColumns"
                    :key="col.field"
                    :header="columnTitle(col)"
                    :field="getSortField(col.field)"
                    :sortable="isSortable(col)">
                    <template #body="slotProps">
                        <!-- eslint-disable-next-line vue/no-v-html -->
                        <span
                            v-if="col.isHtml"
                            class="html-content"
                            v-html="sanitizeHtml(getCellValue(slotProps.data, col.field))"
                        ></span>
                        <span v-else>
                            {{ getCellValue(slotProps.data, col.field) }}
                        </span>
                    </template>
                </Column>
            </DataTable>
        </dd>
    </dl>
</template>

<style scoped>
.html-content :deep(p) {
    margin: 0.5rem 0;
}

.html-content :deep(p:first-child) {
    margin-top: 1rem;
}

.html-content :deep(p:last-child) {
    margin-bottom: 0;
}

.html-content :deep(strong) {
    margin-right: 0.25rem;
}

.html-content {
    display: block;
    line-height: 1.5;
}

.html-content :deep(p:not(:first-child)) {
    margin-top: 1rem;
}
</style>
