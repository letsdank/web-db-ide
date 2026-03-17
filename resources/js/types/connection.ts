export interface ConnectionDto {
    id: number;
    user_id: number;
    name: string;
    driver: 'pgsql' | 'mysql';
    host: string;
    port: number;
    database_name: string;
    username: string;
    schema_default: string | null;
    ssl_mode: string | null;
    color: string | null;
    visibility: 'private' | 'shared';
    is_favorite: boolean;
    is_read_only: boolean;
    use_ssh_tunnel: boolean;
    ssh_host: string | null;
    ssh_port: string | null;
    ssh_username: string | null;
    ssh_password: string | null;
    ssh_private_key: string | null;
    ssh_passphrase: string | null;
    ssh_known_host_fingerprint: string | null;
    has_ssh_password: boolean;
    has_ssh_private_key: boolean;
    has_ssh_passphrase: boolean;
    connect_timeout_seconds: number;
    query_timeout_seconds: number;
    meta: Record<string, unknown> | null;
    last_used_at: string | null;
    created_at: string | null;
    updated_at: string | null;
    is_owner: boolean;
    access_scope: 'owned' | 'shared_with_me';
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
    visibility?: 'private' | 'shared';

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
    visibility?: 'private' | 'shared';

    use_ssh_tunnel?: boolean;
    ssh_host?: string | null;
    ssh_port?: number | null;
    ssh_username?: string | null;
    ssh_password?: string | null;
    ssh_private_key?: string | null;
    ssh_passphrase?: string | null;
    ssh_known_host_fingerprint?: string | null;
}
