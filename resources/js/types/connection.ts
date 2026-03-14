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

    use_ssh_tunnel?: boolean;
    ssh_host?: string | null;
    ssh_port?: string | null;
    ssh_username?: string | null;
    ssh_password?: string | null;
    ssh_private_key?: string | null;
    ssh_passphrase?: string | null;
    ssh_known_host_fingerprint?: string | null;

    has_ssh_password?: boolean;
    has_ssh_private_key?: boolean;
    has_ssh_passphrase?: boolean;

    last_used_at?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface TestConnectionResultDto {
    ok: boolean;
    duration_ms: number;
    database_name: string;
    user_name: string;
}

export interface CreateConnectionPayload {
    name: string;
    driver: string;
    host: string;
    port: number;
    database_name: string;
    username: string;
    password: string;
    schema_default?: string | null;
    ssl_mode?: string | null;
    color?: string | null;

    use_ssh_tunnel?: boolean;
    ssh_host?: string | null;
    ssh_port?: number | null;
    ssh_username?: string | null;
    ssh_password?: string | null;
    ssh_private_key?: string | null;
    ssh_passphrase?: string | null;
    ssh_known_host_fingerprint?: string | null;
}

export interface UpdateConnectionPayload {
    name?: string;
    driver?: string;
    host?: string;
    port?: number;
    database_name?: string;
    username?: string;
    password?: string | null;
    schema_default?: string | null;
    ssl_mode?: string | null;
    color?: string | null;

    use_ssh_tunnel?: boolean;
    ssh_host?: string | null;
    ssh_port?: number | null;
    ssh_username?: string | null;
    ssh_password?: string | null;
    ssh_private_key?: string | null;
    ssh_passphrase?: string | null;
    ssh_known_host_fingerprint?: string | null;
}
