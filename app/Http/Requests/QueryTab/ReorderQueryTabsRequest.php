<?php

namespace App\Http\Requests\QueryTab;

use Illuminate\Foundation\Http\FormRequest;

class ReorderQueryTabsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'tabs' => ['required', 'array', 'min:1'],
            'tabs.*.id' => ['required', 'integer'],
            'tabs.*.sort_order' => ['required', 'integer', 'min:0'],
        ];
    }
}
