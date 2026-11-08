<?php

namespace App\Domain\Facilities\Models;

use App\Domain\Facilities\Enums\PublicationStatus;
use App\Domain\Facilities\Enums\VerificationStatus;
use App\Domain\Geography\Models\Barangay;
use App\Domain\Geography\Models\CityMunicipality;
use App\Domain\Geography\Models\Province;
use App\Domain\Geography\Models\Region;
use App\Domain\HealthPrograms\Models\HealthProgram;
use App\Domain\Identity\Models\User;
use App\Domain\Services\Models\Service;
use Database\Factories\FacilityFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'name', 'facility_type_id', 'address', 'region_id', 'province_id', 'city_municipality_id', 'barangay_id',
    'latitude', 'longitude', 'verification_status', 'publication_status', 'verified_at', 'verified_by',
    'verification_method', 'review_notes', 'booking_enabled', 'booking_max_active', 'booking_cancel_cutoff_hours', 'booking_min_notice_hours', 'check_reminded_at',
])]
#[UseFactory(FacilityFactory::class)]
class Facility extends Model
{
    /** @use HasFactory<FacilityFactory> */
    use HasFactory, HasUlids;

    /** @var array<string, mixed> */
    protected $attributes = [
        'verification_status' => 'draft',
        'publication_status' => 'unpublished',
    ];

    /** @return list<string> */
    public function uniqueIds(): array
    {
        return ['public_id'];
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    /** @return BelongsTo<FacilityType, $this> */
    public function type(): BelongsTo
    {
        return $this->belongsTo(FacilityType::class, 'facility_type_id');
    }

    /** @return BelongsTo<Region, $this> */
    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    /** @return BelongsTo<Province, $this> */
    public function province(): BelongsTo
    {
        return $this->belongsTo(Province::class);
    }

    /** @return BelongsTo<CityMunicipality, $this> */
    public function cityMunicipality(): BelongsTo
    {
        return $this->belongsTo(CityMunicipality::class);
    }

    /** @return BelongsTo<Barangay, $this> */
    public function barangay(): BelongsTo
    {
        return $this->belongsTo(Barangay::class);
    }

    /** @return BelongsTo<User, $this> */
    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    /** @return HasMany<FacilityContact, $this> */
    public function contacts(): HasMany
    {
        return $this->hasMany(FacilityContact::class);
    }

    /** @return HasMany<FacilityHour, $this> */
    public function hours(): HasMany
    {
        return $this->hasMany(FacilityHour::class)->orderBy('day_of_week')->orderBy('opens_at');
    }

    /** @return HasMany<FacilityHourException, $this> */
    public function hourExceptions(): HasMany
    {
        return $this->hasMany(FacilityHourException::class);
    }

    /** @return HasMany<FacilitySource, $this> */
    public function sources(): HasMany
    {
        return $this->hasMany(FacilitySource::class);
    }

    /** @return HasMany<FacilityChangeRequest, $this> */
    public function changeRequests(): HasMany
    {
        return $this->hasMany(FacilityChangeRequest::class);
    }

    /** "Today at this facility" entries, one per day. @return HasMany<FacilityDayStatus, $this> */
    public function dayStatuses(): HasMany
    {
        return $this->hasMany(FacilityDayStatus::class);
    }

    /** @return HasMany<FacilityReport, $this> */
    public function reports(): HasMany
    {
        return $this->hasMany(FacilityReport::class);
    }

    /** Facility staff assigned to this facility. @return BelongsToMany<User, $this> */
    public function staff(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'facility_user')->withPivot(['assigned_by', 'assigned_at']);
    }

    /** @return BelongsToMany<Service, $this> */
    /** @return BelongsToMany<HealthProgram, $this> */
    public function programs(): BelongsToMany
    {
        return $this->belongsToMany(HealthProgram::class, 'program_facilities');
    }

    public function services(): BelongsToMany
    {
        return $this->belongsToMany(Service::class, 'facility_services')
            ->withPivot(['availability_status', 'source_name', 'verified_at'])
            ->withTimestamps();
    }

    /** @param Builder<self> $query */
    #[Scope]
    protected function published(Builder $query): void
    {
        $query->where('publication_status', PublicationStatus::Published);
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'booking_enabled' => 'boolean',
            'check_reminded_at' => 'datetime',
            'latitude' => 'float',
            'longitude' => 'float',
            'verification_status' => VerificationStatus::class,
            'publication_status' => PublicationStatus::class,
            'verified_at' => 'datetime',
        ];
    }
}
