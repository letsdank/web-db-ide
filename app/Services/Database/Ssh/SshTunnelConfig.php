<?php

namespace App\Services\Database\Ssh;

final class SshTunnelConfig
{
    public function __construct(
        public readonly string  $sshHost,
        public readonly int     $sshPort,
        public readonly string  $sshUsername,
        public readonly ?string $sshPassword,
        public readonly ?string $sshPrivateKey,
        public readonly ?string $sshPassphrase,
        public readonly string  $targetHost,
        public readonly int     $targetPort,
    )
    {
    }
}
