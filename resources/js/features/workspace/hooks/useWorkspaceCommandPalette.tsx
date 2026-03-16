import {QueryTabDto} from "../../../types/queryTab";
import {ConnectionDto} from "../../../types/connection";
import {SavedQueryDto} from "../../../types/savedQuery";
import {useMemo} from "react";
import {CommandPaletteItem} from "../../../types/commandPalette";
import {Icon} from "@gravity-ui/uikit";
import {CirclePlus, ClockArrowRotateLeft, Database, FileText, LayoutCells, Magnifier} from "@gravity-ui/icons";
import {useI18n} from "../../../i18n";

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

        if (activeConnection) {
            actionItems.push({
                id: 'action:select-active-connection',
                title: t('workspace.currentConnection'),
                subtitle: `${activeConnection.name} · ${activeConnection.database_name}`,
                kind: 'action',
                icon: <Icon data={Database} size={18}/>,
                keywords: ['current connection active database'],
                onSelect: () => handleSelectConnection(activeConnection.id),
            });
        }

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

        const connectionItems: CommandPaletteItem[] = connections.map((connection) => ({
            id: `connection:${connection.id}`,
            title: connection.name,
            subtitle: `${connection.database_name} · ${connection.host}:${connection.port}`,
            kind: 'connection',
            icon: <Icon data={Database} size={18}/>,
            keywords: [
                connection.driver,
                connection.database_name,
                connection.host,
                connection.username,
            ],
            onSelect: () => handleSelectConnection(connection.id),
        }));

        const savedQueryItems: CommandPaletteItem[] = savedQueries.map((item) => ({
            id: `saved-query:${item.id}`,
            title: item.title,
            subtitle: item.connection
                ? `${item.connection.name} · ${item.connection.database_name}`
                : item.folder || t('workspace.savedQueries'),
            kind: 'saved-query',
            icon: <Icon data={FileText} size={18}/>,
            keywords: [
                item.sql_text,
                item.folder ?? '',
                item.description ?? '',
            ],
            onSelect: () => handleOpenSavedQuery(item),
        }));

        return [
            ...actionItems,
            ...tabItems,
            ...connectionItems,
            ...savedQueryItems,
        ];
    },[
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
    ]);
}
