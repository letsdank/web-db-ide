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
