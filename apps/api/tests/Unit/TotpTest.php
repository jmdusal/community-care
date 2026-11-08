<?php

namespace Tests\Unit;

use App\Domain\Identity\TwoFactor\Totp;
use PHPUnit\Framework\TestCase;

final class TotpTest extends TestCase
{
    /** RFC 6238 appendix B test vectors (SHA1, secret "12345678901234567890"), last 6 digits. */
    public function test_matches_the_rfc_6238_test_vectors(): void
    {
        $secret = Totp::base32Encode('12345678901234567890');

        foreach ([59 => '287082', 1111111109 => '081804', 1111111111 => '050471', 1234567890 => '005924', 2000000000 => '279037'] as $time => $code) {
            $this->assertSame($code, Totp::codeAt($secret, Totp::currentStep($time)), "time {$time}");
        }
    }

    public function test_verify_accepts_one_step_of_drift_and_refuses_reuse(): void
    {
        $secret = Totp::newSecret();
        $now = 1_800_000_000;
        $code = Totp::codeAt($secret, Totp::currentStep($now) - 1);

        $step = Totp::verify($secret, $code, null, $now);
        $this->assertSame(Totp::currentStep($now) - 1, $step);
        $this->assertNull(Totp::verify($secret, $code, $step, $now), 'a used code cannot be replayed');
        $this->assertNull(Totp::verify($secret, Totp::codeAt($secret, Totp::currentStep($now) - 3), null, $now), 'old codes are refused');
        $this->assertNull(Totp::verify($secret, 'abc123', null, $now));
    }

    public function test_base32_round_trips_and_uri_is_well_formed(): void
    {
        $this->assertSame('hello world!', Totp::base32Decode(Totp::base32Encode('hello world!')));
        $this->assertStringStartsWith('otpauth://totp/CommunityCare:me%40example.org?secret=', Totp::provisioningUri('CommunityCare', 'me@example.org', 'JBSWY3DPEHPK3PXP'));
    }
}
