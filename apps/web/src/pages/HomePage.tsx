import { Link } from 'react-router';

export function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-display font-bold text-accent mb-4">FlowBoard</h1>
      <p className="text-text-secondary mb-8">Real-time collaborative Kanban board</p>
      <div className="flex gap-4">
        <Link to="/demo" className="px-6 py-3 bg-accent text-surface-primary font-semibold rounded-lg hover:bg-accent-hover transition-colors">
          Try Demo
        </Link>
        <Link to="/login" className="px-6 py-3 border border-accent text-accent rounded-lg hover:bg-accent/10 transition-colors">
          Sign In
        </Link>
      </div>
    </div>
  );
}
