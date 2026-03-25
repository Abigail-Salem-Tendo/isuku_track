//Helper to implement 'DRY' programming for our api calls
const BASE_URL = 'http://127.0.0.1:5000/api';

const getToken = () => localStorage.getItem('access_token');

async function apiCall(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = { ...options, headers };

    try {
        const response = await fetch(url, config);
        if (response.status === 204) return null;

        const data = await response.json();

        if (!response.ok) {
            console.error(`API Error (${response.status}):`, data.error || 'Unknown error');
            throw new Error(data.error || 'API request failed');
        }
        
        return data;
    } catch (error) {
        console.error(`Fetch failed on ${endpoint}:`, error);
        throw error; 
    }
}

// Export  methods for use in other modules
export const api = {
    get: (endpoint) => apiCall(endpoint, { method: 'GET' }),
    post: (endpoint, body) => apiCall(endpoint, { method: 'POST', body: JSON.stringify(body) }),
    put: (endpoint, body) => apiCall(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (endpoint) => apiCall(endpoint, { method: 'DELETE' })
};