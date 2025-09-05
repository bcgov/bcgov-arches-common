<script setup lang="ts">
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import type { ColumnDefinition } from "@/bcgov_arches_common/components/StandardDataTable/types.ts";
import type { AliasedTileData } from "@/arches_component_lab/types.ts";
import {
    getNodeDisplayValue,
    labelize,
} from "@/bcgov_arches_common/datatypes/utils.ts";
import { computed } from "vue";

const { title, columnDefinitions, tableData, initialSortFieldIndex } =
    defineProps<{
        title?: string;
        columnDefinitions: ColumnDefinition[];
        tableData: AliasedTileData[];
        initialSortFieldIndex?: number;
    }>();

const isSortable = (col: ColumnDefinition) => {
    return col.sortable ?? true;
};

const tableTitle = computed(() => {
    return title ?? "";
});

const initialSortField = computed(() => {
    return initialSortFieldIndex ?? 0;
});

const columnTitle = function (colDef: ColumnDefinition) {
    return colDef.label ?? labelize(colDef.field);
};
</script>
<template>
    <dl v-if="(tableData?.length ?? 0) > 0">
        <dt>{{ tableTitle }}</dt>
        <dd>
            <DataTable
                :value="tableData"
                data-key="tileid"
                responsive-layout="scroll"
                :sort-field="`aliased_data.${columnDefinitions[initialSortField].field}.display_value`"
                :sort-order="-1">
                <Column
                    v-for="col in columnDefinitions"
                    :key="col.field"
                    :header="columnTitle(col)"
                    :field="`aliased_data.${col.field}.display_value`"
                    :sortable="isSortable(col)">
                    <template #body="slotProps">
                        {{ getNodeDisplayValue(slotProps.data, col.field) }}
                    </template>
                </Column>
            </DataTable>
        </dd>
    </dl>
</template>
