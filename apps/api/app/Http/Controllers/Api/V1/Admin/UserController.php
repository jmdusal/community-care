<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Facilities\Models\Facility;
use App\Domain\Identity\Actions\InviteUserAction;
use App\Domain\Identity\Actions\UpdateMemberProfileAction;
use App\Domain\Identity\Actions\UpdateUserAccessAction;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Enums\RoleScope;
use App\Domain\Identity\Models\User;
use App\Domain\Identity\Support\MemberAccess;
use App\Domain\Identity\TwoFactor\TwoFactorService;
use App\Http\Controllers\Controller;
use App\Http\Resources\AdminUserResource;
use App\Http\Support\ConsoleScope;
use App\Http\Support\Paginated;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/** Team & roles: members, invitations and access changes (MemberAccess decides who may change whom). */
final class UserController extends Controller
{
    public function __construct(private readonly MemberAccess $access) {}

    public function index(Request $request): JsonResponse
    {
        Gate::authorize('view-team');

        $filters = $request->validate([
            'facility_id' => ConsoleScope::FACILITY_RULE,
            'region_code' => ['nullable', 'digits:10'],
        ]);

        // With a facility (or region) selected in the top bar: the staff assigned there.
        // Admins and verifiers cover every facility, so they are not listed per facility.
        // People who work only at assigned facilities see the members of those facilities.
        $limited = ! $request->user()->seesAllFacilities();
        $managed = $limited ? $request->user()->facilities()->pluck('facilities.id')->all() : [];

        $staff = fn (Builder $q) => $q
            ->when($limited, fn (Builder $q) => $q->whereHas('facilities', fn (Builder $f) => $f->whereIn('facilities.id', $managed)))
            ->whereHas('roles', fn (Builder $r) => $r->where(fn (Builder $w) => $w->whereNull('scope')->orWhere('scope', '!=', RoleScope::None->value))->where('name', '!=', RoleName::Patient->value))
            ->when(ConsoleScope::facilityIds($filters['facility_id'] ?? null), fn (Builder $q, array $ids) => $q->whereHas('facilities', fn (Builder $f) => $f->whereIn('public_id', $ids)))
            ->when($filters['region_code'] ?? null, fn (Builder $q, string $code) => $q->whereHas('facilities.region', fn (Builder $r) => $r->where('psgc_code', $code)));

        $users = User::query()
            ->with(['roles', 'facilities:id,public_id,name'])
            ->where($staff)
            ->orderBy('name')
            ->paginate(Paginated::perPage($request, 50));

        return Paginated::response($users, AdminUserResource::class, $request, [
            'access_review' => [
                'inactive_45_days' => User::query()->where($staff)->where('status', 'active')->where(fn (Builder $q) => $q->whereNull('last_active_at')->orWhere('last_active_at', '<', now()->subDays(45)))->count(),
                'without_mfa' => User::query()->where($staff)->where('status', 'active')->where('mfa_enabled', false)->count(),
            ],
        ]);
    }

    public function store(Request $request, InviteUserAction $invite): JsonResponse
    {
        Gate::authorize('manage-users');
        $input = $this->validated($request, creating: true);
        $facilityIds = $this->access->authorizeChange($request->user(), null, $input['roles'], $input['facility_ids']);

        $user = $invite->handle($input['name'], $input['email'], $input['roles'], $facilityIds, $request->user());

        return (new AdminUserResource($user->load(['roles', 'facilities'])))->response()->setStatusCode(201);
    }

    public function update(Request $request, User $user, UpdateUserAccessAction $updateAccess, UpdateMemberProfileAction $updateProfile): AdminUserResource
    {
        Gate::authorize('manage-users');
        $input = $this->validated($request, creating: false, user: $user);
        $input['facility_ids'] = $this->access->authorizeChange(
            $request->user(),
            $user,
            $request->has('roles') ? $input['roles'] : null,
            $request->has('facility_ids') ? $input['facility_ids'] : null,
        ) ?? $input['facility_ids'];

        $profile = array_intersect_key($input, array_flip(['name', 'email', 'mobile']));
        if ($profile !== []) {
            $updateProfile->handle($user, $request->user(), $profile);
        }

        return new AdminUserResource($updateAccess->handle(
            $user,
            $request->user(),
            $request->has('roles') ? $input['roles'] : null,
            $input['status'] ?? null,
            $request->has('facility_ids') ? $input['facility_ids'] : null,
        ));
    }

    /** @return array<string, mixed> */
    /** POST /admin/users/{user}/two-factor/reset: a member lost their phone. They set it up again at next sign-in. */
    public function resetTwoFactor(Request $request, User $user, TwoFactorService $twoFactor): AdminUserResource
    {
        Gate::authorize('manage-users');
        abort_if($user->is($request->user()), 409, 'You cannot reset your own two-factor sign-in. Ask another administrator.');
        $this->access->authorizeChange($request->user(), $user, null, null);

        $twoFactor->disable($user, $request->user());

        return new AdminUserResource($user->refresh()->load(['roles', 'facilities']));
    }

    private function validated(Request $request, bool $creating, ?User $user = null): array
    {
        if ($request->has('email')) {
            $request->merge(['email' => mb_strtolower(trim((string) $request->input('email')))]);
        }
        if ($request->filled('mobile')) {
            $mobile = preg_replace('/[\s\-()]/', '', (string) $request->input('mobile'));
            $request->merge(['mobile' => preg_match('/^(\+?63|0)?(9\d{9})$/', (string) $mobile, $m) === 1 ? '+63'.$m[2] : $mobile]);
        }

        $input = $request->validate([
            'name' => [$creating ? 'required' : 'sometimes', 'string', 'max:255'],
            'email' => [$creating ? 'required' : 'sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user?->id)],
            'mobile' => ['sometimes', 'nullable', 'regex:/^\+639\d{9}$/'],
            'roles' => [$creating ? 'required' : 'sometimes', 'array', 'min:1'],
            'roles.*' => ['string', 'distinct', Rule::exists('roles', 'name'), Rule::notIn([RoleName::Patient->value])],
            'status' => ['sometimes', Rule::in(['active', 'suspended'])],
            'facility_ids' => ['sometimes', 'array', 'max:50'],
            'facility_ids.*' => ['string', Rule::exists('facilities', 'public_id')],
        ]);

        if (array_key_exists('name', $input)) {
            $input['name'] = trim($input['name']);
        }

        $input['roles'] = array_values($input['roles'] ?? []);
        $input['facility_ids'] = Facility::query()->whereIn('public_id', $input['facility_ids'] ?? [])->pluck('id')->all();

        return $input;
    }
}
