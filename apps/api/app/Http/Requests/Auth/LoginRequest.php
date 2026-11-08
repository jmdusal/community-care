<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * device_name is required for token sign-in (mobile, API clients). The web
     * app signs in with a cookie session and omits it.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
            'remember' => ['nullable', 'boolean'],
            'device_name' => [Rule::requiredIf(fn (): bool => ! $this->usesSession()), 'nullable', 'string', 'max:100'],
            // Apps send the secret they got from "Remember this device" (the web uses a cookie).
            'trusted_device' => ['nullable', 'string', 'max:100'],
        ];
    }

    /** A request from the web app (stateful domain) carries a session. */
    public function usesSession(): bool
    {
        return $this->hasSession() && ! $this->filled('device_name');
    }
}
