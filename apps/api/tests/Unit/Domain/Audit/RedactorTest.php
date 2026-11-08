<?php

namespace Tests\Unit\Domain\Audit;

use App\Domain\Audit\Support\IpMasker;
use App\Domain\Audit\Support\Redactor;
use PHPUnit\Framework\TestCase;

final class RedactorTest extends TestCase
{
    public function test_secrets_and_contact_details_are_masked_at_any_depth(): void
    {
        $redacted = (new Redactor)->redact([
            'verification_status' => 'verified',
            'phone' => '(02) 8123 4567',
            'contacts' => ['email' => 'staff@example.org', 'label' => 'Front desk'],
            'api_token' => 'abc123',
            'address' => 'Quezon City, NCR',
        ]);

        $this->assertSame([
            'verification_status' => 'verified',
            'phone' => Redactor::MASK,
            'contacts' => ['email' => Redactor::MASK, 'label' => 'Front desk'],
            'api_token' => Redactor::MASK,
            'address' => 'Quezon City, NCR',
        ], $redacted);
    }

    public function test_ip_addresses_are_masked(): void
    {
        $this->assertSame('203.177.x.x', IpMasker::mask('203.177.12.34'));
        $this->assertSame('2001:db8:85a3::', IpMasker::mask('2001:db8:85a3:0:0:8a2e:370:7334'));
        $this->assertNull(IpMasker::mask(null));
        $this->assertNull(IpMasker::mask('not-an-ip'));
    }
}
