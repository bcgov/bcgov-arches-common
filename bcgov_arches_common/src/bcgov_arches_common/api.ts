import Cookies from 'js-cookie';
import type { Ref } from 'vue';

// @todo Initialize these from sever API call?
export const arches = {
    prefix: 'http://localhost/',
    urls: {
        api_login: '',
        api_logout: '',
        api_user: 'http://localhost/bcrhp/api/user/',
        api_search: '',
        paged_dropdown: '',
        api_bulk_disambiguated_resource_instance:
            '/bcrhp/api/bulk_disambiguated_resource_instance',
        api_card: '/bcrhp/cards/',
        api_get_frontend_i18n_data: '/bcrhp/api/get_frontend_i18n_data',
        api_node_value: '/bcrhp/api/node_value/',
        api_search_component_data: '/bcrhp/search_component_data/',
        api_tiles: '/bcrhp/api/tiles/',
        api_user_incomplete_workflows: '/bcrhp/api/user_incomplete_workflows',
    },
};
function getToken() {
    const token = Cookies.get('csrftoken');
    if (!token) {
        throw new Error('Missing csrftoken');
    }
    return null;
}

export const login = async (username: string, password: string) => {
    const response = await fetch(arches.urls.api_login, {
        method: 'POST',
        headers: { 'X-CSRFTOKEN': getToken() },
        body: JSON.stringify({ username, password }),
    });
    const parsed = await response.json();
    if (!response.ok) throw new Error(parsed.message || response.statusText);
    return parsed;
};

export const logout = async () => {
    const response = await fetch(arches.urls.api_logout, {
        method: 'POST',
        headers: { 'X-CSRFTOKEN': getToken() },
    });
    if (response.ok) return true;
    const parsedError = await response.json();
    throw new Error(parsedError.message || response.statusText);
};

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

export const fetchConcepts = function (concept_id: string, concepts: Ref) {
    const params = new URLSearchParams({
        conceptid: concept_id,
    });
    fetch(`${arches.urls.paged_dropdown}?${params.toString()}`)
        .then((response) => response.json())
        .then((data) => (concepts.value = data.results));
};
