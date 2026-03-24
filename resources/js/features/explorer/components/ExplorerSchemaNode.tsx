import type {ExplorerTableDetailsDto, ExplorerTableDto} from "../../../types/explorer";
import React, {useCallback, useEffect, useMemo, useState} from "react";
import {Button, DropdownMenu, Icon, Label, Loader, Text} from "@gravity-ui/uikit";
import {ExplorerTableNode} from "./ExplorerTableNode";
import {ChevronDown, ChevronRight, Ellipsis, Folder} from "@gravity-ui/icons";
import {useI18n} from "../../../i18n";
import type {DatabaseDriver} from "../../../types/connection";
import {getExplorerGroupLabelKey} from "../lib/driverPresentation";
import {useContextMenu} from "../../../hooks/useContextMenu";
import {type WorkspaceContextAction, WorkspaceContextMenu} from "../../../components/workspace/WorkspaceContextMenu";

const INITIAL_TABLE_RENDER_BATCH = 60;
const TABLE_RENDER_BATCH_STEP = 80;

type IdleDeadlineLike = {
    didTimeout: boolean;
    timeRemaining: () => number;
}

type IdleWindow = Window & {
    requestIdleCallback?: (
        callback: (deadline: IdleDeadlineLike) => void,
        options?: { timeout: number }
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
}

interface ExplorerTableMenuPayload {
    connectionId: number;
    schema: string;
    table: ExplorerTableDto;
    details?: ExplorerTableDetailsDto;
}

interface Props {
    driver: DatabaseDriver;
    connectionId: number;
    schema: string;
    filter: string;
    isExpanded: boolean;
    tables: ExplorerTableDto[];
    loadingTables: boolean;
    expandedTableKeySet: Set<string>;
    detailsByTableKey: Record<string, ExplorerTableDetailsDto>;
    loadingDetailsFor: string | null;
    canExportDump: boolean;
    onToggleSchema: (schema: string) => void;
    onToggleTable: (schema: string, tableName: string) => void;
    onOpenTableContextMenu: (
        event: React.MouseEvent,
        payload: {
            connectionId: number;
            schema: string;
            table: ExplorerTableDto;
            details?: ExplorerTableDetailsDto;
        }
    ) => void;
    onOpenSelect: (schema: string, table: ExplorerTableDto) => void;
    onOpenCount: (schema: string, table: ExplorerTableDto) => void;
    onOpenMetadata: (schema: string, table: ExplorerTableDto, details?: ExplorerTableDetailsDto) => void;
    onCopyFullName: (schema: string, table: ExplorerTableDto) => void;
    onCopySelect: (schema: string, table: ExplorerTableDto) => void;
    onOpenErd: (schema: string) => void;
    onExportSchemaDump: (schema: string) => void;
    onExportTableDump: (schema: string, table: ExplorerTableDto) => void;
    onQuickExportTableSchema: (schema: string, table: ExplorerTableDto) => void;
    onQuickExportTableData: (schema: string, table: ExplorerTableDto) => void;
}

function scheduleExplorerBatch(callback: () => void): () => void {
    if (typeof window === 'undefined') {
        callback();
        return () => undefined;
    }

    const idleWindow = window as IdleWindow;
    let timeoutId: number | null = null;
    let idleId: number | null = null;
    let cancelled = false;

    const run = () => {
        if (!cancelled) {
            callback();
        }
    };

    if (typeof idleWindow.requestIdleCallback === 'function') {
        idleId = idleWindow.requestIdleCallback(() => run(), {timeout: 120});

        return () => {
            cancelled = true;

            if (idleId !== null && typeof idleWindow.cancelIdleCallback === 'function') {
                idleWindow.cancelIdleCallback(idleId);
            }
        };
    }

    timeoutId = window.setTimeout(run, 16);

    return () => {
        cancelled = true;

        if (timeoutId !== null) {
            window.clearTimeout(timeoutId);
        }
    };
}

export const ExplorerSchemaNode = React.memo(function ExplorerSchemaNode({
                                                                             driver,
                                                                             connectionId,
                                                                             schema,
                                                                             filter,
                                                                             isExpanded,
                                                                             tables,
                                                                             loadingTables,
                                                                             expandedTableKeySet,
                                                                             detailsByTableKey,
                                                                             loadingDetailsFor,
                                                                             canExportDump,
                                                                             onToggleSchema,
                                                                             onToggleTable,
                                                                             onOpenTableContextMenu,
                                                                             onOpenSelect,
                                                                             onOpenCount,
                                                                             onOpenMetadata,
                                                                             onCopyFullName,
                                                                             onCopySelect,
                                                                             onOpenErd,
                                                                             onExportSchemaDump,
                                                                             onExportTableDump,
                                                                             onQuickExportTableSchema,
                                                                             onQuickExportTableData,
                                                                         }: Props) {
    const {t} = useI18n();

    const {
        state: tableMenuState,
        anchorRef: tableMenuAnchorRef,
        anchorStyle: tableMenuAnchorStyle,
        openContextMenu: openTableMenu,
        closeContextMenu: closeTableMenu,
    } = useContextMenu<ExplorerTableMenuPayload>();

    const [renderedTableCount, setRenderedTableCount] = useState(INITIAL_TABLE_RENDER_BATCH);

    const visibleTables = useMemo(() => {
        if (!filter) {
            return tables;
        }

        return tables.filter((table) =>
            table.table_name.toLowerCase().includes(filter),
        );
    }, [filter, tables]);

    useEffect(() => {
        if (!isExpanded || loadingTables) {
            setRenderedTableCount(INITIAL_TABLE_RENDER_BATCH);
            return;
        }

        setRenderedTableCount(Math.min(visibleTables.length, INITIAL_TABLE_RENDER_BATCH));
    }, [isExpanded, loadingTables, schema, filter, visibleTables.length]);

    useEffect(() => {
        if (!isExpanded || loadingTables || renderedTableCount >= visibleTables.length) {
            return;
        }

        return scheduleExplorerBatch(() => {
            setRenderedTableCount((current) => {
                if (current >= visibleTables.length) {
                    return current;
                }

                return Math.min(visibleTables.length, current + TABLE_RENDER_BATCH_STEP);
            });
        });
    }, [isExpanded, loadingTables, renderedTableCount, visibleTables.length]);

    const renderedTables = useMemo(() => {
        if (!isExpanded) {
            return [];
        }

        return visibleTables.slice(0, renderedTableCount);
    }, [isExpanded, visibleTables, renderedTableCount]);

    const handleOpenTableMenu = useCallback((
        event: React.MouseEvent,
        payload: ExplorerTableMenuPayload,
    ) => {
        openTableMenu(event, payload);
        onOpenTableContextMenu(event, payload);
    }, [onOpenTableContextMenu, openTableMenu]);

    const tableMenuActions = useMemo<WorkspaceContextAction[]>(() => {
        const payload = tableMenuState.payload;

        if (!payload) {
            return [];
        }

        const {
            schema: payloadSchema,
            table,
            details,
        } = payload;

        return [
            {
                key: 'export-dump',
                text: t('explorer.exportTableDump'),
                onClick: () => onExportTableDump(payloadSchema, table),
            },
            {
                key: 'quick-export-schema',
                text: t('explorer.quickExportTableSchema'),
                disabled: !canExportDump,
                onClick: () => onQuickExportTableSchema(payloadSchema, table),
            },
            {
                key: 'quick-export-data',
                text: t('explorer.quickExportTableData'),
                disabled: !canExportDump,
                onClick: () => onQuickExportTableData(payloadSchema, table),
            },
            {
                key: 'select-top',
                text: t('explorer.openPreview'),
                onClick: () => onOpenSelect(payloadSchema, table),
            },
            {
                key: 'count',
                text: t('explorer.countRows'),
                onClick: () => onOpenCount(payloadSchema, table),
            },
            {
                key: 'copy-select',
                text: t('explorer.copySelectToEditor'),
                onClick: () => onCopySelect(payloadSchema, table),
            },
            {
                key: 'metadata',
                text: t('explorer.openMetadata'),
                onClick: () => onOpenMetadata(payloadSchema, table, details),
            },
            {
                key: 'copy-full-name',
                text: t('explorer.copyFullName'),
                onClick: () => onCopyFullName(payloadSchema, table),
            },
        ];
    }, [
        canExportDump,
        onCopyFullName,
        onCopySelect,
        onExportTableDump,
        onOpenCount,
        onOpenMetadata,
        onOpenSelect,
        onQuickExportTableData,
        onQuickExportTableSchema,
        t,
        tableMenuState.payload,
    ]);

    return (
        <div className="explorer-schema-node">
            <div className="explorer-schema-node__row">
                <div
                    role="button"
                    tabIndex={0}
                    className="explorer-schema-node__toggle"
                    onClick={() => onToggleSchema(schema)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onToggleSchema(schema);
                        }
                    }}
                >
                    <span className="explorer-schema-node__left">
                        <span className="explorer-schema-node__chevron">
                            <Icon data={isExpanded ? ChevronDown : ChevronRight} size={14}/>
                        </span>

                        <span className="explorer-schema-node__icon">
                            <Icon data={Folder} size={14}/>
                        </span>

                        <Text variant="body-2">{schema}</Text>
                        <Label theme="info">{t(getExplorerGroupLabelKey(driver))}</Label>
                    </span>

                    <span className="explorer-schema-node__toggle-right">
                        <Label theme="unknown">{tables.length}</Label>
                    </span>
                </div>

                <div className="explorer-schema-node__actions">
                    <DropdownMenu
                        items={[
                            {
                                text: 'ERD',
                                action: () => onOpenErd(schema),
                            },
                            {
                                text: t('explorer.exportSchemaDump'),
                                action: () => onExportSchemaDump(schema),
                                disabled: !canExportDump,
                            },
                        ]}
                        renderSwitcher={({onClick, onKeyDown}) => (
                            <Button
                                size="s"
                                view="flat-secondary"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onClick?.(event);
                                }}
                                onKeyDown={onKeyDown}
                            >
                                <Icon data={Ellipsis} size={16}/>
                            </Button>
                        )}
                    />
                </div>
            </div>

            {isExpanded ? (
                <div className="explorer-schema-node__tables">
                    {loadingTables ? (
                        <div className="explorer-schema-node__loading">
                            <Loader size="s"/>
                            <Text variant="body-2" color="secondary">
                                {t('explorer.loadingTables')}
                            </Text>
                        </div>
                    ) : visibleTables.length > 0 ? (
                        renderedTables.map((table) => {
                            const tableKey = `${connectionId}:${schema}:${table.table_name}`;

                            return (
                                <ExplorerTableNode
                                    key={tableKey}
                                    connectionId={connectionId}
                                    schema={schema}
                                    table={table}
                                    isExpanded={expandedTableKeySet.has(tableKey)}
                                    details={detailsByTableKey[tableKey]}
                                    isLoadingDetails={loadingDetailsFor === tableKey}
                                    canExportDump={canExportDump}
                                    onToggle={onToggleTable}
                                    onOpenContextMenu={handleOpenTableMenu}
                                    onOpenActionsMenu={handleOpenTableMenu}
                                />
                            );
                        })
                    ) : (
                        <div className="explorer-schema-node__empty">
                            <Text variant="caption-2" color="secondary">
                                {t('explorer.noTablesInSchema')}
                            </Text>
                        </div>
                    )}
                </div>
            ) : null}

            <div ref={tableMenuAnchorRef} style={tableMenuAnchorStyle}/>

            <WorkspaceContextMenu
                open={tableMenuState.open}
                anchorElement={tableMenuAnchorRef.current}
                actions={tableMenuActions}
                onClose={closeTableMenu}
            />
        </div>
    );
});
