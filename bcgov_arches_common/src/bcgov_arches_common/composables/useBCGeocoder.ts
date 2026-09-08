import { ref } from 'vue';
import arches from 'arches';

export interface GeocoderFeature {
    type: 'Feature';
    geometry: {
        type: string;
        coordinates: number[];
    };
    properties: Record<string, unknown>;
}

export interface GeocoderResponse {
    type: 'FeatureCollection';
    features: GeocoderFeature[];
}

export function useBCGeocoder() {
    const results = ref<GeocoderFeature[]>([]);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    async function search(addressString: string) {
        const trimmed = addressString.trim();
        if (!trimmed) {
            results.value = [];
            return;
        }

        isLoading.value = true;
        error.value = null;

        try {
            const url = arches.urls['bc-geocoder'](trimmed);
            const response = await fetch(url);
            const data: GeocoderResponse = await response.json();
            if (!response.ok) {
                throw new Error(
                    (data as unknown as { error: string }).error ||
                        response.statusText,
                );
            }
            results.value = data.features ?? [];
        } catch (e) {
            error.value = e instanceof Error ? e.message : String(e);
            results.value = [];
        } finally {
            isLoading.value = false;
        }
    }

    function clear() {
        results.value = [];
        error.value = null;
    }

    return {
        results,
        isLoading,
        error,
        search,
        clear,
    };
}
