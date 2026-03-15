"use client";

import type { ReactNode } from "react";
import { FolderSearch } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
}

export function EmptyState({
  title,
  description,
  icon,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center animate-in fade-in duration-500">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
        {icon || <FolderSearch className="h-6 w-6 text-muted-foreground" />}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-xs mx-auto">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
