<?php

namespace App\Domain\Analytics\Queries;

use App\Domain\Analytics\Models\UsageEvent;
use App\Domain\Audit\Models\AuditLog;
use App\Domain\DataImports\Models\ImportBatch;
use App\Domain\Facilities\Enums\ChangeRequestStatus;
use App\Domain\Facilities\Enums\PublicationStatus;
use App\Domain\Facilities\Enums\VerificationStatus;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Models\FacilityChangeRequest;
use App\Domain\Geography\Models\Region;
use App\Http\Support\Time;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Every number on the admin overview, computed from the database (data-driven:
 * nothing is typed in). Scope: everything, one region, or one or more facilities.
 */
final class DashboardStatsQuery
{
    /** @return array<string, mixed> */
    /** @param Collection<int, Facility>|null $chosen one or more facilities, or null for all */
    public function handle(?Collection $chosen, ?Region $region, int $days): array
    {
        $chosen = $chosen?->isEmpty() ? null : $chosen;
        $facility = $chosen?->count() === 1 ? $chosen->first() : null;
        $facilities = Facility::query()
            ->when($chosen, fn (Builder $q) => $q->whereKey($chosen->pluck('id')))
            ->when($region, fn (Builder $q) => $q->where('region_id', $region->id));

        $byStatus = (clone $facilities)->selectRaw('verification_status, COUNT(*) AS total')->groupBy('verification_status')->pluck('total', 'verification_status');
        $published = (clone $facilities)->where('publication_status', PublicationStatus::Published)->count();
        $total = (int) $byStatus->sum();

        $withSource = (clone $facilities)->where('publication_status', PublicationStatus::Published)->whereHas('sources')->count();

        return [
            'scope' => match (true) {
                $facility !== null => ['type' => 'facility', 'id' => $facility->public_id, 'name' => $facility->name],
                $chosen !== null => ['type' => 'facilities', 'id' => $chosen->pluck('public_id')->implode(','), 'name' => "{$chosen->count()} facilities"],
                $region !== null => ['type' => 'region', 'id' => $region->psgc_code, 'name' => $region->name],
                default => ['type' => 'all', 'id' => null, 'name' => 'All facilities'],
            },
            'days' => $days,
            'totals' => [
                'facilities' => $total,
                'published' => $published,
                'pending_changes' => $this->pendingChanges($facilities)->count(),
                'stale' => (int) ($byStatus[VerificationStatus::Stale->value] ?? 0),
            ],
            'verification' => collect(VerificationStatus::cases())->mapWithKeys(fn (VerificationStatus $status): array => [$status->value => (int) ($byStatus[$status->value] ?? 0)])->all(),
            'freshness' => $this->freshness($facilities),
            'traceable_source_pct' => $published > 0 ? round($withSource / $published * 100, 1) : null,
            'usage' => $this->usage($chosen, $region, $days),
            'needs_attention' => $this->pendingChanges($facilities)
                ->with(['facility:id,public_id,name', 'submitter:id,name'])
                ->oldest()
                ->limit(5)
                ->get()
                ->map(fn (FacilityChangeRequest $request): array => [
                    'id' => $request->public_id,
                    'facility' => ['id' => $request->facility->public_id, 'name' => $request->facility->name],
                    'origin' => $request->origin->value,
                    'fields' => array_keys($request->changes),
                    'submitted_by' => $request->submitter?->name,
                    'submitted_at' => Time::iso($request->created_at),
                ])->all(),
            'recent_imports' => $chosen === null && $region === null ? ImportBatch::query()->latest('id')->limit(4)->get()->map(fn (ImportBatch $batch): array => [
                'id' => $batch->public_id,
                'source' => $batch->source_name,
                'filename' => $batch->original_filename,
                'status' => $batch->status->value,
                'created_at' => Time::iso($batch->created_at),
            ])->all() : [],
            'recent_activity' => AuditLog::query()
                ->when($chosen, fn (Builder $q) => $q->where('resource_type', 'facility')->whereIn('resource_id', $chosen->pluck('public_id')))
                // A region: activity on that region's facilities only.
                ->when($chosen === null && $region !== null, fn (Builder $q) => $q->where('resource_type', 'facility')
                    ->whereIn('resource_id', Facility::query()->where('region_id', $region->id)->select('public_id')))
                ->leftJoin('users', 'users.id', '=', 'audit_logs.actor_id')
                ->latest('audit_logs.id')
                ->limit(6)
                ->get(['audit_logs.action', 'audit_logs.resource_type', 'audit_logs.resource_id', 'audit_logs.created_at', 'users.name as actor'])
                ->map(fn (AuditLog $log): array => [
                    'action' => $log->action,
                    'actor' => $log->getAttribute('actor') ?? 'System',
                    'resource_type' => $log->resource_type,
                    'resource_id' => $log->resource_id,
                    'created_at' => Time::iso($log->created_at),
                ])->all(),
        ];
    }

    /**
     * @param  Builder<Facility>  $facilities
     * @return Builder<FacilityChangeRequest>
     */
    private function pendingChanges(Builder $facilities): Builder
    {
        return FacilityChangeRequest::query()
            ->where('status', ChangeRequestStatus::Submitted)
            ->whereIn('facility_id', (clone $facilities)->select('id'));
    }

    /**
     * @param  Builder<Facility>  $facilities
     * @return array{under_90: int, from_90_to_180: int, over_180: int, never: int}
     */
    private function freshness(Builder $facilities): array
    {
        $row = (clone $facilities)->toBase()->selectRaw(
            'SUM(verified_at >= ?) AS under_90, SUM(verified_at < ? AND verified_at >= ?) AS from_90_to_180, SUM(verified_at < ?) AS over_180, SUM(verified_at IS NULL) AS never',
            [now()->subDays(90), now()->subDays(90), now()->subDays(180), now()->subDays(180)],
        )->first();

        return [
            'under_90' => (int) ($row->under_90 ?? 0),
            'from_90_to_180' => (int) ($row->from_90_to_180 ?? 0),
            'over_180' => (int) ($row->over_180 ?? 0),
            'never' => (int) ($row->never ?? 0),
        ];
    }

    /** @return array<string, mixed> */
    /** @param Collection<int, Facility>|null $chosen */
    private function usage(?Collection $chosen, ?Region $region, int $days): array
    {
        $timezone = config('communitycare.display_timezone');
        $firstDay = now($timezone)->subDays($days - 1)->startOfDay();
        $since = $firstDay->copy()->utc();
        $offset = $firstDay->getOffset();

        $events = UsageEvent::query()
            ->where('created_at', '>=', $since)
            ->when($chosen, fn (Builder $q) => $q->whereIn('facility_id', $chosen->pluck('id')))
            ->when($region, fn (Builder $q) => $q->where('region_id', $region->id));

        $counts = (clone $events)->selectRaw('event, COUNT(*) AS total')->groupBy('event')->pluck('total', 'event');

        $daily = (clone $events)
            ->selectRaw('DATE(DATE_ADD(created_at, INTERVAL ? SECOND)) AS day, event, COUNT(*) AS total', [$offset])
            ->groupBy('day', 'event')
            ->get()
            ->groupBy('day');

        $series = [];
        for ($date = $firstDay->copy(); count($series) < $days; $date->addDay()) {
            $day = $date->toDateString();
            $rows = $daily->get($day, collect())->pluck('total', 'event');
            $series[] = ['date' => $day, 'searches' => (int) ($rows[UsageEvent::SEARCH] ?? 0), 'profile_views' => (int) ($rows[UsageEvent::PROFILE_VIEW] ?? 0)];
        }

        $searches = (int) ($counts[UsageEvent::SEARCH] ?? 0);
        $views = (int) ($counts[UsageEvent::PROFILE_VIEW] ?? 0);

        return [
            'searches' => $searches,
            'profile_views' => $views,
            'call_clicks' => (int) ($counts[UsageEvent::CALL_CLICK] ?? 0),
            'directions_clicks' => (int) ($counts[UsageEvent::DIRECTIONS_CLICK] ?? 0),
            'search_to_profile_pct' => $searches > 0 ? round(min(100, $views / $searches * 100), 1) : null,
            'series' => $series,
        ];
    }
}
