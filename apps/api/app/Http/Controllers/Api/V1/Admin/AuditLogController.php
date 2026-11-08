<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Audit\Models\AuditLog;
use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Http\Support\Paginated;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

final class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('view-audit-log');

        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'category' => ['nullable', 'string', 'alpha_dash', 'max:40'],
            'resource_type' => ['nullable', 'string', 'alpha_dash', 'max:60'],
            'resource_id' => ['nullable', 'string', 'max:191'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $user = $request->user();
        $onlyFacilities = $user->seesAllFacilities() ? null : $user->facilities()->pluck('facilities.public_id')->all();

        $logs = AuditLog::query()
            ->when($onlyFacilities !== null, fn (Builder $q) => $q->where('audit_logs.resource_type', 'facility')->whereIn('audit_logs.resource_id', $onlyFacilities))
            ->leftJoin('users', 'users.id', '=', 'audit_logs.actor_id')
            ->select(['audit_logs.*', 'users.name as actor_name'])
            ->when($filters['category'] ?? null, fn (Builder $q, string $category) => $q->where('audit_logs.action', 'like', $category.'.%'))
            ->when($filters['resource_type'] ?? null, fn (Builder $q, string $type) => $q->where('audit_logs.resource_type', $type))
            ->when($filters['resource_id'] ?? null, fn (Builder $q, string $id) => $q->where('audit_logs.resource_id', $id))
            ->when($filters['q'] ?? null, fn (Builder $q, string $text) => $q->where(fn (Builder $w) => $w
                ->where('audit_logs.action', 'like', "%{$text}%")
                ->orWhere('audit_logs.resource_id', 'like', "%{$text}%")
                ->orWhere('users.name', 'like', "%{$text}%")))
            ->when($filters['from'] ?? null, fn (Builder $q, string $from) => $q->where('audit_logs.created_at', '>=', $from))
            ->when($filters['to'] ?? null, fn (Builder $q, string $to) => $q->where('audit_logs.created_at', '<', now()->parse($to)->addDay()))
            ->latest('audit_logs.id')
            ->paginate(Paginated::perPage($request, 25));

        return Paginated::response($logs, AuditLogResource::class, $request);
    }
}
