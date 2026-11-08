<?php

namespace App\Http\Support;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Context;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

/**
 * Renders every API error in the one documented shape:
 * {"error": {"code", "message", "fields"?, "retry_after"?, "request_id"?}}
 */
final class ApiErrorRenderer
{
    public static function render(Throwable $exception): JsonResponse
    {
        [$status, $code, $message, $fields, $headers] = match (true) {
            $exception instanceof ValidationException => [422, 'validation_failed', 'Some fields are invalid.', $exception->errors(), []],
            $exception instanceof AuthenticationException => [401, 'unauthenticated', 'Sign in to continue.', null, []],
            $exception instanceof HasErrorCode && $exception instanceof HttpExceptionInterface => [$exception->getStatusCode(), $exception->errorCode(), $exception->getMessage(), null, $exception->getHeaders()],
            $exception instanceof AccessDeniedHttpException => [403, 'forbidden', 'You are not allowed to do this.', null, []],
            $exception instanceof NotFoundHttpException => [404, 'not_found', 'The requested resource was not found.', null, []],
            $exception instanceof ThrottleRequestsException => [429, 'rate_limited', 'Too many requests. Try again later.', null, $exception->getHeaders()],
            $exception instanceof HttpExceptionInterface => [$exception->getStatusCode(), self::codeFor($exception->getStatusCode()), $exception->getMessage() !== '' ? $exception->getMessage() : 'The request could not be completed.', null, $exception->getHeaders()],
            default => [500, 'server_error', 'Something went wrong. Please try again.', null, []],
        };

        $retryAfter = $headers['Retry-After'] ?? null;

        $error = array_filter([
            'code' => $code,
            'message' => $message,
            'fields' => $fields,
            'retry_after' => $retryAfter === null ? null : (int) $retryAfter,
            'request_id' => Context::get('request_id'),
        ], fn (mixed $value): bool => $value !== null);

        return new JsonResponse(['error' => $error], $status, $headers);
    }

    private static function codeFor(int $status): string
    {
        return match ($status) {
            405 => 'method_not_allowed',
            409 => 'conflict',
            413 => 'payload_too_large',
            503 => 'service_unavailable',
            default => 'http_error',
        };
    }
}
