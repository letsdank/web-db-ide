export interface ExplorerTableDto {
    table_name: string;
    table_type: string;
}

export interface ExplorerColumnDto {
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
}

export interface ExplorerIndexDto {
    indexname: string;
    indexdef: string;
}

export interface ExplorerTableDetailsDto {
    schema: string;
    table: string;
    columns: ExplorerColumnDto[];
    indexes: ExplorerIndexDto[];
}
