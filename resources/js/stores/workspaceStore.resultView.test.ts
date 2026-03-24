import {beforeEach, describe, expect, it} from "vitest";
import {useWorkspaceStore} from "./workspaceStore";
import {makeQueryTab} from "../test/factories";

describe('workspace pinned result columns', () => {
    beforeEach(() => {
        useWorkspaceStore.setState({
            ...useWorkspaceStore.getState(),
            tabs: [],
            activeTabId: null,
            activeConnectionId: null,
            tabStateById: {},
            resultViewStateByTabId: {},
            dirtyTabIds: [],
        });
    });

    it('pins columns without duplicates', () => {
        const store = useWorkspaceStore.getState();

        store.addTab(makeQueryTab({id: 101, title: 'Users'}));
        store.pinResultColumn(101, 'email');
        store.pinResultColumn(101, 'email');
        store.pinResultColumn(101, 'created_at');

        expect(useWorkspaceStore.getState().resultViewStateByTabId[101]?.pinnedColumnNames).toEqual([
            'email',
            'created_at',
        ]);
    });

    it('unpinned and reset actions update the pinned list', () => {
        const store = useWorkspaceStore.getState();

        store.addTab(makeQueryTab({id: 202, title: 'Orders'}));
        store.pinResultColumn(202, 'id');
        store.pinResultColumn(202, 'status');
        store.unpinResultColumn(202, 'id');

        expect(useWorkspaceStore.getState().resultViewStateByTabId[202]?.pinnedColumnNames).toEqual([
            'status',
        ]);

        store.resetPinnedResultColumns(202);

        expect(useWorkspaceStore.getState().resultViewStateByTabId[202]?.pinnedColumnNames).toEqual([]);
    });
})
