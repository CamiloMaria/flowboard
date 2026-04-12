import type { ListWithCards } from '@flowboard/shared';

export function ColumnContainer({ list, boardId }: { list: ListWithCards; boardId: string }) {
  return (
    <div className="w-[280px] min-w-[280px] bg-bg-surface border border-border-subtle rounded-[12px] p-3">
      <div className="flex items-center justify-between p-3">
        <h2 className="font-display font-semibold text-lg text-text-primary">{list.name}</h2>
        <span className="font-mono text-xs text-text-muted">{list.cards.length}</span>
      </div>
    </div>
  );
}
