import {toaster} from "@gravity-ui/uikit/toaster-singleton";

function normalizeErrorMessage(input: unknown): string {
    if (!input) {
        return "Unexpected error.";
    }

    if (typeof input === "string") {
        return input;
    }

    if (typeof input === "object" && input !== null) {
        const value = input as Record<string, unknown>;

        if (typeof value.message === "string" && value.message.trim()) {
            return value.message;
        }

        if (typeof value.error === "string" && value.error.trim()) {
            return value.error;
        }
    }

    return "Unexpected error.";
}

export function showErrorToast(message: unknown, title = "Request failed") {
    const content = normalizeErrorMessage(message);

    toaster.add({
        name: `error-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title,
        content,
        theme: "danger",
        autoHiding: 6000,
        isClosable: true,
    });
}

export function showSuccessToast(message: string, title = "Success") {
    const content = normalizeErrorMessage(message);

    toaster.add({
        name: `success-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title,
        content: message,
        theme: "success",
        autoHiding: 6000,
        isClosable: true,
    });
}

