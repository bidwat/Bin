import { Audio } from 'expo-av';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { Item } from '@bin/shared';

import { createVoiceItem } from '../lib/api';

type VoiceCaptureButtonProps = {
  onCreated: (item: Item) => void;
  onProcessingStart?: () => void;
  onError?: () => void;
};

export function VoiceCaptureButton({
  onCreated,
  onProcessingStart,
  onError,
}: VoiceCaptureButtonProps) {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startRecording() {
    if (isRecording || isProcessing) {
      return;
    }

    setError(null);

    const permission = await Audio.requestPermissionsAsync();

    if (!permission.granted) {
      setError('Microphone permission is required');
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );
    await recording.startAsync();
    recordingRef.current = recording;
    setIsRecording(true);
  }

  async function stopRecording() {
    const recording = recordingRef.current;

    if (!recording || !isRecording) {
      return;
    }

    setIsRecording(false);
    setIsProcessing(true);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) {
        throw new Error('Recording failed to save');
      }

      onProcessingStart?.();
      const item = await createVoiceItem(uri, 'audio/mp4');
      onCreated(item);
    } catch (recordingError) {
      onError?.();
      setError(
        recordingError instanceof Error
          ? recordingError.message
          : 'Voice capture failed',
      );
    } finally {
      recordingRef.current = null;
      setIsProcessing(false);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
    }
  }

  return (
    <>
      <Pressable
        style={[
          styles.button,
          isRecording ? styles.buttonRecording : styles.buttonIdle,
        ]}
        onPressIn={() => {
          void startRecording();
        }}
        onPressOut={() => {
          void stopRecording();
        }}
        disabled={isProcessing}
      >
        <Text
          style={[
            styles.buttonText,
            isRecording ? styles.buttonTextRecording : null,
          ]}
        >
          {isProcessing
            ? 'Transcribing...'
            : isRecording
              ? 'Release to stop'
              : 'Hold to talk'}
        </Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 14,
  },
  buttonIdle: {
    backgroundColor: '#fcd34d',
  },
  buttonRecording: {
    backgroundColor: '#dc2626',
  },
  buttonText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  buttonTextRecording: {
    color: '#ffffff',
  },
  error: {
    color: '#dc2626',
    fontSize: 13,
  },
});
