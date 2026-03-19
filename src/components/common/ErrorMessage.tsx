import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { ApiError } from '../../api/client';

interface ErrorMessageProps {
  error: Error | null;
  onRetry?: () => void;
}

export default function ErrorMessage({ error, onRetry }: ErrorMessageProps) {
  if (!error) return null;

  const is404 = error instanceof ApiError && error.status === 404;
  const is401 = error instanceof ApiError && error.status === 401;
  const is403 = error instanceof ApiError && error.status === 403;

  let title = 'Something went wrong';
  let description = error.message;

  if (is404) {
    title = 'Not found';
    description = 'The resource you are looking for does not exist or you do not have access.';
  } else if (is401) {
    title = 'Authentication required';
    description = 'Your token may have expired or lacks the required scopes.';
  } else if (is403) {
    title = 'Access denied';
    description = 'You do not have permission to access this resource.';
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try again
        </Button>
      )}
    </div>
  );
}
