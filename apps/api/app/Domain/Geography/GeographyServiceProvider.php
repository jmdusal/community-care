<?php

namespace App\Domain\Geography;

use App\Domain\Geography\Contracts\AreaGeocoder;
use App\Domain\Geography\Geocoders\NominatimGeocoder;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Support\ServiceProvider;

final class GeographyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(AreaGeocoder::class, fn (Application $app): AreaGeocoder => new NominatimGeocoder(
            (string) $app['config']->get('communitycare.maps.geocoder_url'),
            (string) $app['config']->get('communitycare.maps.user_agent'),
            (int) $app['config']->get('communitycare.maps.min_interval_ms', 1100),
        ));
    }
}
