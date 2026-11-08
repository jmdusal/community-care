<?php

namespace App\Domain\Identity\TwoFactor;

use App\Domain\Identity\Events\TwoFactorChanged;
use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Models\User;
use App\Domain\Settings\Contracts\SettingsRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/**
 * Two-factor sign-in: a code from an authenticator app (TOTP) or a code sent by email,
 * plus one-time recovery codes. The app secret is stored encrypted; email codes and
 * recovery codes only as keyed hashes.
 */
final class TwoFactorService
{
    public const ISSUER = 'CommunityCare';

    private const RECOVERY_CODES = 8;

    public function __construct(
        private readonly SettingsRepository $settings,
        private readonly EmailCodes $emailCodes,
    ) {}

    /** Required when any of the person's roles asks for it (Team & roles) while security.require_mfa_for_staff is on. */
    public function isRequiredFor(User $user): bool
    {
        return (bool) config('communitycare.two_factor.enforced', true)
            && $this->settings->bool('security.require_mfa_for_staff')
            && $user->roles->contains(fn (Role $role) => $role->needsTwoFactor());
    }

    /**
     * Starts setup. "app": a new secret for an authenticator app (QR code).
     * "email": a 6-digit code is emailed now; entering it turns two-factor on.
     *
     * @param  'app'|'email'  $method
     * @return array{method: string, secret?: string, otpauth_uri?: string, sent_to?: string}
     */
    public function startSetup(User $user, string $method = 'app'): array
    {
        if ($user->hasTwoFactor()) {
            throw new ConflictHttpException('Two-factor sign-in is already on. Turn it off first to change how you get codes.');
        }

        if ($method === 'email') {
            $user->forceFill(['two_factor_secret' => null, 'two_factor_method' => 'email', 'two_factor_confirmed_at' => null, 'two_factor_recovery_codes' => null, 'two_factor_last_step' => null])->save();
            $this->emailCodes->send($user, 'setup');

            return ['method' => 'email', 'sent_to' => EmailCodes::mask($user->email)];
        }

        $secret = Totp::newSecret();
        $user->forceFill(['two_factor_secret' => $secret, 'two_factor_method' => 'app', 'two_factor_confirmed_at' => null, 'two_factor_recovery_codes' => null, 'two_factor_last_step' => null])->save();

        return ['method' => 'app', 'secret' => $secret, 'otpauth_uri' => Totp::provisioningUri(self::ISSUER, $user->email, $secret)];
    }

    /**
     * Emails a sign-in code to a person who uses email codes. $resend: the person asked
     * for another one (limited to one every 30 seconds).
     */
    public function sendSignInCode(User $user, bool $resend = false): void
    {
        if ($user->two_factor_method === 'email') {
            $this->emailCodes->send($user, 'sign_in', strict: $resend);
        }
    }

    /**
     * Turns two-factor on after the person proves their app shows the right code.
     *
     * @return list<string>|null the recovery codes (shown once), or null if the code was wrong
     */
    public function confirm(User $user, string $code): ?array
    {
        if ($user->hasTwoFactor() || ($user->two_factor_method !== 'email' && $user->two_factor_secret === null)) {
            throw new ConflictHttpException('Start the setup first.');
        }

        if ($user->two_factor_method === 'email') {
            if (! $this->emailCodes->check($user, 'setup', $code)) {
                return null;
            }
            $step = null;
        } else {
            $step = Totp::verify($user->two_factor_secret, $code);
            if ($step === null) {
                return null;
            }
        }

        return DB::transaction(function () use ($user, $step): array {
            $codes = $this->newRecoveryCodes();
            $user->forceFill([
                'two_factor_confirmed_at' => now(),
                'two_factor_last_step' => $step,
                'two_factor_recovery_codes' => array_map(fn (string $code): string => $this->hash($code), $codes),
                'mfa_enabled' => true,
            ])->save();
            TwoFactorChanged::dispatch('enabled', $user->public_id, $user->id);

            return $codes;
        });
    }

    /** Checks a code from the app, or a one-time recovery code, at sign-in. */
    public function verify(User $user, ?string $code, ?string $recoveryCode): bool
    {
        if (! $user->hasTwoFactor()) {
            return false;
        }

        if ($code !== null && $code !== '' && $user->two_factor_method === 'email') {
            return $this->emailCodes->check($user, 'sign_in', $code);
        }

        if ($code !== null && $code !== '') {
            $step = Totp::verify($user->two_factor_secret, $code, $user->two_factor_last_step);
            if ($step === null) {
                return false;
            }
            $user->forceFill(['two_factor_last_step' => $step])->save();

            return true;
        }

        if ($recoveryCode !== null && $recoveryCode !== '') {
            $hash = $this->hash($recoveryCode);
            $remaining = $user->two_factor_recovery_codes ?? [];
            if (! in_array($hash, $remaining, true)) {
                return false;
            }
            $user->forceFill(['two_factor_recovery_codes' => array_values(array_diff($remaining, [$hash]))])->save();
            TwoFactorChanged::dispatch('recovery_code_used', $user->public_id, $user->id);

            return true;
        }

        return false;
    }

    /** @return list<string> new recovery codes (the old ones stop working) */
    public function regenerateRecoveryCodes(User $user): array
    {
        $codes = $this->newRecoveryCodes();
        $user->forceFill(['two_factor_recovery_codes' => array_map(fn (string $code): string => $this->hash($code), $codes)])->save();
        TwoFactorChanged::dispatch('recovery_codes_regenerated', $user->public_id, $user->id);

        return $codes;
    }

    public function disable(User $user, User $actor): void
    {
        $byAdmin = ! $user->is($actor);
        if (! $byAdmin && $this->isRequiredFor($user)) {
            throw new ConflictHttpException('Two-factor sign-in is required for your role and cannot be turned off.');
        }

        $user->forceFill(['two_factor_secret' => null, 'two_factor_method' => null, 'two_factor_recovery_codes' => null, 'two_factor_confirmed_at' => null, 'two_factor_last_step' => null, 'mfa_enabled' => false])->save();
        app(TrustedDevices::class)->forgetAll($user);

        if ($byAdmin) {
            // A reset after a lost phone: sign the person out everywhere too.
            $user->tokens()->delete();
            $user->setRememberToken(Str::random(60));
            $user->save();
        }

        TwoFactorChanged::dispatch($byAdmin ? 'reset' : 'disabled', $user->public_id, $actor->id);
    }

    public function recoveryCodesLeft(User $user): int
    {
        return count($user->two_factor_recovery_codes ?? []);
    }

    /** @return list<string> e.g. "7KQ2M-9MXDP" */
    private function newRecoveryCodes(): array
    {
        return array_map(fn (): string => strtoupper(Str::random(5)).'-'.strtoupper(Str::random(5)), range(1, self::RECOVERY_CODES));
    }

    private function hash(string $recoveryCode): string
    {
        return hash_hmac('sha256', strtoupper(trim($recoveryCode)), (string) config('app.key'));
    }
}
