<?php

namespace App\Http\Resources;

use App\Domain\Booking\Enums\AppointmentStatus;
use App\Domain\Booking\Models\Appointment;
use App\Domain\Booking\Models\AppointmentEvent;
use App\Domain\Booking\Support\CheckInQr;
use App\Http\Support\Time;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Patients see their own appointment; staff also see who it is for (name, mobile,
 * email, whether they have an account) so the clinic can reach them, and how it was
 * made (online, guest, or booked by staff). No medical information exists.
 *
 * @mixin Appointment
 */
final class AppointmentResource extends JsonResource
{
    public bool $forStaff = false;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->public_id,
            'reference_code' => $this->reference_code,
            'status' => ['value' => $this->status->value, 'label' => $this->status->label()],
            'starts_at' => Time::iso($this->starts_at),
            'ends_at' => Time::iso($this->ends_at),
            'facility' => ['id' => $this->facility->public_id, 'name' => $this->facility->name, 'address' => $this->facility->address],
            'service' => $this->service === null ? null : ['slug' => $this->service->slug, 'name' => $this->service->name],
            'status_reason' => $this->status_reason,
            'can_cancel' => in_array(AppointmentStatus::Cancelled, $this->status->allowedNext(), true),
            'next_actions' => $this->when($this->forStaff, fn () => array_map(fn (AppointmentStatus $status): string => $status->value, $this->status->allowedNext())),
            'source' => $this->source,
            'arrived_at' => Time::iso($this->arrived_at),
            'queue_number' => $this->whenLoaded('queueTicket', fn () => $this->queueTicket?->label()),
            // Shown to the patient (never in staff lists): scanned at the desk on the day.
            'check_in_qr' => $this->when(! $this->forStaff, fn () => $this->status === AppointmentStatus::Confirmed && $this->arrived_at === null && $this->ends_at->isFuture() ? CheckInQr::dataUri($this->reference_code) : null),
            'patient' => $this->when($this->forStaff, fn () => [
                'name' => $this->contact_name ?? $this->patient?->name,
                'mobile' => $this->contact_mobile ?? $this->patient?->mobile,
                'email' => $this->contact_email ?? $this->patient?->email,
                'account_id' => $this->patient?->public_id,
            ]),
            'booked_by' => $this->when($this->forStaff && $this->booked_by !== null, fn () => $this->bookedBy?->name),
            'history' => $this->whenLoaded('events', fn () => $this->events->map(fn (AppointmentEvent $event): array => [
                'from' => $event->from_status,
                'to' => $event->to_status,
                'note' => $event->note,
                'by' => $this->forStaff ? $event->actor?->name : null,
                'at' => Time::iso($event->created_at),
            ])->values()),
            'requested_at' => Time::iso($this->created_at),
        ];
    }
}
