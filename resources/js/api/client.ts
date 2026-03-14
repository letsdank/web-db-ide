import axios from "axios";
import {showErrorToast} from "../lib/toast";

const token = localStorage.getItem('api_token');

export const apiClient = axios.create({
    baseURL: '/api',
    headers: token
        ? {
            Authorization: `Bearer ${token}`,
        }
        : {},
});

function extractErrorMessage(error: any): string {
    const responseData = error?.response?.data;

    if (typeof responseData?.message === "string" && responseData.message.trim()) {
        return responseData.message;
    }

    if (typeof responseData?.error === "string" && responseData.error.trim()) {
        return responseData.error;
    }

    if (responseData?.errors && typeof responseData.errors === "object") {
        const firstEntry = Object.values(responseData.errors)[0];

        if (Array.isArray(firstEntry) && typeof firstEntry[0] === "string") {
            return firstEntry[0];
        }

        if (typeof firstEntry === "string") {
            return firstEntry;
        }
    }

    if (typeof error?.message === "string" && error.message.trim()) {
        return error.message;
    }

    return "Unexpected server error.";
}

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        const requestUrl = error?.config?.url ?? "";

        if (status === 401) {
            localStorage.removeItem('api_token');
            delete apiClient.defaults.headers.Authorization;
        }

        if (
            status >= 400 &&
            requestUrl !== '/auth/me' &&
            requestUrl !== '/auth/login'
        ) {
            showErrorToast(extractErrorMessage(error), "Request failed");
        }

        if (!status) {
            showErrorToast(extractErrorMessage(error), "Request failed");
        }

        return Promise.reject(error);
    },
);

export function setApiToken(token: string | null) {
    if (token) {
        localStorage.setItem('api_token', token);
        apiClient.defaults.headers.Authorization = `Bearer ${token}`;
    } else {
        localStorage.removeItem('api_token');
        delete apiClient.defaults.headers.Authorization;
    }
}
