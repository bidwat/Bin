import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { authStyles } from './login';
import { supabase } from '../../src/lib/supabase';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signUp() {
    setError(null);
    setMessage(null);

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      return;
    }

    setMessage(
      data.session
        ? 'Account created and signed in.'
        : 'Account created. Check your email for confirmation.',
    );
  }

  return (
    <View style={authStyles.container}>
      <Text style={authStyles.eyebrow}>Bin</Text>
      <Text style={authStyles.title}>Create account</Text>
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
      {message ? <Text style={{ color: '#15803d' }}>{message}</Text> : null}
      <Pressable style={authStyles.button} onPress={() => void signUp()}>
        <Text style={authStyles.buttonText}>Create Account</Text>
      </Pressable>
      <Link href="/(auth)/login" style={authStyles.link}>
        Back to sign in
      </Link>
    </View>
  );
}
