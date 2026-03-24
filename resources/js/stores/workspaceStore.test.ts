import {beforeEach, describe, expect, it} from "vitest";
import {useWorkspaceStore} from "./workspaceStore";
import {makeQueryTab} from "../test/factories";

const DEFAULT_RESULT_VIEW_STATE = {
    filterValue: '',
    hiddenColumnNames: [],
    sortState: null,
};

describe('workspaceStore result view state', () => {
    beforeEach(() => {
        useWorkspaceStore.setState({
            isBooting: true,
            connections: [],
            tabs: [],
            activeTabId: null,
            activeConnectionId: null,
            queryHistory: [],
            savedQueries: [],
            rightPanel: 'history',
            tabStateById: {},
            resultViewStateByTabId: {},
            dirtyTabIds: [],
            isConnectionDialogOpen: false,
            isCreatingConnection: false,
            editingConnection: null,
            connectionDialogError: null,
        });
    });

    it('creates default result view state for a new tab', () => {
        useWorkspaceStore.getState().addTab(
            makeQueryTab({id: 101, title: 'Users'}),
        );

        expect(useWorkspaceStore.getState().resultViewStateByTabId[101]).toEqual(
            DEFAULT_RESULT_VIEW_STATE,
        );
    });

    it('stores result view state independently for each tab', () => {
        const store = useWorkspaceStore.getState();

        store.addTab(makeQueryTab({id: 1, title: 'First'}));
        store.addTab(makeQueryTab({id: 2, title: 'Second'}));

        store.setResultFilterValue(1, 'chat');
        store.hideResultColumn(1, 'email');
        store.setResultSortState(1, {
            columnName: 'name',
            direction: 'asc',
        });

        expect(useWorkspaceStore.getState().resultViewStateByTabId[1]).toEqual({
            filterValue: 'chat',
            hiddenColumnNames: ['email'],
            sortState: {
                columnName: 'name',
                direction: 'asc',
            },
        });

        expect(useWorkspaceStore.getState().resultViewStateByTabId[2]).toEqual(
            DEFAULT_RESULT_VIEW_STATE,
        );
    });

    it('removes result view state when a tab is closed', () => {
        const store = useWorkspaceStore.getState();

        store.addTab(makeQueryTab({id: 7, title: 'Temp'}));
        store.setResultFilterValue(7, 'debug');

        expect(useWorkspaceStore.getState().resultViewStateByTabId[7]).toBeDefined();

        store.removeTab(7);

        expect(useWorkspaceStore.getState().resultViewStateByTabId[7]).toBeUndefined();
    });
});
