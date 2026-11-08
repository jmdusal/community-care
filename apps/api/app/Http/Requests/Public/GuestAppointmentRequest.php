<?php

namespace App\Http\Requests\Public;

use App\Http\Support\PhilippineMobile;
use Illuminate\Foundation\Http\FormRequest;

/** A guest's details for an appointment request (no account). The email gets the code. */
final class GuestAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'mobile' => PhilippineMobile::normalize($this->input('mobile')),
            'email' => is_string($this->input('email')) ? mb_strtolower(trim($this->input('email'))) : $this->input('email'),
        ]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'slot_id' => ['required', 'string', 'size:26'],
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'email' => ['required', 'email', 'max:255'],
            'mobile' => ['required', PhilippineMobile::RULE],
            'privacy_consent' => ['accepted'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'mobile.regex' => PhilippineMobile::MESSAGE,
            'privacy_consent.accepted' => 'Please agree to how we use your details.',
        ];
    }
}
