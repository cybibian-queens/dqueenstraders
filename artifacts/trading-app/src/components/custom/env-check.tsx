import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Fires a warning toast on first mount if either required env var is not set.
 * Renders nothing — exists only for its side effect.
 */
export function EnvCheck() {
  useEffect(() => {
    if (import.meta.env.VITE_PREVIEW_MODE === 'true') return;
    if (
      window.location.pathname.includes('/preview') ||
      window.location.pathname.includes('/edit')
    )
      return;
    if (!import.meta.env.VITE_DERIV_APP_ID || !import.meta.env.VITE_DERIV_REDIRECT_URI) {
      toast.warning('Waiting for environment variables to be set…');
    }
  }, []);

  return null;
}
