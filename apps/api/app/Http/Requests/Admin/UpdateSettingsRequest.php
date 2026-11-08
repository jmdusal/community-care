<?php

namespace App\Http\Requests\Admin;

use App\Domain\Settings\SettingsSchema;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator as ValidatorFactory;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Body: {"settings": [{"key": "verification.stale_after_days", "value": 150}, ...]}
 * A list is used because setting keys contain dots, which validation would read as nesting.
 */
final class UpdateSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('manage-settings');
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'settings' => ['required', 'array', 'min:1', 'max:50'],
            'settings.*' => ['required', 'array:key,value'],
            'settings.*.key' => ['required', 'string', 'distinct', Rule::in(app(SettingsSchema::class)->keys())],
            'settings.*.value' => ['present'],
        ];
    }

    /** Each value is validated against the rules its setting declares in SettingsSchema. */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $schema = app(SettingsSchema::class);

                foreach ((array) $this->input('settings', []) as $index => $item) {
                    $key = is_array($item) ? ($item['key'] ?? null) : null;

                    if (! is_string($key) || ! $schema->has($key)) {
                        continue;
                    }

                    $check = ValidatorFactory::make(
                        ['value' => $item['value'] ?? null],
                        ['value' => ['required', ...$schema->definition($key)['rules']]],
                    );

                    foreach ($check->errors()->get('value') as $message) {
                        $validator->errors()->add("settings.{$index}.value", $message);
                    }
                }
            },
        ];
    }

    /** @return array<string, mixed> validated key => value pairs */
    public function changes(): array
    {
        return collect($this->validated('settings'))
            ->mapWithKeys(fn (array $item): array => [$item['key'] => $item['value']])
            ->all();
    }
}
