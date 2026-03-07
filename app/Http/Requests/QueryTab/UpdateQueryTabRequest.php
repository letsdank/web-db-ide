<?php

namespace App\Http\Requests\QueryTab;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateQueryTabRequest extends FormRequest
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
                    fn ($query) => $query->where('user_id', $this->user()->id)
                ),
            ],
            'title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'sql_text' => ['sometimes', 'nullable', 'string'],
            'selected_text' => ['sometimes', 'nullable', 'string'],
            'cursor_position' => ['sometimes', 'nullable', 'array'],
            'selection_range' => ['sometimes', 'nullable', 'array'],
            'is_pinned' => ['sometimes', 'boolean'],
            'last_executed_at' => ['sometimes', 'nullable', 'date'],
        ];
    }
}
