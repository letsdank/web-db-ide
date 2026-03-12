import React from "react";

interface Props {
    left: React.ReactNode;
    centerTop: React.ReactNode;
    tabs: React.ReactNode;
    toolbar: React.ReactNode;
    editor: React.ReactNode;
    results: React.ReactNode;
    right: React.ReactNode;
}

export function WorkspaceMainLayout({
                                        left,
                                        centerTop,
                                        tabs,
                                        toolbar,
                                        editor,
                                        results,
                                        right,
                                    }: Props) {
    return (
        <div className="workspace-page">
            <div className="workspace-page__layout">
                {left}

                <div className="workspace-page__center">
                    <div className="workspace-page__palette-trigger">
                        {centerTop}
                    </div>

                    {tabs}
                    {toolbar}

                    <div className="workspace-page__panel">
                        {editor}
                    </div>

                    <div className="workspace-page__panel">
                        {results}
                    </div>
                </div>

                {right}
            </div>
        </div>
    );
}
