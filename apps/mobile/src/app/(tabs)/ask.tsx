import { router } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { ScreenIntro } from '@/components/ui/ScreenIntro';
import { ApiError } from '@/lib/api';
import { type AssistantAnswer, plainAnswer, useAsk } from '@/lib/assistant';
import { colors, radius, space } from '@/lib/theme';

const SUGGESTIONS = ['Where can my baby get vaccines?', 'Saan may libreng TB check-up?', 'Which health centers have prenatal care?'];

type Turn = { question: string; answer?: AssistantAnswer; error?: string };

/** Ask CommunityCare: answers come only from approved records, with their sources. */
export default function AskScreen() {
  const ask = useAsk();
  const [text, setText] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);

  const send = (question: string) => {
    if (question.trim().length < 3) {
      return;
    }
    const index = turns.length;
    setTurns((current) => [...current, { question }]);
    setText('');
    ask.mutate({ message: question }, {
      onSuccess: (answer) => setTurns((current) => current.map((turn, i) => (i === index ? { ...turn, answer } : turn))),
      onError: (error) => setTurns((current) => current.map((turn, i) => (i === index ? { ...turn, error: error instanceof ApiError ? error.body.message : 'Could not reach CommunityCare.' } : turn))),
    });
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        {turns.length === 0 && (
          <>
            <ScreenIntro icon="chatbubbles-outline" title="Ask CommunityCare">
              Find facilities and services in plain language, in English or Filipino. It answers only from approved records, and can’t diagnose or recommend medicine.
            </ScreenIntro>
            <AppText style={styles.tryLabel}>Try asking</AppText>
            {SUGGESTIONS.map((question) => (
              <Pressable key={question} accessibilityRole="button" onPress={() => send(question)} style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}>
                <Ionicons name="sparkles-outline" size={16} color={colors.brand} />
                <AppText style={styles.suggestionText}>{question}</AppText>
                <Ionicons name="arrow-forward" size={16} color="#a1a1aa" />
              </Pressable>
            ))}
          </>
        )}
        {turns.map((turn, index) => (
          <View key={index} style={styles.turn}>
            <AppText style={styles.question}>{turn.question}</AppText>
            {turn.answer ? <Answer answer={turn.answer} /> : turn.error ? <Notice tone="danger">{turn.error}</Notice> : (
              <View style={styles.thinking}><ActivityIndicator size="small" color={colors.brand} /><AppText variant="small">Looking through approved records…</AppText></View>
            )}
          </View>
        ))}
      </ScrollView>
      <View style={styles.composer}>
        <View style={styles.inputBox}>
          <TextInput style={styles.input} placeholder="Ask about facilities or services" placeholderTextColor={colors.textMuted} accessibilityLabel="Your question" value={text} onChangeText={setText} maxLength={500} returnKeyType="send" onSubmitEditing={() => send(text)} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send question"
            disabled={ask.isPending || text.trim().length < 3}
            onPress={() => send(text)}
            style={[styles.send, (ask.isPending || text.trim().length < 3) && styles.sendOff]}
          >
            <Ionicons name="arrow-up" size={20} color="#ffffff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Answer({ answer }: { answer: AssistantAnswer }) {
  const emergency = answer.outcome === 'emergency';

  return (
    <View style={[styles.answer, emergency && styles.emergency]}>
      <View style={styles.answerHead}>
        <View style={styles.bot}><Ionicons name="medkit-outline" size={14} color={colors.brandDark} /></View>
        <AppText style={styles.botName}>CommunityCare</AppText>
      </View>
      <AppText style={styles.answerText}>{plainAnswer(answer.answer)}</AppText>
      {emergency && <Button label="Call 911" onPress={() => void Linking.openURL('tel:911')} />}
      {answer.citations.length > 0 && (
        <View style={styles.sources}>
          <AppText variant="small" style={styles.sourcesTitle}>Sources</AppText>
          {answer.citations.map((citation) => (
            <Pressable key={citation.key} accessibilityRole="link" onPress={() => (citation.type === 'facility' ? router.push(`/facilities/${citation.id}`) : citation.url && void Linking.openURL(citation.url))}>
              <AppText variant="link">{citation.title}</AppText>
              <AppText variant="small">{citation.verified_at ? `verified ${new Date(citation.verified_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'not yet verified'}{citation.is_stale ? ' · may be out of date' : ''}</AppText>
            </Pressable>
          ))}
        </View>
      )}
      <AppText variant="small">{answer.notice}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { padding: space.lg, gap: space.md },
  tryLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: space.xs },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 54, paddingHorizontal: space.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, backgroundColor: colors.surface },
  suggestionText: { flex: 1, fontWeight: '500' },
  pressed: { backgroundColor: '#f4f4f5' },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md },
  turn: { gap: space.sm },
  question: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: colors.brandDark, color: '#ffffff', paddingHorizontal: space.md, paddingVertical: 10, borderRadius: 18, borderBottomRightRadius: 6, overflow: 'hidden' },
  answer: { gap: space.sm, padding: space.md, borderRadius: 18, borderTopLeftRadius: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, maxWidth: '95%' },
  answerHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  botName: { fontSize: 12, fontWeight: '700', color: colors.brandDark },
  answerText: { lineHeight: 22 },
  emergency: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  sources: { gap: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: space.sm },
  sourcesTitle: { fontWeight: '600' },
  composer: { padding: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.surface },
  inputBox: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingLeft: space.lg, paddingRight: 5 },
  input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: space.sm },
  send: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.brandDark, alignItems: 'center', justifyContent: 'center' },
  sendOff: { opacity: 0.4 },
});
