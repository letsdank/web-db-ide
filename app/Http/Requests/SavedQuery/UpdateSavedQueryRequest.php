<?php

namespace App\Http\Requests\SavedQuery;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSavedQueryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'db_connection_id' => [
                'nullable',
                'integer',
                Rule::exists('db_connections', 'id')->where(
                    fn($query) => $query->where('user_id', $this->user()->id)
                ),
            ],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'sql_text' => ['sometimes', 'required', 'string'],
            'folder' => ['nullable', 'string', 'max:255'],
            'visibility' => ['nullable', 'in:private,shared'],
        ];
    }
}
