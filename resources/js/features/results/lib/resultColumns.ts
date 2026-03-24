import type {QueryColumnDto} from "../../../types/queryResult";

export interface VisibleResultColumn extends QueryColumnDto {
    originalIndex: number;
    isPinned: boolean;
}

export function buildVisibleResultColumns(
    columns: QueryColumnDto[],
    hiddenColumnNames: string[],
    pinnedColumnNames: string[],
): VisibleResultColumn[] {
    const hiddenColumnSet = new Set(hiddenColumnNames);
    const pinnedColumnSet = new Set(pinnedColumnNames);

    return columns
        .map((column, index) => ({
            ...column,
            originalIndex: index,
            isPinned: pinnedColumnSet.has(column.name),
        }))
        .filter((column) => !hiddenColumnSet.has(column.name))
        .sort((left, right) => {
            if (left.isPinned === right.isPinned) {
                return left.originalIndex - right.originalIndex;
            }

            return left.isPinned ? -1 : 1;
        });
}
