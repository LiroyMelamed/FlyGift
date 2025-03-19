import { ApiUtils } from "@/utils/ApiUtils";

// Endpoint for logging in (adjust according to your backend API)
const LOGIN_ENDPOINT = 'Auth/Login';

interface LoginCredentials {
    username: string;
    passwordHash: string;
}

export interface LoginResponse {
    isSuccess: boolean;
    message: string;
    data: string;
    user?: any;  // Define a more specific type based on what your user object includes
}

/**
 * API object to handle authentication-related tasks.
 */
export const loginApi = {
    /**
     * Function to log in a user with username and password hash.
     * @param username The user's username.
     * @param passwordHash The password hash (or plain password that will be hashed backend).
     * @returns A promise resolving to the login response.
     */
    Login: (username: string, passwordHash: string) => {

        const data: LoginCredentials = {
            username,
            passwordHash,
        };

        console.log('Login', data);




        return ApiUtils.post(LOGIN_ENDPOINT, data);
    },
};
