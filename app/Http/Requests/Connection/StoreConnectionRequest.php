<?php

namespace App\Http\Requests\Connection;

use Illuminate\Foundation\Http\FormRequest;

class StoreConnectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'driver' => ['required', 'string'],
            'host' => ['required', 'string'],
            'port' => ['required', 'integer'],
            'database_name' => ['required', 'string'],
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],

            'ssl_mode' => ['nullable', 'string'],
            'schema_default' => ['nullable', 'string'],
            'color' => ['nullable', 'string'],
            'is_read_only' => ['boolean'],
        ];
    }
}
