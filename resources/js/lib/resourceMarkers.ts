import {ResourceVisibilityFilter} from "../types/resourceFilter";

export type ResourceVisibility = 'private' | 'shared';

export interface ResourceMarker {
    kind: 'owned' | 'shared';
    theme: 'success' | 'info';
}

export function getResourceMarker(visibility: ResourceVisibility): ResourceMarker {
    if (visibility === 'shared') {
        return {
            kind: 'shared',
            theme: 'info',
        };
    }

    return {
        kind: 'owned',
        theme: 'success',
    };
}

export function matchesVisibilityFilter(
    visibility: ResourceVisibility,
    filter: ResourceVisibilityFilter,
): boolean {
    if (filter === 'all') {
        return true;
    }

    if (filter === 'owned') {
        return visibility === 'private';
    }

    return visibility === 'shared';
}
