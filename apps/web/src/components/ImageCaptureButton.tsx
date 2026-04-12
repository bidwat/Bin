'use client';

import { useId, useRef, useState } from 'react';

import type { Item } from '@bin/shared';

type ImageCaptureButtonProps = {
  onCreated: (item: Item) => void;
};

export function ImageCaptureButton({ onCreated }: ImageCaptureButtonProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch('/api/items/image', {
        method: 'POST',
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        item?: Item;
      } | null;

      if (!response.ok || !payload?.item) {
        throw new Error(payload?.error ?? 'Image capture failed');
      }

      onCreated(payload.item);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Image capture failed',
      );
    } finally {
      setIsUploading(false);

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            void uploadImage(file);
          }
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span aria-hidden="true">▣</span>
        {isUploading ? 'Uploading image...' : 'Image'}
      </button>
      {error ? <span className="text-sm text-rose-600">{error}</span> : null}
    </div>
  );
}
