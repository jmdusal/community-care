<?php

namespace App\Domain\Facilities\Actions;

use App\Domain\Facilities\Enums\VerificationStatus;
use App\Domain\Facilities\Events\FacilitiesMarkedStale;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Settings\Contracts\SettingsRepository;

/**
 * Data-driven stale rule: verified records older than the
 * verification.stale_after_days setting become stale. Run nightly.
 */
final class MarkFacilitiesStaleAction
{
    public function __construct(private readonly SettingsRepository $settings) {}

    public function handle(): int
    {
        $days = $this->settings->int('verification.stale_after_days');

        $count = Facility::query()
            ->where('verification_status', VerificationStatus::Verified)
            ->where('verified_at', '<', now()->subDays($days))
            ->update(['verification_status' => VerificationStatus::Stale, 'updated_at' => now()]);

        if ($count > 0) {
            FacilitiesMarkedStale::dispatch($count, $days);
        }

        return $count;
    }
}
