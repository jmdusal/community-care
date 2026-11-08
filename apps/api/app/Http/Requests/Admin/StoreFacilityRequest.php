<?php

namespace App\Http\Requests\Admin;

use App\Domain\Facilities\Models\Facility;
use Illuminate\Support\Facades\Gate;

/** Creating a facility: same fields as a proposal, but a name is required. */
final class StoreFacilityRequest extends ProposeFacilityRequest
{
    public function authorize(): bool
    {
        return Gate::allows('create', Facility::class);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [...parent::rules(), 'name' => ['required', 'string', 'max:255']];
    }
}
