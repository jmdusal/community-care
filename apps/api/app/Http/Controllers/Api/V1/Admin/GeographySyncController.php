<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\DataImports\Jobs\SyncGeographyJob;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/** POST /admin/locations/sync: queue a full PSGC download and import. The batch appears on the Imports screen. */
final class GeographySyncController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        Gate::authorize('import-datasets');

        SyncGeographyJob::dispatch($request->user()->id);

        return response()->json(['data' => ['status' => 'queued', 'message' => 'Downloading the PSGC list. The import appears on the Imports screen when it starts.']], 202);
    }
}
