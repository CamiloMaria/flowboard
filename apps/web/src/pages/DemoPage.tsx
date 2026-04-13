import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { apiPost, setAccessToken } from '../lib/api';
import { BoardSkeleton } from '../components/board/BoardSkeleton';

const DEMO_BOARD_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Demo entry point — creates a guest JWT and redirects to the demo board.
 * Shows BoardSkeleton during loading for seamless skeleton → board transition (D-12).
 */
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
      <div className="flex items-center justify-center min-h-screen bg-bg-base">
        <div className="text-center">
          <h2 className="text-2xl font-display font-bold text-accent-danger mb-2">Demo Error</h2>
          <p className="text-text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  // Show BoardSkeleton during guest JWT creation — seamless transition to real board (D-12)
  return <BoardSkeleton />;
}
