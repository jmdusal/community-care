<?php

namespace Tests\Feature\Api\V1;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class ErrorFormatTest extends TestCase
{
    use RefreshDatabase;

    public function test_unknown_endpoint_returns_the_standard_not_found_error(): void
    {
        $this->getJson('/api/v1/does-not-exist')
            ->assertNotFound()
            ->assertExactJsonStructure(['error' => ['code', 'message']])
            ->assertJsonPath('error.code', 'not_found');
    }

    public function test_protected_endpoint_without_credentials_returns_unauthenticated(): void
    {
        $this->getJson('/api/v1/me')
            ->assertUnauthorized()
            ->assertJsonPath('error.code', 'unauthenticated')
            ->assertJsonStructure(['error' => ['code', 'message', 'request_id']]);
    }

    public function test_validation_errors_list_fields_under_error(): void
    {
        $this->postJson('/api/v1/auth/login', [])
            ->assertUnprocessable()
            ->assertJsonPath('error.code', 'validation_failed')
            ->assertJsonStructure(['error' => ['code', 'message', 'fields' => ['email', 'password', 'device_name'], 'request_id']]);
    }
}
