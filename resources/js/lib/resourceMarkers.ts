import {ResourceVisibilityFilter} from "../types/resourceFilter";
import {ConnectionDto} from "../types/connection";
import {SavedQueryDto} from "../types/savedQuery";

export interface ResourceMarker {
    kind: 'owned' | 'shared';
    theme: 'success' | 'info';
}

export interface ResourceAccessDescriptor {
    is_owner?: boolean;
    access_scope?: 'owned' | 'shared_with_me' | null;
    visibility?: 'private' | 'shared';
}

export function getResourceMarker(resource: ResourceAccessDescriptor): ResourceMarker {
    if (resource.access_scope === 'shared_with_me' || resource.is_owner === false) {
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
    resource: ResourceAccessDescriptor,
    filter: ResourceVisibilityFilter,
): boolean {
    if (filter === 'all') {
        return true;
    }

    if (filter === 'owned') {
        return resource.access_scope === 'owned' || resource.is_owner === true;
    }

    return resource.access_scope === 'shared_with_me' || resource.is_owner === false;
}

export function isSharedWithMe(resource: ResourceAccessDescriptor): boolean {
    return resource.access_scope === 'shared_with_me' || resource.is_owner === false;
}

export function isOwnedResource(resource: ResourceAccessDescriptor): boolean {
    return resource.access_scope === 'owned' || resource.is_owner === true;
}

export function getResourceMarkerLabelKey(resource: ResourceAccessDescriptor): 'workspace.ownedMarker' | 'workspace.sharedMarker' {
    return getResourceMarker(resource).kind === 'shared'
        ? 'workspace.sharedMarker'
        : 'workspace.ownedMarker';
}

export type ResourceWithAccess = Pick<ConnectionDto, 'is_owner' | 'access_scope' | 'visibility'>
    | Pick<SavedQueryDto, 'is_owner' | 'access_scope' | 'visibility'>;
