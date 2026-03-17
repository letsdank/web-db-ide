import type {ReactNode} from "react";
import { useEffect} from "react";
import {useAuthStore} from "../../../stores/authStores";
import {fetchMe} from "../../../api/auth";
import {Spin, Text} from "@gravity-ui/uikit";
import {LoginPage} from "./LoginPage";

interface Props {
    children: ReactNode;
}

export function AuthBootstrap({children}: Props) {
    const token = useAuthStore((state) => state.token);
    const status = useAuthStore((state) => state.status);
    const setUser = useAuthStore((state) => state.setUser);
    const setStatus = useAuthStore((state) => state.setStatus);
    const reset = useAuthStore((state) => state.reset);

    useEffect(() => {
        let isMounted = true;

        async function bootstrap() {
            if (!token) {
                setStatus('guest');
                return;
            }

            try {
                const user = await fetchMe();

                if (!isMounted) {
                    return;
                }

                setUser(user);
                setStatus('authenticated');
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                reset();
            }
        }

        void bootstrap();

        return () => {
            isMounted = false;
        };
    }, [token, setStatus, setUser, reset]);

    if (status === 'booting') {
        return (
            <div className="auth-page auth-page--loading">
                <div className="auth-page__loading">
                    <Spin size="l"/>
                    <Text variant="body-2" color="secondary">
                        Loading workspace...
                    </Text>
                </div>
            </div>
        );
    }

    if (status !== 'authenticated') {
        return <LoginPage/>
    }

    return <>{children}</>
}
