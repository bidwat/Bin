import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Item } from '@bin/shared';

import { createImageItem } from '../lib/api';

type ImageCaptureButtonProps = {
  onCreated: (item: Item) => void;
  onProcessingStart?: () => void;
  onError?: () => void;
};

export function ImageCaptureButton({
  onCreated,
  onProcessingStart,
  onError,
}: ImageCaptureButtonProps) {
  const [isChoosing, setIsChoosing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadSelectedAsset(mode: 'camera' | 'library') {
    if (isUploading) {
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const permission =
        mode === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        throw new Error(
          mode === 'camera'
            ? 'Camera permission is required'
            : 'Photo library permission is required',
        );
      }

      const result =
        mode === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              quality: 0.8,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.8,
            });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      onProcessingStart?.();
      const item = await createImageItem(
        asset.uri,
        asset.mimeType ?? 'image/jpeg',
      );
      onCreated(item);
      setIsChoosing(false);
    } catch (uploadError) {
      onError?.();
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Image capture failed',
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.trigger, isChoosing ? styles.triggerActive : null]}
        onPress={() => {
          setError(null);
          setIsChoosing((current) => !current);
        }}
      >
        <Text style={styles.triggerText}>
          {isUploading ? 'Uploading...' : 'Image'}
        </Text>
      </Pressable>

      {isChoosing ? (
        <View style={styles.menu}>
          <Pressable
            style={styles.option}
            disabled={isUploading}
            onPress={() => {
              void uploadSelectedAsset('camera');
            }}
          >
            <Text style={styles.optionText}>Camera</Text>
          </Pressable>
          <Pressable
            style={styles.option}
            disabled={isUploading}
            onPress={() => {
              void uploadSelectedAsset('library');
            }}
          >
            <Text style={styles.optionText}>Library</Text>
          </Pressable>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 8,
  },
  trigger: {
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#e2e8f0',
  },
  triggerActive: {
    backgroundColor: '#cbd5e1',
  },
  triggerText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  menu: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  optionText: {
    color: '#334155',
    fontWeight: '600',
  },
  error: {
    color: '#dc2626',
    fontSize: 13,
  },
});
