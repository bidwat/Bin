'use client';

import { useRef, useState } from 'react';

import type { Item } from '@bin/shared';

type VoiceCaptureButtonProps = {
  onCreated: (item: Item) => void;
};

export function VoiceCaptureButton({ onCreated }: VoiceCaptureButtonProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startRecording() {
    if (isRecording || isUploading) {
      return;
    }

    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : undefined,
      });

      chunksRef.current = [];
      recorderRef.current = recorder;

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener('stop', () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
        void uploadRecording(blob);
      });

      recorder.start();
      setIsRecording(true);
    } catch {
      setError('Microphone permission is required');
    }
  }

  function stopRecording() {
    if (!recorderRef.current || recorderRef.current.state === 'inactive') {
      return;
    }

    setIsRecording(false);
    recorderRef.current.stop();
  }

  async function uploadRecording(blob: Blob) {
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'capture.webm');
      formData.append('source', 'voice');
      formData.append('mode', 'create');

      const response = await fetch('/api/items/voice', {
        method: 'POST',
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as {
        item?: Item;
        error?: string;
      } | null;

      if (!response.ok || !payload?.item) {
        throw new Error(payload?.error ?? 'Voice capture failed');
      }

      onCreated(payload.item);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Voice capture failed',
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onMouseDown={() => void startRecording()}
        onMouseUp={stopRecording}
        onMouseLeave={stopRecording}
        onTouchStart={() => void startRecording()}
        onTouchEnd={stopRecording}
        disabled={isUploading}
        className={`rounded-full px-4 py-3 text-sm font-medium transition ${
          isRecording
            ? 'bg-rose-600 text-white shadow-[0_0_0_6px_rgba(225,29,72,0.12)]'
            : 'bg-amber-100 text-amber-950'
        } disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500`}
      >
        {isUploading
          ? 'Transcribing…'
          : isRecording
            ? 'Release to stop'
            : 'Hold to talk'}
      </button>
      {error ? <span className="text-sm text-rose-600">{error}</span> : null}
    </div>
  );
}
