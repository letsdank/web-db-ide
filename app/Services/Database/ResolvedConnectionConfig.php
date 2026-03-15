<?php

namespace App\Services\Database;

final class ResolvedConnectionConfig
{
    public function __construct(
        public readonly string           $host,
        public readonly int              $port,
        public readonly ?SshTunnelSession $tunnelHandle = null,
    )
    {
    }
}
