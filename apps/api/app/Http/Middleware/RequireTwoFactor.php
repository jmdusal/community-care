<?php

namespace App\Http\Middleware;

use App\Domain\Identity\TwoFactor\TwoFactorService;
use App\Http\Support\HasErrorCode;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * Admin API: administrators and verifiers must have two-factor sign-in on before
 * anything else. Until then every admin endpoint answers 403 two_factor_setup_required,
 * and the console shows the setup screen.
 */
final class RequireTwoFactor
{
    public function __construct(private readonly TwoFactorService $twoFactor) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user !== null && ! $user->hasTwoFactor() && $this->twoFactor->isRequiredFor($user)) {
            throw new class('Set up two-factor sign-in to continue.') extends AccessDeniedHttpException implements HasErrorCode
            {
                public function errorCode(): string
                {
                    return 'two_factor_setup_required';
                }
            };
        }

        return $next($request);
    }
}
