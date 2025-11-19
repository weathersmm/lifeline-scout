import { Suspense, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AIFeatureSuspenseProps {
  children: ReactNode;
  loadingMessage?: string;
  fullHeight?: boolean;
}

function AIFeatureLoadingFallback({ message, fullHeight }: { message?: string; fullHeight?: boolean }) {
  return (
    <Card className={fullHeight ? 'h-full' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          {message || 'Loading AI Feature...'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-32 w-full" />
      </CardContent>
    </Card>
  );
}

export function AIFeatureSuspense({ 
  children, 
  loadingMessage,
  fullHeight = false 
}: AIFeatureSuspenseProps) {
  return (
    <Suspense fallback={<AIFeatureLoadingFallback message={loadingMessage} fullHeight={fullHeight} />}>
      {children}
    </Suspense>
  );
}
