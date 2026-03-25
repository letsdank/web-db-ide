<?php

namespace App\Services\Database;

use App\Models\DbConnection;
use App\Services\Database\Ssh\SshTunnelManager;

/**
 * Resolves the runtime endpoint that low-level database services should use.
 *
 * This keeps SSH tunnel bootstrapping in one place so callers can work with a
 * normalized {host, port, tunnelHandle) contract regardless of connection type.
 */
class ConnectionEndpointResolver
{
    public function __construct(
        protected SshTunnelManager $sshTunnelManager
    )
    {
    }

    /**
     * Resolves the effective endpoint for the given connection.
     *
     * Direct connections are returned as-is. SSH-backed connections are mapped
     * to the local forwarded endpoint and keep the tunnel handle for cleanup.
     */
    public function resolve(DbConnection $connection): ResolvedConnectionConfig
    {
        if (!$connection->usesSshTunnel()) {
            return new ResolvedConnectionConfig(
                host: $connection->host,
                port: (int)$connection->port,
                tunnelHandle: null,
            );
        }

        $tunnelHandle = $this->sshTunnelManager->open($connection);

        return new ResolvedConnectionConfig(
            host: '127.0.0.1',
            port: $tunnelHandle->localPort,
            tunnelHandle: $tunnelHandle,
        );
    }

    /**
     * Closes any transient resources associated with a resolved endpoint.
     *
     * Safe to call for both direct and SSH-backed connections.
     */
    public function cleanup(ResolvedConnectionConfig $resolved): void
    {
        $resolved->tunnelHandle?->close();
    }
}
