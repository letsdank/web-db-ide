import {create} from "zustand/react";
import {setApiToken} from "../api/client";
import {AuthUserDto} from "../types/auth";

type AuthStatus = 'booting' | 'authenticated' | 'guest';

interface AuthState {
    token: string | null;
    user: AuthUserDto | null;
    status: AuthStatus;

    setToken: (token: string | null) => void;
    setUser: (user: AuthUserDto | null) => void;
    setStatus: (status: AuthStatus) => void;
    reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    token: localStorage.getItem('api_token'),
    user: null,
    status: 'booting',

    setToken: (token) => {
        setApiToken(token);
        set({token});
    },

    setUser: (user) => set({user}),
    setStatus: (status) => set({status}),

    reset: () => {
        setApiToken(null);
        set({
            token: null,
            user: null,
            status: 'guest',
        });
    },
}));
