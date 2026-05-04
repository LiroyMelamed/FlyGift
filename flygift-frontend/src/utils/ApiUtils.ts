import axios from 'axios';

const AUTHORIZATION_HEADER_NAME = 'Authorization';
const AUTH_COOKIE_NAME = 'flygift_token';

const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

/**
 * Stage 23 — On every request, hydrate the Authorization header from the
 * `flygift_token` cookie. This survives full page reloads (axios defaults
 * are reset when the JS module re-evaluates), which previously caused
 * 401s on /api/FlightSearch and other authed endpoints.
 */
function readAuthCookie(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${AUTH_COOKIE_NAME}=`));
    if (!match) return null;
    return decodeURIComponent(match.split('=')[1] ?? '');
}

apiClient.interceptors.request.use((config) => {
    const existing = config.headers?.[AUTHORIZATION_HEADER_NAME];
    if (!existing) {
        const token = readAuthCookie();
        if (token) {
            config.headers = config.headers ?? {};
            (config.headers as Record<string, string>)[AUTHORIZATION_HEADER_NAME] =
                `Bearer ${token}`;
        }
    }
    return config;
});

/**
 * Global 401 handler — when any authed call comes back unauthorized we
 * (a) clear the stale token from cookie + axios defaults so we don't
 * keep sending it, and (b) redirect to /login while preserving the
 * intended return path. Skipped for the /Auth/* endpoints themselves
 * so a wrong-password POST doesn't kick the user off the login page.
 */
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        const url: string = error?.config?.url ?? '';
        const isAuthEndpoint = /\/?Auth\//i.test(url);

        if (status === 401 && !isAuthEndpoint && typeof window !== 'undefined') {
            // Clear the bad token so subsequent requests don't loop.
            document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0`;
            delete apiClient.defaults.headers.common[AUTHORIZATION_HEADER_NAME];

            const here = window.location.pathname + window.location.search;
            if (!window.location.pathname.startsWith('/login')) {
                const next = encodeURIComponent(here);
                window.location.replace(`/login?next=${next}`);
            }
        }
        return Promise.reject(error);
    }
);

const handleRequest = async (requestFunction: () => Promise<any>) => {
    try {
        const response = await requestFunction();
        return response.data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
};

export const ApiUtils = {
    setAuthorizationHeader: (token: string) => {
        apiClient.defaults.headers.common[AUTHORIZATION_HEADER_NAME] = `Bearer ${token}`;
    },

    removeAuthorizationHeader: () => {
        delete apiClient.defaults.headers.common[AUTHORIZATION_HEADER_NAME];
    },

    getAuthorizationHeader: (): string | undefined => {
        return apiClient.defaults.headers.common[AUTHORIZATION_HEADER_NAME]?.toString();
    },

    get: (endpoint: string) => {

        function startRequest() {
            return handleRequest(() => apiClient.get(endpoint));
        }

        return { startRequest };
    },

    post: (endpoint: string, data: any) => {

        function startRequest() {
            return handleRequest(() => apiClient.post(endpoint, data));
        }

        return { startRequest };
    },
};
