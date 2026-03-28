import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export function CaptureBar({
  onCapture,
}: {
  onCapture: (text: string) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function submit() {
    if (!value.trim() || isSaving) return;

    setIsSaving(true);
    setError(null);

    try {
      await onCapture(value.trim());
      setValue('');
      setIsOpen(false);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Capture failed',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Pressable
        style={styles.fab}
        onPress={() => {
          setError(null);
          setIsOpen(true);
        }}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <Modal
        animationType="slide"
        presentationStyle="pageSheet"
        transparent
        visible={isOpen}
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.backdrop}>
          <Pressable style={styles.scrim} onPress={() => setIsOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.title}>Throw something into Bin</Text>
            <TextInput
              multiline
              placeholder="Buy milk, call Sam, remember this idea..."
              style={styles.input}
              value={value}
              onChangeText={setValue}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.actions}>
              <Pressable
                style={[styles.button, styles.secondaryButton]}
                onPress={() => setIsOpen(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.button} onPress={() => void submit()}>
                <Text style={styles.buttonText}>
                  {isSaving ? 'Capturing...' : 'Capture'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
    zIndex: 20,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 32,
    lineHeight: 34,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.2)',
  },
  scrim: {
    flex: 1,
  },
  sheet: {
    gap: 16,
    padding: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#ffffff',
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#cbd5e1',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  input: {
    minHeight: 160,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    padding: 16,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  error: {
    color: '#dc2626',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    paddingVertical: 14,
  },
  secondaryButton: {
    backgroundColor: '#e2e8f0',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontWeight: '700',
  },
});
