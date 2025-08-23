import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
  variant?: 'spinner' | 'dots' | 'pulse';
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

export function LoadingSpinner({ 
  size = 'md', 
  className,
  text,
  variant = 'spinner'
}: LoadingSpinnerProps) {
  if (variant === 'dots') {
    return (
      <div className={cn("flex items-center justify-center gap-1", className)}>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
        </div>
        {text && <span className="ml-2 text-sm text-muted-foreground">{text}</span>}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <div className={cn(
          "animate-pulse rounded-full bg-primary",
          sizeClasses[size]
        )} />
        {text && <span className="ml-2 text-sm text-muted-foreground">{text}</span>}
      </div>
    );
  }

  // Default spinner variant
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {text && <span className="ml-2 text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}

// Convenience components for common use cases
export function LoadingSpinnerCentered({ 
  size = 'lg', 
  text = 'Loading...',
  className 
}: Omit<LoadingSpinnerProps, 'size' | 'text'> & { 
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <LoadingSpinner size={size} text={text} className={className} />
    </div>
  );
}

export function LoadingSpinnerInline({ 
  size = 'sm',
  className 
}: Omit<LoadingSpinnerProps, 'size'> & { size?: 'sm' | 'md' | 'lg' }) {
  return <LoadingSpinner size={size} className={className} />;
}
