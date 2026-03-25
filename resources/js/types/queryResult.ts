/**
 * Metadata for a single result-set column returned by the backend.
 *
 * `native_type` is driver-specific and intended for UI display only.
 */
export interface QueryColumnDto {
    name: string;
    native_type: string | null;
}

/**
 * Successful query execution payload returned by the backend.
 *
 * Rows are transferred as positional arrays so the frontend can render large
 * result sets without paying the cost of object-key mapping for every cell.
 */
export interface ExecuteQuerySuccess {
    execution_id: string;
    status: 'success';
    duration_ms: number;
    columns: QueryColumnDto[];
    rows: Array<Array<unknown>>;
    row_count: number;
    has_more: boolean;
}

/**
 * Error payload returned by the backend when query execution fails.
 */
export interface ExecuteQueryError {
    execution_id: string;
    status: 'error';
    error: string;
}

/**
 * Union of all query execution responses consumed by the results layer.
 */
export type ExecuteQueryResponse = ExecuteQuerySuccess | ExecuteQueryError;

/**
 * Direction of the active client-side result sorting.
 */
export type ResultSortDirection = 'asc' | 'desc';

/**
 * Persisted per-tab preferences for the result grid.
 *
 * This state survives tab switches and controls only presentation:
 * - free-text / tokenized filtering
 * - hidden columns
 * - pinned columns
 * - active client-side sorting
 *
 * It does not store the query result itself.
 */
export interface QueryResultViewState {
    filterValue: string;
    hiddenColumnNames: string[];
    pinnedColumnNames: string[];
    sortState: {
        columnName: string;
        direction: ResultSortDirection;
    } | null;
}
