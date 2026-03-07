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
}

export interface ExecuteQueryError {
    execution_id: string;
    status: 'error';
    error: string;
}

export type ExecuteQueryResponse = ExecuteQuerySuccess | ExecuteQueryError;
