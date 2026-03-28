

const CONFIG = {
    // production URL when ready deploy
    API_BASE_URL: 'http://127.0.0.1:5000/api',
    
    // 2 minutes = 120,000 ms
    CACHE_TTL: 120000 
};

const API = {
   
    request: async function(endpoint, method = 'GET', body = null) {
        const token = localStorage.getItem('access_token');
        const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${CONFIG.API_BASE_URL}${formattedEndpoint}`;
        const cacheKey = `isuku_cache_${formattedEndpoint}`;

        // --- 1. SMART CACHE INTERCEPT (GET Requests Only) ---
        if (method === 'GET') {
            const cachedData = sessionStorage.getItem(cacheKey);
            if (cachedData) {
                const parsedCache = JSON.parse(cachedData);
                const now = new Date().getTime();
                
                // If the cache is younger than our TTL, return it instantly
                if (now - parsedCache.timestamp < CONFIG.CACHE_TTL) {
                    console.log(`⚡ [Cache Hit] Loaded instantly: ${formattedEndpoint}`);
                    return parsedCache.data;
                }
            }
        } else {
            // --- 2. CACHE INVALIDATION ---
            // If we are doing a POST, PUT, or DELETE, the database is changing.
            
            this.clearCache();
        }

        // --- 3. NETWORK REQUEST ---
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const options = { method: method, headers: headers };
        if (body) options.body = JSON.stringify(body);

        try {
            const response = await fetch(url, options);
            
            if (response.status === 401) {
                console.warn("Unauthorized: Token may be expired.");
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || 'API request failed');
            }

            // --- 4. SAVE TO CACHE ---
            if (method === 'GET') {
                sessionStorage.setItem(cacheKey, JSON.stringify({
                    timestamp: new Date().getTime(),
                    data: data
                }));
            }

            return data;
        } catch (error) {
            console.error(`[API Error] ${method} ${endpoint}:`, error.message);
            throw error;
        }
    },

    // --- Cache Nuke Utility ---
    clearCache: function() {
        const keysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key.startsWith('isuku_cache_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key));
        console.log("🔥 [Cache Cleared] Database mutation detected.");
    },

    // --- Clean Convenience Methods ---
    get: function(endpoint) { return this.request(endpoint, 'GET'); },
    post: function(endpoint, body) { return this.request(endpoint, 'POST', body); },
    put: function(endpoint, body) { return this.request(endpoint, 'PUT', body); },
    delete: function(endpoint) { return this.request(endpoint, 'DELETE'); }
};