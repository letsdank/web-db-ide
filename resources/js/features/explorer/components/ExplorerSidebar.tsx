import type {ConnectionDto} from "../../../types/connection";
import type {ExplorerTableDetailsDto, ExplorerTableDto} from "../../../types/explorer";
import {Button, Card, Icon, SegmentedRadioGroup, Text, TextInput} from "@gravity-ui/uikit";
import {ExplorerConnectionCard} from "./ExplorerConnectionCard";
import React, {useMemo, useState} from "react";
import {CirclePlus, Magnifier} from "@gravity-ui/icons";
import {useI18n} from "../../../i18n";
import type {ResourceVisibilityFilter} from "../../../types/resourceFilter";
import {matchesVisibilityFilter} from "../../../lib/resourceMarkers";
import {EXPLORER_I18N_KEYS} from "../lib/i18nKeys";

interface Props {
    connections: ConnectionDto[];
    activeConnectionId: number | null;
    loadingSchemasByConnectionId: Record<number, boolean>;
    schemasByConnectionId: Record<number, string[]>;
    expandedConnectionIds: number[];
    expandedSchemaKeys: string[];
    expandedTableKeys: string[];
    tablesBySchemaKey: Record<string, ExplorerTableDto[]>;
    detailsByTableKey: Record<string, ExplorerTableDetailsDto>;
    loadingTablesFor: string | null;
    loadingDetailsFor: string | null;
    hiddenActiveConnectionByFilter: boolean;
    onCreateConnection: () => void;
    onToggleConnection: (connectionId: number) => void;
    onEditConnection: (connection: ConnectionDto) => void;
    onDeleteConnection: (connection: ConnectionDto) => void;
    onToggleSchema: (connectionId: number, schema: string) => void;
    onToggleTable: (connectionId: number, schema: string, tableName: string) => void;
    onOpenTableContextMenu: (
        event: React.MouseEvent,
        payload: {
            connectionId: number;
            schema: string;
            table: ExplorerTableDto;
            details?: ExplorerTableDetailsDto;
        }
    ) => void;
    onOpenSelect: (connectionId: number, schema: string, table: ExplorerTableDto) => void;
    onOpenCount: (connectionId: number, schema: string, table: ExplorerTableDto) => void;
    onOpenMetadata: (
        connectionId: number,
        schema: string,
        table: ExplorerTableDto,
        details?: ExplorerTableDetailsDto
    ) => void;
    onCopyFullName: (connectionId: number, schema: string, table: ExplorerTableDto) => void;
    onCopySelect: (connectionId: number, schema: string, table: ExplorerTableDto) => void;
    onExportConnectionDump: (connection: ConnectionDto) => void;
    onExportSchemaDump: (connectionId: number, schema: string) => void;
    onExportTableDump: (connectionId: number, schema: string, table: ExplorerTableDto) => void;
    onQuickExportTableSchema: (connectionId: number, schema: string, table: ExplorerTableDto) => void;
    onQuickExportTableData: (connectionId: number, schema: string, table: ExplorerTableDto) => void;
}

export function ExplorerSidebar({
                                    connections,
                                    activeConnectionId,
                                    loadingSchemasByConnectionId,
                                    schemasByConnectionId,
                                    expandedConnectionIds,
                                    expandedSchemaKeys,
                                    expandedTableKeys,
                                    tablesBySchemaKey,
                                    detailsByTableKey,
                                    loadingTablesFor,
                                    loadingDetailsFor,
                                    hiddenActiveConnectionByFilter,
                                    onCreateConnection,
                                    onToggleConnection,
                                    onEditConnection,
                                    onDeleteConnection,
                                    onToggleSchema,
                                    onToggleTable,
                                    onOpenTableContextMenu,
                                    onOpenSelect,
                                    onOpenCount,
                                    onOpenMetadata,
                                    onCopyFullName,
                                    onCopySelect,
                                    onExportConnectionDump,
                                    onExportSchemaDump,
                                    onExportTableDump,
                                    onQuickExportTableSchema,
                                    onQuickExportTableData,
                                }: Props) {
    const {t} = useI18n();
    const [filter, setFilter] = useState('');
    const [visibilityFilter, setVisibilityFilter] = useState<ResourceVisibilityFilter>('all');

    const safeExpandedConnectionIds = expandedConnectionIds ?? [];
    const safeExpandedSchemaKeys = expandedSchemaKeys ?? [];
    const safeExpandedTableKeys = expandedTableKeys ?? [];

    const safeLoadingSchemasByConnectionId = loadingSchemasByConnectionId ?? {};
    const safeSchemasByConnectionId = schemasByConnectionId ?? {};
    const safeTablesBySchemaKey = tablesBySchemaKey ?? {};
    const safeDetailsByTableKey = detailsByTableKey ?? {};

    const visibleConnections = useMemo(() => {
        const normalizedFilter = filter.trim().toLowerCase();

        return connections.filter((connection) => {
            const matchesSearch = !normalizedFilter || [
                connection.name,
                connection.database_name,
                connection.host,
                connection.driver,
                connection.username,
            ]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(normalizedFilter));

            const matchesVisibility = matchesVisibilityFilter(connection, visibilityFilter);

            return matchesSearch && matchesVisibility;
        });
    }, [connections, filter, visibilityFilter]);

    return (
        <Card view="filled" className="explorer-sidebar__card">
            <div className="explorer-sidebar__layout">
                <div className="explorer-sidebar__hero">
                    <div className="explorer-sidebar__hero-top">
                        <div className="explorer-sidebar__hero-copy">
                            <Text variant="header-1">{t(EXPLORER_I18N_KEYS.title)}</Text>
                        </div>

                        <Button view="action" size="m" onClick={onCreateConnection}>
                            <Icon data={CirclePlus} size={16}/>
                            {t(EXPLORER_I18N_KEYS.new)}
                        </Button>
                    </div>

                    <div className="explorer-sidebar__hero-subtitle">
                        <Text variant="body-2" color="secondary">
                            {t(EXPLORER_I18N_KEYS.subtitle)}
                        </Text>
                    </div>
                </div>

                <div className="explorer-sidebar__toolbar">
                    <TextInput
                        value={filter}
                        placeholder={t(EXPLORER_I18N_KEYS.filterConnections)}
                        onUpdate={setFilter}
                        startContent={<Icon data={Magnifier} size={16}/>}
                        size="m"
                    />

                    <SegmentedRadioGroup
                        size="m"
                        value={visibilityFilter}
                        options={[
                            {value: 'all', content: t('workspace.allResources')},
                            {value: 'owned', content: t('workspace.ownedResources')},
                            {value: 'shared', content: t('workspace.sharedResources')},
                        ]}
                        onUpdate={(value) => setVisibilityFilter(value as ResourceVisibilityFilter)}
                    />
                </div>

                {hiddenActiveConnectionByFilter ? (
                    <div className="explorer-sidebar__hint">
                        <Text variant="caption-2" color="warning">
                            {t(EXPLORER_I18N_KEYS.hiddenActiveConnectionHint)}
                        </Text>
                    </div>
                ) : null}

                <div className="explorer-sidebar__summary">
                    <Text variant="caption-2" color="secondary">
                        {visibleConnections.length} / {connections.length}
                    </Text>
                </div>

                <div className="explorer-sidebar__content">
                    <div className="explorer-sidebar__list">
                        {visibleConnections.length > 0 ? (
                            visibleConnections.map((connection) => (
                                <ExplorerConnectionCard
                                    key={connection.id}
                                    connection={connection}
                                    isActive={connection.id === activeConnectionId}
                                    isExpanded={safeExpandedConnectionIds.includes(connection.id)}
                                    schemas={safeSchemasByConnectionId[connection.id] ?? []}
                                    loadingSchemas={Boolean(safeLoadingSchemasByConnectionId[connection.id])}
                                    expandedSchemaKeys={safeExpandedSchemaKeys}
                                    expandedTableKeys={safeExpandedTableKeys}
                                    tablesBySchemaKey={safeTablesBySchemaKey}
                                    detailsByTableKey={safeDetailsByTableKey}
                                    loadingTablesFor={loadingTablesFor}
                                    loadingDetailsFor={loadingDetailsFor}
                                    filter={filter.trim().toLowerCase()}
                                    onToggleConnection={() => onToggleConnection(connection.id)}
                                    onEditConnection={() => onEditConnection(connection)}
                                    onDeleteConnection={() => onDeleteConnection(connection)}
                                    onToggleSchema={(schema) => onToggleSchema(connection.id, schema)}
                                    onToggleTable={(schema, tableName) => onToggleTable(connection.id, schema, tableName)}
                                    onOpenTableContextMenu={onOpenTableContextMenu}
                                    onOpenSelect={(schema, table) => onOpenSelect(connection.id, schema, table)}
                                    onOpenCount={(schema, table) => onOpenCount(connection.id, schema, table)}
                                    onOpenMetadata={(schema, table, details) => onOpenMetadata(connection.id, schema, table, details)}
                                    onCopyFullName={(schema, table) => onCopyFullName(connection.id, schema, table)}
                                    onCopySelect={(schema, table) => onCopySelect(connection.id, schema, table)}
                                    onExportConnectionDump={() => onExportConnectionDump(connection)}
                                    onExportSchemaDump={(schema) => onExportSchemaDump(connection.id, schema)}
                                    onExportTableDump={(schema, table) => onExportTableDump(connection.id, schema, table)}
                                    onQuickExportTableSchema={(schema, table) => onQuickExportTableSchema(connection.id, schema, table)}
                                    onQuickExportTableData={(schema, table) => onQuickExportTableData(connection.id, schema, table)}
                                />
                            ))
                        ) : (
                            <div className="explorer-sidebar__empty">
                                <Text variant="body-2" color="secondary">
                                    {filter.trim()
                                        ? t(EXPLORER_I18N_KEYS.noFilterMatches)
                                        : t(EXPLORER_I18N_KEYS.noConnections)}
                                </Text>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}
