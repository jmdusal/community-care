<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

/** Patient sign-up. A Philippine mobile number lets the clinic reach the patient. */
final class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $mobile = preg_replace('/[\s\-()]/', '', (string) $this->input('mobile'));
        $this->merge([
            'email' => mb_strtolower(trim((string) $this->input('email'))),
            'mobile' => preg_match('/^(\+?63|0)?(9\d{9})$/', (string) $mobile, $m) === 1 ? '+63'.$m[2] : $mobile,
        ]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'mobile' => ['required', 'regex:/^\+639\d{9}$/'],
            'password' => ['required', 'confirmed', Password::min(10)],
            'privacy_consent' => ['accepted'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'mobile.regex' => 'Enter a Philippine mobile number, for example 0917 123 4567.',
            'privacy_consent.accepted' => 'Please agree to how we use your details.',
            'email.unique' => 'An account with this email already exists. Sign in instead.',
        ];
    }
}
