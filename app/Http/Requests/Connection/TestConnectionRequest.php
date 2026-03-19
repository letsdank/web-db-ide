<?php

namespace App\Http\Requests\Connection;

use App\Enums\DatabaseDriver;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TestConnectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'max:255'],
            'driver' => ['required', Rule::in(DatabaseDriver::values())],
            'host' => ['required', 'string'],
            'port' => ['required', 'integer', 'min:1', 'max:65535'],
            'database_name' => ['required', 'string'],
            'username' => ['required', 'string'],
            'password' => ['nullable', 'string'],

            'ssl_mode' => ['nullable', 'string'],
            'schema_default' => ['nullable', 'string'],
            'color' => ['nullable', 'string'],
            'is_read_only' => ['nullable', 'boolean'],
            'connect_timeout_seconds' => ['nullable', 'integer', 'min:1', 'max:120'],
            'query_timeout_seconds' => ['nullable', 'integer', 'min:1', 'max:600'],

            'use_ssh_tunnel' => ['nullable', 'boolean'],
            'ssh_host' => ['nullable', 'string', 'max:255'],
            'ssh_port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'ssh_username' => ['nullable', 'string', 'max:255'],
            'ssh_password' => ['nullable', 'string'],
            'ssh_private_key' => ['nullable', 'string'],
            'ssh_passphrase' => ['nullable', 'string'],
            'ssh_known_host_fingerprint' => ['nullable', 'string', 'max:255'],
        ];
    }
}
