<?php

namespace App\Http\Support;

use App\Domain\Settings\Contracts\SettingsRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The documented list shape: {"data": [...], "meta": {page, per_page, total, last_page}, "links": {next, prev}}.
 */
final class Paginated
{
    /**
     * @param  class-string<JsonResource>  $resource
     * @param  array<string, mixed>  $meta
     */
    public static function response(LengthAwarePaginator $paginator, string $resource, Request $request, array $meta = []): JsonResponse
    {
        return response()->json([
            'data' => $resource::collection($paginator->getCollection())->resolve($request),
            'meta' => [
                'page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
                ...$meta,
            ],
            'links' => [
                'next' => $paginator->nextPageUrl(),
                'prev' => $paginator->previousPageUrl(),
            ],
        ]);
    }

    /** per_page from the request, capped by the api.max_page_size setting. */
    public static function perPage(Request $request, int $default = 20): int
    {
        $max = app(SettingsRepository::class)->int('api.max_page_size');

        return max(1, min($max, $request->integer('per_page', $default)));
    }
}
