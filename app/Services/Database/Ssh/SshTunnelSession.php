<?php

namespace App\Services\Database\Ssh;

final class SshTunnelSession
{
    public function __construct(
        public readonly int $localPort,
        private             $process,
        private array       $pipes = [],
        private array       $tempFiles = [],
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
            @proc_terminate($this->process);
            @proc_close($this->process);
        }

        foreach ($this->tempFiles as $path) {
            if (is_string($path) && is_file($path)) {
                @unlink($path);
            }
        }
    }
}
