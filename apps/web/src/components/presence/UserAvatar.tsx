interface UserAvatarProps {
  name: string;
  color: string;
  size?: 'sm' | 'md';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

export function UserAvatar({ name, color, size = 'md' }: UserAvatarProps) {
  const sizeClasses = size === 'sm'
    ? 'w-6 h-6 text-xs'
    : 'w-8 h-8 text-sm';

  const borderWidth = size === 'sm' ? '1.5px' : '2px';

  return (
    <div
      className={`${sizeClasses} rounded-full flex items-center justify-center font-body font-medium shrink-0 select-none`}
      style={{
        backgroundColor: color,
        color: '#0C1017', // --bg-base for readability on bright user colors
        border: `${borderWidth} solid var(--color-bg-base)`,
      }}
      aria-label={name}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}
