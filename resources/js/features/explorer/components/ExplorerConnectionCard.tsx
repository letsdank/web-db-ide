import type {ConnectionDto} from "../../../types/connection";
import type {ExplorerTableDetailsDto, ExplorerTableDto} from "../../../types/explorer";
import React, {useCallback, useMemo} from "react";
import {Button, DropdownMenu, Icon, Label, Loader, Text} from "@gravity-ui/uikit";
import {ChevronDown, ChevronRight, Ellipsis} from "@gravity-ui/icons";
import {useI18n} from "../../../i18n";
import {getResourceMarker, getResourceMarkerLabelKey, isOwnedResource} from "../../../lib/resourceMarkers";
import {DriverIcon} from "../../../components/common/DriverIcon";
import {supportsDumpExport} from "../../../lib/databaseDrivers";
import {
    getExplorerEmptyFilteredGroupLabelKey,
    getExplorerEmptyGroupLabelKey,
    getExplorerGroupCollectionLabelKey,
    getExplorerLoadingGroupLabelKey
} from "../lib/driverPresentation";
import {ExplorerObjectTree} from "./ExplorerObjectTree";

interface Props {
    connection: ConnectionDto;
    isActive: boolean;
    isExpanded: boolean;
    schemas: string[];
    loadingSchemas: boolean;
    expandedSchemaKeys: string[];
    expandedTableKeySet: Set<string>;
    tablesBySchemaKey: Record<string, ExplorerTableDto[]>;
    detailsByTableKey: Record<string, ExplorerTableDetailsDto>;
    loadingTablesFor: string | null;
    loadingDetailsFor: string | null;
    filter: string;
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
    onOpenSchemaErd: (connectionId: number, schema: string) => void;
    onExportConnectionDump: (connection: ConnectionDto) => void;
    onExportSchemaDump: (connectionId: number, schema: string) => void;
    onExportTableDump: (connectionId: number, schema: string, table: ExplorerTableDto) => void;
    onQuickExportTableSchema: (connectionId: number, schema: string, table: ExplorerTableDto) => void;
    onQuickExportTableData: (connectionId: number, schema: string, table: ExplorerTableDto) => void;
}

export const ExplorerConnectionCard = React.memo(function ExplorerConnectionCard({
                                                                                     connection,
                                                                                     isActive,
                                                                                     isExpanded,
                                                                                     schemas,
                                                                                     loadingSchemas,
                                                                                     expandedSchemaKeys,
                                                                                     expandedTableKeySet,
                                                                                     tablesBySchemaKey,
                                                                                     detailsByTableKey,
                                                                                     loadingTablesFor,
                                                                                     loadingDetailsFor,
                                                                                     filter,
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
                                                                                     onOpenSchemaErd,
                                                                                     onExportConnectionDump,
                                                                                     onExportSchemaDump,
                                                                                     onExportTableDump,
                                                                                     onQuickExportTableSchema,
                                                                                     onQuickExportTableData,
                                                                                 }: Props) {
    const {t} = useI18n();

    const id = connection.id;

    const handleToggleConnection = useCallback(() => onToggleConnection(id), [onToggleConnection, id]);
    const handleEditConnection = useCallback(() => onEditConnection(connection), [onEditConnection, connection]);
    const handleDeleteConnection = useCallback(() => onDeleteConnection(connection), [onDeleteConnection, connection]);
    const handleToggleSchema = useCallback((schema: string) => onToggleSchema(id, schema), [onToggleSchema, id]);
    const handleToggleTable = useCallback((schema: string, tableName: string) => onToggleTable(id, schema, tableName), [onToggleTable, id]);
    const handleOpenSelect = useCallback((schema: string, table: ExplorerTableDto) => onOpenSelect(id, schema, table), [onOpenSelect, id]);
    const handleOpenCount = useCallback((schema: string, table: ExplorerTableDto) => onOpenCount(id, schema, table), [onOpenCount, id]);
    const handleOpenMetadata = useCallback((schema: string, table: ExplorerTableDto, details?: ExplorerTableDetailsDto) => onOpenMetadata(id, schema, table, details), [onOpenMetadata, id]);
    const handleCopyFullName = useCallback((schema: string, table: ExplorerTableDto) => onCopyFullName(id, schema, table), [onCopyFullName, id]);
    const handleCopySelect = useCallback((schema: string, table: ExplorerTableDto) => onCopySelect(id, schema, table), [onCopySelect, id]);
    const handleOpenSchemaErd = useCallback((schema: string) => onOpenSchemaErd(id, schema), [onOpenSchemaErd, id]);
    const handleExportConnectionDump = useCallback(() => onExportConnectionDump(connection), [onExportConnectionDump, connection]);
    const handleExportSchemaDump = useCallback((schema: string) => onExportSchemaDump(id, schema), [onExportSchemaDump, id]);
    const handleExportTableDump = useCallback((schema: string, table: ExplorerTableDto) => onExportTableDump(id, schema, table), [onExportTableDump, id]);
    const handleQuickExportTableSchema = useCallback((schema: string, table: ExplorerTableDto) => onQuickExportTableSchema(id, schema, table), [onQuickExportTableSchema, id]);
    const handleQuickExportTableData = useCallback((schema: string, table: ExplorerTableDto) => onQuickExportTableData(id, schema, table), [onQuickExportTableData, id]);

    const marker = getResourceMarker(connection);
    const markerLabelKey = getResourceMarkerLabelKey(connection);
    const canManageConnection = isOwnedResource(connection);
    const canExportDump = supportsDumpExport(connection.driver);

    const visibleSchemas = useMemo(() => {
        if (!filter) {
            return schemas;
        }

        return schemas.filter((schema) => {
            const schemaKey = `${connection.id}:${schema}`;
            const schemaMatches = schema.toLowerCase().includes(filter);
            const tableMatches = (tablesBySchemaKey[schemaKey] ?? []).some((table) =>
                table.table_name.toLowerCase().includes(filter)
            );

            return schemaMatches || tableMatches;
        });
    }, [connection.id, filter, schemas, tablesBySchemaKey])

    const connectionDetailsByTableKey = useMemo(() => {
        const prefix = `${id}:`;
        const result: Record<string, ExplorerTableDetailsDto> = {};
        for (const key of Object.keys(detailsByTableKey)) {
            if (key.startsWith(prefix)) {
                result[key] = detailsByTableKey[key];
            }
        }
        return result;
    }, [detailsByTableKey, id]);

    const connectionClasses = [
        "explorer-connection-card",
        isActive ? "explorer-connection-card--active" : "",
        isExpanded ? "explorer-connection-card--expanded" : "",
    ].filter(Boolean).join(" ");

    const collectionLabel = t(getExplorerGroupCollectionLabelKey(connection.driver));
    const loadingLabel = t(getExplorerLoadingGroupLabelKey(connection.driver));
    const emptyLabel = filter
        ? t(getExplorerEmptyFilteredGroupLabelKey(connection.driver))
        : t(getExplorerEmptyGroupLabelKey(connection.driver));

    return (
        <div className={connectionClasses}>
            <div className="explorer-connection-card__row">
                <div
                    role="button"
                    tabIndex={0}
                    onClick={handleToggleConnection}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleToggleConnection();
                        }
                    }}
                    className="explorer-connection-card__toggle"
                >
                    <span className="explorer-connection-card__chevron">
                        <Icon data={isExpanded ? ChevronDown : ChevronRight} size={16}/>
                    </span>

                    <span className="explorer-connection-card__header-icon">
                        <DriverIcon driver={connection.driver} size={16}/>
                    </span>

                    <span className="explorer-connection-card__content">
                        <span className="explorer-connection-card__title-row">
                            <Text variant="subheader-2">{connection.name}</Text>

                            <span className="explorer-connection-card__badges">
                                <Label theme={marker.theme}>{t(markerLabelKey)}</Label>
                                <Label theme="info">{t(`connections.driver.${connection.driver}`)}</Label>

                                {connection.use_ssh_tunnel ? (
                                    <Label theme="info">{t('connections.ssh')}</Label>
                                ) : null}

                                {connection.is_read_only ? (
                                    <Label theme="warning">{t('connections.readOnly')}</Label>
                                ) : null}
                            </span>
                        </span>

                        <span className="explorer-connection-card__subtitle">
                            <Text variant="body-1" color="secondary">
                                {connection.database_name} · {connection.host}:{connection.port}
                            </Text>
                        </span>
                    </span>
                </div>

                <div className="explorer-connection-card__actions">
                    <DropdownMenu
                        items={[
                            {
                                text: t('explorer.exportDatabaseDump'),
                                action: handleExportConnectionDump,
                            },
                            ...(canManageConnection ? [
                                {
                                    text: t('connections.editConnection'),
                                    action: handleEditConnection,
                                },
                                {
                                    text: t('connections.deleteConnection'),
                                    action: handleDeleteConnection,
                                    theme: 'danger' as const,
                                },
                            ] : []),
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
                <div className="explorer-connection-card__tree">
                    <div className="explorer-connection-card__section-caption">
                        <Text variant="caption-2" color="secondary">
                            {collectionLabel}
                        </Text>
                    </div>

                    {loadingSchemas ? (
                        <div className="explorer-connection-card__loading">
                            <Loader size="m"/>
                            <Text variant="body-2" color="secondary">
                                {loadingLabel}
                            </Text>
                        </div>
                    ) : visibleSchemas.length > 0 ? (
                        <ExplorerObjectTree
                            driver={connection.driver}
                            connectionId={connection.id}
                            schemas={visibleSchemas}
                            filter={filter}
                            expandedSchemaKeys={expandedSchemaKeys}
                            expandedTableKeySet={expandedTableKeySet}
                            tablesBySchemaKey={tablesBySchemaKey}
                            detailsByTableKey={connectionDetailsByTableKey}
                            loadingTablesFor={loadingTablesFor}
                            loadingDetailsFor={loadingDetailsFor}
                            canExportDump={canExportDump}
                            onToggleSchema={handleToggleSchema}
                            onToggleTable={handleToggleTable}
                            onOpenTableContextMenu={onOpenTableContextMenu}
                            onOpenSelect={handleOpenSelect}
                            onOpenCount={handleOpenCount}
                            onOpenMetadata={handleOpenMetadata}
                            onCopyFullName={handleCopyFullName}
                            onCopySelect={handleCopySelect}
                            onOpenErd={handleOpenSchemaErd}
                            onExportSchemaDump={handleExportSchemaDump}
                            onExportTableDump={handleExportTableDump}
                            onQuickExportTableSchema={handleQuickExportTableSchema}
                            onQuickExportTableData={handleQuickExportTableData}
                        />
                    ) : (
                        <div className="explorer-connection-card__empty">
                            <Text variant="body-2" color="secondary">
                                {emptyLabel}
                            </Text>
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
});
