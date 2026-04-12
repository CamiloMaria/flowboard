import { useBoardStore } from '../../stores/board.store';

const statusConfig = {
  connected: {
    color: 'bg-[#34D399]',
    label: 'Connected',
  },
  reconnecting: {
    color: 'bg-[#FB923C]',
    label: 'Reconnecting...',
  },
  disconnected: {
    color: 'bg-[#F87171]',
    label: 'Disconnected',
  },
} as const;

export function ConnectionStatus() {
  const connectionStatus = useBoardStore((state) => state.connectionStatus);
  const config = statusConfig[connectionStatus];

  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-2 h-2 rounded-full ${config.color}`}
        aria-hidden="true"
      />
      <span className="font-mono text-xs text-text-muted">
        {config.label}
      </span>
    </div>
  );
}
