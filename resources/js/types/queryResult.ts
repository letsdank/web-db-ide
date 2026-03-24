export interface QueryColumnDto {
    name: string;
    native_type: string | null;
}

export interface ExecuteQuerySuccess {
    execution_id: string;
    status: 'success';
    duration_ms: number;
    columns: QueryColumnDto[];
    rows: Array<Array<unknown>>;
    row_count: number;
    has_more: boolean;
}

export interface ExecuteQueryError {
    execution_id: string;
    status: 'error';
    error: string;
}

export type ExecuteQueryResponse = ExecuteQuerySuccess | ExecuteQueryError;

export type ResultSortDirection = 'asc' | 'desc';

export interface QueryResultViewState {
    filterValue: string;
    hiddenColumnNames: string[];
    sortState: {
        columnName: string;
        direction: ResultSortDirection;
    } | null;
}
