import { FileQuestion } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { homeFor } from '@/routes/paths';

export function NotFoundPage() {
  useDocumentTitle('Page Not Found');
  const { user } = useAuth();
  const homePath = user ? homeFor(user.role) : '/login';

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
        <FileQuestion className="size-7" aria-hidden />
      </span>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900">Page Not Found</h1>
      <p className="mt-2 max-w-md text-sm text-zinc-600">
        The requested screen does not exist or may have been moved.
      </p>
      <div className="mt-6">
        <Link to={homePath}>
          <Button variant="secondary">Go back to home</Button>
        </Link>
      </div>
    </div>
  );
}
