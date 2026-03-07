import axios from "axios";

const token = localStorage.getItem('api_token');

export const apiClient = axios.create({
    baseURL: '/api',
    headers: token
        ? {
            Authorization: `Bearer ${token}`,
        }
        : {},
});

export function setApiToken(token: string | null) {
    if (token) {
        localStorage.setItem('api_token', token);
        apiClient.defaults.headers.Authorization = `Bearer ${token}`;
    } else {
        localStorage.removeItem('api_token');
        delete apiClient.defaults.headers.Authorization;
    }
}
