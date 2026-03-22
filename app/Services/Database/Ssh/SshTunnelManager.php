<?php

namespace App\Services\Database\Ssh;

use App\Models\DbConnection;
use RuntimeException;
use Throwable;

class SshTunnelManager
{
    public function open(DbConnection $connection): SshTunnelSession
    {
        if (!$connection->use_ssh_tunnel) {
            throw new RuntimeException('SSH tunnel is not enabled for this connection.');
        }

        $localPort = $this->findFreeLocalPort();
        $tempFiles = [];

        [$command, $env] = $this->buildSshCommand($connection, $localPort, $tempFiles);

        $descriptorDesc = [
            0 => ['file', '/dev/null', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $process = proc_open($command, $descriptorDesc, $pipes, null, $env);

        if (!is_resource($process)) {
            $this->cleanupTempFiles($tempFiles);
            throw new RuntimeException('Failed to start SSH tunnel process.');
        }

        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);

        try {
            $this->waitUntilTunnelIsReady($process, $pipes, $localPort);
        } catch (Throwable $e) {
            foreach ($pipes as $pipe) {
                if (is_resource($pipe)) {
                    fclose($pipe);
                }
            }

            @proc_terminate($process);
            @proc_close($process);
            $this->cleanupTempFiles($tempFiles);

            throw $e;
        }

        return new SshTunnelSession($localPort, $process, $pipes, $tempFiles);
    }

    private function buildSshCommand(DbConnection $connection, int $localPort, array &$tempFiles): array
    {
        $sshHost = trim((string)$connection->ssh_host);
        $sshPort = (int)($connection->ssh_port ?: 22);
        $sshUser = trim((string)$connection->ssh_username);

        if ($sshHost === '' || $sshUser === '') {
            throw new RuntimeException('SSH host and SSH username are required.');
        }

        $targetHost = trim((string)$connection->host);
        $targetPort = (int)$connection->port;

        if ($targetHost === '' || $targetPort <= 0) {
            throw new RuntimeException('Database host and port are required for SSH tunneling.');
        }

        $command = [
            'ssh',
            '-v',
            '-p', (string)$sshPort,
            '-N',
            '-L', sprintf('127.0.0.1:%d:%s:%d', $localPort, $targetHost, $targetPort),
            '-o', 'ExitOnForwardFailure=yes',
            '-o', 'BatchMode=no',
            '-o', 'ConnectTimeout=8',
            '-o', 'ServerAliveInterval=30',
            '-o', 'ServerAliveCountMax=3',
            '-o', 'StrictHostKeyChecking=no',
            '-o', 'UserKnownHostsFile=/dev/null',
        ];

        $env = [
            'PATH' => (string)env('PATH', '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'),
            'HOME' => base_path('storage/app/ssh-home'),
        ];

        $this->ensureDirectoryExists($env['HOME']);

        $askpassSecret = null;

        $hasPrivateKey = filled($connection->ssh_private_key_encrypted);
        $hasPassword = filled($connection->ssh_password_encrypted);

        if ($hasPrivateKey) {
            $privateKey = decrypt($connection->ssh_private_key_encrypted);
            $privateKeyPath = $this->createTempFile('ssh-key-', $privateKey, 0600);
            $tempFiles[] = $privateKeyPath;

            $command[] = '-i';
            $command[] = $privateKeyPath;

            if (filled($connection->ssh_passphrase_encrypted)) {
                $askpassSecret = decrypt($connection->ssh_passphrase_encrypted);
            }
        } else if ($hasPassword) {
            $askpassSecret = decrypt($connection->ssh_password_encrypted);
        } else {
            throw new RuntimeException(
                'SSH authentication data is missing. Provide either SSH password or SSH private key.'
            );
        }

        if ($askpassSecret !== null && $askpassSecret !== '') {
            $askpassSecretFile = $this->createTempFile('ssh-askpass-secret-', $askpassSecret, 0600);
            $askpassScriptFile = $this->createTempFile(
                'ssh-askpass-script-',
                <<<'BASH'
#!/usr/bin/env bash
cat "$SSH_ASKPASS_SECRET_FILE"
BASH,
                0700,
            );

            $tempFiles[] = $askpassSecretFile;
            $tempFiles[] = $askpassScriptFile;

            $env['DISPLAY'] = 'ssh-askpass:0';
            $env['SSH_ASKPASS'] = $askpassScriptFile;
            $env['SSH_ASKPASS_REQUIRE'] = 'force';
            $env['SSH_ASKPASS_SECRET_FILE'] = $askpassSecretFile;
        }

        $command[] = sprintf('%s@%s', $sshUser, $sshHost);

        return [$command, $env];
    }

    private function waitUntilTunnelIsReady($process, array $pipes, int $localPort): void
    {
        $deadline = microtime(true) + 8.0;
        $stderrBuffer = '';
        $stdoutBuffer = '';

        do {
            $status = proc_get_status($process);

            if (is_resource($pipes[1])) {
                $stdoutChunk = stream_get_contents($pipes[1]);
                if ($stdoutChunk !== false && $stdoutChunk !== '') {
                    $stdoutBuffer .= $stdoutChunk;
                }
            }

            if (is_resource($pipes[2])) {
                $stderrChunk = stream_get_contents($pipes[2]);
                if ($stderrChunk !== false && $stderrChunk !== '') {
                    $stderrBuffer .= $stderrChunk;
                }
            }

            if (!$status['running']) {
                throw new RuntimeException(
                    'SSH tunnel exited before becoming ready.'
                    . ($stderrBuffer !== '' ? ' STDERR: ' . trim($stderrBuffer) : '')
                    . ($stdoutBuffer !== '' ? ' STDOUT: ' . trim($stdoutBuffer) : '')
                );
            }

            $socket = @fsockopen('127.0.0.1', $localPort, $errno, $errstr, 0.2);

            if (is_resource($socket)) {
                fclose($socket);
                return;
            }

            usleep(100_000);
        } while (microtime(true) < $deadline);

        if (is_resource($pipes[1])) {
            $stdoutChunk = stream_get_contents($pipes[1]);
            if ($stdoutChunk !== false && $stdoutChunk !== '') {
                $stdoutBuffer .= $stdoutChunk;
            }
        }

        if (is_resource($pipes[2])) {
            $stderrChunk = stream_get_contents($pipes[2]);
            if ($stderrChunk !== false && $stderrChunk !== '') {
                $stderrBuffer .= $stderrChunk;
            }
        }

        throw new RuntimeException(
            'SSH tunnel did not become ready on 127.0.0.1:' . $localPort
            . ($stderrBuffer !== '' ? '. STDERR: ' . trim($stderrBuffer) : '')
            . ($stdoutBuffer !== '' ? '. STDOUT: ' . trim($stdoutBuffer) : '')
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

    private function createTempFile(string $prefix, string $contents, int $mode): string
    {
        $path = tempnam(sys_get_temp_dir(), $prefix);

        if ($path === false) {
            throw new RuntimeException('Failed to create temporary file.');
        }

        if (file_put_contents($path, $contents) === false) {
            @unlink($path);
            throw new RuntimeException('Failed to write temporary file.');
        }

        @chmod($path, $mode);

        return $path;
    }

    private function cleanupTempFiles(array $tempFiles): void
    {
        foreach ($tempFiles as $path) {
            if (is_string($path) && is_file($path)) {
                @unlink($path);
            }
        }
    }

    private function ensureDirectoryExists(string $path): void
    {
        if (is_dir($path)) {
            return;
        }

        if (!mkdir($path, 0700, true) && !is_dir($path)) {
            throw new RuntimeException(sprintf('Failed to create directory %s', $path));
        }
    }
}
