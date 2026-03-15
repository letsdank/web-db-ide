<?php

namespace App\Services\Database;

use App\Models\DbConnection;
use RuntimeException;
use Symfony\Component\Process\Process;

class SshTunnelManager
{
    public function open(DbConnection $connection): SshTunnelSession
    {
        $localPort = $this->findFreeLocalPort();

        $sshHost = $connection->ssh_host;
        $sshPort = (int)($connection->ssh_port ?: 22);
        $sshUser = $connection->ssh_username;

        $targetHost = $connection->host;
        $targetPort = (int)$connection->port;

        $command = [
            'ssh',
            '-p', (string)$sshPort,
            '-N',
            '-L', sprintf('127.0.0.1:%d:%s:%d', $localPort, $targetHost, $targetPort),
            '-o', 'ExitOnForwardFailure=yes',
            '-o', 'ServerAliveInterval=30',
            '-o', 'ServerAliveCountMax=3',
            '-o', 'StrictHostKeyChecking=no',
            sprintf('%s@%s', $sshUser, $sshHost),
        ];

        $descriptorSpec = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $process = proc_open($command, $descriptorSpec, $pipes);

        if (!is_resource($process)) {
            throw new RuntimeException('Failed to start SSH tunnel process.');
        }

        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);

        $this->waitUntilTunnelIsReady($process, $pipes, $localPort);

        return new SshTunnelSession($localPort, $process, $pipes);
    }

    private function waitUntilTunnelIsReady($process, array $pipes, int $localPort): void
    {
        $deadline = microtime(true) + 5.0;

        do {
            $status = proc_get_status($process);

            if (!$status['running']) {
                $stderr = is_resource($pipes[2]) ? stream_get_contents($pipes[2]) : '';
                throw new RuntimeException(
                    'SSH tunnel exited before becoming ready.'
                    . ($stderr ? ' STDERR: ' . trim($stderr) : '')
                );
            }

            $socket = @fsockopen('127.0.0.1', $localPort, $errno, $errstr, 0.2);

            if (is_resource($socket)) {
                fclose($socket);
                return;
            }

            usleep(100_000);
        } while (microtime(true) < $deadline);

        $stderr = is_resource($pipes[2]) ? stream_get_contents($pipes[2]) : '';

        throw new RuntimeException(
            sprintf(
                'SSH tunnel did not become ready on 127.0.0.1:%d.%s',
                $localPort,
                $stderr ? ' STDERR: ' . trim($stderr) : '',
            )
        );
    }

    private function findFreeLocalPort(): int
    {
        $socket = stream_socket_server('tcp://127.0.0.1:0', $errno, $errstr);
        if (!$socket) {
            throw new RuntimeException("Failed to allocate local port: $errstr");
        }

        $name = stream_socket_get_name($socket, false);
        fclose($socket);

        if (!$name || !str_contains($name, ':')) {
            throw new RuntimeException('Failed to detect allocated local port.');
        }

        return (int)substr(strrchr($name, ':'), 1);
    }
}
