/**
 * Reverse geocode latitude/longitude to get state and city using Nominatim API
 * (OpenStreetMap's free reverse geocoding service)
 */

interface NominatimResponse {
    address?: {
        city?: string;
        town?: string;
        village?: string;
        county?: string;
        state?: string;
        state_code?: string;
    };
}

export const reverseGeocode = async (
    latitude: number,
    longitude: number
): Promise<{ city: string; state: string } | null> => {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
            {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Spectru-Biomarker-App',
                }
            }
        );

        if (!response.ok) throw new Error('Nominatim API error');

        const data: NominatimResponse = await response.json();
        const address = data.address;

        if (!address) return null;

        // Extract city (prefer city > town > village)
        const city = address.city || address.town || address.village || '';

        // Extract state (use state_code as fallback for short form)
        const state = address.state || address.state_code || '';

        return { city, state };
    } catch (error) {
        console.error('Reverse geocoding failed:', error);
        return null;
    }
};
