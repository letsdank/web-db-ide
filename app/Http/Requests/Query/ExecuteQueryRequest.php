<?php

namespace App\Http\Requests\Query;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ExecuteQueryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'connection_id' => [
                'required',
                'integer',
                Rule::exists('db_connections', 'id')->where(
                    fn($query) => $query->where('user_id', $this->user()->id)
                ),
            ],
            'query_tab_id' => [
                'nullable',
                'integer',
                Rule::exists('query_tabs', 'id')->where(
                    fn($query) => $query->where('user_id', $this->user()->id)
                ),
            ],
            'sql' => ['required', 'string'],
            'selected_sql' => ['nullable', 'string'],
            'max_rows' => ['nullable', 'integer', 'in:100,500,1000'],
            'save_to_history' => ['boolean'],
        ];
    }
}
