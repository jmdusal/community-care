<?php

namespace App\Domain\KnowledgeAssistant;

use Anthropic\Client;
use App\Domain\Identity\Enums\Permission;
use App\Domain\Identity\Models\User;
use App\Domain\KnowledgeAssistant\Contracts\AiProvider;
use App\Domain\KnowledgeAssistant\Providers\ClaudeProvider;
use App\Domain\KnowledgeAssistant\Providers\GroundedProvider;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

final class KnowledgeAssistantServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // The provider is chosen by configuration. Claude is used only when a key is set;
        // otherwise the grounded provider answers, so the feature works with no AI account.
        $this->app->bind(AiProvider::class, function (Application $app): AiProvider {
            $config = $app['config']->get('communitycare.assistant');

            if ($config['provider'] === 'claude' && filled($config['claude']['api_key'])) {
                return new ClaudeProvider(
                    client: new Client(apiKey: $config['claude']['api_key'], requestOptions: ['timeout' => $config['claude']['timeout'], 'maxRetries' => 1]),
                    model: $config['claude']['model'],
                    effort: $config['claude']['effort'],
                    maxTokens: $config['claude']['max_tokens'],
                );
            }

            return $app->make(GroundedProvider::class);
        });
    }

    public function boot(): void
    {
        Gate::define('manage-knowledge', fn (User $user) => $user->isActive() && $user->hasPermission(Permission::AssistantManage));
    }
}
