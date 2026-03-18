"use client";

import { createContext, useCallback, useContext, useState } from "react";
import Toast from "@/components/Toast";

interface ToastContextValue {
    showError: (msg?: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ showError: () => { } });

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [message, setMessage] = useState<string | null>(null);

    const showError = useCallback(
        (msg = "Something went wrong. Please try again.") => setMessage(msg),
        []
    );

    const dismiss = useCallback(() => setMessage(null), []);

    return (
        <ToastContext.Provider value={{ showError }}>
            {children}
            {message && <Toast message={message} onDismiss={dismiss} />}
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext);
