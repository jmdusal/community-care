<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;

final class MeController extends Controller
{
    public function __invoke(Request $request): UserResource
    {
        return new UserResource($request->user()->load(['roles', 'facilities:id,public_id,name']));
    }
}
