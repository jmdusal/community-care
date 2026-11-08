<?php

namespace App\Domain\Analytics\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['event', 'facility_id', 'region_id', 'query_hash', 'visitor_hash', 'result_count', 'created_at'])]
class UsageEvent extends Model
{
    public const SEARCH = 'search';

    public const PROFILE_VIEW = 'profile_view';

    public const CALL_CLICK = 'call_click';

    public const DIRECTIONS_CLICK = 'directions_click';

    public const PUBLIC_EVENTS = [self::CALL_CLICK, self::DIRECTIONS_CLICK];

    public $timestamps = false;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }
}
