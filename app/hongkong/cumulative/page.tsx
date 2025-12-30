'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import HongKongCumulativeDashboard from '@/components/dashboard/hongkong-cumulative-dashboard';

function CumulativePageContent() {
  const searchParams = useSearchParams();
  const period = searchParams.get('period') || '2511';

  return <HongKongCumulativeDashboard period={period} />;
}

export default function CumulativePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CumulativePageContent />
    </Suspense>
  );
}

