<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Domain\Facilities\Enums\PublicationStatus;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Models\FacilityReport;
use App\Domain\Identity\Enums\Permission;
use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Models\User;
use App\Domain\Shared\Notifications\InAppNotification;
use App\Http\Controllers\Controller;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;

/**
 * POST /facilities/{id}/reports: anyone can say something on a facility's page is wrong.
 * The facility's staff are told (or, with no staff, the reviewers who cover every facility).
 * Contact details are optional; the reporter's IP is kept only as a one-way hash.
 */
final class FacilityReportController extends Controller
{
    public function __invoke(Request $request, Facility $facility): JsonResponse
    {
        abort_unless($facility->publication_status === PublicationStatus::Published, 404);

        $input = $request->validate([
            'reason' => ['required', Rule::in(array_keys(FacilityReport::REASONS))],
            'details' => ['nullable', 'required_if:reason,other', 'string', 'max:500'],
            'contact' => ['nullable', 'string', 'max:120'],
        ], ['details.required_if' => 'Tell us what is wrong.']);

        $report = $facility->reports()->create([
            ...$input,
            'status' => FacilityReport::OPEN,
            'reporter_hash' => hash_hmac('sha256', (string) $request->ip(), (string) config('app.key')),
        ]);

        $recipients = $facility->staff()->where('status', 'active')->with('roles')->get()->filter(fn (User $user) => $user->canAt(Permission::FacilitiesEdit, $facility));
        if ($recipients->isEmpty()) {
            $recipients = User::query()->where('status', 'active')->whereHas('roles', fn (Builder $q) => $q->whereIn('name', Role::namesGranting(Permission::FacilitiesReview, everywhere: true)))->get();
        }
        Notification::send($recipients, new InAppNotification('facility', "Report: {$facility->name}", FacilityReport::REASONS[$report->reason], '/admin/review-queue?tab=reports', ['facility-reports']));

        return response()->json(['data' => ['id' => $report->public_id, 'message' => 'Thank you. The facility team will check it.']], 201);
    }
}
