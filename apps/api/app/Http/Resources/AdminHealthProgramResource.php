<?php

namespace App\Http\Resources;

use App\Domain\HealthPrograms\Models\HealthProgram;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Admin shape of a program: the public shape plus status, dates and every
 * linked facility (published or not).
 *
 * @mixin HealthProgram
 */
final class AdminHealthProgramResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $public = new HealthProgramResource($this->resource);
        $public->admin = true;

        return $public->toArray($request);
    }
}
