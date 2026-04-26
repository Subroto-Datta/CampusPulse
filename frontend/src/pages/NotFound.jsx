import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center px-4">
      <div className="text-center animate-fade-in">
        <p className="text-8xl font-black bg-gradient-to-r from-accent-400 to-surface-600 bg-clip-text text-transparent mb-4">
          404
        </p>
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-gray-400 mb-8">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link to="/dashboard" className="btn-primary">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
