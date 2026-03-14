import {useAuthStore} from "../../../stores/authStores";
import {FormEvent, useMemo, useState} from "react";
import {login} from "../../../api/auth";
import {Button, Card, Label, Text, TextInput} from "@gravity-ui/uikit";

export function LoginPage() {
    const setToken = useAuthStore((state) => state.setToken);
    const setUser = useAuthStore((state) => state.setUser);
    const setStatus = useAuthStore((state) => state.setStatus);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isDisabled = useMemo(() => {
        return !email.trim() || !password.trim() || isSubmitting;
    }, [email, password, isSubmitting]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await login({
                email: email.trim(),
                password,
            });

            setToken(response.token);
            setUser(response.user);
            setStatus('authenticated');
        } catch (error: any) {
            setError(
                error?.response?.data?.message ||
                "Failed to sign in.",
            );
            setStatus('guest');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="auth-page">
            <Card className="auth-page__card" view="filled">
                <div className="auth-page__header">
                    <Label theme="info">Web SQL IDE</Label>
                    <Text variant="header-1">Sign in</Text>
                    <Text variant="body-2" color="secondary">
                        Continue to your database workspace.
                    </Text>
                </div>

                <form className="auth-page__form" onSubmit={handleSubmit}>
                    <div className="auth-page__field">
                        <Text variant="subheader-2">Email</Text>
                        <TextInput
                            type="email"
                            size="xl"
                            value={email}
                            onUpdate={setEmail}
                            placeholder="you@example.com"
                            autoComplete="email"
                        />
                    </div>

                    <div className="auth-page__field">
                        <Text variant="subheader-2">Password</Text>
                        <TextInput
                            type="password"
                            size="xl"
                            value={password}
                            onUpdate={setPassword}
                            placeholder="Password"
                            autoComplete="current-password"
                        />
                    </div>

                    {error ? (
                        <div className="auth-page__error">
                            <Text variant="body-2">{error}</Text>
                        </div>
                    ) : null}

                    <Button
                        type="submit"
                        view="action"
                        size="xl"
                        width="max"
                        loading={isSubmitting}
                        disabled={isDisabled}
                    >
                        Sign in
                    </Button>
                </form>
            </Card>
        </div>
    );
}
