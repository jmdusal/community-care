<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Domain\Booking\Queue\WalkInQueue;
use App\Domain\Facilities\Enums\PublicationStatus;
use App\Domain\Facilities\Models\Facility;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

/** GET /facilities/{id}/queue: the "Now serving" board for a TV or tablet. Numbers only, never names. */
final class QueueDisplayController extends Controller
{
    public function __invoke(Facility $facility, WalkInQueue $queue): JsonResponse
    {
        abort_unless($facility->publication_status === PublicationStatus::Published, 404);

        return response()->json(['data' => ['facility' => ['id' => $facility->public_id, 'name' => $facility->name], ...$queue->display($facility)]]);
    }
}
