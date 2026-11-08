<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Domain\Facilities\Models\FacilityType;
use App\Domain\Services\Events\CatalogItemChanged;
use App\Domain\Services\Models\Service;
use App\Http\Controllers\Controller;
use App\Http\Support\Time;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/**
 * The service and facility-type catalogs (system admins). The slug is fixed once created,
 * because facility records, imports and public search links use it; renaming changes only
 * the name people see. An item in use is archived instead of deleted: it leaves pickers
 * and public filters, but facilities that already list it keep it.
 */
final class CatalogController extends Controller
{
    /** @var array<string, array{model: class-string<Service|FacilityType>, kind: 'service'|'facility_type', label: string}> */
    private const CATALOGS = [
        'services' => ['model' => Service::class, 'kind' => 'service', 'label' => 'service'],
        'facility-types' => ['model' => FacilityType::class, 'kind' => 'facility_type', 'label' => 'facility type'],
    ];

    public function index(Request $request, string $catalog): JsonResponse
    {
        Gate::authorize('manage-catalog');
        $filters = $request->validate(['q' => ['nullable', 'string', 'max:80'], 'status' => ['nullable', Rule::in(['active', 'archived', 'all'])]]);
        $status = $filters['status'] ?? 'active';

        $items = $this->query($catalog)
            ->withCount('facilities')
            ->when($status === 'active', fn (Builder $q) => $q->whereNull('archived_at'))
            ->when($status === 'archived', fn (Builder $q) => $q->whereNotNull('archived_at'))
            ->when($filters['q'] ?? null, fn (Builder $q, string $text) => $q->where(fn (Builder $w) => $w
                ->where('name', 'like', '%'.addcslashes($text, '%_\\').'%')
                ->orWhere('slug', 'like', '%'.addcslashes($text, '%_\\').'%')))
            ->orderBy('name')
            ->get();

        $counts = [
            'active' => $this->query($catalog)->whereNull('archived_at')->count(),
            'archived' => $this->query($catalog)->whereNotNull('archived_at')->count(),
        ];

        return response()->json([
            'data' => $items->map(fn (Model $item): array => $this->present($catalog, $item))->values(),
            'meta' => ['counts' => $counts, 'categories' => $catalog === 'services' ? Service::query()->whereNotNull('category')->distinct()->orderBy('category')->pluck('category') : []],
        ]);
    }

    public function store(Request $request, string $catalog): JsonResponse
    {
        Gate::authorize('manage-catalog');
        $input = $request->validate($this->rules($catalog));

        $slug = Str::slug($input['name']);
        if ($slug === '' || $this->query($catalog)->where('slug', $slug)->exists()) {
            throw new ConflictHttpException("A {$this->label($catalog)} with this name already exists (it may be archived).");
        }

        $item = $this->query($catalog)->create([...$input, 'slug' => $slug]);
        CatalogItemChanged::dispatch(self::CATALOGS[$catalog]['kind'], $slug, 'created', $request->user()->id, null, $this->auditable($item));

        return response()->json(['data' => $this->present($catalog, $item->loadCount('facilities'))], 201);
    }

    public function update(Request $request, string $catalog, string $slug): JsonResponse
    {
        Gate::authorize('manage-catalog');
        $item = $this->find($catalog, $slug);
        $input = $request->validate($this->rules($catalog, $item));

        $before = $this->auditable($item);
        $item->update($input);
        if ($item->wasChanged()) {
            CatalogItemChanged::dispatch(self::CATALOGS[$catalog]['kind'], $slug, 'updated', $request->user()->id, $before, $this->auditable($item));
        }

        return response()->json(['data' => $this->present($catalog, $item->loadCount('facilities'))]);
    }

    public function archive(Request $request, string $catalog, string $slug): JsonResponse
    {
        return $this->setArchived($request, $catalog, $slug, true);
    }

    public function restore(Request $request, string $catalog, string $slug): JsonResponse
    {
        return $this->setArchived($request, $catalog, $slug, false);
    }

    /** Only items no facility lists can be deleted; archive the rest. (Booking slots fall back to "General".) */
    public function destroy(Request $request, string $catalog, string $slug): Response
    {
        Gate::authorize('manage-catalog');
        $item = $this->find($catalog, $slug)->loadCount('facilities');

        if ($item->facilities_count > 0) {
            throw new ConflictHttpException("This {$this->label($catalog)} is used by {$item->facilities_count} ".Str::plural('facility', $item->facilities_count).'. Archive it instead.');
        }

        $before = $this->auditable($item);
        $item->delete();
        CatalogItemChanged::dispatch(self::CATALOGS[$catalog]['kind'], $slug, 'deleted', $request->user()->id, $before, null);

        return response()->noContent();
    }

    private function setArchived(Request $request, string $catalog, string $slug, bool $archived): JsonResponse
    {
        Gate::authorize('manage-catalog');
        $item = $this->find($catalog, $slug);

        if (($item->archived_at !== null) !== $archived) {
            $item->update(['archived_at' => $archived ? now() : null]);
            CatalogItemChanged::dispatch(self::CATALOGS[$catalog]['kind'], $slug, $archived ? 'archived' : 'restored', $request->user()->id, ['archived' => ! $archived], ['archived' => $archived]);
        }

        return response()->json(['data' => $this->present($catalog, $item->loadCount('facilities'))]);
    }

    /** @return array<string, mixed> */
    private function rules(string $catalog, ?Model $item = null): array
    {
        $table = $catalog === 'services' ? 'services' : 'facility_types';
        $required = $item === null ? 'required' : 'sometimes';

        return [
            'name' => [$required, 'string', 'min:2', 'max:120', Rule::unique($table, 'name')->ignore($item?->getKey())],
            'description' => ['sometimes', 'nullable', 'string', 'max:500'],
            ...($catalog === 'services' ? ['category' => [$required, 'string', 'max:40', 'regex:/^[a-z][a-z0-9_ -]*$/']] : []),
        ];
    }

    /** @return Builder<Service>|Builder<FacilityType> */
    private function query(string $catalog): Builder
    {
        return self::CATALOGS[$catalog]['model']::query();
    }

    private function find(string $catalog, string $slug): Service|FacilityType
    {
        return $this->query($catalog)->where('slug', $slug)->firstOrFail();
    }

    private function label(string $catalog): string
    {
        return self::CATALOGS[$catalog]['label'];
    }

    /** @return array<string, mixed> */
    private function auditable(Model $item): array
    {
        return array_filter(['name' => $item->name, 'category' => $item->category ?? null, 'description' => $item->description], fn ($v) => $v !== null);
    }

    /** @return array<string, mixed> */
    private function present(string $catalog, Model $item): array
    {
        return [
            'slug' => $item->slug,
            'name' => $item->name,
            'category' => $catalog === 'services' ? $item->category : null,
            'description' => $item->description,
            'facilities' => $item->facilities_count ?? 0,
            'archived' => $item->archived_at !== null,
            'archived_at' => Time::iso($item->archived_at),
            'updated_at' => Time::iso($item->updated_at),
        ];
    }
}
