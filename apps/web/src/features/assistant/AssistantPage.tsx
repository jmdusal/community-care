import { useState } from 'react';
import { Link } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { ApiError } from '../../lib/api';
import { useAsk, useAssistantStatus } from '../../lib/assistant';
import { AskForm, type Coordinates } from './components/AskForm';
import { Conversation, type Turn } from './components/Conversation';
import { SuggestedQuestions } from './components/SuggestedQuestions';

/** Public assistant: answers only from approved records, with sources. Not for emergencies or medical advice. */
export function AssistantPage() {
  const status = useAssistantStatus();
  const ask = useAsk('/assistant/messages');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);

  const send = (question: string) => {
    const id = Date.now();
    setTurns((current) => [...current, { id, question }]);
    ask.mutate({ message: question, ...(coordinates ?? {}) }, {
      onSuccess: (answer) => setTurns((current) => current.map((turn) => (turn.id === id ? { ...turn, answer } : turn))),
      onError: (error) => setTurns((current) => current.map((turn) => (turn.id === id ? { ...turn, error: error instanceof ApiError ? error.body.message : 'Could not reach CommunityCare. Try again.' } : turn))),
    });
  };

  if (status.data && !status.data.enabled) {
    return (
      <Alert>
        The assistant is not available yet. <Link to="/" className="font-medium underline">Search the directory</Link> instead.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Ask CommunityCare</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Find facilities and services in plain language. Answers come only from records CommunityCare has on file, with their sources.
          It can't diagnose or recommend medicine. <strong className="text-rose-700 dark:text-rose-400">In an emergency, call 911.</strong>
        </p>
      </div>

      {turns.length === 0 && <SuggestedQuestions onPick={send} />}
      <Conversation turns={turns} />
      <div className="sticky bottom-0 -mx-4 border-t border-zinc-200 bg-zinc-50/95 px-4 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <AskForm onAsk={send} pending={ask.isPending} coordinates={coordinates} onCoordinates={setCoordinates} />
      </div>
    </div>
  );
}
