<?php

namespace App\Domain\Settings\Actions;

use App\Domain\Identity\Models\User;
use App\Domain\Settings\Contracts\SettingsRepository;
use App\Domain\Settings\Events\SettingUpdated;
use App\Domain\Settings\SettingsSchema;
use Illuminate\Support\Facades\DB;

final class UpdateSettingsAction
{
    public function __construct(
        private readonly SettingsRepository $settings,
        private readonly SettingsSchema $schema,
    ) {}

    /**
     * @param  array<string, mixed>  $changes  validated key => value pairs
     * @return list<string> the keys whose value actually changed
     */
    public function handle(array $changes, User $actor): array
    {
        return DB::transaction(function () use ($changes, $actor): array {
            $changed = [];

            foreach ($changes as $key => $value) {
                $new = $this->schema->coerce($key, $value);
                $old = $this->settings->get($key);

                if ($old === $new) {
                    continue;
                }

                $this->settings->write($key, $new, $actor->id);
                SettingUpdated::dispatch($key, $old, $new, $actor->id);
                $changed[] = $key;
            }

            return $changed;
        });
    }
}
