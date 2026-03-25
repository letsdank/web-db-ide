<?php

namespace App\Services\Database;

use App\Services\Database\Ssh\SshTunnelSession;

/**
 * Immutable connection endpoint resolved for the current request.
 *
 * For direct connection this contains the original database host/port.
 * For SSH-backed connections this contains the local forwarded endpoint
 * plus an open tunnel handle that must be closed after use.
 */
final class ResolvedConnectionConfig
{
    /**
     * @param string $host Hostname that PDO should connect to.
     * @param int $port Port that PDO should connect to.
     * @param SshTunnelSession|null $tunnelHandle Open SSH tunnel session, if one was created.
     */
    public function __construct(
        public readonly string            $host,
        public readonly int               $port,
        public readonly ?SshTunnelSession $tunnelHandle = null,
    )
    {
    }
}
