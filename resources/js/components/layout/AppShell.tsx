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
        <div
            style={{
                minHeight: '100vh',
                display: 'grid',
                gridTemplateRows: '56px 1fr',
                background: '#0f1115',
                color: '#fff',
            }}
        >
            <header
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
            >
                <strong>Web SQL IDE</strong>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                    }}
                >
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
