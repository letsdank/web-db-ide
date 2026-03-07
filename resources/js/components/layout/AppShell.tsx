import {PropsWithChildren} from "react";

export function AppShell({children}: PropsWithChildren) {
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
                    padding: '0 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
            >
                <strong>Web SQL IDE</strong>
            </header>

            <main>{children}</main>
        </div>
    );
}
