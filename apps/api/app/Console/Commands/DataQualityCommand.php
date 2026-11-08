<?php

namespace App\Console\Commands;

use App\Domain\Facilities\Queries\DataQualityQuery;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('communitycare:data-quality')]
#[Description('Summarise missing or doubtful facility data (the pilot data-quality review)')]
final class DataQualityCommand extends Command
{
    public function handle(DataQualityQuery $quality): int
    {
        $report = $quality->handle(fn () => null);

        $this->info("{$report['complete']} of {$report['total']} facilities have no data-quality issues.");
        $this->table(['Issue', 'Facilities', 'Why it matters'], array_map(fn (array $row): array => [$row['label'], $row['count'], $row['why']], array_values($report['summary'])));
        $this->line('Details per facility: Admin console → Data quality.');

        return self::SUCCESS;
    }
}
