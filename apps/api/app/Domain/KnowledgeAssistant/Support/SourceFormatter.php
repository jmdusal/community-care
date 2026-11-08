<?php

namespace App\Domain\KnowledgeAssistant\Support;

use App\Domain\Facilities\Enums\VerificationStatus;
use App\Domain\Facilities\Models\Facility;
use App\Domain\Facilities\Models\FacilityContact;
use App\Domain\Facilities\Models\FacilityHour;
use App\Domain\KnowledgeAssistant\Data\SourceItem;
use App\Domain\KnowledgeAssistant\Models\KnowledgeDocument;
use App\Domain\Services\Models\Service;
use Illuminate\Support\Str;

/** Turns approved records into the source items a provider may quote. */
final class SourceFormatter
{
    private const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    private const DOCUMENT_PROMPT_CHARS = 4000;

    public function facility(Facility $facility, int $position): SourceItem
    {
        $place = collect([$facility->barangay?->name, $facility->cityMunicipality?->name, $facility->province?->name, $facility->region?->name])->filter()->implode(', ');
        $services = $facility->services->map(fn (Service $service): string => $service->name)->implode(', ');
        $hours = $this->hours($facility);
        $phones = $facility->contacts->filter(fn (FacilityContact $contact): bool => $contact->contact_type === 'phone')->pluck('value')->take(2)->implode(', ');
        $verification = $this->verification($facility);

        $lines = array_filter([
            'Name: '.$facility->name,
            $facility->type ? 'Type: '.$facility->type->name : null,
            $facility->address ? 'Address: '.$facility->address : null,
            $place !== '' ? 'Area: '.$place : null,
            'Listed services: '.($services !== '' ? $services : 'none listed'),
            'Opening hours: '.($hours ?? 'not listed'),
            $phones !== '' ? 'Phone: '.$phones : null,
            'Verification: '.$verification,
            isset($facility->distance_km) ? sprintf('Distance from the person: %.1f km', (float) $facility->distance_km) : null,
        ]);

        $summary = collect([
            $facility->name,
            $facility->address ?: ($place !== '' ? $place : null),
            $services !== '' ? 'Services: '.$services : null,
            $hours ? 'Hours: '.$hours : null,
            $phones !== '' ? 'Phone: '.$phones : null,
            isset($facility->distance_km) ? sprintf('%.1f km away', (float) $facility->distance_km) : null,
            $verification,
        ])->filter()->implode(' · ');

        return new SourceItem(
            key: 'F'.$position,
            type: SourceItem::FACILITY,
            id: $facility->public_id,
            title: $facility->name,
            content: implode("\n", $lines),
            summary: $summary,
            url: rtrim((string) config('communitycare.frontend_url'), '/').'/facilities/'.$facility->public_id,
            verifiedAt: $facility->verified_at,
            isStale: $facility->verification_status === VerificationStatus::Stale,
        );
    }

    public function document(KnowledgeDocument $document, int $position, int $staleAfterDays): SourceItem
    {
        $body = trim((string) preg_replace('/\s+/u', ' ', $document->body));

        return new SourceItem(
            key: 'D'.$position,
            type: SourceItem::DOCUMENT,
            id: $document->public_id,
            title: $document->title,
            content: 'Title: '.$document->title."\nSource: ".$document->source_name."\n".Str::limit($body, self::DOCUMENT_PROMPT_CHARS),
            summary: $document->title.': '.Str::limit($body, 280),
            url: $document->source_url,
            verifiedAt: $document->verified_at,
            isStale: $document->isStale($staleAfterDays),
        );
    }

    private function verification(Facility $facility): string
    {
        return match ($facility->verification_status) {
            VerificationStatus::Verified => 'verified on '.$facility->verified_at?->timezone(config('communitycare.display_timezone'))->toDateString(),
            VerificationStatus::Stale => 'stale (last verified '.($facility->verified_at?->toDateString() ?? 'unknown').'; details may have changed)',
            default => 'not yet verified (from the imported registry)',
        };
    }

    /** "Mon–Fri 08:00–17:00; Sat 08:00–12:00" with consecutive days grouped. */
    private function hours(Facility $facility): ?string
    {
        if ($facility->hours->isEmpty()) {
            return null;
        }

        $groups = [];

        foreach ($facility->hours->sortBy('day_of_week') as $hour) {
            /** @var FacilityHour $hour */
            $opens = substr((string) $hour->opens_at, 0, 5);
            $closes = substr((string) $hour->closes_at, 0, 5);
            $range = match (true) {
                $opens === '00:00' && $closes === '24:00' => 'open 24 hours',
                $closes < $opens => "{$opens}–{$closes} (next day)",
                default => "{$opens}–{$closes}",
            };
            $last = array_key_last($groups);

            if ($last !== null && $groups[$last]['range'] === $range && $groups[$last]['to'] === $hour->day_of_week - 1) {
                $groups[$last]['to'] = $hour->day_of_week;
            } else {
                $groups[] = ['from' => $hour->day_of_week, 'to' => $hour->day_of_week, 'range' => $range];
            }
        }

        if (count($groups) === 1 && $groups[0]['from'] === 1 && $groups[0]['to'] === 7 && $groups[0]['range'] === 'open 24 hours') {
            return 'Open 24 hours, every day';
        }

        return implode('; ', array_map(
            fn (array $group): string => self::DAYS[$group['from']].($group['to'] !== $group['from'] ? '–'.self::DAYS[$group['to']] : '').' '.$group['range'],
            $groups,
        ));
    }
}
