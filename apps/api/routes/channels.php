<?php

use App\Domain\Identity\Models\User;
use Illuminate\Support\Facades\Broadcast;

/*
| Private channel for each user's in-app notifications (the bell), named after the
| user's public id (User::receivesBroadcastNotificationsOn). A user may only listen
| to their own channel, and suspended accounts get nothing.
*/
Broadcast::channel(
    'users.{publicId}',
    fn (User $user, string $publicId): bool => $user->public_id === $publicId && $user->isActive(),
    ['guards' => ['sanctum']],
);
