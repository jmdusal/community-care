<?php

namespace App\Providers;

use App\Domain\Settings\Contracts\SettingsRepository;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Telescope is a dev dependency: load it only in local development.
        if ($this->app->environment('local') && class_exists(\Laravel\Telescope\TelescopeServiceProvider::class)) {
            $this->app->register(\Laravel\Telescope\TelescopeServiceProvider::class);
            $this->app->register(TelescopeServiceProvider::class);
        }
    }

    public function boot(): void
    {
        $this->configureRateLimiting();

        // Password-reset emails link to the web app, not to a Laravel route.
        ResetPassword::createUrlUsing(fn (object $user, string $token): string => rtrim((string) config('communitycare.frontend_url'), '/')
            .'/reset-password?'.http_build_query(['token' => $token, 'email' => $user->getEmailForPasswordReset()]));
    }

    /**
     * Limits are data-driven: they are read from settings on each request,
     * so an admin can change them without a deployment.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('login', function (Request $request): Limit {
            $perMinute = app(SettingsRepository::class)->int('api.rate_limit.login');

            return Limit::perMinute($perMinute)->by(strtolower((string) $request->input('email')).'|'.$request->ip());
        });

        RateLimiter::for('search', function (Request $request): Limit {
            $perMinute = app(SettingsRepository::class)->int('api.rate_limit.search');

            return Limit::perMinute($perMinute)->by($request->ip());
        });

        // Guest booking sends emails and checks reference codes: few per IP, fewer per email address.
        RateLimiter::for('guest-booking', fn (Request $request): array => [
            Limit::perMinute(10)->by('ip|'.$request->ip()),
            Limit::perHour(10)->by('email|'.strtolower((string) $request->input('email'))),
        ]);

        RateLimiter::for('assistant', function (Request $request): Limit {
            $perMinute = app(SettingsRepository::class)->int('api.rate_limit.assistant');

            return Limit::perMinute($perMinute)->by($request->ip());
        });
    }
}
