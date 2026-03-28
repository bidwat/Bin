import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { fetchProfile, updateProfile } from '../../src/lib/api';
import { supabase } from '../../src/lib/supabase';

export default function SettingsScreen() {
  const [email, setEmail] = useState<string | null>(null);
  const [timezone, setTimezone] = useState('UTC');
  const [autoReminders, setAutoReminders] = useState(false);
  const [autoEvents, setAutoEvents] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProfile().then(({ profile }) => {
      setEmail(profile.email);
      setTimezone(profile.timezone);
      setAutoReminders(profile.auto_create_reminders);
      setAutoEvents(profile.auto_create_events);
    });
  }, []);

  async function save() {
    setIsSaving(true);
    try {
      const { profile } = await updateProfile({
        timezone,
        auto_create_reminders: autoReminders,
        auto_create_events: autoEvents,
      });
      setTimezone(profile.timezone);
      setAutoReminders(profile.auto_create_reminders);
      setAutoEvents(profile.auto_create_events);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Settings</Text>
      <Text style={styles.title}>Profile and defaults</Text>
      <Text style={styles.meta}>Signed in as {email ?? 'unknown user'}</Text>

      <TextInput
        style={styles.input}
        value={timezone}
        onChangeText={setTimezone}
        placeholder="Timezone"
      />

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Auto-create reminders</Text>
        <Switch value={autoReminders} onValueChange={setAutoReminders} />
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Auto-create events</Text>
        <Switch value={autoEvents} onValueChange={setAutoEvents} />
      </View>

      <Pressable style={styles.button} onPress={() => void save()}>
        <Text style={styles.buttonText}>{isSaving ? 'Saving...' : 'Save'}</Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.signOut]}
        onPress={() => void supabase.auth.signOut()}
      >
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f4ec',
    padding: 24,
    gap: 16,
  },
  eyebrow: {
    color: '#b45309',
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '700',
    fontSize: 12,
  },
  title: {
    color: '#0f172a',
    fontSize: 30,
    fontWeight: '700',
  },
  meta: {
    color: '#475569',
  },
  input: {
    borderRadius: 18,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  toggleRow: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    color: '#0f172a',
    fontSize: 16,
  },
  button: {
    borderRadius: 999,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    paddingVertical: 14,
  },
  signOut: {
    backgroundColor: '#475569',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
