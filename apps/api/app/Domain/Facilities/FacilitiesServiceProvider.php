<?php

namespace App\Domain\Facilities;

use App\Domain\Facilities\Contracts\FacilityReader;
use App\Domain\Facilities\Contracts\FacilityWriter;
use App\Domain\Facilities\Events\FacilityApproved;
use App\Domain\Facilities\Events\FacilityChangeSubmitted;
use App\Domain\Facilities\Events\FacilityRejected;
use App\Domain\Facilities\Listeners\NotifyReviewers;
use App\Domain\Facilities\Listeners\NotifySubmitter;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Models\FacilityChangeRequest;
use App\Domain\Facilities\Policies\ChangeRequestPolicy;
use App\Domain\Facilities\Policies\FacilityPolicy;
use App\Domain\Facilities\Repositories\EloquentFacilityRepository;
use App\Domain\Facilities\Repositories\EloquentFacilitySearch;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

final class FacilitiesServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Not singletons: each use gets a fresh GeographyLookup.
        $this->app->bind(FacilityWriter::class, EloquentFacilityRepository::class);
        $this->app->bind(FacilityReader::class, EloquentFacilitySearch::class);
    }

    public function boot(): void
    {
        Gate::policy(Facility::class, FacilityPolicy::class);
        Gate::policy(FacilityChangeRequest::class, ChangeRequestPolicy::class);

        Event::listen(FacilityChangeSubmitted::class, NotifyReviewers::class);
        Event::listen([FacilityApproved::class, FacilityRejected::class], NotifySubmitter::class);
    }
}
