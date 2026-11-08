<?php

namespace Tests\Feature\Api\V1\Public;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class HealthTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_reports_ok_with_database_and_cache_checks(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertOk()
            ->assertJsonPath('data.status', 'ok')
            ->assertJsonPath('data.checks.database', 'ok')
            ->assertJsonPath('data.checks.cache', 'ok')
            ->assertJsonStructure(['data' => ['status', 'checks', 'drivers' => ['cache', 'queue'], 'time']]);
    }

    public function test_every_api_response_carries_a_request_id(): void
    {
        $response = $this->getJson('/api/v1/health');

        $this->assertMatchesRegularExpression('/^req_[0-9A-Z]{26}$/', (string) $response->headers->get('X-Request-Id'));
    }

    public function test_a_valid_incoming_request_id_is_kept(): void
    {
        $response = $this->getJson('/api/v1/health', ['X-Request-Id' => 'client-trace-12345']);

        $response->assertHeader('X-Request-Id', 'client-trace-12345');
    }
}
