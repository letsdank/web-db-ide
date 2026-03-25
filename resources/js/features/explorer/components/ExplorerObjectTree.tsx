import {ExplorerColumnDto, ExplorerTableDetailsDto, ExplorerTableDto} from "../../../types/explorer";
import {DatabaseDriver} from "../../../types/connection";
import React, {useCallback, useMemo} from "react";
import {useI18n} from "../../../i18n";
import {unstable_ListItemView as ListItemView,} from "@gravity-ui/uikit/unstable";
import {getExplorerGroupLabelKey} from "../lib/driverPresentation";
import {ActionTooltip, Button, DropdownMenu, Icon, Label, Loader, Text} from "@gravity-ui/uikit";
import {
    ChevronDown,
    ChevronRight,
    Copy,
    Ellipsis,
    FileText,
    Folder,
    LayoutHeaderCellsLargeFill
} from "@gravity-ui/icons";

type ExplorerTreeNodeData =
    | {
    id: string;
    kind: 'schema';
    schema: string;
    expanded: boolean;
    tableCount: number;
}
    | {
    id: string;
    kind: 'table';
    schema: string;
    table: ExplorerTableDto;
    details?: ExplorerTableDetailsDto;
    expanded: boolean;
    isLoadingDetails: boolean;
    canExportDump: boolean;
}
    | {
    id: string;
    kind: 'column';
    schema: string;
    tableName: string;
    column: ExplorerColumnDto;
}
    | {
    id: string;
    kind: 'status';
    tone: 'loading' | 'empty';
    title: string;
    subtitle?: string;
};

interface Props {
    driver: DatabaseDriver;
    connectionId: number;
    schemas: string[];
    filter: string;
    expandedSchemaKeys: string[];
    expandedTableKeySet: Set<string>;
    tablesBySchemaKey: Record<string, ExplorerTableDto[]>;
    detailsByTableKey: Record<string, ExplorerTableDetailsDto>;
    loadingTablesFor: string | null;
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
    onOpenMetadata: (
        schema: string,
        table: ExplorerTableDto,
        details?: ExplorerTableDetailsDto
    ) => void;
    onCopyFullName: (schema: string, table: ExplorerTableDto) => void;
    onCopySelect: (schema: string, table: ExplorerTableDto) => void;
    onOpenErd: (schema: string) => void;
    onExportSchemaDump: (schema: string) => void;
    onExportTableDump: (schema: string, table: ExplorerTableDto) => void;
    onQuickExportTableSchema: (schema: string, table: ExplorerTableDto) => void;
    onQuickExportTableData: (schema: string, table: ExplorerTableDto) => void;
}

function stopEvent(event: React.SyntheticEvent) {
    event.preventDefault();
    event.stopPropagation();
}

function ExplorerTreeRow({
                             node,
                             depth,
                             driver,
                             t,
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
                             connectionId,
                         }: {
    node: ExplorerTreeNodeData;
    depth: number;
    driver: DatabaseDriver;
    connectionId: number;
    t: (key: string, params?: Record<string, unknown>) => string;
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
    onOpenMetadata: (
        schema: string,
        table: ExplorerTableDto,
        details?: ExplorerTableDetailsDto
    ) => void;
    onCopyFullName: (schema: string, table: ExplorerTableDto) => void;
    onCopySelect: (schema: string, table: ExplorerTableDto) => void;
    onOpenErd: (schema: string) => void;
    onExportSchemaDump: (schema: string) => void;
    onExportTableDump: (schema: string, table: ExplorerTableDto) => void;
    onQuickExportTableSchema: (schema: string, table: ExplorerTableDto) => void;
    onQuickExportTableData: (schema: string, table: ExplorerTableDto) => void;
}) {
    const paddingLeft = 8 + depth * 18;

    if (node.kind === 'schema') {
        return (
            <div className="explorer-object-tree__item explorer-object-tree__item--schema">
                <ListItemView
                    as="div"
                    id={node.id}
                    size="l"
                    style={{paddingLeft}}
                    onClick={() => onToggleSchema(node.schema)}
                    content={{
                        title: node.schema,
                        subtitle: t(getExplorerGroupLabelKey(driver)),
                        startSlot: (
                            <span className="explorer-object-tree__start-slot">
                                <Icon data={node.expanded ? ChevronDown : ChevronRight} size={14}/>
                                <Icon data={Folder} size={16}/>
                            </span>
                        ),
                        endSlot: (
                            <div className="explorer-object-tree__end-slot">
                                <Label theme="unknown">{node.tableCount}</Label>

                                <DropdownMenu
                                    items={[
                                        {
                                            text: 'ERD',
                                            action: () => onOpenErd(node.schema),
                                        },
                                        {
                                            text: t('explorer.exportSchemaDump'),
                                            action: () => onExportSchemaDump(node.schema),
                                        },
                                    ]}
                                    renderSwitcher={({onClick, onKeyDown}) => (
                                        <Button
                                            size="s"
                                            view="flat-secondary"
                                            onClick={(event) => {
                                                stopEvent(event);
                                                onClick?.(event);
                                            }}
                                            onKeyDown={onKeyDown}
                                        >
                                            <Icon data={Ellipsis} size={16}/>
                                        </Button>
                                    )}
                                />
                            </div>
                        ),
                    }}
                />
            </div>
        );
    }

    if (node.kind === 'table') {
        return (
            <div
                className="explorer-object-tree__item explorer-object-tree__item--table"
                onContextMenu={(event) =>
                    onOpenTableContextMenu(event, {
                        connectionId,
                        schema: node.schema,
                        table: node.table,
                        details: node.details,
                    })
                }
            >
                <ListItemView
                    as="div"
                    id={node.id}
                    size="l"
                    style={{paddingLeft}}
                    onClick={() => onToggleTable(node.schema, node.table.table_name)}
                    content={{
                        title: node.table.table_name,
                        subtitle: node.details
                            ? `${node.table.table_type} · ${t('explorer.columnsCount', {count: node.details.columns.length})}`
                            : node.table.table_type,
                        startSlot: (
                            <span className="explorer-object-tree__start-slot">
                                <Icon data={node.expanded ? ChevronDown : ChevronRight} size={14}/>
                                <Icon data={LayoutHeaderCellsLargeFill} size={16}/>
                            </span>
                        ),
                        endSlot: (
                            <div className="explorer-object-tree__end-slot">
                                {node.details ? (
                                    <Label theme="info">{node.details.columns.length}</Label>
                                ) : null}

                                <ActionTooltip title={t('explorer.copyTableName')}>
                                    <Button
                                        size="s"
                                        view="flat-secondary"
                                        onClick={(event) => {
                                            stopEvent(event);
                                            void navigator.clipboard.writeText(node.table.table_name);
                                        }}
                                    >
                                        <Icon data={Copy} size={16}/>
                                    </Button>
                                </ActionTooltip>

                                <DropdownMenu
                                    items={[
                                        {
                                            text: t('explorer.exportTableDump'),
                                            action: () => onExportTableDump(node.schema, node.table),
                                        },
                                        {
                                            text: t('explorer.quickExportTableSchema'),
                                            action: () => onQuickExportTableSchema(node.schema, node.table),
                                            disabled: !node.canExportDump,
                                        },
                                        {
                                            text: t('explorer.quickExportTableData'),
                                            action: () => onQuickExportTableData(node.schema, node.table),
                                            disabled: !node.canExportDump,
                                        },
                                        {
                                            text: t('explorer.openPreview'),
                                            action: () => onOpenSelect(node.schema, node.table),
                                        },
                                        {
                                            text: t('explorer.countRows'),
                                            action: () => onOpenCount(node.schema, node.table),
                                        },
                                        {
                                            text: t('explorer.copySelectToEditor'),
                                            action: () => onCopySelect(node.schema, node.table),
                                        },
                                        {
                                            text: t('explorer.openMetadata'),
                                            action: () => onOpenMetadata(node.schema, node.table, node.details),
                                        },
                                        {
                                            text: t('explorer.copyFullName'),
                                            action: () => onCopyFullName(node.schema, node.table),
                                        },
                                    ]}
                                    renderSwitcher={({onClick, onKeyDown}) => (
                                        <Button
                                            size="s"
                                            view="flat-secondary"
                                            onClick={(event) => {
                                                stopEvent(event);
                                                onClick?.(event);
                                            }}
                                            onKeyDown={onKeyDown}
                                        >
                                            <Icon data={Ellipsis} size={16}/>
                                        </Button>
                                    )}
                                />
                            </div>
                        ),
                    }}
                />
            </div>
        );
    }

    if (node.kind === 'column') {
        return (
            <div className="explorer-object-tree__item explorer-object-tree__item--column">
                <ListItemView
                    as="div"
                    id={node.id}
                    size="l"
                    style={{paddingLeft}}
                    content={{
                        title: node.column.column_name,
                        subtitle: node.column.data_type,
                        startSlot: (
                            <span className="explorer-object-tree__start-slot">
                                <span className="explorer-object-tree__spacer"/>
                                <Icon data={FileText} size={14}/>
                            </span>
                        ),
                        endSlot: node.column.is_nullable === 'NO'
                            ? <Label theme="warning">not null</Label>
                            : undefined,
                    }}
                />
            </div>
        );
    }

    return (
        <div className="explorer-object-tree__item explorer-object-tree__item--status">
            <ListItemView
                as="div"
                id={node.id}
                size="l"
                style={{paddingLeft}}
                content={{
                    title: (
                        <span className="explorer-object-tree__status-title">
                            {node.tone === 'loading' ? <Loader size="s"/> : null}
                            <Text variant="body-2" color="secondary">
                                {node.title}
                            </Text>
                        </span>
                    ),
                    subtitle: node.subtitle,
                    startSlot: (
                        <span className="explorer-object-tree__start-slot">
                            <span className="explorer-object-tree__spacer"/>
                        </span>
                    ),
                }}
            />
        </div>
    );
}

export const ExplorerObjectTree = React.memo(function ExplorerObjectTree({
                                                                             driver,
                                                                             connectionId,
                                                                             schemas,
                                                                             filter,
                                                                             expandedSchemaKeys,
                                                                             expandedTableKeySet,
                                                                             tablesBySchemaKey,
                                                                             detailsByTableKey,
                                                                             loadingTablesFor,
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

    const normalizedFilter = filter.trim().toLowerCase();

    const tree = useMemo(() => {
        return schemas.map((schema) => {
            const schemaKey = `${connectionId}:${schema}`;
            const schemaTables = tablesBySchemaKey[schemaKey] ?? [];
            const visibleTables = !normalizedFilter
                ? schemaTables
                : schemaTables.filter((table) =>
                    table.table_name.toLowerCase().includes(normalizedFilter),
                );

            const schemaNode: ExplorerTreeNodeData = {
                id: schemaKey,
                kind: 'schema',
                schema,
                expanded: expandedSchemaKeys.includes(schemaKey),
                tableCount: schemaTables.length,
            };

            const children: Array<{
                node: ExplorerTreeNodeData;
                children?: ExplorerTreeNodeData[];
            }> = [];

            if (schemaNode.expanded) {
                if (loadingTablesFor === schemaKey) {
                    children.push({
                        node: {
                            id: `${schemaKey}:status:loading`,
                            kind: 'status',
                            tone: 'loading',
                            title: t('explorer.loadingTables'),
                        },
                    });
                } else if (visibleTables.length > 0) {
                    visibleTables.forEach((table) => {
                        const tableKey = `${connectionId}:${schema}:${table.table_name}`;
                        const details = detailsByTableKey[tableKey];
                        const isLoadingDetails = loadingDetailsFor === tableKey;
                        const tableExpanded = expandedTableKeySet.has(tableKey);

                        const tableNode: ExplorerTreeNodeData = {
                            id: tableKey,
                            kind: 'table',
                            schema,
                            table,
                            details,
                            expanded: tableExpanded,
                            isLoadingDetails,
                            canExportDump,
                        };

                        const tableChildren: ExplorerTreeNodeData[] = [];

                        if (tableExpanded) {
                            if (details && details.columns.length > 0) {
                                details.columns.forEach((column) => {
                                    tableChildren.push({
                                        id: `${tableKey}:column:${column.column_name}`,
                                        kind: 'column',
                                        schema,
                                        tableName: table.table_name,
                                        column,
                                    });
                                });
                            } else {
                                tableChildren.push({
                                    id: `${tableKey}:status:${isLoadingDetails ? 'loading' : 'empty'}`,
                                    kind: 'status',
                                    tone: isLoadingDetails ? 'loading' : 'empty',
                                    title: isLoadingDetails
                                        ? t('explorer.loadingColumns')
                                        : t('explorer.noColumnsInTable'),
                                });
                            }
                        }

                        children.push({
                            node: tableNode,
                            children: tableChildren,
                        });
                    });
                } else {
                    children.push({
                        node: {
                            id: `${schemaKey}:status:empty`,
                            kind: 'status',
                            tone: 'empty',
                            title: t('explorer.noTablesInSchema'),
                        },
                    });
                }
            }

            return {
                node: schemaNode,
                children,
            };
        });
    }, [
        canExportDump,
        connectionId,
        detailsByTableKey,
        expandedSchemaKeys,
        expandedTableKeySet,
        loadingDetailsFor,
        loadingTablesFor,
        normalizedFilter,
        schemas,
        t,
        tablesBySchemaKey,
    ]);

    return (
        <div className="explorer-object-tree">
            {tree.map((schemaBranch)=>(
                <div key={schemaBranch.node.id} className="explorer-object-tree__branch">
                    <ExplorerTreeRow
                        node={schemaBranch.node}
                        depth={0}
                        driver={driver}
                        connectionId={connectionId}
                        t={t}
                        onToggleSchema={onToggleSchema}
                        onToggleTable={onToggleTable}
                        onOpenTableContextMenu={onOpenTableContextMenu}
                        onOpenSelect={onOpenSelect}
                        onOpenCount={onOpenCount}
                        onOpenMetadata={onOpenMetadata}
                        onCopyFullName={onCopyFullName}
                        onCopySelect={onCopySelect}
                        onOpenErd={onOpenErd}
                        onExportSchemaDump={onExportSchemaDump}
                        onExportTableDump={onExportTableDump}
                        onQuickExportTableSchema={onQuickExportTableSchema}
                        onQuickExportTableData={onQuickExportTableData}
                    />

                    {schemaBranch.children?.map((tableBranch)=>(
                        <React.Fragment key={tableBranch.node.id}>
                            <ExplorerTreeRow
                                node={tableBranch.node}
                                depth={1}
                                driver={driver}
                                connectionId={connectionId}
                                t={t}
                                onToggleSchema={onToggleSchema}
                                onToggleTable={onToggleTable}
                                onOpenTableContextMenu={onOpenTableContextMenu}
                                onOpenSelect={onOpenSelect}
                                onOpenCount={onOpenCount}
                                onOpenMetadata={onOpenMetadata}
                                onCopyFullName={onCopyFullName}
                                onCopySelect={onCopySelect}
                                onOpenErd={onOpenErd}
                                onExportSchemaDump={onExportSchemaDump}
                                onExportTableDump={onExportTableDump}
                                onQuickExportTableSchema={onQuickExportTableSchema}
                                onQuickExportTableData={onQuickExportTableData}
                            />

                            {tableBranch.children?.map((childNode) => (
                                <ExplorerTreeRow
                                    key={childNode.id}
                                    node={childNode}
                                    depth={2}
                                    driver={driver}
                                    connectionId={connectionId}
                                    t={t}
                                    onToggleSchema={onToggleSchema}
                                    onToggleTable={onToggleTable}
                                    onOpenTableContextMenu={onOpenTableContextMenu}
                                    onOpenSelect={onOpenSelect}
                                    onOpenCount={onOpenCount}
                                    onOpenMetadata={onOpenMetadata}
                                    onCopyFullName={onCopyFullName}
                                    onCopySelect={onCopySelect}
                                    onOpenErd={onOpenErd}
                                    onExportSchemaDump={onExportSchemaDump}
                                    onExportTableDump={onExportTableDump}
                                    onQuickExportTableSchema={onQuickExportTableSchema}
                                    onQuickExportTableData={onQuickExportTableData}
                                />
                            ))}
                        </React.Fragment>
                    ))}
                </div>
            ))}
        </div>
    );
});
