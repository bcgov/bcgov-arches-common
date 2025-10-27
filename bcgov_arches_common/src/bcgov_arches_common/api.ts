import Cookies from 'js-cookie';
import type { Ref } from 'vue';
import arches from 'arches';

export function getToken() {
    const token = Cookies.get('csrftoken');
    if (!token) {
        throw new Error('Missing csrftoken');
    }
    return token;
}

export const fetchUser = async () => {
    const response = await fetch(arches.urls.api_user);
    const parsed = await response.json();
    if (!response.ok) throw new Error(parsed.message || response.statusText);
    return parsed;
};

export const fetchSearchResults = async (
    searchTerm: string,
    items: number,
    page: number,
) => {
    const params = new URLSearchParams({
        term: searchTerm,
        items: items.toString(),
        page: page.toString(),
    });

    const url = `${arches.urls.api_search}?${params.toString()}`;
    const response = await fetch(url);
    const parsed = await response.json();
    if (!response.ok) throw new Error(parsed.message || response.statusText);
    return parsed;
};

export const getConceptsForNode = function (
    graphSlug: string,
    nodeAlias: string,
    concepts: Ref,
) {
    fetch(

            `${arches.urls.api_concepts_for_node}/${graphSlug}/${nodeAlias}`,
    )
        .then((response) => response.json())
        .then((data) => (concepts.value = data));
};

export const fetchConcepts = function (concept_id: string, concepts: Ref) {
    const params = new URLSearchParams({
        conceptid: concept_id,
    });
    fetch(`${arches.urls.paged_dropdown}?${params.toString()}`)
        .then((response) => response.json())
        .then((data) => (concepts.value = data.results));
};
