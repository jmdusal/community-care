<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\DataImports\Support\AdapterRegistry;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

final class ImportSourceController extends Controller
{
    public function __invoke(AdapterRegistry $adapters): JsonResponse
    {
        Gate::authorize('import-datasets');

        return response()->json(['data' => $adapters->describe()]);
    }
}
