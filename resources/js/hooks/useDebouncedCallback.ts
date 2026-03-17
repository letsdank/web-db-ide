import {useCallback, useEffect, useRef} from "react";

export function useDebouncedCallback<TArgs extends unknown[]>(
    callback: (...args: TArgs) => void,
    delay: number,
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
        };
    }, []);

    return useCallback((...args: TArgs) => {
        if (timeoutRef.current !== null) {
            window.clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = window.setTimeout(() => {
            callbackRef.current(...args);
        }, delay);
    }, [delay]);
}
