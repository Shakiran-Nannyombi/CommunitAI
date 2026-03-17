"use client";

import { useEffect } from "react";

interface ToastProps {
    message: string;
    onDismiss: () => void;
    duration?: number;
}

export default function Toast({ message, onDismiss, duration = 4000 }: ToastProps) {
    useEffect(() => {
        const t = setTimeout(onDismiss, duration);
        return () => clearTimeout(t);
    }, [onDismiss, duration]);

    return (
        <div
            role="alert"
            className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-lg"
        >
            <span>{message}</span>
            <button
                onClick={onDismiss}
                className="text-gray-400 hover:text-white"
                aria-label="Dismiss"
            >
                ✕
            </button>
        </div>
    );
}
