<?php

namespace App\Domain\KnowledgeAssistant\Support;

use App\Domain\Facilities\Contracts\FacilityReader;
use App\Domain\Facilities\Data\FacilitySearchData;
use App\Domain\Facilities\Enums\PublicationStatus;
use App\Domain\Facilities\Models\Facility;
use App\Domain\KnowledgeAssistant\Data\AssistantQuestion;
use App\Domain\KnowledgeAssistant\Data\RetrievedContext;
use App\Domain\KnowledgeAssistant\Models\KnowledgeDocument;
use App\Domain\Services\Models\Service;
use App\Domain\Settings\Contracts\SettingsRepository;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * Finds the approved records relevant to a question: published facilities
 * (by recognised service, place words and the person's location) and
 * published knowledge documents (FULLTEXT, natural-language mode).
 * Plain database search first; embeddings only if evaluation shows a need.
 */
final class KnowledgeRetriever
{
    private const NEARBY_RADIUS_KM = 15;

    /** Words that describe facilities in general; they never identify a place. */
    private const GENERIC_WORDS = [
        'health', 'center', 'centre', 'centers', 'station', 'office', 'unit', 'rural', 'hospital', 'hospitals', 'city', 'barangay', 'brgy',
        'municipal', 'municipality', 'province', 'rhu', 'bhs', 'doctor', 'doktor',
    ];

    private const MIN_AREA_WORD = 4;

    public function __construct(
        private readonly FacilityReader $facilities,
        private readonly SourceFormatter $formatter,
        private readonly SettingsRepository $settings,
    ) {}

    public function retrieve(AssistantQuestion $question): RetrievedContext
    {
        $keywords = Keywords::from($question->text);
        $services = $this->matchServices($question->text);
        $serviceWords = $services->flatMap(fn (Service $service): array => [...Keywords::from($service->name), ...$this->serviceKeywords($service->slug)])->all();
        $placeWords = array_values(array_diff($keywords, $serviceWords, self::GENERIC_WORDS));

        $facilities = $this->findFacilities($question, $services, $placeWords);
        $documents = $this->findDocuments(array_values(array_diff($keywords, self::GENERIC_WORDS)));

        $items = [];
        foreach ($facilities->values() as $index => $facility) {
            $items[] = $this->formatter->facility($facility, $index + 1);
        }

        $staleAfter = $this->settings->int('verification.stale_after_days');
        foreach ($documents->values() as $index => $document) {
            $items[] = $this->formatter->document($document, $index + 1, $staleAfter);
        }

        return new RetrievedContext($items, $services->pluck('name')->all(), $question->isNearby() || $question->regionCode !== null);
    }

    /** @return \Illuminate\Support\Collection<int, Service> */
    private function matchServices(string $text): \Illuminate\Support\Collection
    {
        $text = ' '.mb_strtolower($text).' ';

        return Service::query()->orderBy('name')->get(['id', 'slug', 'name'])
            ->filter(function (Service $service) use ($text): bool {
                $phrases = [mb_strtolower($service->name), ...$this->serviceKeywords($service->slug)];

                foreach ($phrases as $phrase) {
                    if (preg_match('/(?<![\p{L}])'.preg_quote($phrase, '/').'(?![\p{L}])/u', $text) === 1) {
                        return true;
                    }
                }

                return false;
            })
            ->values();
    }

    /** @return list<string> */
    private function serviceKeywords(string $slug): array
    {
        return array_map('mb_strtolower', config("communitycare.assistant.service_keywords.{$slug}", []));
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Service>  $services
     * @param  list<string>  $placeWords
     * @return Collection<int, Facility>
     */
    private function findFacilities(AssistantQuestion $question, \Illuminate\Support\Collection $services, array $placeWords): Collection
    {
        $limit = (int) config('communitycare.assistant.max_facilities', 5);
        $serviceSlug = $services->first()?->slug;

        if ($question->isNearby()) {
            $found = $this->facilities->search(new FacilitySearchData(
                service: $serviceSlug,
                latitude: $question->latitude,
                longitude: $question->longitude,
                radiusKm: self::NEARBY_RADIUS_KM,
                perPage: $limit,
            ));

            return $this->withDetails(new Collection($found->items()));
        }

        $base = Facility::query()
            ->where('facilities.publication_status', PublicationStatus::Published)
            ->with(['type:id,slug,name', 'region:id,psgc_code,name', 'province:id,psgc_code,name', 'cityMunicipality:id,psgc_code,name', 'barangay:id,psgc_code,name', 'services:id,slug,name']);

        if ($question->regionCode !== null) {
            $base->whereHas('region', fn (Builder $q) => $q->where('psgc_code', $question->regionCode));
        }

        if ($serviceSlug !== null) {
            $base->whereHas('services', fn (Builder $q) => $q->where('slug', $serviceSlug));
        }

        if ($placeWords !== []) {
            $terms = implode(' ', $placeWords);
            $areaWords = array_values(array_filter($placeWords, fn (string $word): bool => mb_strlen($word) >= self::MIN_AREA_WORD));

            // Place words match the facility's name or address, or its city, province or barangay
            // (PSGC names such as "City of Antipolo" live on the area tables, not in the address).
            $matched = (clone $base)
                ->where(function (Builder $q) use ($terms, $areaWords): void {
                    $q->whereFullText(['facilities.name', 'facilities.address'], $terms);

                    foreach (['cityMunicipality', 'province', 'barangay'] as $area) {
                        foreach ($areaWords as $word) {
                            $q->orWhereHas($area, fn (Builder $a) => $a->where('name', 'like', '%'.addcslashes($word, '%_\\').'%'));
                        }
                    }
                })
                ->orderByRaw('MATCH(facilities.name, facilities.address) AGAINST (? IN NATURAL LANGUAGE MODE) DESC', [$terms])
                ->orderBy('facilities.name')
                ->limit($limit)
                ->get();

            if ($matched->isNotEmpty()) {
                return $this->withDetails($matched);
            }
        }

        // No place match: list facilities only when the question named a service or the person gave a region.
        if ($serviceSlug === null && $question->regionCode === null) {
            return new Collection;
        }

        return $this->withDetails($base->orderBy('facilities.name')->limit($limit)->get());
    }

    /**
     * @param  Collection<int, Facility>  $facilities
     * @return Collection<int, Facility>
     */
    private function withDetails(Collection $facilities): Collection
    {
        return $facilities->loadMissing([
            'hours',
            'contacts' => fn ($q) => $q->where('is_public', true),
            'services:id,slug,name',
        ]);
    }

    /**
     * @param  list<string>  $keywords
     * @return Collection<int, KnowledgeDocument>
     */
    private function findDocuments(array $keywords): Collection
    {
        if ($keywords === []) {
            return new Collection;
        }

        $terms = implode(' ', $keywords);

        return KnowledgeDocument::query()
            ->published()
            ->whereFullText(['title', 'body'], $terms)
            ->orderByRaw('MATCH(title, body) AGAINST (? IN NATURAL LANGUAGE MODE) DESC', [$terms])
            ->limit((int) config('communitycare.assistant.max_documents', 3))
            ->get();
    }
}
