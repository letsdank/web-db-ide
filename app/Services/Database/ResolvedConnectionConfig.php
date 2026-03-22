<?php

namespace App\Services\Database;

use App\Services\Database\Ssh\SshTunnelSession;

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
