import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { apiPost, setAccessToken } from '../lib/api';

const DEMO_BOARD_ID = '00000000-0000-0000-0000-000000000000';

export function DemoPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initDemo() {
      try {
        const res = await apiPost<{ accessToken: string }>('/api/auth/guest');
        if (cancelled) return;
        setAccessToken(res.accessToken);
        navigate(`/board/${DEMO_BOARD_ID}`, { replace: true });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to start demo');
      }
    }

    initDemo();
    return () => { cancelled = true; };
  }, [navigate]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-display font-bold text-accent-danger mb-2">Demo Error</h2>
          <p className="text-text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-display font-bold text-accent mb-2">Demo Board</h2>
        <p className="text-text-secondary">Loading collaborative board...</p>
      </div>
    </div>
  );
}
