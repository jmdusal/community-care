<?php

namespace App\Http\Requests\Admin;

use App\Domain\DataImports\Enums\StagingDecision;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

final class DecideImportRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('review-imports');
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'decision' => ['required', Rule::in([StagingDecision::Approved->value, StagingDecision::Rejected->value])],
            'reason' => ['nullable', 'required_if:decision,rejected', 'string', 'max:255'],
        ];
    }

    public function decision(): StagingDecision
    {
        return StagingDecision::from($this->validated('decision'));
    }
}
