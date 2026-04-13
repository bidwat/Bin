'use client';

import { useEffect } from 'react';

function getDetectedTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

export function TimezoneSync() {
  useEffect(() => {
    const detectedTimezone = getDetectedTimezone();
    if (!detectedTimezone || detectedTimezone === 'UTC') {
      return;
    }

    let cancelled = false;

    void fetch('/api/users/profile')
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        return (await response.json()) as { profile?: { timezone?: string } };
      })
      .then(async (payload) => {
        if (cancelled || !payload?.profile) {
          return;
        }

        const currentTimezone = payload.profile.timezone;
        if (!currentTimezone || currentTimezone === 'UTC') {
          await fetch('/api/users/profile', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              timezone: detectedTimezone,
            }),
          });
        }
      })
      .catch((error: unknown) => {
        console.warn('Unable to sync web timezone', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
