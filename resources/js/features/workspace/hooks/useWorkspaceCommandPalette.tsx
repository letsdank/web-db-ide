import type {QueryTabDto} from "../../../types/queryTab";
import type {ConnectionDto} from "../../../types/connection";
import type {SavedQueryDto} from "../../../types/savedQuery";
import {useMemo} from "react";
import type {CommandPaletteItem} from "../../../types/commandPalette";
import {Icon} from "@gravity-ui/uikit";
import {CirclePlus, ClockArrowRotateLeft, Database, FileText, LayoutCells, Magnifier} from "@gravity-ui/icons";
import {useI18n} from "../../../i18n";
import {getResourceMarker, getResourceMarkerLabelKey} from "../../../lib/resourceMarkers";
import {DriverIcon} from "../../../components/common/DriverIcon";

/**
 * Store state and actins required to assemble the command palette model.
 *
 * The hook does not render the palette. It only converts current workspace
 * state into a flat list of palette items with `onSelect` handlers.
 */
interface Params {
    activeConnectionId: number | null;
    activeTab: QueryTabDto | null;
    connections: ConnectionDto[];
    tabs: QueryTabDto[];
    savedQueries: SavedQueryDto[];
    hasSelection: boolean;

    openCreateConnectionDialog: () => void;
    setRightPanel: (panel: 'history' | 'saved') => void;

    handleCreateTab: () => Promise<void> | void;
    handleRun: (target?: 'auto' | 'selection' | 'full') => Promise<void> | void;
    handleSelectTab: (tabId: number) => Promise<void> | void;
    handleSelectConnection: (connectionId: number | null) => Promise<void> | void;
    handleOpenSavedQuery: (item: SavedQueryDto) => Promise<void> | void;
    handleDuplicateTab: (tab: QueryTabDto) => Promise<void> | void;
    handleCloseTab: (tabId: number) => Promise<void> | void;
    handleTogglePin: (tab: QueryTabDto) => Promise<void> | void;
}

/**
 * Builds the flat item list consumed by the command palette UI.
 *
 * The resulting list intentionally mixes several resource kinds:
 * - generic actions
 * - open tabs
 * - connections
 * - saved queries
 *
 * Filtering, keyboard navigation and grouping are handled downstream by the
 * palette components. This hook only describes what can be selected right now.
 */
export function useWorkspaceCommandPalette({
                                               activeConnectionId,
                                               activeTab,
                                               connections,
                                               tabs,
                                               savedQueries,
                                               hasSelection,
                                               openCreateConnectionDialog,
                                               setRightPanel,
                                               handleCreateTab,
                                               handleRun,
                                               handleSelectTab,
                                               handleSelectConnection,
                                               handleOpenSavedQuery,
                                               handleDuplicateTab,
                                               handleCloseTab,
                                               handleTogglePin,
                                           }: Params) {
    const {t} = useI18n();

    return useMemo<CommandPaletteItem[]>(() => {
        const activeConnection = activeConnectionId
            ? connections.find((connection) => connection.id === activeConnectionId)
            : null;

        /**
         * Global workspace actions always available from the palette.
         */
        const actionItems: CommandPaletteItem[] = [
            {
                id: 'action:new-tab',
                title: t('workspace.newQueryTab'),
                subtitle: t('workspace.createEmptySqlTab'),
                kind: 'action',
                icon: <Icon data={CirclePlus} size={18}/>,
                keywords: ['new tab create query sql'],
                onSelect: () => handleCreateTab(),
            },
            {
                id: 'action:new-connection',
                title: t('workspace.newConnection'),
                subtitle: t('workspace.openConnectionCreationDialog'),
                kind: 'action',
                icon: <Icon data={Database} size={18}/>,
                keywords: ['connection database create add'],
                onSelect: () => openCreateConnectionDialog(),
            },
            {
                id: 'action:run-query',
                title: t('workspace.runFullQuery'),
                subtitle: activeTab?.title ?? t('workspace.activeTab'),
                kind: 'action',
                icon: <Icon data={Magnifier} size={18}/>,
                keywords: ['run execute query sql current active full all'],
                onSelect: () => handleRun('full'),
            },
            {
                id: 'action:run-selection',
                title: t('workspace.runSelection'),
                subtitle: hasSelection
                    ? t('workspace.selectedSqlFragment')
                    : t('workspace.noSqlSelected'),
                kind: 'action',
                icon: <Icon data={Magnifier} size={18}/>,
                keywords: ['run execute selection highlighted sql fragment'],
                onSelect: () => handleRun('selection'),
            },
            {
                id: 'action:show-history',
                title: t('workspace.openHistoryPanel'),
                subtitle: t('workspace.switchRightSidebarToHistory'),
                kind: 'action',
                icon: <Icon data={ClockArrowRotateLeft} size={18}/>,
                keywords: ['history sidebar panel'],
                onSelect: () => setRightPanel('history'),
            },
            {
                id: 'action:show-saved',
                title: t('workspace.openSavedQueriesPanel'),
                subtitle: t('workspace.switchRightSidebarToSaved'),
                kind: 'action',
                icon: <Icon data={LayoutCells} size={18}/>,
                keywords: ['saved queries sidebar panel'],
                onSelect: () => setRightPanel('saved'),
            },
        ];

        /**
         * Active-tab-specific actions appear only when a tab exists.
         */
        if (activeTab) {
            actionItems.push(
                {
                    id: 'action:duplicate-active-tab',
                    title: t('workspace.duplicateActiveTab'),
                    subtitle: activeTab.title || t('workspace.currentTab'),
                    kind: 'action',
                    icon: <Icon data={FileText} size={18}/>,
                    keywords: ['duplicate tab copy current'],
                    onSelect: () => handleDuplicateTab(activeTab),
                },
                {
                    id: 'action:toggle-pin-active-tab',
                    title: activeTab.is_pinned
                        ? t('workspace.unpinActiveTab')
                        : t('workspace.pinActiveTab'),
                    subtitle: activeTab.title || t('workspace.currentTab'),
                    kind: 'action',
                    icon: <Icon data={FileText} size={18}/>,
                    keywords: ['pin unpin tab current'],
                    onSelect: () => handleTogglePin(activeTab),
                },
            );

            if (!activeTab.is_pinned) {
                actionItems.push({
                    id: 'action:close-active-tab',
                    title: t('workspace.closeActiveTab'),
                    subtitle: activeTab.title || t('workspace.currentTab'),
                    kind: 'action',
                    icon: <Icon data={FileText} size={18}/>,
                    keywords: ['close tab current'],
                    onSelect: () => handleCloseTab(activeTab.id),
                });
            }
        }

        /**
         * The current connection is also exposed as an action so the palette can
         * act like a quick workspace switcher.
         */
        if (activeConnection) {
            const activeMarker = getResourceMarker(activeConnection);
            const activeMarkerLabelKey = getResourceMarkerLabelKey(activeConnection);

            actionItems.push({
                id: 'action:select-active-connection',
                title: t('workspace.currentConnection'),
                subtitle: `${t(activeMarkerLabelKey)} · ${activeConnection.name} · ${activeConnection.database_name}`,
                kind: 'action',
                icon: <DriverIcon driver={activeConnection.driver} size={18}/>,
                keywords: [
                    'current connection active database',
                    activeMarker.kind,
                    activeConnection.access_scope ?? '',
                ],
                onSelect: () => handleSelectConnection(activeConnection.id),
            });
        }

        /**
         * Open tabs become palette resources for fast tab navigation.
         */
        const tabItems: CommandPaletteItem[] = tabs.map((tab) => ({
            id: `tab:${tab.id}`,
            title: tab.title || t('workspace.newQuery'),
            subtitle: tab.db_connection_id
                ? connections.find((connection) => connection.id === tab.db_connection_id)?.name ?? 'Tab'
                : t('workspace.unboundTab'),
            kind: 'tab',
            icon: <Icon data={FileText} size={18}/>,
            keywords: [
                'tab query editor',
                tab.sql_text ?? '',
                tab.is_pinned ? 'pinned' : '',
            ],
            onSelect: () => handleSelectTab(tab.id),
        }));

        /**
         * Connections become selectable palette resources for fast rebinding of
         * the active workspace context.
         */
        const connectionItems: CommandPaletteItem[] = connections.map((connection) => {
            const marker = getResourceMarker(connection);
            const markerLabelKey = getResourceMarkerLabelKey(connection);

            return {
                id: `connection:${connection.id}`,
                title: connection.name,
                subtitle: `${t(markerLabelKey)} · ${connection.database_name} · ${connection.host}:${connection.port}`,
                kind: 'connection' as const,
                icon: <DriverIcon driver={connection.driver} size={18}/>,
                keywords: [
                    connection.driver,
                    connection.database_name,
                    connection.host,
                    connection.username,
                    marker.kind,
                    connection.access_scope ?? '',
                ],
                onSelect: () => handleSelectConnection(connection.id),
            }
        });

        /**
         * Saved queries are exposed as immutable library entries that open into
         * fresh working tabs when selected.
         */
        const savedQueryItems: CommandPaletteItem[] = savedQueries.map((item) => {
            const marker = getResourceMarker(item);
            const markerLabelKey = getResourceMarkerLabelKey(item);
            const baseSubtitle = item.connection
                ? `${item.connection.name} · ${item.connection.database_name}`
                : item.folder || t('workspace.savedQuery');

            return {
                id: `saved-query:${item.id}`,
                title: item.title,
                subtitle: `${t(markerLabelKey)} · ${baseSubtitle}`,
                kind: 'saved-query' as const,
                icon: <Icon data={FileText} size={18}/>,
                keywords: [
                    item.sql_text,
                    item.folder ?? '',
                    item.description ?? '',
                    marker.kind,
                    item.access_scope ?? '',
                ],
                onSelect: () => handleOpenSavedQuery(item),
            };
        });

        return [
            ...actionItems,
            ...tabItems,
            ...connectionItems,
            ...savedQueryItems,
        ];
    }, [
        activeConnectionId,
        activeTab,
        connections,
        hasSelection,
        savedQueries,
        tabs,
        openCreateConnectionDialog,
        setRightPanel,
        handleCreateTab,
        handleRun,
        handleSelectTab,
        handleSelectConnection,
        handleOpenSavedQuery,
        handleDuplicateTab,
        handleCloseTab,
        handleTogglePin,
        t,
    ]);
}
