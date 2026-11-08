<?php

use App\Http\Middleware\RequireTwoFactor;
use Illuminate\Support\Facades\Route;

/*
| All endpoints live under /api/v1 (the "api" prefix is added by Laravel).
| Each area has its own file so public, auth and admin routes stay separate.
*/

Route::prefix('v1')->name('v1.')->group(function (): void {
    require __DIR__.'/api/public.php';
    require __DIR__.'/api/auth.php';

    Route::prefix('admin')->name('admin.')->middleware(['auth:sanctum', RequireTwoFactor::class])->group(__DIR__.'/api/admin.php');
});
