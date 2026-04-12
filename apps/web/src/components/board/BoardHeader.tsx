import { ConnectionStatus } from './ConnectionStatus';
import { OnlineUsers } from '../presence/OnlineUsers';

interface BoardHeaderProps {
  name: string;
}

export function BoardHeader({ name }: BoardHeaderProps) {
  return (
    <header className="flex items-center justify-between p-4 px-6 bg-bg-surface border-b border-border-subtle">
      <h1 className="font-display font-semibold text-2xl text-text-primary leading-[1.25]">
        {name}
      </h1>
      <div className="flex items-center gap-3">
        <OnlineUsers />
        <ConnectionStatus />
      </div>
    </header>
  );
}
