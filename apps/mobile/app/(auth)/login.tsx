import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { supabase } from '../../src/lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      return;
    }

    router.replace('/(app)/feed');
  }

  return (
    <View style={authStyles.container}>
      <Text style={authStyles.eyebrow}>Bin</Text>
      <Text style={authStyles.title}>Sign in</Text>
      <TextInput
        style={authStyles.input}
        placeholder="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={authStyles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={authStyles.error}>{error}</Text> : null}
      <Pressable style={authStyles.button} onPress={() => void signIn()}>
        <Text style={authStyles.buttonText}>Sign In</Text>
      </Pressable>
      <Link href="/(auth)/signup" style={authStyles.link}>
        Create account
      </Link>
    </View>
  );
}

export const authStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8f4ec',
    gap: 12,
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
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    borderRadius: 18,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  button: {
    marginTop: 8,
    backgroundColor: '#0f172a',
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 14,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  link: {
    color: '#0f172a',
    fontWeight: '600',
  },
  error: {
    color: '#dc2626',
  },
});
