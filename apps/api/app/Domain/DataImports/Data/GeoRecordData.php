<?php

namespace App\Domain\DataImports\Data;

final readonly class GeoRecordData
{
    public const REGION = 'region';

    public const PROVINCE = 'province';

    public const DISTRICT = 'district';

    public const CITY = 'city';

    public const MUNICIPALITY = 'municipality';

    public const SUB_MUNICIPALITY = 'sub_municipality';

    public const BARANGAY = 'barangay';

    public function __construct(
        public string $code,
        public string $name,
        public string $level,
        /** For cities independent of any province: the province they sit in geographically (10-digit code). */
        public ?string $geographicProvinceCode = null,
    ) {}
}
