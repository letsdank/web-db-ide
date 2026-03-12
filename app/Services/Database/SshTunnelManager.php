<?php

namespace App\Services\Database;

use App\Models\DbConnection;
use RuntimeException;
use Symfony\Component\Process\Process;

class SshTunnelManager
{
    public function open(DbConnection $connection): SshTunnelHandle
    {
        if (!$connection->usesSshTunnel()) {
            throw new RuntimeException('SSH tunnel is not enabled for this connection.');
        }

        $config = new SshTunnelConfig(
            sshHost: (string)$connection->ssh_host,
            sshPort: (int)($connection->ssh_port ?: 22),
            sshUsername: (string)$connection->ssh_username,
            sshPassword: $connection->ssh_password_encrypted
                ? decrypt($connection->ssh_password_encrypted)
                : null,
            sshPrivateKey: $connection->ssh_private_key_encrypted
                ? decrypt($connection->ssh_private_key_encrypted)
                : null,
            sshPassphrase: $connection->ssh_passphrase_encrypted
                ? decrypt($connection->ssh_passphrase_encrypted)
                : null,
            targetHost: (string)$connection->host,
            targetPort: (int)$connection->port,
        );

        return $this->spawnTunnel($connection);
    }

    protected function spawnTunnel(SshTunnelConfig $config): SshTunnelHandle
    {
        $localPort = $this->findFreeLocalPort();

        $tmpDir = storage_path('app/ssh-tunnels/' . uniqid('ssh_', true));
        if (!is_dir($tmpDir) && !mkdir($tmpDir, 0700, true) && !is_dir($tmpDir)) {
            throw new RuntimeException('Failed to create SSH temp directory.');
        }

        $identityFile = null;
        if ($config->sshPrivateKey) {
            $identityFile = $tmpDir . '/id_key';
            file_put_contents($identityFile, $config->sshPrivateKey);
            chmod($identityFile, 0600);
        }

        $askPassScript = null;
        $env = [
            'DISPLAY' => 'dummy:0',
            'SSH_ASKPASS_REQUIRE' => 'force',
        ];

        if ($config->sshPassword !== null && $config->sshPassword !== '') {
            $askPassScript = $tmpDir . '/askpass.sh';
            file_put_contents(
                $askPassScript,
                "#!/bin/sh\n" .
                "printf '%s' " . escapeshellarg($config->sshPassword) . "\n"
            );
            chmod($askPassScript, 0700);
            $env['SSH_ASKPASS'] = $askPassScript;
        }

        $command = [
            'ssh',
            '-N',
            '-L', sprintf('%d:%s:%d', $localPort, $config->targetHost, $config->targetPort),
            '-p', (string)$config->sshPort,
            '-o', 'ExitOnForwardFailure=yes',
            '-o', 'StrictHostKeyChecking=no',
            '-o', 'UserKnownHostsFile=/dev/null',
            '-o', 'ServerAliveInterval=30',
            '-o', 'ServerAliveCountMax=3',
        ];

        if ($identityFile) {
            $command[] = '-i';
            $command[] = $identityFile;
        }

        $command[] = sprintf('%s@%s', $config->sshUsername, $config->sshHost);

        $process = new Process($command, null, $env, null, 15);
        $process->start();

        usleep(700000);

        if (!$process->isRunning()) {
            $output = $process->getErrorOutput() ?: $process->getOutput() ?: 'Unknown SSH error.';
            $this->cleanupTempDir($tmpDir);

            throw new RuntimeException('Failed to establish SSH tunnel: ' . trim($output));
        }

        return new SshTunnelHandle(
            localHost: '127.0.0.1',
            localPort: $localPort,
            process: $process,
            tempDir: $tmpDir,
        );
    }

    protected function findFreeLocalPort(): int
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

    public function close(SshTunnelHandle $handle): void
    {
        if ($handle->process->isRunning()) {
            $handle->process->stop(1);
        }

        $this->cleanupTempDir($handle->tempDir);
    }

    protected function cleanupTempDir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }

        foreach (scandir($dir) ?: [] as $file) {
            if (in_array($file, ['.', '..'], true)) {
                continue;
            }

            $path = $dir . DIRECTORY_SEPARATOR . $file;
            if (is_file($path)) {
                @unlink($path);
            }
        }

        @rmdir($dir);
    }
}
