<?php

namespace App\Http\Requests\Connection;

use Illuminate\Foundation\Http\FormRequest;

class ExportDumpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'format' => ['required', 'in:plain,custom'],
            'scope' => ['required', 'in:database,schema,table'],
            'schema' => ['nullable', 'string', 'required_if:scope,schema,table'],
            'table' => ['nullable', 'string', 'required_if:scope,table'],
            'section' => ['required', 'in:full,schema,data'],

            'clean' => ['nullable', 'boolean'],
            'if_exists' => ['nullable', 'boolean'],
            'no_owner' => ['nullable', 'boolean'],
            'no_privileges' => ['nullable', 'boolean'],
            'include_blobs' => ['nullable', 'boolean'],
        ];
    }

    public function validated($key = null, $default = null): array
    {
        $data = parent::validated($key, $default);

        return [
            'format' => $data['format'],
            'scope' => $data['scope'],
            'schema' => isset($data['schema']) ? trim((string)$data['schema']) : null,
            'table' => isset($data['table']) ? trim((string)$data['table']) : null,
            'section' => $data['section'],
            'clean' => (bool)($data['clean'] ?? false),
            'if_exists' => (bool)($data['if_exists'] ?? false),
            'no_owner' => array_key_exists('no_owner', $data) ? (bool)$data['no_owner'] : true,
            'no_privileges' => array_key_exists('no_privileges', $data) ? (bool)$data['no_privileges'] : true,
            'include_blobs' => (bool)($data['include_blobs'] ?? false),
        ];
    }
}
