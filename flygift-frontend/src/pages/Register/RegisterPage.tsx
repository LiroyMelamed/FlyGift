import { useHttpRequest } from '@/hooks/useHttpRequest';
import React, { useState } from 'react';
import { registerApi } from '../../../api/registerApi';
import { useRouter } from 'next/navigation';

interface RegisterRequest {
    Username: string;
    PasswordHash: string;
    FullName: string;
    Role: string;
}

const RegisterPage: React.FC = () => {
    const router = useRouter();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');

    const { performRequest, isLoading, error } = useHttpRequest(
        registerApi.Register,
        onSuccess,
        (error) => {
            console.error('Registration failed:', error);
        }
    );

    function onSuccess(response: any) {
        console.log('Registration successful:', response);
        router.push("/Login/LoginPage")
    }

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        performRequest(username, password, fullName);
    };

    return (
        <div>
            <h1>Register</h1>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Full Name</label>
                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Registering...' : 'Register'}
                </button>
            </form>
            {error && <p>Error: {error.message}</p>} {/* Display error message if any */}
        </div>
    );
};

export default RegisterPage;