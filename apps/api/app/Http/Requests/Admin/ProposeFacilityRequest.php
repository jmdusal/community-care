<?php

namespace App\Http\Requests\Admin;

use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Support\FacilitySnapshot;
use App\Domain\Geography\Support\Distance;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * Proposed facility fields (FacilitySnapshot shape). Every field is optional
 * for an edit; only the fields sent are compared and proposed.
 */
class ProposeFacilityRequest extends FormRequest
{
    private const TIME = '/^([01]\d|2[0-3]):[0-5]\d$/';

    private const TIME_OR_MIDNIGHT = '/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/';

    /** Permission is checked before validation, so callers without access learn nothing about the fields. */
    public function authorize(): bool
    {
        $facility = $this->route('facility');

        return $facility instanceof Facility ? Gate::allows('propose', $facility) : false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $bounds = Distance::PH_BOUNDS;

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'type' => ['sometimes', 'nullable', 'string', Rule::exists('facility_types', 'slug')],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'city_code' => ['sometimes', 'nullable', 'digits:10', Rule::exists('cities_municipalities', 'psgc_code')],
            'barangay_code' => ['sometimes', 'nullable', 'digits:10', Rule::exists('barangays', 'psgc_code')],
            'latitude' => ['sometimes', 'nullable', 'required_with:longitude', 'numeric', "between:{$bounds['min_lat']},{$bounds['max_lat']}"],
            'longitude' => ['sometimes', 'nullable', 'required_with:latitude', 'numeric', "between:{$bounds['min_lng']},{$bounds['max_lng']}"],
            'contacts' => ['sometimes', 'array', 'max:10'],
            'contacts.*.type' => ['required', Rule::in(['phone', 'email', 'website'])],
            'contacts.*.value' => ['required', 'string', 'max:255'],
            'hours' => ['sometimes', 'array', 'max:21'],
            'hours.*.day_of_week' => ['required', 'integer', 'between:1,7'],
            // 00:00–24:00 is open all day; a closing time earlier than the opening time runs past midnight.
            'hours.*.opens_at' => ['required', 'regex:'.self::TIME],
            'hours.*.closes_at' => ['required', 'regex:'.self::TIME_OR_MIDNIGHT, 'different:hours.*.opens_at'],
            'hour_exceptions' => ['sometimes', 'array', 'max:60'],
            'hour_exceptions.*.date' => ['required', 'date_format:Y-m-d', 'distinct', 'after_or_equal:'.FacilitySnapshot::today()],
            'hour_exceptions.*.is_closed' => ['required', 'boolean'],
            'hour_exceptions.*.opens_at' => ['nullable', 'required_if:hour_exceptions.*.is_closed,false', 'regex:'.self::TIME],
            'hour_exceptions.*.closes_at' => ['nullable', 'required_if:hour_exceptions.*.is_closed,false', 'regex:'.self::TIME_OR_MIDNIGHT],
            'hour_exceptions.*.reason' => ['nullable', 'string', 'max:120'],
            'services' => ['sometimes', 'array', 'max:40'],
            'services.*' => ['string', Rule::exists('services', 'slug')],
            'note' => ['nullable', 'string', 'max:500'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'hours.*.opens_at.regex' => 'Use a time such as 08:00.',
            'hours.*.closes_at.regex' => 'Use a time such as 17:00 (24:00 for midnight).',
            'hours.*.closes_at.different' => 'Opening and closing times are the same. For all day, use "Open 24 hours".',
            'hour_exceptions.*.date.after_or_equal' => 'Special days must be today or later.',
            'hour_exceptions.*.date.distinct' => 'Each special day can be listed once.',
            'hour_exceptions.*.opens_at.required_if' => 'Give the opening time, or mark the day as closed.',
            'hour_exceptions.*.closes_at.required_if' => 'Give the closing time, or mark the day as closed.',
        ];
    }

    /** @return array<string, mixed> the proposed values without the note */
    public function proposed(): array
    {
        return collect($this->validated())->except('note')->all();
    }
}
