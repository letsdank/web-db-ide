import {describe, expect, it} from "vitest";
import {getResourceMarker, matchesVisibilityFilter} from "./resourceMarkers";

describe('resourceMarkers', () => {
    it('marks owned shared resource as owned for owner', () => {
        const marker = getResourceMarker({
            visibility: 'shared',
            is_owner: true,
            access_scope: 'owned',
        });

        expect(marker.kind).toBe('owned');
        expect(marker.theme).toBe('success');
    });

    it('marks shared-with-me resource as shared for invited user', () => {
        const marker = getResourceMarker({
            visibility: 'shared',
            is_owner: false,
            access_scope: 'shared_with_me',
        });

        expect(marker.kind).toBe('shared');
        expect(marker.theme).toBe('info');
    });

    it('filters owned resources using access scope instead of visibility', () => {
        expect(matchesVisibilityFilter({
            visibility: 'shared',
            is_owner: true,
            access_scope: 'owned',
        }, 'owned')).toBe(true);

        expect(matchesVisibilityFilter({
            visibility: 'shared',
            is_owner: true,
            access_scope: 'owned',
        }, 'shared')).toBe(false);
    });

    it('filters shared resources using shared_with_me access scope', () => {
        expect(matchesVisibilityFilter({
            visibility: 'shared',
            is_owner: false,
            access_scope: 'shared_with_me',
        }, 'shared')).toBe(true);

        expect(matchesVisibilityFilter({
            visibility: 'shared',
            is_owner: false,
            access_scope: 'shared_with_me',
        }, 'owned')).toBe(false);
    });
});
