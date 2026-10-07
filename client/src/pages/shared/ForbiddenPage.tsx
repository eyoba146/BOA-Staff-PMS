import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { homeFor } from '@/routes/paths';

export function ForbiddenPage() {
  useDocumentTitle('Access Denied');
  const { user } = useAuth();
  const homePath = user ? homeFor(user.role) : '/login';

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
        <ShieldAlert className="size-7" aria-hidden />
      </span>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900">Access Restricted</h1>
      <p className="mt-2 max-w-md text-sm text-zinc-600">
        You do not have permission to access this page. This system enforces role-based access control for branch staff and managers.
      </p>
      <div className="mt-6">
        <Link to={homePath}>
          <Button variant="primary">Return to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
