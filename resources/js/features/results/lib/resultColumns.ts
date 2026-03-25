import type {QueryColumnDto} from "../../../types/queryResult";

/**
 * Column descriptor prepared specifically for result-grid rendering.
 *
 * `originalIndex` points back to the source position in the raw backend row,
 * while `isPinned` controls sticky-left rendering in the table UI.
 */
export interface VisibleResultColumn extends QueryColumnDto {
    originalIndex: number;
    isPinned: boolean;
}

/**
 * Builds the list of columns that should be rendered in the result grid.
 *
 * Rules:
 * - hidden columns are removed
 * - pinned columns are moved to the front
 * - order inside pinned and unpinned groups follows the original SQL order
 *
 * This function is pure and does not mutate the incoming arrays.
 */
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
