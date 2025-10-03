import arches from 'arches';
import type { EditLogResponse } from '@/bcgov_arches_common/types.ts';

export async function getEditLogForTile(
    resourceId: string,
    tileId: string,
): Promise<EditLogResponse> {
    const url =
        arches.urls.resource_edit_log(resourceId) + `?tile_id=${tileId}`;

    return getEditLog(url);
}

export async function getEditLogForNodegroupId(
    resourceId: string,
    nodegroupId: string,
): Promise<EditLogResponse> {
    const url =
        arches.urls.resource_edit_log(resourceId) +
        `?nodegroup_id=${nodegroupId}`;
    return getEditLog(url);
}

export async function getEditLogForNodeAlias(
    resourceId: string,
    graphSlug: string,
    nodeAlias: string,
): Promise<EditLogResponse> {
    const url =
        arches.urls.resource_edit_log(resourceId) +
        `?graph_slug=${graphSlug}&node_alias=${nodeAlias}`;

    return getEditLog(url);
}

export async function getEditLogForResource(
    resourceId: string,
): Promise<EditLogResponse> {
    return getEditLog(arches.urls.resource_edit_log(resourceId));
}

async function getEditLog(url: string): Promise<EditLogResponse> {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to load edit information: ${response.status}`);
    }

    const result: EditLogResponse = await response.json();
    return result;
}
