'use client';

import { useEffect, useRef, useState } from 'react';

type CaptureBarProps = {
  onCapture: (text: string) => Promise<void>;
};

export function CaptureBar({ onCapture }: CaptureBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = '0px';
    const lineHeight = 28;
    const maxHeight = lineHeight * 5 + 32;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, [value]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function submit() {
    const trimmed = value.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onCapture(trimmed);
      setValue('');
      setToast('Captured');
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Capture failed',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="sticky top-6 z-10 rounded-[2rem] border border-slate-200 bg-white/85 p-4 shadow-[0_16px_60px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex flex-col gap-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              void submit();
            }
          }}
          rows={1}
          placeholder="Throw something into Bin..."
          className="min-h-28 w-full resize-none rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900 outline-none transition focus:border-slate-400"
        />

        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-slate-500">
            Cmd/Ctrl + Enter to capture
            {error ? <span className="ml-3 text-rose-600">{error}</span> : null}
            {toast ? (
              <span className="ml-3 text-emerald-700">{toast}</span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => void submit()}
            disabled={isSubmitting || !value.trim()}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? 'Capturing...' : 'Capture'}
          </button>
        </div>
      </div>
    </div>
  );
}
