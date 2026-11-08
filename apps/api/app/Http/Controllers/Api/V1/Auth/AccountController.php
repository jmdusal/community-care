<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Domain\Booking\Actions\ChangeAppointmentStatus;
use App\Domain\Booking\Enums\AppointmentStatus;
use App\Domain\Booking\Models\Appointment;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Events\UserAccessChanged;
use App\Domain\Identity\Models\User;
use App\Domain\Identity\TwoFactor\TrustedDevices;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Http\Support\PhilippineMobile;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/**
 * The signed-in person's own account: name and mobile, password, and (patients only)
 * deleting the account. Email stays fixed because it is the sign-in and the two-factor channel.
 */
final class AccountController extends Controller
{
    public function update(Request $request): UserResource
    {
        $user = $request->user();
        $request->merge(['mobile' => PhilippineMobile::normalize($request->input('mobile'))]);
        $input = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'min:2', 'max:120'],
            'mobile' => [$this->isPatientOnly($user) ? 'required' : 'nullable', PhilippineMobile::RULE],
        ], ['mobile.regex' => PhilippineMobile::MESSAGE]);

        $before = ['name' => $user->name, 'mobile' => $user->mobile];
        $user->update($input);
        if ($user->wasChanged()) {
            UserAccessChanged::dispatch('user.profile_updated', $user->public_id, $user->id, $before, ['name' => $user->name, 'mobile' => $user->mobile]);
        }

        return new UserResource($user->load(['roles', 'facilities:id,public_id,name']));
    }

    /** Needs the current password. Signs out every other device (tokens and "keep me signed in"). */
    public function password(Request $request): Response
    {
        $user = $request->user();
        $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', 'different:current_password', PasswordRule::min(6)->letters()->numbers()],
        ], ['password.different' => 'Choose a password different from the current one.']);

        if (! Hash::check($request->string('current_password')->toString(), $user->password)) {
            throw ValidationException::withMessages(['current_password' => ['That is not your current password.']]);
        }

        $current = $user->currentAccessToken();
        $user->forceFill(['password' => $request->string('password')->toString()])->setRememberToken(Str::random(60));
        $user->save();
        $user->tokens()->when($current instanceof PersonalAccessToken, fn ($q) => $q->whereKeyNot($current->getKey()))->delete();
        app(TrustedDevices::class)->forgetAll($user);

        UserAccessChanged::dispatch('user.password_changed', $user->public_id, $user->id, null, ['password' => 'changed']);

        return response()->noContent();
    }

    /**
     * Deletes a patient account. Upcoming appointments are cancelled (the seats open again and
     * the clinics are told). Past appointment records stay with the clinic under the name only;
     * the email and mobile number are removed from them.
     */
    public function destroy(Request $request, ChangeAppointmentStatus $change): Response
    {
        $user = $request->user();
        if (! $this->isPatientOnly($user)) {
            throw new ConflictHttpException('Staff accounts are closed by an administrator, not deleted here.');
        }
        $request->validate(['password' => ['required', 'string']]);
        if (! Hash::check($request->string('password')->toString(), $user->password)) {
            throw ValidationException::withMessages(['password' => ['That is not your password.']]);
        }

        Appointment::query()->where('patient_id', $user->id)
            ->whereIn('status', [AppointmentStatus::Requested, AppointmentStatus::Confirmed])
            ->where('starts_at', '>', now())
            ->each(fn (Appointment $appointment) => $change->handle($appointment, AppointmentStatus::Cancelled, $user, 'Patient deleted their account', byPatient: true));

        $token = $user->currentAccessToken();
        if (! $token instanceof PersonalAccessToken) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        DB::transaction(function () use ($user): void {
            Appointment::query()->where('patient_id', $user->id)->update(['patient_id' => null, 'contact_email' => null, 'contact_mobile' => null]);
            $user->tokens()->delete();
            $user->pushTokens()->delete();
            $user->notifications()->delete();
            UserAccessChanged::dispatch('user.account_deleted', $user->public_id, null, ['status' => $user->status], ['status' => 'deleted']);
            $user->delete();
        });

        return response()->noContent();
    }

    private function isPatientOnly(User $user): bool
    {
        $roles = $user->roles->pluck('name');

        return $roles->isNotEmpty() && $roles->every(fn (string $role) => $role === RoleName::Patient->value);
    }
}
