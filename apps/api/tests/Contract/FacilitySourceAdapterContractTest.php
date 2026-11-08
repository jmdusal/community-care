<?php

namespace Tests\Contract;

use App\Domain\DataImports\Adapters\MappedCsvFacilityAdapter;
use App\Domain\DataImports\Data\FacilityRecordData;
use App\Domain\DataImports\Exceptions\ImportFileInvalid;
use App\Domain\DataImports\Support\AdapterRegistry;
use Tests\TestCase;

/**
 * Every configured facility source must honour the same contract (Liskov):
 * normalized FacilityRecordData out, ImportFileInvalid when required columns are missing.
 */
final class FacilitySourceAdapterContractTest extends TestCase
{
    public function test_every_configured_facility_source_honours_the_adapter_contract(): void
    {
        $adapters = app(AdapterRegistry::class)->facilityAdapters();
        $this->assertNotEmpty($adapters);

        foreach ($adapters as $adapter) {
            $columns = config("communitycare.imports.facility_sources.{$adapter->key()}.columns");
            $path = $this->csvFor($columns, [
                'source_record_id' => 'X-1',
                'name' => '  Sample   Clinic ',
                'region_code' => '04-000-00-000',
                'latitude' => '14.6',
                'longitude' => '121.12',
                'phone' => '(02) 1111 1111; (02) 2222 2222',
            ]);

            $records = iterator_to_array($adapter->read($path), false);

            $this->assertCount(1, $records, $adapter->key());
            $this->assertInstanceOf(FacilityRecordData::class, $records[0]);
            $this->assertSame('X-1', $records[0]->sourceRecordId);
            $this->assertSame('Sample Clinic', $records[0]->name, 'Whitespace is normalized.');
            $this->assertSame('0400000000', $records[0]->regionCode, 'PSGC codes keep digits only.');
            $this->assertSame(14.6, $records[0]->latitude);
            $this->assertCount(2, array_filter($records[0]->contacts, fn (array $c): bool => $c['type'] === 'phone'));
        }
    }

    public function test_missing_required_columns_raise_import_file_invalid(): void
    {
        foreach (app(AdapterRegistry::class)->facilityAdapters() as $adapter) {
            $path = tempnam(sys_get_temp_dir(), 'contract');
            file_put_contents($path, "unrelated,columns\n1,2\n");

            try {
                iterator_to_array($adapter->read($path));
                $this->fail("{$adapter->key()} accepted a file without required columns.");
            } catch (ImportFileInvalid $exception) {
                $this->assertStringContainsString('Required column', $exception->getMessage());
            }
        }
    }

    /**
     * @param  array<string, string|null>  $columns
     * @param  array<string, string>  $values
     */
    private function csvFor(array $columns, array $values): string
    {
        $headers = array_values(array_filter($columns));
        $row = array_map(function (string $header) use ($columns, $values): string {
            $field = array_search($header, $columns, true);

            return $values[$field] ?? '';
        }, $headers);

        $path = tempnam(sys_get_temp_dir(), 'contract');
        $handle = fopen($path, 'w');
        fputcsv($handle, $headers, escape: '');
        fputcsv($handle, $row, escape: '');
        fclose($handle);

        $this->assertContains('source_record_id', array_keys(array_filter($columns)));
        $this->assertSame(MappedCsvFacilityAdapter::REQUIRED_FIELDS, ['source_record_id', 'name']);

        return $path;
    }
}
