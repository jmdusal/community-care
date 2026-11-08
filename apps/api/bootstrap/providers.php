<?php

use App\Domain\Audit\AuditServiceProvider;
use App\Domain\Booking\BookingServiceProvider;
use App\Domain\DataImports\DataImportsServiceProvider;
use App\Domain\Facilities\FacilitiesServiceProvider;
use App\Domain\Geography\GeographyServiceProvider;
use App\Domain\HealthPrograms\HealthProgramsServiceProvider;
use App\Domain\Identity\IdentityServiceProvider;
use App\Domain\KnowledgeAssistant\KnowledgeAssistantServiceProvider;
use App\Domain\Settings\SettingsServiceProvider;
use App\Providers\AppServiceProvider;

return [
    AppServiceProvider::class,

    // Domain modules (one provider each: bindings, gates, event listeners).
    IdentityServiceProvider::class,
    SettingsServiceProvider::class,
    AuditServiceProvider::class,
    GeographyServiceProvider::class,
    FacilitiesServiceProvider::class,
    DataImportsServiceProvider::class,
    KnowledgeAssistantServiceProvider::class,
    HealthProgramsServiceProvider::class,
    BookingServiceProvider::class,

    // Telescope (dev only) is registered by AppServiceProvider in the local environment.
];
