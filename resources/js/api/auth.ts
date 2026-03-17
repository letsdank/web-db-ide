import {apiClient, setApiToken} from "./client";
import type {LoginResponseDto, MeResponseDto} from "../types/auth";

export interface LoginPayload {
    email: string;
    password: string;
}

export async function login(payload: LoginPayload) {
    const response = await apiClient.post<LoginResponseDto>('/auth/login', payload);

    setApiToken(response.data.token);

    return response.data;
}

export async function fetchMe() {
    const response = await apiClient.get<MeResponseDto>('/auth/me');

    return response.data.user;
}

export async function logout() {
    await apiClient.post('/auth/logout');
    setApiToken(null);
}
