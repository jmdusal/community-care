<?php

namespace App\Domain\Booking\Support;

use chillerlan\QRCode\Output\QRGdImagePNG;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;

/**
 * The check-in QR code a confirmed patient shows at the desk. It holds only the
 * reference code (no name, no medical information); staff scanning it still need
 * appointment access at that facility to check the person in.
 */
final class CheckInQr
{
    /** A PNG data URI ("data:image/png;base64,…") that web pages and the app can show as an image. */
    public static function dataUri(string $referenceCode): string
    {
        $options = new QROptions([
            'outputInterface' => QRGdImagePNG::class,
            'outputBase64' => true,
            'scale' => 10,
            'quietzoneSize' => 2,
        ]);

        return (new QRCode($options))->render($referenceCode);
    }
}
