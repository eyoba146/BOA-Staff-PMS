import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: Array<{ label: string; to?: string }>;
  /** Override document title (defaults to `title`). */
  documentTitle?: string;
}

/** Page heading (the page's single h1) + optional breadcrumbs and actions. */
export function PageHeader({ title, description, actions, breadcrumbs, documentTitle }: PageHeaderProps) {
  useDocumentTitle(documentTitle ?? title);
  return (
    <div className="mb-4 sm:mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-xs sm:text-[13px] text-zinc-500">
            {breadcrumbs.map((b, i) => (
              <li key={b.label} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3.5 text-zinc-400" aria-hidden />}
                {b.to ? (
                  <Link to={b.to} className="hover:text-zinc-900 hover:underline">
                    {b.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-zinc-700">
                    {b.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl md:text-2xl">{title}</h1>
          {description && <p className="mt-1 text-xs text-zinc-500 sm:text-sm sm:text-zinc-600 leading-relaxed">{description}</p>}
        </div>
        {actions && <div className="flex w-full sm:w-auto shrink-0 flex-wrap items-center gap-2 pt-1 sm:pt-0">{actions}</div>}
      </div>
    </div>
  );
}
