<?php

namespace App\Http\Requests\Programs;

use App\Domain\HealthPrograms\Enums\ProgramCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

final class SaveHealthProgramRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('manage-programs');
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:200'],
            'category' => ['required', Rule::enum(ProgramCategory::class)],
            'summary' => ['required', 'string', 'max:300'],
            'description' => ['required', 'string', 'max:10000'],
            'starts_on' => ['required', 'date'],
            'ends_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
            'source_name' => ['nullable', 'string', 'max:200'],
            'source_url' => ['nullable', 'url:https,http', 'max:2048'],
            'facility_ids' => ['present', 'array', 'max:500'],
            'facility_ids.*' => ['string', 'size:26', 'distinct'],
        ];
    }

    /** @return array<string, mixed> */
    public function fields(): array
    {
        return collect($this->validated())->except('facility_ids')->all();
    }
}
