import type {WorkspaceRightPanel} from "../../stores/workspaceStore";
import type {QueryHistoryDto} from "../../types/queryHistory";
import type {SavedQueryDto} from "../../types/savedQuery";
import {
    ActionTooltip,
    Button,
    Card,
    DropdownMenu,
    Icon,
    Label,
    List,
    SegmentedRadioGroup,
    Tab,
    TabList,
    TabPanel,
    TabProvider,
    Text,
    TextInput
} from "@gravity-ui/uikit";
import {useI18n} from "../../i18n";
import {
    getResourceMarker,
    getResourceMarkerLabelKey,
    isOwnedResource,
    matchesVisibilityFilter
} from "../../lib/resourceMarkers";
import React, {useMemo, useState} from "react";
import type {ResourceVisibilityFilter} from "../../types/resourceFilter";
import {ClockArrowRotateLeft, Ellipsis, FileText, Magnifier} from "@gravity-ui/icons";

interface Props {
    panel: WorkspaceRightPanel;
    history: QueryHistoryDto[];
    savedQueries: SavedQueryDto[];
    canSaveCurrentQuery: boolean;
    onChangePanel: (panel: WorkspaceRightPanel) => void;
    onOpenHistoryItem: (item: QueryHistoryDto) => void;
    onOpenSavedQuery: (item: SavedQueryDto) => void;
    onOpenSaveQueryDialog: () => void;
    onEditSavedQuery: (item: SavedQueryDto) => void;
}

function normalizeSearch(value: string): string {
    return value.trim().toLowerCase();
}

function matchesHistorySearch(item: QueryHistoryDto, query: string): boolean {
    if (!query) {
        return true;
    }

    return [
        item.sql_text,
        item.status,
        item.error_message ?? '',
        item.row_count?.toString() ?? '',
        item.duration_ms?.toString() ?? '',
    ]
        .join(' ')
        .toLowerCase()
        .includes(query);
}

function matchesSavedQuerySearch(item: SavedQueryDto, query: string): boolean {
    if (!query) {
        return true;
    }

    return [
        item.title,
        item.description ?? '',
        item.folder ?? '',
        item.sql_text,
        item.connection?.name ?? '',
        item.connection?.database_name ?? '',
    ]
        .join(' ')
        .toLowerCase()
        .includes(query);
}

export const RightSidebarPanels = React.memo(function RightSidebarPanels({
                                                                             panel,
                                                                             history,
                                                                             savedQueries,
                                                                             canSaveCurrentQuery,
                                                                             onChangePanel,
                                                                             onOpenHistoryItem,
                                                                             onOpenSavedQuery,
                                                                             onOpenSaveQueryDialog,
                                                                             onEditSavedQuery,
                                                                         }: Props) {
    const {t} = useI18n();
    const [visibilityFilter, setVisibilityFilter] = useState<ResourceVisibilityFilter>('all');
    const [search, setSearch] = useState('');

    const normalizedSearch = normalizeSearch(search);

    const filteredHistory = useMemo(() => {
        return history.filter((item) => matchesHistorySearch(item, normalizedSearch));
    }, [history, normalizedSearch]);

    const filteredSavedQueries = useMemo(() => {
        return savedQueries.filter((item) =>
            matchesVisibilityFilter(item, visibilityFilter) &&
            matchesSavedQuerySearch(item, normalizedSearch),
        );
    }, [savedQueries, visibilityFilter]);

    return (
        <Card view="filled" className="right-sidebar-panels__card">
            <TabProvider
                value={panel}
                onUpdate={(value) => onChangePanel(value as WorkspaceRightPanel)}
            >
                <div className="right-sidebar-panels__layout">
                    <div className="right-sidebar-panels__header">
                        <div className="right-sidebar-panels__title-row">
                            <div className="right-sidebar-panels__title-copy">
                                <Text variant="header-1">{t('workspace.workspace')}</Text>

                                <div className="right-sidebar-panels__title-meta">
                                    <Label theme="utility">{history.length}</Label>
                                    <Label theme="info">{savedQueries.length}</Label>
                                </div>
                            </div>

                            <Button
                                view="action"
                                size="m"
                                disabled={!canSaveCurrentQuery}
                                onClick={onOpenSaveQueryDialog}
                            >
                                {t('common.save')}
                            </Button>
                        </div>

                        <TabList size="l" className="right-sidebar-panels__tabs">
                            <Tab value="history">
                                {t('workspace.history')} · {history.length}
                            </Tab>

                            <Tab value="saved">
                                {t('workspace.saved')} · {savedQueries.length}
                            </Tab>
                        </TabList>

                        <div className="right-sidebar-panels__controls">
                            <TextInput
                                size="m"
                                value={search}
                                placeholder={
                                    panel === 'history'
                                        ? t('workspace.searchHistoryPlaceholder')
                                        : t('workspace.searchSavedQueriesPlaceholder')
                                }
                                onUpdate={setSearch}
                                startContent={<Icon data={Magnifier} size={16}/>}
                            />

                            {panel === 'saved' ? (
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
                            ) : null}
                        </div>
                    </div>

                    <div className="right-sidebar-panels__content">
                        <TabPanel value="history">
                            <div className="right-sidebar-panels__panel">
                                <List<QueryHistoryDto>
                                    className="right-sidebar-panels__list"
                                    itemClassName="right-sidebar-panels__list-item"
                                    items={filteredHistory}
                                    virtualized={false}
                                    filterable={false}
                                    emptyPlaceholder={
                                        <div className="right-sidebar-panels__empty">
                                            <Text variant="body-2" color="secondary">
                                                {normalizedSearch
                                                    ? t('workspace.noHistoryMatchingSearch')
                                                    : t('workspace.noHistory')}
                                            </Text>
                                        </div>
                                    }
                                    onItemClick={(item) => onOpenHistoryItem(item)}
                                    renderItem={(item) => (
                                        <div className="right-sidebar-panels__row">
                                            <div className="right-sidebar-panels__row-icon">
                                                <Icon data={ClockArrowRotateLeft} size={18}/>
                                            </div>

                                            <div className="right-sidebar-panels__row-main">
                                                <div className="right-sidebar-panels__row-head">
                                                    <div className="right-sidebar-panels__row-meta">
                                                        <Label theme={item.status === 'success' ? 'success' : 'danger'}>
                                                            {item.status}
                                                        </Label>

                                                        {item.duration_ms !== null ? (
                                                            <Label theme="utility">{item.duration_ms} ms</Label>
                                                        ) : null}

                                                        {item.row_count != null ? (
                                                            <Label theme="info">{item.row_count} rows</Label>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                <Text variant="body-2" className="right-sidebar-panels__row-text">
                                                    {item.sql_text.slice(0, 180) || t('workspace.emptyQuery')}
                                                </Text>

                                                {item.error_message ? (
                                                    <Text
                                                        variant="caption-2"
                                                        color="danger"
                                                        className="right-sidebar-panels__row-error"
                                                    >
                                                        {item.error_message}
                                                    </Text>
                                                ) : null}

                                                <div className="right-sidebar-panels__row-footer">
                                                    <Text variant="caption-2" color="secondary">
                                                        {new Date(item.executed_at).toLocaleString()}
                                                    </Text>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                />
                            </div>
                        </TabPanel>

                        <TabPanel value="saved">
                            <div className="right-sidebar-panels__panel">
                                <List<SavedQueryDto>
                                    className="right-sidebar-panels__list"
                                    itemClassName="right-sidebar-panels__list-item"
                                    items={filteredSavedQueries}
                                    virtualized={false}
                                    filterable={false}
                                    emptyPlaceholder={
                                        <div className="right-sidebar-panels__empty">
                                            <Text variant="body-2" color="secondary">
                                                {normalizedSearch
                                                    ? t('workspace.noSavedQueriesMatchingSearch')
                                                    : t('workspace.noSavedQueries')}
                                            </Text>
                                        </div>
                                    }
                                    onItemClick={(item) => onOpenSavedQuery(item)}
                                    renderItem={(item) => {
                                        const marker = getResourceMarker(item);
                                        const markerLabelKey = getResourceMarkerLabelKey(item);
                                        const canManageSavedQuery = isOwnedResource(item);
                                        const updatedAt = item.updated_at ?? item.created_at;

                                        return (
                                            <div className="right-sidebar-panels__row">
                                                <div className="right-sidebar-panels__row-icon">
                                                    <Icon data={FileText} size={18}/>
                                                </div>

                                                <div className="right-sidebar-panels__row-main">
                                                    <div className="right-sidebar-panels__row-head">
                                                        <div className="right-sidebar-panels__row-title">
                                                            <Text variant="subheader-2">
                                                                {item.title}
                                                            </Text>

                                                            <div className="right-sidebar-panels__row-meta">
                                                                <Label theme={marker.theme}>
                                                                    {t(markerLabelKey)}
                                                                </Label>

                                                                {item.folder ? (
                                                                    <Label theme="unknown">{item.folder}</Label>
                                                                ) : null}
                                                            </div>
                                                        </div>

                                                        {canManageSavedQuery ? (
                                                            <div className="right-sidebar-panels__row-actions">
                                                                <ActionTooltip title={t('workspace.editSavedQuery')}>
                                                                    <DropdownMenu
                                                                        items={[
                                                                            {
                                                                                text: t('workspace.editSavedQuery'),
                                                                                action: () => onEditSavedQuery(item),
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
                                                                </ActionTooltip>
                                                            </div>
                                                        ) : null}
                                                    </div>

                                                    {item.connection ? (
                                                        <div className="right-sidebar-panels__row-subtitle">
                                                            <Text variant="caption-2" color="secondary">
                                                                {item.connection.name} · {item.connection.database_name}
                                                            </Text>
                                                        </div>
                                                    ) : null}

                                                    <Text variant="body-2" className="right-sidebar-panels__row-text">
                                                        {item.sql_text.slice(0, 180) || t('workspace.emptyQuery')}
                                                    </Text>

                                                    {updatedAt ? (
                                                        <div className="right-sidebar-panels__row-footer">
                                                            <Text variant="caption-2" color="secondary">
                                                                {new Date(updatedAt).toLocaleString()}
                                                            </Text>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        );
                                    }}
                                />
                            </div>
                        </TabPanel>
                    </div>
                </div>
            </TabProvider>
        </Card>
    );
});
