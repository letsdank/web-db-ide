<?php

namespace App\Services\Database;

use App\Models\DbConnection;

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
            host: $tunnelHandle->localHost,
            port: $tunnelHandle->localPort,
            tunnelHandle: $tunnelHandle,
        );
    }

    public function cleanup(ResolvedConnectionConfig $resolved): void
    {
        if ($resolved->tunnelHandle) {
            $this->sshTunnelManager->close($resolved->tunnelHandle);
        }
    }
}
