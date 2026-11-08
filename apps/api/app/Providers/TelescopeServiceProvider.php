<?php

namespace App\Providers;

use App\Domain\Identity\Enums\Permission;
use App\Domain\Identity\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Gate;
use Laravel\Telescope\IncomingEntry;
use Laravel\Telescope\Telescope;
use Laravel\Telescope\TelescopeApplicationServiceProvider;

/**
 * Laravel Telescope: a debugging dashboard at /telescope on the API host.
 * Development only: AppServiceProvider registers it in the local environment,
 * and composer installs it as a dev dependency, so production never loads it.
 */
class TelescopeServiceProvider extends TelescopeApplicationServiceProvider
{
    public function register(): void
    {
        $this->hideSensitiveRequestDetails();

        $isLocal = $this->app->environment('local');

        Telescope::filter(fn (IncomingEntry $entry): bool => $isLocal
            || $entry->isReportableException()
            || $entry->isFailedRequest()
            || $entry->isFailedJob()
            || $entry->isScheduledTask()
            || $entry->hasMonitoredTag());

        // Assistant questions may hold personal or medical details and are never stored.
        // Hiding the "message" field is not enough: retrieval queries contain its words,
        // so nothing from these requests is recorded.
        Telescope::filterBatch(fn (Collection $entries): bool => ! $entries->contains(
            fn (IncomingEntry $entry): bool => $entry->type === 'request'
                && preg_match('#/api/v1/(admin/assistant/preview|assistant/messages)$#', (string) ($entry->content['uri'] ?? '')) === 1,
        ));
    }

    /**
     * Never record secrets or personal text, even locally: passwords, tokens,
     * cookies, and assistant questions (which are never stored anywhere).
     */
    protected function hideSensitiveRequestDetails(): void
    {
        Telescope::hideRequestParameters(['_token', 'password', 'password_confirmation', 'current_password', 'token', 'message']);

        Telescope::hideRequestHeaders(['cookie', 'set-cookie', 'authorization', 'x-csrf-token', 'x-xsrf-token']);

        Telescope::hideResponseParameters(['data.token']);
    }

    /** Outside local development, only active system admins may open Telescope. */
    protected function gate(): void
    {
        Gate::define('viewTelescope', fn (?User $user = null): bool => $user !== null && $user->isActive() && $user->hasPermission(Permission::SettingsManage));
    }
}
