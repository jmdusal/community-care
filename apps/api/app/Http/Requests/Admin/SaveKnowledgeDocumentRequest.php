<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

final class SaveKnowledgeDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('manage-knowledge');
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:200'],
            'body' => ['required', 'string', 'min:20', 'max:20000'],
            'topic' => ['nullable', 'string', 'max:60'],
            'source_name' => ['required', 'string', 'max:200'],
            'source_url' => ['nullable', 'url:https,http', 'max:2048'],
            'verified_at' => ['nullable', 'date', 'before_or_equal:now'],
        ];
    }
}
