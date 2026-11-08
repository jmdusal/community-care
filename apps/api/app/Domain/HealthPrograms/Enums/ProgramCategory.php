<?php

namespace App\Domain\HealthPrograms\Enums;

enum ProgramCategory: string
{
    case Immunization = 'immunization';
    case Screening = 'screening';
    case MaternalChild = 'maternal_child';
    case Nutrition = 'nutrition';
    case InfectiousDisease = 'infectious_disease';
    case HealthEducation = 'health_education';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Immunization => 'Immunization',
            self::Screening => 'Screening',
            self::MaternalChild => 'Maternal & child health',
            self::Nutrition => 'Nutrition',
            self::InfectiousDisease => 'Infectious disease',
            self::HealthEducation => 'Health education',
            self::Other => 'Other',
        };
    }
}
