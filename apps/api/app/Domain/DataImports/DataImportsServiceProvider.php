<?php

namespace App\Domain\DataImports;

use App\Domain\DataImports\Support\AdapterRegistry;
use Illuminate\Support\ServiceProvider;

final class DataImportsServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(AdapterRegistry::class, fn (): AdapterRegistry => new AdapterRegistry(
            config('communitycare.imports.facility_sources', []),
            config('communitycare.imports.geography_sources', []),
        ));
    }
}
