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
            'is_read_only' => ['boolean'],
        ];
    }
}
