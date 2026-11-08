<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Settings\Actions\UpdateSettingsAction;
use App\Domain\Settings\Contracts\SettingsRepository;
use App\Domain\Settings\SettingsSchema;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateSettingsRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

final class SettingController extends Controller
{
    public function __construct(
        private readonly SettingsRepository $settings,
        private readonly SettingsSchema $schema,
    ) {}

    public function index(): JsonResponse
    {
        Gate::authorize('manage-settings');

        return response()->json(['data' => $this->present()]);
    }

    public function update(UpdateSettingsRequest $request, UpdateSettingsAction $updateSettings): JsonResponse
    {
        $changed = $updateSettings->handle($request->changes(), $request->user());

        return response()->json([
            'data' => $this->present(),
            'meta' => ['changed' => $changed],
        ]);
    }

    /** @return list<array{key: string, value: mixed, default: mixed, type: string, description: string}> */
    private function present(): array
    {
        $values = $this->settings->all();

        return array_map(fn (string $key): array => [
            'key' => $key,
            'value' => $values[$key],
            'default' => $this->schema->definition($key)['default'],
            'type' => $this->schema->definition($key)['type'],
            'description' => $this->schema->definition($key)['description'],
        ], $this->schema->keys());
    }
}
