"use client";

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";

type Ctx = {
    isOpen: boolean;
    open: () => void;
    close: () => void;
};

const LoginOverlayContext = createContext<Ctx>({
    isOpen: false,
    open: () => { },
    close: () => { },
});

export function LoginOverlayProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);

    const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);

    return (
        <LoginOverlayContext.Provider value={value}>
            {children}
        </LoginOverlayContext.Provider>
    );
}

export function useLoginOverlay() {
    return useContext(LoginOverlayContext);
}
