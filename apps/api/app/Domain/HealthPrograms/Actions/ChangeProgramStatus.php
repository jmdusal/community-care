<?php

namespace App\Domain\HealthPrograms\Actions;

use App\Domain\HealthPrograms\Enums\ProgramStatus;
use App\Domain\HealthPrograms\Events\HealthProgramChanged;
use App\Domain\HealthPrograms\Exceptions\ProgramNotPublishable;
use App\Domain\HealthPrograms\Models\HealthProgram;
use App\Domain\Identity\Models\User;
use Illuminate\Support\Facades\DB;

final class ChangeProgramStatus
{
    public function handle(HealthProgram $program, ProgramStatus $status, User $actor): HealthProgram
    {
        if ($program->status === $status) {
            return $program;
        }

        if ($status === ProgramStatus::Published) {
            if ($program->ends_on !== null && $program->ends_on->lt(now(config('communitycare.display_timezone'))->startOfDay())) {
                throw ProgramNotPublishable::ended();
            }
            if (! $program->facilities()->exists()) {
                throw ProgramNotPublishable::noFacilities();
            }
        }

        return DB::transaction(function () use ($program, $status, $actor): HealthProgram {
            $before = ['status' => $program->status->value];

            $program->forceFill([
                'status' => $status,
                'published_at' => $status === ProgramStatus::Published ? now() : $program->published_at,
                'updated_by' => $actor->id,
            ])->save();

            HealthProgramChanged::dispatch($status->value, $program->public_id, $actor->id, $before, ['status' => $status->value]);

            return $program;
        });
    }
}
