import React from "react";
import ReactDOM from 'react-dom/client';
import {WorkspacePage} from "./pages/WorkspacePage";
import '@gravity-ui/uikit/styles/styles.css';
import {ThemeProvider, ToasterComponent, ToasterProvider} from "@gravity-ui/uikit";
import "../css/app.scss";
import {toaster} from "@gravity-ui/uikit/toaster-singleton";

const root = ReactDOM.createRoot(document.getElementById("app")!);

root.render(
    <React.StrictMode>
        <ThemeProvider theme="dark">
            <ToasterProvider toaster={toaster}>
                <WorkspacePage/>
                <ToasterComponent/>
            </ToasterProvider>
        </ThemeProvider>
    </React.StrictMode>,
);
