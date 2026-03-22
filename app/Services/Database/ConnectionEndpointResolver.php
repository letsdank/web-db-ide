<?php

namespace App\Services\Database;

use App\Models\DbConnection;
use App\Services\Database\Ssh\SshTunnelManager;

class ConnectionEndpointResolver
{
    public function __construct(
        protected SshTunnelManager $sshTunnelManager
    )
    {
    }

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

    public function cleanup(ResolvedConnectionConfig $resolved): void
    {
        $resolved->tunnelHandle?->close();
    }
}
