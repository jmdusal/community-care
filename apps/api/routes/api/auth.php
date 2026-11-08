<?php

use App\Http\Controllers\Api\V1\Auth\AccountController;
use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\Auth\MeController;
use App\Http\Controllers\Api\V1\Auth\NotificationController;
use App\Http\Controllers\Api\V1\Auth\PasswordController;
use App\Http\Controllers\Api\V1\Auth\PushTokenController;
use App\Http\Controllers\Api\V1\Auth\RegisterController;
use App\Http\Controllers\Api\V1\Auth\TwoFactorController;
use App\Http\Controllers\Api\V1\Patient\AppointmentController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', LoginController::class)->middleware('throttle:login')->name('auth.login');
Route::post('/auth/two-factor', [TwoFactorController::class, 'challenge'])->middleware('throttle:login')->name('auth.two-factor');
Route::post('/auth/two-factor/resend', [TwoFactorController::class, 'resend'])->middleware('throttle:login')->name('auth.two-factor.resend');
Route::post('/auth/register', RegisterController::class)->middleware('throttle:login')->name('auth.register');
Route::post('/auth/forgot-password', [PasswordController::class, 'forgot'])->middleware('throttle:login')->name('auth.password.forgot');
Route::post('/auth/reset-password', [PasswordController::class, 'reset'])->middleware('throttle:login')->name('auth.password.reset');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/auth/logout', LogoutController::class)->name('auth.logout');
    Route::get('/me', MeController::class)->name('me');
    Route::patch('/me', [AccountController::class, 'update'])->name('me.update');
    Route::put('/me/password', [AccountController::class, 'password'])->middleware('throttle:login')->name('me.password');
    Route::delete('/me', [AccountController::class, 'destroy'])->middleware('throttle:login')->name('me.destroy');

    // Two-factor sign-in settings for the signed-in person.
    Route::get('/me/two-factor', [TwoFactorController::class, 'show'])->name('me.two-factor');
    Route::post('/me/two-factor/setup', [TwoFactorController::class, 'setup'])->middleware('throttle:login')->name('me.two-factor.setup');
    Route::post('/me/two-factor/confirm', [TwoFactorController::class, 'confirm'])->middleware('throttle:login')->name('me.two-factor.confirm');
    Route::post('/me/two-factor/recovery-codes', [TwoFactorController::class, 'recoveryCodes'])->middleware('throttle:login')->name('me.two-factor.recovery-codes');
    Route::delete('/me/trusted-devices', [TwoFactorController::class, 'forgetDevices'])->name('me.trusted-devices.destroy');
    Route::delete('/me/two-factor', [TwoFactorController::class, 'destroy'])->middleware('throttle:login')->name('me.two-factor.destroy');

    // Mobile push notifications (Expo push tokens).
    Route::post('/me/push-tokens', [PushTokenController::class, 'store'])->middleware('throttle:20,1')->name('me.push-tokens.store');
    Route::delete('/me/push-tokens', [PushTokenController::class, 'destroy'])->name('me.push-tokens.destroy');

    // In-app notifications (the bell); new ones are also pushed live over Reverb.
    Route::get('/me/notifications', [NotificationController::class, 'index'])->name('me.notifications');
    Route::post('/me/notifications/read-all', [NotificationController::class, 'readAll'])->name('me.notifications.read-all');
    Route::post('/me/notifications/{notification}/read', [NotificationController::class, 'read'])->whereUuid('notification')->name('me.notifications.read');

    // Patients: their own appointments (booking pilot, phase 7).
    Route::get('/me/appointments', [AppointmentController::class, 'index'])->name('me.appointments');
    Route::post('/appointments', [AppointmentController::class, 'store'])->middleware('throttle:20,1')->name('appointments.store');
    Route::get('/appointments/{appointment}', [AppointmentController::class, 'show'])->name('appointments.show');
    Route::post('/appointments/{appointment}/cancel', [AppointmentController::class, 'cancel'])->name('appointments.cancel');
});
