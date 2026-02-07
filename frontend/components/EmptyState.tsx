'use client';

import { Button } from '@/components/ui/button';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Reusable empty state component — consistent pattern across all pages.
 */
export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`border border-border bg-card ${className}`}>
      <div className="p-12 text-center">
        {icon ? (
          <div className="w-12 h-12 mx-auto mb-4 bg-muted flex items-center justify-center">
            {icon}
          </div>
        ) : (
          <div className="w-12 h-12 mx-auto mb-4 bg-muted flex items-center justify-center">
            <svg
              className="w-6 h-6 text-muted-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
              <polyline points="13 2 13 9 20 9" />
            </svg>
          </div>
        )}
        <p className="text-sm font-medium mb-1">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">{description}</p>
        )}
        {action && (
          <Button size="sm" className="mt-4" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}
