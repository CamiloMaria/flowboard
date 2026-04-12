export function BoardHeader({ name }: { name: string }) {
  return (
    <header className="flex items-center justify-between p-4 px-6 bg-bg-surface border-b border-border-subtle">
      <h1 className="font-display font-semibold text-2xl text-text-primary">{name}</h1>
    </header>
  );
}
