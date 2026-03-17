import type React from "react";
import {useCallback, useMemo, useRef, useState} from "react";

export interface ContextMenuState<TPayload = unknown> {
    open: boolean;
    x: number;
    y: number;
    payload: TPayload | null;
}

export function useContextMenu<TPayload = unknown>() {
    const [state, setState] = useState<ContextMenuState<TPayload>>({
        open: false,
        x: 0,
        y: 0,
        payload: null,
    });

    const anchorRef = useRef<HTMLDivElement | null>(null);

    const openContextMenu = useCallback((event: React.MouseEvent, payload: TPayload) => {
        event.preventDefault();

        setState({
            open: true,
            x: event.clientX,
            y: event.clientY,
            payload,
        });
    }, []);

    const closeContextMenu = useCallback(() => {
        setState((prev) => ({
            ...prev,
            open: false,
            payload: null,
        }));
    }, []);

    const anchorStyle = useMemo<React.CSSProperties>(() => ({
        position: 'fixed',
        left: state.x,
        top: state.y,
        width: 1,
        height: 1,
        pointerEvents: 'none',
        opacity: 0,
        zIndex: 9999,
    }), [state.x, state.y]);

    return {
        state,
        anchorRef,
        anchorStyle,
        openContextMenu,
        closeContextMenu,
    };
}
