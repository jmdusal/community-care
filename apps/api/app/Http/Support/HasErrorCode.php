<?php

namespace App\Http\Support;

/** An HTTP exception with its own machine-readable error code (instead of the generic one for its status). */
interface HasErrorCode
{
    public function errorCode(): string;
}
