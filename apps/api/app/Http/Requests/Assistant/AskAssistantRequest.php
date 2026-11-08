<?php

namespace App\Http\Requests\Assistant;

use App\Domain\KnowledgeAssistant\Data\AssistantQuestion;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

/** A question for the assistant. Location is optional and only used to sort facilities. */
final class AskAssistantRequest extends FormRequest
{
    /** Public on /assistant/messages; the admin test console needs the knowledge permission (checked before validation). */
    public function authorize(): bool
    {
        return $this->routeIs('v1.admin.*') ? Gate::allows('manage-knowledge') : true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'message' => ['required', 'string', 'min:3', 'max:500'],
            'region_code' => ['nullable', 'digits:10'],
            'lat' => ['nullable', 'required_with:lng', 'numeric', 'between:4,22'],
            'lng' => ['nullable', 'required_with:lat', 'numeric', 'between:116,127.5'],
        ];
    }

    public function toQuestion(string $channel): AssistantQuestion
    {
        return new AssistantQuestion(
            text: trim($this->string('message')->value()),
            regionCode: $this->input('region_code'),
            latitude: $this->filled('lat') ? (float) $this->input('lat') : null,
            longitude: $this->filled('lng') ? (float) $this->input('lng') : null,
            channel: $channel,
        );
    }
}
