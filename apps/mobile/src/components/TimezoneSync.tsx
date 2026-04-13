import { useEffect } from 'react';

import { fetchProfile, updateProfile } from '../lib/api';
import { useSession } from '../lib/session';

function getDetectedTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

export function TimezoneSync() {
  const { session } = useSession();

  useEffect(() => {
    if (!session?.user?.id) {
      return;
    }

    const detectedTimezone = getDetectedTimezone();
    if (!detectedTimezone || detectedTimezone === 'UTC') {
      return;
    }

    let cancelled = false;

    void fetchProfile()
      .then(async ({ profile }) => {
        if (cancelled) {
          return;
        }

        if (!profile.timezone || profile.timezone === 'UTC') {
          await updateProfile({ timezone: detectedTimezone });
        }
      })
      .catch((error: unknown) => {
        console.warn('Unable to sync mobile timezone', error);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  return null;
}
