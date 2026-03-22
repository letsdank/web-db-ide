import React from "react";

interface Props {
    left: React.ReactNode;
    centerTop: React.ReactNode;
    tabs: React.ReactNode;
    toolbar: React.ReactNode;
    editor: React.ReactNode;
    editorFooter?: React.ReactNode;
    results: React.ReactNode;
    right: React.ReactNode;
    isErd?: boolean;
}

export function WorkspaceMainLayout({
                                        left,
                                        centerTop,
                                        tabs,
                                        toolbar,
                                        editor,
                                        editorFooter,
                                        results,
                                        right,
                                        isErd,
                                    }: Props) {
    return (
        <div className="workspace-page">
            <div className="workspace-page__layout">
                {left}

                <div className={`workspace-page__center${isErd ? ' workspace-page__center--erd' : ''}`}>
                    <div className="workspace-page__tabs-row">
                        <div className="workspace-page__tabs">
                            {tabs}
                        </div>

                        <div className="workspace-page__palette-trigger">
                            {centerTop}
                        </div>
                    </div>

                    {toolbar}

                    <div className="workspace-page__editor-panel">
                        <div className="workspace-page__panel-main">
                            <div className="workspace-page__panel-content">
                                {editor}
                            </div>

                            {editorFooter ? (
                                <div className="workspace-page__editor-footer">
                                    {editorFooter}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="workspace-page__results-panel">
                        {results}
                    </div>
                </div>

                {right}
            </div>
        </div>
    );
}
