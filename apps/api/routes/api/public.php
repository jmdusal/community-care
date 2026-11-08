<?php

use App\Http\Controllers\Api\V1\Public\AssistantController;
use App\Http\Controllers\Api\V1\Public\AvailabilityController;
use App\Http\Controllers\Api\V1\Public\CatalogController;
use App\Http\Controllers\Api\V1\Public\FacilityController;
use App\Http\Controllers\Api\V1\Public\FacilityReportController;
use App\Http\Controllers\Api\V1\Public\GuestAppointmentController;
use App\Http\Controllers\Api\V1\Public\HealthController;
use App\Http\Controllers\Api\V1\Public\HealthProgramController;
use App\Http\Controllers\Api\V1\Public\LocationController;
use App\Http\Controllers\Api\V1\Public\QueueDisplayController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class)->name('health');

Route::middleware('throttle:search')->group(function (): void {
    Route::get('/facilities', [FacilityController::class, 'index'])->name('facilities.index');
    Route::get('/facilities/{facility}', [FacilityController::class, 'show'])->name('facilities.show');
    Route::get('/facilities/{facility}/services', [FacilityController::class, 'services'])->name('facilities.services');
    Route::get('/facilities/{facility}/hours', [FacilityController::class, 'hours'])->name('facilities.hours');
    Route::post('/facilities/{facility}/events', [FacilityController::class, 'event'])->name('facilities.events');
    Route::get('/facilities/{facility}/availability', AvailabilityController::class)->name('facilities.availability');
    Route::get('/facilities/{facility}/queue', QueueDisplayController::class)->name('facilities.queue');
    Route::post('/facilities/{facility}/reports', FacilityReportController::class)->middleware('throttle:5,60')->name('facilities.reports');
    Route::get('/health-programs', [HealthProgramController::class, 'index'])->name('health-programs.index');
    Route::get('/health-programs/{program}', [HealthProgramController::class, 'show'])->name('health-programs.show');
});

// Appointments without an account: email code first, then reference code + email to manage.
Route::middleware('throttle:guest-booking')->group(function (): void {
    Route::post('/appointments/guest', [GuestAppointmentController::class, 'start'])->name('appointments.guest');
    Route::post('/appointments/guest/verify', [GuestAppointmentController::class, 'verify'])->name('appointments.guest.verify');
    Route::post('/appointments/lookup', [GuestAppointmentController::class, 'lookup'])->name('appointments.lookup');
    Route::post('/appointments/lookup/cancel', [GuestAppointmentController::class, 'cancel'])->name('appointments.lookup.cancel');
});

Route::get('/services', [CatalogController::class, 'services'])->name('services.index');
Route::get('/facility-types', [CatalogController::class, 'facilityTypes'])->name('facility-types.index');

Route::prefix('locations')->name('locations.')->group(function (): void {
    Route::get('/regions', [LocationController::class, 'regions'])->name('regions');
    Route::get('/provinces', [LocationController::class, 'provinces'])->name('provinces');
    Route::get('/cities', [LocationController::class, 'cities'])->name('cities');
    Route::get('/barangays', [LocationController::class, 'barangays'])->name('barangays');
});

Route::get('/assistant', [AssistantController::class, 'status'])->name('assistant.status');
Route::post('/assistant/messages', [AssistantController::class, 'ask'])->middleware('throttle:assistant')->name('assistant.messages');
