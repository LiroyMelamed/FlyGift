import axios from 'axios';
import { resetUser } from '@/lib/appStore';

const AUTHORIZATION_HEADER_NAME = 'Authorization';

const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
    // Send cookies on every cross-origin request — the auth token now
    // lives in an HttpOnly cookie set by the backend on /Auth/Login,
    // so JavaScript cannot read it (XSS-resistant). Backend reads it
    // from the cookie or, if a native client supplies one, from the
    // Authorization: Bearer header.
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

/**
 * Stage 25 — JWT lives in an HttpOnly cookie set by the backend on
 * login. Browser sends it automatically with `withCredentials`. The
 * `setAuthorizationHeader` API stays available for native/mobile
 * clients (React Native bridge) that don't have a cookie jar; on the
 * web SPA the cookie path is preferred and the header is unused.
 */

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
            // Cookie is HttpOnly so JS can't clear it; ask the backend to
            // expire it via the Logout endpoint. Fire-and-forget — even if
            // it fails, the redirect below dumps the user at /login.
            try {
                apiClient.post('Auth/Logout').catch(() => undefined);
            } catch {
                // ignore — we're redirecting anyway
            }
            delete apiClient.defaults.headers.common[AUTHORIZATION_HEADER_NAME];
            resetUser();
            const here = window.location.pathname + window.location.search;
            if (!window.location.pathname.startsWith('/login')) {
                const next = encodeURIComponent(here);
                window.location.replace(`/login?next=${next}`);
            }
        }
        return Promise.reject(error);
    }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleRequest = async (requestFunction: () => Promise<any>) => {
    try {
        const response = await requestFunction();
        return response.data;
    } catch (error) {
        // Transport-level failures (backend down, network blip) get a
        // quiet `warn` so Next's dev error overlay doesn't promote a
        // 60s notification poll into a red banner. The caller still
        // sees the rejection — silenced ones (`fetchMine`, hydration
        // hooks) catch and ignore by design. Logical/server errors
        // (status >= 400) stay as `error`.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const status = (error as any)?.response?.status;
        if (typeof status !== 'number') {
            console.warn('API request transport failure:', error);
        } else {
            console.error('API request failed:', error);
        }
        throw error;
    }
};

export const ApiUtils = {
    /** Resolved API base URL (env var with no trailing slash). */
    getBaseUrl: (): string => {
        const raw = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
        return raw.replace(/\/$/, "");
    },

    /** Build an absolute API URL without duplicating `/api`. */
    apiUrl: (path: string): string => {
        const base = ApiUtils.getBaseUrl();
        const normalized = path.replace(/^\//, "");
        return base ? `${base}/${normalized}` : `/${normalized}`;
    },

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

    post: (endpoint: string, data: unknown, config?: { timeout?: number }) => {

        function startRequest() {
            return handleRequest(() => apiClient.post(endpoint, data, config));
        }

        return { startRequest };
    },

    put: (endpoint: string, data: unknown) => {
        function startRequest() {
            return handleRequest(() => apiClient.put(endpoint, data));
        }

        return { startRequest };
    },
};
