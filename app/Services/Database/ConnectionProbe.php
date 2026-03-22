<?php

namespace App\Services\Database;

use App\Enums\DatabaseDriver;
use App\Models\DbConnection;
use App\Services\Database\Ssh\SshTunnelManager;
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
        $driver = DatabaseDriver::from($connection->driver);

        try {
            if ($connection->use_ssh_tunnel) {
                $tunnelSession = $this->sshTunnelManager->open($connection);
                $host = '127.0.0.1';
                $port = $tunnelSession->localPort;
            }

            $pdo = new PDO(
                $this->buildDsn($driver, $connection, $host, $port),
                $connection->username,
                filled($connection->password_encrypted)
                    ? decrypt($connection->password_encrypted)
                    : null,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_TIMEOUT => $connection->connect_timeout_seconds ?? 10,
                ],
            );

            $statement = $pdo->query($this->probeSql($driver));

            return (array)$statement->fetch(PDO::FETCH_ASSOC);
        } finally {
            $tunnelSession?->close();
        }
    }

    protected function buildDsn(
        DatabaseDriver $driver,
        DbConnection   $connection,
        string         $host,
        int            $port,
    ): string
    {
        return match ($driver) {
            DatabaseDriver::Postgres => sprintf(
                'pgsql:host=%s;port=%s;dbname=%s;sslmode=%s',
                $host,
                $port,
                $connection->database_name,
                $connection->ssl_mode ?: 'prefer',
            ),
            DatabaseDriver::MySql => sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
                $host,
                $port,
                $connection->database_name,
            ),
        };
    }

    protected function probeSql(DatabaseDriver $driver): string
    {
        return match ($driver) {
            DatabaseDriver::Postgres => 'select current_database() as database_name, current_user as user_name',
            DatabaseDriver::MySql => 'select database() as database_name, current_user() as user_name',
        };
    }
}
