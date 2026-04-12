import { ConnectionStatus } from './ConnectionStatus';

interface BoardHeaderProps {
  name: string;
}

export function BoardHeader({ name }: BoardHeaderProps) {
  return (
    <header className="flex items-center justify-between p-4 px-6 bg-bg-surface border-b border-border-subtle">
      <h1 className="font-display font-semibold text-2xl text-text-primary leading-[1.25]">
        {name}
      </h1>
      <ConnectionStatus />
    </header>
  );
}
