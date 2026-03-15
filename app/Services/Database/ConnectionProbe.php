<?php

namespace App\Services\Database;

use App\Models\DbConnection;
use PDO;

class ConnectionProbe
{
    public function __construct(
        protected SshTunnelManager $sshTunnelManager,
    )
    {
    }

    public function probe(DbConnection $connection): array
    {
        $host = $connection->host;
        $port = (int)$connection->port;
        $tunnelSession = null;

        try {
            if ($connection->use_ssh_tunnel) {
                $tunnelSession = $this->sshTunnelManager->open($connection);
                $host = '127.0.0.1';
                $port = $tunnelSession->localPort;
            }
            $dsn = sprintf(
                'pgsql:host=%s;port=%s;dbname=%s;sslmode=%s',
                $host,
                $port,
                $connection->database_name,
                $connection->ssl_mode ?: 'prefer',
            );

            $pdo = new PDO(
                $dsn,
                $connection->username,
                filled($connection->password_encrypted)
                    ? decrypt($connection->password_encrypted)
                    : null,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_TIMEOUT => $connection->connect_timeout_seconds ?? 10,
                ],
            );

            $statement = $pdo->query('select current_database() as database_name, current_user as user_name');

            return (array)$statement->fetch(PDO::FETCH_ASSOC);
        } finally {
            $tunnelSession?->close();
        }
    }
}
