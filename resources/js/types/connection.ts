export interface ConnectionDto {
    id: number;
    user_id: number;
    name: string;
    driver: string;
    host: string;
    port: number;
    database_name: string;
    username: string;
    ssl_mode?: string | null;
    schema_default?: string | null;
    color?: string | null;
    is_favorite: boolean;
    is_read_only: boolean;
    connect_timeout_seconds?: number;
    query_timeout_seconds?: number;
    meta?: Record<string, unknown> | null;
    last_used_at?: string | null;
    created_at?: string;
    updated_at?: string;
}
