<?php

namespace App\Http\Requests\Connection;

use Illuminate\Foundation\Http\FormRequest;

class UpdateConnectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'host' => ['sometimes', 'string'],
            'port' => ['sometimes', 'integer'],
            'database_name' => ['sometimes', 'string'],
            'username' => ['sometimes', 'string'],
            'password' => ['nullable', 'string'],

            'ssl_mode' => ['nullable', 'string'],
            'schema_default' => ['nullable', 'string'],
            'color' => ['nullable', 'string'],
            'visibility' => ['nullable', 'in:private,shared'],
            'is_read_only' => ['boolean'],

            // SSH
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
