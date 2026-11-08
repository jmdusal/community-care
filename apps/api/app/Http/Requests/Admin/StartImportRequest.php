<?php

namespace App\Http\Requests\Admin;

use App\Domain\DataImports\Support\AdapterRegistry;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

final class StartImportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('import-datasets');
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $sources = array_column(app(AdapterRegistry::class)->describe(), 'key');

        return [
            'source' => ['required', 'string', Rule::in($sources)],
            'file' => ['required', 'file', 'mimes:csv,txt', 'extensions:csv', 'max:51200'],
            'source_version' => ['nullable', 'string', 'max:40'],
            'usage_terms' => ['required', 'string', 'min:5', 'max:2000'],
            'terms_recorded' => ['accepted'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'terms_recorded.accepted' => "Confirm that the file's source, date, version and usage terms are recorded.",
        ];
    }
}
