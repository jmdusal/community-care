<?php

namespace App\Http\Requests\Public;

use App\Domain\Facilities\Data\FacilitySearchData;
use App\Domain\Settings\Contracts\SettingsRepository;
use Illuminate\Foundation\Http\FormRequest;

/** Search parameters from docs/api.md (section 9.3). Caps come from settings. */
final class SearchFacilitiesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $settings = app(SettingsRepository::class);

        return [
            'q' => ['nullable', 'string', 'max:120'],
            'region_code' => ['nullable', 'digits:10'],
            'province_code' => ['nullable', 'digits:10'],
            'city_code' => ['nullable', 'digits:10'],
            'barangay_code' => ['nullable', 'digits:10'],
            'type' => ['nullable', 'string', 'max:80', 'alpha_dash'],
            'service' => ['nullable', 'string', 'max:80', 'alpha_dash'],
            'lat' => ['nullable', 'required_with:lng', 'numeric', 'between:4,22'],
            'lng' => ['nullable', 'required_with:lat', 'numeric', 'between:116,127.5'],
            'radius_km' => ['nullable', 'numeric', 'min:0.5', 'max:'.$settings->int('api.nearby_radius_cap_km')],
            'verified_only' => ['nullable', 'boolean'],
            'page' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.$settings->int('api.max_page_size')],
        ];
    }

    public function toData(): FacilitySearchData
    {
        return new FacilitySearchData(
            query: $this->validated('q'),
            regionCode: $this->validated('region_code'),
            provinceCode: $this->validated('province_code'),
            cityCode: $this->validated('city_code'),
            barangayCode: $this->validated('barangay_code'),
            type: $this->validated('type'),
            service: $this->validated('service'),
            latitude: $this->filled('lat') ? (float) $this->validated('lat') : null,
            longitude: $this->filled('lng') ? (float) $this->validated('lng') : null,
            radiusKm: (float) ($this->validated('radius_km') ?? 10),
            verifiedOnly: $this->boolean('verified_only'),
            page: (int) ($this->validated('page') ?? 1),
            perPage: (int) ($this->validated('per_page') ?? 20),
        );
    }
}
