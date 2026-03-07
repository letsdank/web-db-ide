import {create} from "zustand/react";
import {setApiToken} from "../api/client";

interface AuthState {
    token: string | null;
    setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    token: localStorage.getItem('api_token'),
    setToken: (token) => {
        setApiToken(token);
        set({token});
    },
}));
