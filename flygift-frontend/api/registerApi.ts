import { ApiUtils } from "@/utils/ApiUtils";

// Endpoint for registering a new user
const REGISTER_ENDPOINT = 'Auth/Register';

interface RegisterRequest {
    Username: string;
    PasswordHash: string;
    FullName: string;
    // Role: string;
}

interface RegisterResponse {
    isSuccess: boolean;
    message: string;
}

export const registerApi = {
    /**
     * Function to register a new user.
     * @param Username The user's username.
     * @param PasswordHash The user's password (to be hashed on the server).
     * @param FullName The full name of the user.
     * @param Role The role of the user (e.g., Client, Company, Admin).
     * @returns A promise resolving to the registration response.
     */
    Register: (Username: string, PasswordHash: string, FullName: string, Role: string) => {
        const data: RegisterRequest = {
            Username,
            PasswordHash,
            FullName,
            // Role,
        };

        console.log('Register', data);


        return ApiUtils.post(REGISTER_ENDPOINT, data);
    },
};