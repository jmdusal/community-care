<?php

namespace App\Http\Requests\Booking;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

final class GenerateAvailabilityRequest extends FormRequest
{
    /** Only the facility's staff (or a system admin) may add slots; checked before validation. */
    public function authorize(): bool
    {
        return Gate::allows('manage-schedule', $this->route('facility'));
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'from_date' => ['required', 'date', 'after_or_equal:today'],
            'to_date' => ['required', 'date', 'after_or_equal:from_date', 'before_or_equal:'.now()->addDays(90)->toDateString()],
            'weekdays' => ['required', 'array', 'min:1'],
            'weekdays.*' => ['integer', 'between:0,6', 'distinct'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'slot_minutes' => ['required', 'integer', 'in:15,20,30,45,60,90,120'],
            'capacity' => ['required', 'integer', 'min:1', 'max:200'],
            'service' => ['nullable', 'string', 'exists:services,slug'],
        ];
    }
}
