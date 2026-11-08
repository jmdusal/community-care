<?php

namespace Tests\Feature\Api\V1;

use App\Domain\Identity\Enums\RoleName;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Route as Router;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Walks the real route table, so a new admin endpoint without protection fails here
 * even if nobody remembered to write a test for it.
 */
final class RouteProtectionTest extends TestCase
{
    use RefreshDatabase;

    /** @return list<array{0: string, 1: string}> [method, uri] of every admin API route */
    private function adminRoutes(): array
    {
        $routes = [];
        foreach (Router::getRoutes() as $route) {
            /** @var Route $route */
            if (! str_starts_with($route->uri(), 'api/v1/admin/')) {
                continue;
            }
            foreach (array_diff($route->methods(), ['HEAD']) as $method) {
                // Fill {placeholders}: route constraints first, else a well-formed id that does not exist.
                $uri = preg_replace_callback('/\{(\w+)\??\}/', fn (array $m): string => match ($m[1]) {
                    'action' => str_contains($route->uri(), 'queue/') ? 'call' : (str_contains($route->uri(), 'facility-reports/') ? 'resolve' : 'confirm'),
                    'catalog' => 'services',
                    default => '01aaaaaaaaaaaaaaaaaaaaaaaa',
                }, $route->uri());
                $routes[] = [$method, '/'.$uri];
            }
        }

        $this->assertGreaterThan(40, count($routes), 'the admin route table was not found');

        return $routes;
    }

    public function test_every_admin_route_requires_sign_in(): void
    {
        foreach ($this->adminRoutes() as [$method, $uri]) {
            $this->json($method, $uri)->assertStatus(401);
        }
    }

    public function test_patients_get_nothing_from_any_admin_route(): void
    {
        Sanctum::actingAs($this->userWithRole(RoleName::Patient));

        foreach ($this->adminRoutes() as [$method, $uri]) {
            $status = $this->json($method, $uri)->getStatusCode();
            $this->assertContains($status, [403, 404, 422], "{$method} {$uri} answered {$status} to a patient");
            $this->assertNotSame(422, $status, "{$method} {$uri} validated input before checking permission");
        }
    }

    public function test_api_responses_carry_security_headers(): void
    {
        $this->getJson('/api/v1/health')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'no-referrer');
    }
}
