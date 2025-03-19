import axios from 'axios';

const AUTHORIZATION_HEADER_NAME = 'Authorization';

const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

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
