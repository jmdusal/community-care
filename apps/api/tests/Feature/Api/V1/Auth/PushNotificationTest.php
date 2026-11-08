<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Shared\Notifications\InAppNotification;
use App\Domain\Shared\Notifications\PushToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class PushNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_phone_registers_and_receives_push_notifications(): void
    {
        config(['communitycare.push.expo_url' => 'https://push.test/send']);
        Http::preventStrayRequests();
        Http::fake(['push.test/*' => Http::response(['data' => [['status' => 'ok', 'id' => 'abc']]])]);
        $patient = $this->userWithRole(RoleName::Patient);
        Sanctum::actingAs($patient);

        $this->postJson('/api/v1/me/push-tokens', ['token' => 'ExponentPushToken[abc123]', 'platform' => 'ios'])->assertCreated();
        $this->postJson('/api/v1/me/push-tokens', ['token' => 'not-a-token', 'platform' => 'ios'])->assertUnprocessable();

        $patient->notify(new InAppNotification('appointment', 'Appointment confirmed', 'Pilot Center · Mon 8:00 AM', '/account/appointments'));

        Http::assertSent(fn (Request $request): bool => $request[0]['to'] === 'ExponentPushToken[abc123]'
            && $request[0]['title'] === 'Appointment confirmed'
            && $request[0]['data']['path'] === '/account/appointments');
        $this->assertSame(1, $patient->notifications()->count(), 'the in-app copy is still stored');
    }

    public function test_tokens_expo_rejects_are_removed_and_sign_out_unregisters(): void
    {
        config(['communitycare.push.expo_url' => 'https://push.test/send']);
        Http::fake(['push.test/*' => Http::response(['data' => [['status' => 'error', 'details' => ['error' => 'DeviceNotRegistered']]]])]);
        $patient = $this->userWithRole(RoleName::Patient);
        $patient->pushTokens()->create(['token' => 'ExponentPushToken[gone]', 'platform' => 'android']);

        $patient->notify(new InAppNotification('appointment', 'Hello', 'Body', '/account/appointments'));
        $this->assertSame(0, PushToken::query()->count());

        $patient->pushTokens()->create(['token' => 'ExponentPushToken[mine]', 'platform' => 'ios']);
        Sanctum::actingAs($patient);
        $this->deleteJson('/api/v1/me/push-tokens', ['token' => 'ExponentPushToken[mine]'])->assertNoContent();
        $this->assertSame(0, PushToken::query()->count());
    }

    public function test_without_a_phone_no_push_is_attempted(): void
    {
        Http::preventStrayRequests();
        $this->userWithRole(RoleName::Patient)->notify(new InAppNotification('appointment', 'Hello', 'Body', '/x'));
        Http::assertNothingSent();
    }
}
