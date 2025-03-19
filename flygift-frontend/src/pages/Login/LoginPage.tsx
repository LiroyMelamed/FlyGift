import { useHttpRequest } from '@/hooks/useHttpRequest';
import React, { useState } from 'react';
import { loginApi, LoginResponse } from '../../../api/loginApi';
import { ApiUtils } from '@/utils/ApiUtils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SimpleScreen from '@/components/simpleComponents/SimpleScreen';

const LoginPage: React.FC = () => {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const { performRequest, isLoading, error } = useHttpRequest(loginApi.Login, (respone) => onSuccess(respone));

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        performRequest(username, password);
    };

    function onSuccess(respone: LoginResponse) {
        console.log(respone);
        ApiUtils.setAuthorizationHeader(respone.data);
        router.push("/Login/LoginPage")
    }

    return (
        <SimpleScreen>
            {/* <h1>Login</h1>
            <form onSubmit={handleSubmit}>
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
                    {isLoading ? 'Logging in...' : 'Login'}
                </button>
            </form>
            {error && <p>Error: {error.message}</p>} 
            <p>
                Don't have an account?{' '}
                <Link href="/Register/RegisterPage">Register here</Link>
            </p> */}
        </SimpleScreen>
    );
};

export default LoginPage;