<?php

use App\Http\Middleware\AssignRequestId;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Support\ApiErrorRenderer;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    // WebSocket channel auth at /api/broadcasting/auth: works with the web app's cookie
    // session (through the same /api proxy) and the mobile app's tokens.
    ->withBroadcasting(__DIR__.'/../routes/channels.php', ['prefix' => 'api', 'middleware' => ['api', 'auth:sanctum']])
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [AssignRequestId::class, SecurityHeaders::class]);

        // Web SPA signs in with a Sanctum cookie session; mobile uses tokens.
        $middleware->statefulApi();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(
            fn (Throwable $exception, Request $request) => $request->is('api/*')
                ? ApiErrorRenderer::render($exception)
                : null,
        );
    })->create();
