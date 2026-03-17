import {useCallback, useEffect, useRef} from "react";

export function useDebouncedCallback<T extends (...args: unknown[]) => void>(
    callback: T,
    delay: number
) {
    const callbackRef = useRef(callback);
    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current !== null) {
                window.clearTimeout(timeoutRef.current);
            }
        }
    }, []);

    return useCallback((...args: Parameters<T>) => {
        if (timeoutRef.current !== null) {
            window.clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = window.setTimeout(() => {
            callbackRef.current(...args);
        }, delay);
    }, [delay]);
}
