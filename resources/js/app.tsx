import React from "react";
import ReactDOM from 'react-dom/client';
import {WorkspacePage} from "./pages/WorkspacePage";
import '@gravity-ui/uikit/styles/styles.css';
import {ThemeProvider} from "@gravity-ui/uikit";


const el = document.getElementById('app');

if (el) {
    ReactDOM.createRoot(el).render(
        <React.StrictMode>
            <ThemeProvider theme="dark">
                <WorkspacePage/>
            </ThemeProvider>
        </React.StrictMode>
    )
}
