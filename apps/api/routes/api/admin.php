<?php

use App\Http\Controllers\Api\V1\Admin\AppointmentController;
use App\Http\Controllers\Api\V1\Admin\AreaMapController;
use App\Http\Controllers\Api\V1\Admin\AssistantController;
use App\Http\Controllers\Api\V1\Admin\AuditLogController;
use App\Http\Controllers\Api\V1\Admin\CatalogController;
use App\Http\Controllers\Api\V1\Admin\ChangeRequestController;
use App\Http\Controllers\Api\V1\Admin\DataQualityController;
use App\Http\Controllers\Api\V1\Admin\FacilityController;
use App\Http\Controllers\Api\V1\Admin\FacilityReportController;
use App\Http\Controllers\Api\V1\Admin\FacilityTodayController;
use App\Http\Controllers\Api\V1\Admin\GeographySyncController;
use App\Http\Controllers\Api\V1\Admin\HealthProgramController;
use App\Http\Controllers\Api\V1\Admin\ImportBatchController;
use App\Http\Controllers\Api\V1\Admin\ImportRecordController;
use App\Http\Controllers\Api\V1\Admin\ImportSourceController;
use App\Http\Controllers\Api\V1\Admin\KnowledgeDocumentController;
use App\Http\Controllers\Api\V1\Admin\LocationCoverageController;
use App\Http\Controllers\Api\V1\Admin\PatientController;
use App\Http\Controllers\Api\V1\Admin\QueueController;
use App\Http\Controllers\Api\V1\Admin\ReportController;
use App\Http\Controllers\Api\V1\Admin\RoleController;
use App\Http\Controllers\Api\V1\Admin\ScheduleController;
use App\Http\Controllers\Api\V1\Admin\SettingController;
use App\Http\Controllers\Api\V1\Admin\StatsController;
use App\Http\Controllers\Api\V1\Admin\UserController;
use Illuminate\Support\Facades\Route;

/* Prefixed with /api/v1/admin and protected by auth:sanctum (see routes/api.php). */

Route::get('/settings', [SettingController::class, 'index'])->name('settings.index');
Route::patch('/settings', [SettingController::class, 'update'])->name('settings.update');

Route::get('/import-sources', ImportSourceController::class)->name('import-sources.index');
Route::get('/import-batches', [ImportBatchController::class, 'index'])->name('import-batches.index');
Route::post('/import-batches', [ImportBatchController::class, 'store'])->name('import-batches.store');
Route::get('/import-batches/{batch}', [ImportBatchController::class, 'show'])->name('import-batches.show');
Route::post('/import-batches/{batch}/publish', [ImportBatchController::class, 'publish'])->name('import-batches.publish');
Route::get('/import-batches/{batch}/records', [ImportRecordController::class, 'index'])->name('import-records.index');
Route::post('/import-batches/{batch}/records/{record}/decision', [ImportRecordController::class, 'decide'])
    ->scopeBindings()
    ->name('import-records.decide');

Route::get('/locations/coverage', LocationCoverageController::class)->name('locations.coverage');
Route::get('/locations/map', AreaMapController::class)->middleware('throttle:60,1')->name('locations.map');
Route::post('/locations/sync', GeographySyncController::class)->middleware('throttle:6,60')->name('locations.sync');

Route::get('/stats', StatsController::class)->name('stats');
Route::get('/data-quality', DataQualityController::class)->name('data-quality');

Route::get('/facilities', [FacilityController::class, 'index'])->name('facilities.index');
Route::post('/facilities', [FacilityController::class, 'store'])->name('facilities.store');
Route::get('/facilities/{facility}', [FacilityController::class, 'show'])->name('facilities.show');
Route::patch('/facilities/{facility}', [FacilityController::class, 'update'])->name('facilities.update');
Route::post('/facilities/{facility}/reverify', [FacilityController::class, 'reverify'])->name('facilities.reverify');
Route::post('/facilities/{facility}/publication', [FacilityController::class, 'publication'])->name('facilities.publication');

Route::get('/change-requests', [ChangeRequestController::class, 'index'])->name('change-requests.index');
Route::get('/change-requests/{changeRequest}', [ChangeRequestController::class, 'show'])->name('change-requests.show');
Route::post('/change-requests/{changeRequest}/approve', [ChangeRequestController::class, 'approve'])->name('change-requests.approve');
Route::post('/change-requests/{changeRequest}/reject', [ChangeRequestController::class, 'reject'])->name('change-requests.reject');
Route::post('/change-requests/{changeRequest}/withdraw', [ChangeRequestController::class, 'withdraw'])->name('change-requests.withdraw');

Route::get('/users', [UserController::class, 'index'])->name('users.index');
Route::post('/users', [UserController::class, 'store'])->name('users.store');
Route::patch('/users/{user}', [UserController::class, 'update'])->name('users.update');
Route::post('/users/{user}/two-factor/reset', [UserController::class, 'resetTwoFactor'])->name('users.two-factor.reset');

Route::get('/audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');

Route::get('/assistant/overview', [AssistantController::class, 'overview'])->name('assistant.overview');
Route::post('/assistant/preview', [AssistantController::class, 'preview'])->middleware('throttle:assistant')->name('assistant.preview');
Route::post('/assistant/guardrails', [AssistantController::class, 'guardrails'])->name('assistant.guardrails');

Route::get('/knowledge-documents', [KnowledgeDocumentController::class, 'index'])->name('knowledge-documents.index');
Route::post('/knowledge-documents', [KnowledgeDocumentController::class, 'store'])->name('knowledge-documents.store');
Route::get('/knowledge-documents/{document}', [KnowledgeDocumentController::class, 'show'])->name('knowledge-documents.show');
Route::patch('/knowledge-documents/{document}', [KnowledgeDocumentController::class, 'update'])->name('knowledge-documents.update');
Route::post('/knowledge-documents/{document}/publish', [KnowledgeDocumentController::class, 'publish'])->name('knowledge-documents.publish');
Route::post('/knowledge-documents/{document}/archive', [KnowledgeDocumentController::class, 'archive'])->name('knowledge-documents.archive');

// Health programs (phase 7)
Route::get('/health-programs', [HealthProgramController::class, 'index'])->name('health-programs.index');
Route::post('/health-programs', [HealthProgramController::class, 'store'])->name('health-programs.store');
Route::get('/health-programs/{program}', [HealthProgramController::class, 'show'])->name('health-programs.show');
Route::patch('/health-programs/{program}', [HealthProgramController::class, 'update'])->name('health-programs.update');
Route::post('/health-programs/{program}/publish', [HealthProgramController::class, 'publish'])->name('health-programs.publish');
Route::post('/health-programs/{program}/archive', [HealthProgramController::class, 'archive'])->name('health-programs.archive');

// Booking pilot (phase 7)
Route::get('/appointments', [AppointmentController::class, 'index'])->name('appointments.index');
Route::get('/appointments/calendar', [AppointmentController::class, 'calendar'])->name('appointments.calendar');
Route::get('/appointments/{appointment}', [AppointmentController::class, 'show'])->name('appointments.show');
Route::post('/appointments/{appointment}/{action}', [AppointmentController::class, 'transition'])
    ->whereIn('action', ['confirm', 'decline', 'cancel', 'complete', 'no-show'])
    ->name('appointments.transition');
Route::post('/facilities/{facility}/appointments', [AppointmentController::class, 'store'])->middleware('throttle:60,1')->name('facilities.appointments.store');
Route::get('/facilities/{facility}/availability', [ScheduleController::class, 'index'])->name('facilities.availability');
Route::post('/facilities/{facility}/availability', [ScheduleController::class, 'store'])->name('facilities.availability.store');
Route::patch('/facilities/{facility}/booking', [ScheduleController::class, 'booking'])->name('facilities.booking');
Route::patch('/facilities/{facility}/booking-rules', [ScheduleController::class, 'rules'])->name('facilities.booking-rules');
Route::delete('/availability/{slot}', [ScheduleController::class, 'destroy'])->name('availability.destroy');

// Service and facility-type catalogs (system admins). {slug} is fixed once created.
Route::prefix('catalog/{catalog}')->whereIn('catalog', ['services', 'facility-types'])->name('catalog.')->group(function (): void {
    Route::get('/', [CatalogController::class, 'index'])->name('index');
    Route::post('/', [CatalogController::class, 'store'])->name('store');
    Route::patch('/{slug}', [CatalogController::class, 'update'])->name('update');
    Route::post('/{slug}/archive', [CatalogController::class, 'archive'])->name('archive');
    Route::post('/{slug}/restore', [CatalogController::class, 'restore'])->name('restore');
    Route::delete('/{slug}', [CatalogController::class, 'destroy'])->name('destroy');
});

// Patient accounts (system admins: all; facility admins and staff: patients of their facilities).
Route::get('/patients', [PatientController::class, 'index'])->name('patients.index');
Route::get('/patients/{patient}', [PatientController::class, 'show'])->name('patients.show');
Route::patch('/patients/{patient}/status', [PatientController::class, 'status'])->name('patients.status');

// Pilot reports and CSV exports (aggregates; no patient names or contact details).
Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
Route::get('/reports/export', [ReportController::class, 'export'])->middleware('throttle:20,1')->name('reports.export');

// Roles and their permissions (Team & roles → Roles).
Route::get('/roles', [RoleController::class, 'index'])->name('roles.index');
Route::post('/roles', [RoleController::class, 'store'])->name('roles.store');
Route::patch('/roles/{role}', [RoleController::class, 'update'])->name('roles.update');
Route::delete('/roles/{role}', [RoleController::class, 'destroy'])->name('roles.destroy');

// Walk-in queue (today, per facility) and its actions.
Route::get('/facilities/{facility}/queue', [QueueController::class, 'index'])->name('facilities.queue.index');
Route::post('/facilities/{facility}/queue', [QueueController::class, 'store'])->middleware('throttle:120,1')->name('facilities.queue.store');
Route::post('/facilities/{facility}/check-in', [QueueController::class, 'checkIn'])->middleware('throttle:120,1')->name('facilities.check-in');
Route::post('/facilities/{facility}/queue/call-next', [QueueController::class, 'callNext'])->name('facilities.queue.call-next');
Route::post('/queue/{ticket}/{action}', [QueueController::class, 'move'])->whereIn('action', ['call', 'serve', 'done', 'skip', 'requeue'])->name('queue.move');

// "Today at this facility" and reports from the public.
Route::get('/facilities/{facility}/today', [FacilityTodayController::class, 'show'])->name('facilities.today.show');
Route::put('/facilities/{facility}/today', [FacilityTodayController::class, 'update'])->name('facilities.today.update');
Route::get('/facility-reports', [FacilityReportController::class, 'index'])->name('facility-reports.index');
Route::post('/facility-reports/{report}/{action}', [FacilityReportController::class, 'handle'])->whereIn('action', ['resolve', 'dismiss'])->name('facility-reports.handle');
