<?php

namespace App\Http\Middleware;

use App\Domain\Audit\Support\IpMasker;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Context;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gives every API request an id (kept from a valid incoming X-Request-Id),
 * shares it and the masked client IP through Context so logs and queued
 * listeners can use them, and returns it in the response header.
 */
final class AssignRequestId
{
    public function handle(Request $request, Closure $next): Response
    {
        $incoming = $request->headers->get('X-Request-Id');
        $requestId = is_string($incoming) && preg_match('/^[A-Za-z0-9_-]{8,64}$/', $incoming) === 1
            ? $incoming
            : 'req_'.Str::ulid();

        Context::add('request_id', $requestId);
        Context::add('ip_masked', IpMasker::mask($request->ip()));

        $response = $next($request);
        $response->headers->set('X-Request-Id', $requestId);

        return $response;
    }
}
