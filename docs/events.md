# Domain Events

[← Documentation index](README.md)

## 6.3 Event-driven design

Every meaningful state change raises a **domain event**. The Action that changes the data stays short; listeners handle the side effects.

**Approve-facility flow**

```
Verifier clicks Approve
  -> POST /api/v1/admin/change-requests/{id}/approve
  -> ApproveFacilityAction (DB transaction: apply change, mark verified)
  -> commit
  -> FacilityApproved event
       |-> WriteAuditLog            (queued)
       |-> NotifySubmitter          (queued)
       |-> RefreshDirectoryCache    (queued)
       |-> RefreshDashboardStats    (queued)
       '-> ReindexAssistantKnowledge (queued, phase 6)
```

**Event catalogue**

| Event | Raised when | Main listeners |
|---|---|---|
| `FacilityChangeSubmitted` | Staff or a verifier proposes a change | Audit log, notify verifiers, update review-queue count |
| `FacilityApproved` | A change request is approved and published | Audit log, notify submitter, refresh caches, re-index assistant |
| `FacilityRejected` | A change request is rejected with a reason | Audit log, notify submitter |
| `FacilityMarkedStale` | Nightly job finds verification older than the threshold | Audit log, add to review queue, weekly digest |
| `ImportBatchStarted` | An authorized user or the scheduler starts an import | Audit log |
| `ImportBatchStaged` | Records are normalized and matched in staging | Run duplicate and conflict detection |
| `ImportRecordFlagged` | A duplicate or conflict is detected | Add to review queue |
| `ImportBatchPublished` | Approved staged records are published | Audit log, refresh caches, notify importer |
| `ImportBatchFailed` | A batch fails at any step | Audit log, alert admins (published data unchanged) |
| `UserInvited` / `UserRoleChanged` | Access changes | Audit log, security alert email |
| `SettingUpdated` | A setting changes | Audit log, clear settings cache |
| `KnowledgeDocumentPublished` | A document is approved for the assistant | Re-index assistant knowledge |
| `HealthProgramPublished` | A program becomes visible | Refresh caches, notify subscribed users (phase 2) |
| `AppointmentRequested` / `AppointmentConfirmed` | Booking changes (phase 2) | Notifications, appointment history |

**Rules**

- Event names are in the past tense and describe a business fact.
- Events carry IDs and minimal fields only. **No personal contact details or medical data in event payloads.**
- Events are dispatched **after the database commit** (`ShouldDispatchAfterCommit`), so listeners never see uncommitted data.
- Listeners are queued (`ShouldQueue`) on Redis, with retries and backoff, and must be **idempotent** (safe to run twice).
- Work that must succeed or fail together stays inside the Action's transaction. Events are for side effects only.
- If events later need to reach external systems reliably, add an outbox table rather than calling them inside the request.

```php
final class FacilityApproved implements ShouldDispatchAfterCommit
{
    use Dispatchable;

    public function __construct(
        public readonly int $facilityId,
        public readonly int $reviewerId,
        public readonly int $changeRequestId,
    ) {}
}

final class WriteAuditLog implements ShouldQueue
{
    public int $tries = 5;

    public function handle(FacilityApproved $event): void
    {
        AuditLog::firstOrCreate(
            ['event_key' => "facility.approved:{$event->changeRequestId}"], // idempotent
            [
                'actor_id' => $event->reviewerId,
                'action' => 'facility.approved',
                'resource_type' => 'facility',
                'resource_id' => $event->facilityId,
            ],
        );
    }
}
```

## As built (phase 7)

| Event | Audit action | Listeners |
|---|---|---|
| `AppointmentRequested` | `appointment.requested` | Email + in-app to the facility's staff; email to the patient |
| `AppointmentStatusChanged` | `appointment.{confirmed, declined, cancelled, completed, no_show}` | Email + in-app to the patient (clinic actions) or to staff (patient cancelled) |
| `FacilityBookingChanged` | `facility.booking_enabled / booking_disabled` | none |
| `HealthProgramChanged` | `health_program.{created, updated, published, archived}` | none |

In-app notifications (`InAppNotification`) are stored in `notifications` and broadcast over Reverb. They carry a title, a short text and a link, never medical details.
