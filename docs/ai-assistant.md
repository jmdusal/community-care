# AI Assistant

[← Documentation index](README.md)

The AI assistant helps users find services and understand approved public information. It does not diagnose, prescribe, or make clinical decisions.

## Request flow

1. The client sends a question to Laravel.
2. Laravel validates and rate-limits the request.
3. A retrieval service searches approved facility records and `knowledge_documents`.
4. The AI provider receives the question plus only the relevant public context.
5. The application returns the answer, supporting sources, and source freshness.
6. If information is missing or stale, the assistant says so and directs the user to the facility or an official source.

## Safeguards

- Do not allow the model to invent clinic hours, service availability, accreditation, or prices.
- Show source links and last-verified dates for factual facility claims.
- Keep provider credentials server-side; monitor cost and rate limits.
- Do not send identifiable patient or medical information to an AI provider without a reviewed legal basis, privacy controls, and agreements.
- For possible emergencies, tell the user to call **911** or go to the nearest emergency room; the assistant is never an emergency triage tool.
- Test for prompt injection in source documents, unsupported claims, and harmful or misleading answers.

## Implementation

Create a `KnowledgeAssistantService` with an `AiProvider` interface (dependency inversion), so providers can be swapped without changing the service. Start with database filters and approved documents. The `KnowledgeDocumentPublished` and `FacilityApproved` events keep the retrieval index current. Add embeddings or vector search only if evaluation shows it materially improves retrieval.

## As built (phase 6)

**Module:** `app/Domain/KnowledgeAssistant`.

| Piece | Class | What it does |
|---|---|---|
| Contract | `Contracts/AiProvider` | `answer(question, context): ?string`; `null` means the provider declined |
| Default provider | `Providers/GroundedProvider` | No language model: lists the retrieved records word for word with `[F1]`/`[D1]` markers. Free, cannot invent, used as the fallback |
| Model provider | `Providers/ClaudeProvider` | Official `anthropic-ai/sdk`, model `claude-opus-5-5`, adaptive thinking, effort from config (default `low`). Sources are wrapped in `<source>` tags and declared as data, not instructions |
| Safety | `Support/SafetyScreen` | Emergency patterns (911 answer) and diagnosis/medicine/dosage patterns, in English and Filipino. Runs first; no retrieval or model call follows |
| Retrieval | `Support/KnowledgeRetriever` | Published facilities by recognised service (`assistant.service_keywords`), place words (facility name/address FULLTEXT, or city/province/barangay name) and the person's location; published documents by FULLTEXT natural-language search |
| Pipeline | `Services/KnowledgeAssistantService` | Screen → retrieve → (nothing found: "no information", no model call) → provider → keep only cited sources. An answer citing nothing is replaced with "no information" |
| Metrics | `assistant_interactions` | Channel, outcome, provider, latency, citation count, fallback. **The question text is never stored** |

**Configuration (`apps/api/.env`):**

```dotenv
ASSISTANT_PROVIDER=grounded   # or claude
ANTHROPIC_API_KEY=            # required for claude; without it the grounded provider answers
ASSISTANT_CLAUDE_MODEL=claude-opus-5-5
ASSISTANT_CLAUDE_EFFORT=low
```

The public endpoint is off until an admin turns on **Settings → Features → features.assistant.enabled**. The admin test console works either way.

**Knowledge documents** need a verified date before they can be published; every create, edit, publish and archive is audited. Documents older than `verification.stale_after_days` are shown as stale to the public.

**Guardrail cases** live in `config/communitycare.php` (`assistant.guardrail_cases`) and run from the admin screen without calling a model. Add a case whenever a new failure is found.

**Not yet done:** evaluation of Claude answers against a reviewed question set (costs API credit, so it needs your approval and a budget), and a Filipino-language review of the safety patterns by a native speaker.
