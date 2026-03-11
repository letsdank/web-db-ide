<?php

namespace App\Http\Requests\QueryTab;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreQueryTabRequest extends FormRequest
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
            'title' => ['nullable', 'string', 'max:255'],
            'sql_text' => ['nullable', 'string'],
            'selected_text' => ['nullable', 'string'],
            'cursor_position' => ['nullable', 'array'],
            'selection_range' => ['nullable', 'array'],
            'is_pinned' => ['nullable', 'boolean'],
        ];
    }
}
