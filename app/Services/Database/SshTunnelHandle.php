<?php

namespace App\Services\Database;

use Symfony\Component\Process\Process;

final class SshTunnelHandle
{
    public function __construct(
        public readonly string  $localHost,
        public readonly int     $localPort,
        public readonly Process $process,
        public readonly string  $tempDir,
    )
    {
    }
}
