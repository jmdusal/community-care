<?php

namespace App\Domain\HealthPrograms\Actions;

use App\Domain\Facilities\Models\Facility;
use App\Domain\HealthPrograms\Events\HealthProgramChanged;
use App\Domain\HealthPrograms\Models\HealthProgram;
use App\Domain\Identity\Models\User;
use Illuminate\Support\Facades\DB;

/** Creates or edits a program and its participating facilities. */
final class SaveHealthProgram
{
    private const AUDITED = ['title', 'category', 'summary', 'starts_on', 'ends_on', 'source_name', 'source_url', 'status'];

    /**
     * @param  array<string, mixed>  $data  validated fields
     * @param  list<string>  $facilityIds  public ids
     */
    public function handle(?HealthProgram $program, array $data, array $facilityIds, User $actor): HealthProgram
    {
        return DB::transaction(function () use ($program, $data, $facilityIds, $actor): HealthProgram {
            $creating = $program === null;
            $program ??= new HealthProgram(['created_by' => $actor->id]);
            $before = $creating ? null : $this->snapshot($program);

            $program->fill([...$data, 'updated_by' => $actor->id])->save();
            $program->facilities()->sync(Facility::query()->whereIn('public_id', $facilityIds)->pluck('id')->all());

            $after = $this->snapshot($program->load('facilities:id,public_id'));
            if ($creating || $before != $after) {
                HealthProgramChanged::dispatch($creating ? 'created' : 'updated', $program->public_id, $actor->id, $before, $after);
            }

            return $program;
        });
    }

    /** @return array<string, mixed> */
    private function snapshot(HealthProgram $program): array
    {
        $values = [];
        foreach (self::AUDITED as $field) {
            $value = $program->getAttribute($field);
            $values[$field] = $value instanceof \BackedEnum ? $value->value : ($value instanceof \DateTimeInterface ? $value->format('Y-m-d') : $value);
        }

        return [...$values, 'facilities' => $program->facilities->pluck('public_id')->sort()->values()->all()];
    }
}
