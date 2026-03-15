import {PropsWithChildren} from "react";
import {useAuthStore} from "../../stores/authStores";
import {logout} from "../../api/auth";
import {Button, Text} from "@gravity-ui/uikit";

export function AppShell({children}: PropsWithChildren) {
    const user = useAuthStore((state) => state.user);
    const reset = useAuthStore((state) => state.reset);

    async function handleLogout() {
        try {
            await logout();
        } finally {
            reset();
        }
    }

    return (
        <div className="app-shell">
            <header className="app-shell__header">
                <strong>Web SQL IDE</strong>

                <div className="app-shell__user">
                    <Text variant="body-2" color="secondary">
                        {user?.email ?? 'Guest'}
                    </Text>

                    <Button size="m" view="flat-secondary" onClick={handleLogout}>
                        Logout
                    </Button>
                </div>
            </header>

            <main>{children}</main>
        </div>
    );
}
