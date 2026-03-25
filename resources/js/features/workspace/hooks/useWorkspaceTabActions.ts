import type {QueryTabDto} from "../../../types/queryTab";
import {useCallback} from "react";
import {createQueryTab, deleteQueryTab, reorderQueryTabs, updateQueryTab} from "../../../api/queryTabs";
import {useI18n} from "../../../i18n";

/**
 * Dependencies injected from the workspace store and surrounding hooks.
 *
 * Keeping this interface explicit makes tab behavior easier to test and avoids
 * hard-coupling the hook to a specific store implementation.
 */
interface Params {
    tabs: QueryTabDto[];
    activeTabId: number | null;
    activeConnectionId: number | null;
    setActiveConnectionId: (id: number | null) => void;

    addTab: (tab: QueryTabDto) => void;
    upsertTab: (tab: QueryTabDto) => void;
    removeTab: (tabId: number) => void;
    replaceTabs: (tabs: QueryTabDto[]) => void;
    reorderTabs: (tabs: QueryTabDto[]) => void;
    setActiveTabId: (tabId: number | null) => void;

    ensureTabState: (tabId: number) => void;
    scheduleTabDraftPersist: (tab: QueryTabDto, patch: Partial<QueryTabDto>) => void;
}

/**
 * Optional values used when creating a new tab programmatically.
 */
interface CreateTabInitial {
    title?: string;
    sql_text?: string;
    db_connection_id?: number | null;
    tab_type?: 'sql' | 'erd';
    meta?: Record<string, unknown> | null;
}

/**
 * Payload used when a feature wants to apply a query to the current tab or
 * create a fresh tab if no active one exists.
 */
interface ApplyQueryToTabPayload {
    title?: string;
    sql_text: string;
    db_connection_id?: number | null;
}

/**
 * Recomputes tab sort_order values so the persisted order matches the current
 * in-memory visual order.
 */
export function withSequentialSortOrder(nextTabs: QueryTabDto[]): QueryTabDto[] {
    return nextTabs.map((tab, index) => ({
        ...tab,
        sort_order: index,
    }));
}

/**
 * Moves a tab left or right inside its current pin group.
 *
 * Pinned and unpinned tabs are intentionally treated as separate segments so a
 * move operation cannot accidentally cross the pin boundary.
 */
export function moveTabInsideGroup(
    sourceTabs: QueryTabDto[],
    tabId: number,
    direction: "left" | "right",
): QueryTabDto[] {
    const targetTab = sourceTabs.find((tab) => tab.id === tabId);

    if (!targetTab) {
        return sourceTabs;
    }

    const sameGroupTabs = sourceTabs.filter((tab) => tab.is_pinned === targetTab.is_pinned);
    const groupIndex = sameGroupTabs.findIndex((tab) => tab.id === tabId);

    if (groupIndex === -1) {
        return sourceTabs;
    }

    const swapIndex = direction === "left" ? groupIndex - 1 : groupIndex + 1;

    if (swapIndex < 0 || swapIndex >= sameGroupTabs.length) {
        return sourceTabs;
    }

    const reorderedGroup = [...sameGroupTabs];
    const [movedTab] = reorderedGroup.splice(groupIndex, 1);
    reorderedGroup.splice(swapIndex, 0, movedTab);

    const groupIds = new Set(reorderedGroup.map((tab) => tab.id));
    const nextTabs: QueryTabDto[] = [];
    let groupCursor = 0;

    for (const tab of sourceTabs) {
        if (groupIds.has(tab.id)) {
            nextTabs.push(reorderedGroup[groupCursor]);
            groupCursor += 1;
        } else {
            nextTabs.push(tab);
        }
    }

    return withSequentialSortOrder(nextTabs);
}

/**
 * High-level tab actions for the workspace shell.
 *
 * The hook owns optimistic updates for create/rename/close/reorder pin flows
 * and syncs them back to the API. Consumers get a thin command surface instead
 * of duplicating tab orchestration in components.
 */
export function useWorkspaceTabActions({
                                           tabs,
                                           activeTabId,
                                           activeConnectionId,
                                           setActiveConnectionId,
                                           addTab,
                                           upsertTab,
                                           removeTab,
                                           replaceTabs,
                                           reorderTabs,
                                           setActiveTabId,
                                           ensureTabState,
                                           scheduleTabDraftPersist,
                                       }: Params) {
    const {t} = useI18n();

    /**
     * Creates a new tab and promotes it to the active workspace context.
     */
    const handleCreateTab = useCallback(async (initial?: CreateTabInitial) => {
        try {
            const createdTab = await createQueryTab({
                title: initial?.title ?? t('workspace.newQuery'),
                sql_text: initial?.sql_text ?? "",
                db_connection_id: initial?.db_connection_id ?? activeConnectionId,
                tab_type: initial?.tab_type ?? 'sql',
                meta: initial?.meta ?? null,
                result_limit: 500,
            });

            addTab(createdTab);
            setActiveTabId(createdTab.id);

            if (createdTab.db_connection_id) {
                setActiveConnectionId(createdTab.db_connection_id);
            }
        } catch (error) {
            console.error(error);
        }
    }, [activeConnectionId, addTab, setActiveConnectionId, setActiveTabId, t]);

    /**
     * Activates a tab and aligns the active connection with that tab's binding.
     */
    const handleSelectTab = useCallback(async (id: number) => {
        setActiveTabId(id);

        const tab = tabs.find((item) => item.id === id);

        if (tab?.db_connection_id !== undefined) {
            setActiveConnectionId(tab.db_connection_id);
        }

        ensureTabState(id);
    }, [ensureTabState, setActiveConnectionId, setActiveTabId, tabs]);

    /**
     * Optimistically closes a tab, then persists the deletion and resolves the
     * next active tab if the closed one was selected.
     */
    const handleCloseTab = useCallback(async (tabId: number) => {
        const previousTabs = tabs;
        const closingIndex = previousTabs.findIndex((tab) => tab.id === tabId);

        removeTab(tabId);

        try {
            await deleteQueryTab(tabId);

            if (activeTabId === tabId) {
                const remainingTabs = previousTabs.filter((tab) => tab.id !== tabId);
                const fallbackTab =
                    remainingTabs[closingIndex] ??
                    remainingTabs[closingIndex - 1] ??
                    remainingTabs[0] ??
                    null;

                if (fallbackTab) {
                    setActiveTabId(fallbackTab.id);

                    if (fallbackTab.db_connection_id) {
                        setActiveConnectionId(fallbackTab.db_connection_id);
                    }

                    ensureTabState(fallbackTab.id);
                } else {
                    setActiveTabId(null);
                    await handleCreateTab({
                        db_connection_id: activeConnectionId,
                    });
                }
            }
        } catch (error) {
            console.error(error);
            replaceTabs(previousTabs);
        }
    }, [
        tabs,
        removeTab,
        activeTabId,
        setActiveTabId,
        setActiveConnectionId,
        ensureTabState,
        handleCreateTab,
        activeConnectionId,
        replaceTabs,
    ]);

    /**
     * Closes every unpinned tab except the requested one.
     */
    const handleCloseOtherTabs = useCallback(async (tabId: number) => {
        const otherTabs = tabs.filter((tab) => tab.id !== tabId && !tab.is_pinned);

        for (const tab of otherTabs) {
            await handleCloseTab(tab.id);
        }
    }, [handleCloseTab, tabs]);

    /**
     * Creates a new tab prefilled from the source tab.
     */
    const handleDuplicateTab = useCallback(async (tab: QueryTabDto) => {
        await handleCreateTab({
            title: t('workspace.duplicateTabTitle', {
                title: tab.title || t('workspace.newQuery'),
            }),
            sql_text: tab.sql_text,
            db_connection_id: tab.db_connection_id,
        });
    }, [handleCreateTab, t]);

    /**
     * Optimistically renames a tab and rolls back on failure.
     */
    const handleRenameTab = useCallback(async (tab: QueryTabDto, title: string) => {
        const normalizedTitle = title.trim() || t('workspace.newQuery');
        const previousTab = tab;

        const nextTab: QueryTabDto = {
            ...tab,
            title: normalizedTitle,
        };

        upsertTab(nextTab);

        try {
            const updatedTab = await updateQueryTab(tab.id, {
                title: normalizedTitle,
            });

            upsertTab(updatedTab);
        } catch (error) {
            console.error(error);
            upsertTab(previousTab);
        }
    }, [upsertTab, t]);

    /**
     * Moves a tab inside its current pin group and persists the new ordering.
     */
    const handleMoveTab = useCallback(async (tab: QueryTabDto, direction: "left" | "right") => {
        const nextTabs = moveTabInsideGroup(tabs, tab.id, direction);

        if (nextTabs === tabs) {
            return;
        }

        reorderTabs(nextTabs);

        try {
            const updatedTabs = await reorderQueryTabs(
                nextTabs.map((item) => ({
                    id: item.id,
                    sort_order: item.sort_order,
                })),
            );

            reorderTabs(updatedTabs);
        } catch (error) {
            console.error(error);
            replaceTabs(tabs);
        }
    }, [reorderTabs, replaceTabs, tabs]);

    /**
     * Toggles the pinned state for a tab and then normalizes the full visual
     * order so pinned tabs remain grouped at the start of the list.
     */
    const handleTogglePin = useCallback(async (tab: QueryTabDto) => {
        const nextTab: QueryTabDto = {
            ...tab,
            is_pinned: !tab.is_pinned,
        };

        upsertTab(nextTab);

        try {
            const updatedTab = await updateQueryTab(tab.id, {
                is_pinned: nextTab.is_pinned,
            });

            const refreshedTabs = tabs.map((item) =>
                item.id === updatedTab.id ? updatedTab : item,
            );

            const normalizedTabs = withSequentialSortOrder(
                [...refreshedTabs].sort((a, b) => {
                    if (a.is_pinned !== b.is_pinned) {
                        return Number(b.is_pinned) - Number(a.is_pinned);
                    }

                    if (a.sort_order !== b.sort_order) {
                        return a.sort_order - b.sort_order;
                    }

                    return a.id - b.id;
                }),
            );

            reorderTabs(normalizedTabs);

            const persistedTabs = await reorderQueryTabs(
                normalizedTabs.map((item) => ({
                    id: item.id,
                    sort_order: item.sort_order,
                })),
            );

            reorderTabs(persistedTabs);
        } catch (error) {
            console.error(error);
            upsertTab(tab);
        }
    }, [reorderTabs, tabs, upsertTab]);

    /**
     * Replaces the current tab contents with a query payload or creates a new
     * tab when there is no active editor yet.
     */
    const handleApplyQueryToActiveTab = useCallback(async (payload: ApplyQueryToTabPayload) => {
        if (!activeTabId) {
            await handleCreateTab({
                title: payload.title ?? t('workspace.newQuery'),
                sql_text: payload.sql_text,
                db_connection_id: payload.db_connection_id ?? activeConnectionId,
            });

            return;
        }

        const activeTab = tabs.find((tab) => tab.id === activeTabId);

        if (!activeTab) {
            return;
        }

        const nextTab: QueryTabDto = {
            ...activeTab,
            title: payload.title ?? activeTab.title,
            sql_text: payload.sql_text,
            db_connection_id: payload.db_connection_id ?? activeTab.db_connection_id,
        };

        upsertTab(nextTab);

        if (nextTab.db_connection_id) {
            setActiveConnectionId(nextTab.db_connection_id);
        }

        scheduleTabDraftPersist(nextTab, {
            title: nextTab.title,
            sql_text: nextTab.sql_text,
            db_connection_id: nextTab.db_connection_id,
        });
    }, [
        activeConnectionId,
        activeTabId,
        handleCreateTab,
        scheduleTabDraftPersist,
        setActiveConnectionId,
        tabs,
        upsertTab,
        t,
    ]);

    return {
        handleCreateTab,
        handleSelectTab,
        handleCloseTab,
        handleCloseOtherTabs,
        handleDuplicateTab,
        handleRenameTab,
        handleMoveTab,
        handleTogglePin,
        handleApplyQueryToActiveTab,
    };
}
