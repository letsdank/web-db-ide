<?php

namespace App\Services\Database;

final class SshTunnelSession
{
    public function __construct(
        public readonly int $localPort,
        private             $process,
        private array       $pipes = [],
    )
    {
    }

    public function close(): void
    {
        foreach ($this->pipes as $pipe) {
            if (is_resource($pipe)) {
                fclose($pipe);
            }
        }

        if (is_resource($this->process)) {
            proc_terminate($this->process);
            proc_close($this->process);
        }
    }
}
