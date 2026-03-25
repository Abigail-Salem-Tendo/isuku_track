//Helper to implement 'DRY' programming for our api calls

const CONFIG = {
    API_BASE_URL: 'http://127.0.0.1:5000/api' 
};

const API = {
    /**
     * Master fetch function that handles headers, tokens, and error parsing automatically.
     */
    request: async function(endpoint, method = 'GET', body = null) {
        const token = localStorage.getItem('access_token');
        
        const headers = {
            'Content-Type': 'application/json'
        };

        // Automatically attach the JWT if the user is logged in
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const options = {
            method: method,
            headers: headers
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            // Ensure endpoint starts with a slash
            const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
            const response = await fetch(`${CONFIG.API_BASE_URL}${formattedEndpoint}`, options);
            
            // Global check for expired tokens / unauthorized access
            if (response.status === 401) {
                console.warn("Unauthorized: Token may be expired.");
                // Forcing logout by redirecting to login page
                // window.location.href = '/login';
            }

            const data = await response.json();

            // If the backend returns an error (400, 404, 500, etc.), throwing it so the UI can catch it
            if (!response.ok) {
                throw new Error(data.error || data.message || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error(`[API Error] ${method} ${endpoint}:`, error.message);
            throw error;
        }
    },

    // ---  Convenience Methods ---
    get: function(endpoint) { 
        return this.request(endpoint, 'GET'); 
    },
    
    post: function(endpoint, body) { 
        return this.request(endpoint, 'POST', body); 
    },
    
    put: function(endpoint, body) { 
        return this.request(endpoint, 'PUT', body); 
    },
    
    delete: function(endpoint) { 
        return this.request(endpoint, 'DELETE'); 
    }
};