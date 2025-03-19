import { useState, useCallback } from 'react';

/**
 * Hook to execute an API request function and manage its state.
 * @param requestFn Function that takes any parameters and returns an object with a startRequest method.
 * @param onSuccess Optional callback function to be executed upon a successful request.
 * @param onFailure Optional callback function to be executed upon a failed request.
 */
export const useHttpRequest = (
    requestFn: (...args: any[]) => { startRequest: () => Promise<any> },
    onSuccess?: (response: any) => void,
    onFailure?: (error: any) => void
) => {
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<any>(null);

    const performRequest = useCallback((...args: any[]) => {
        setIsLoading(true);
        return requestFn(...args).startRequest()
            .then(response => {
                setData(response);
                setError(null);

                if (onSuccess) {
                    onSuccess(response);
                }
            })
            .catch(err => {
                setError(err);
                setData(null);

                if (onFailure) {
                    onFailure(err);
                }
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [requestFn, onSuccess, onFailure]);

    return { performRequest, isLoading, data, error };
};