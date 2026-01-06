'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import HongKongStoreDashboardCumulative from '@/components/dashboard/hongkong-store-dashboard-cumulative';

function HongKongStoresDashboardCumulativeContent() {
  const searchParams = useSearchParams();
  const period = searchParams.get('period') || '2511'; // 기본값 2511

  return <HongKongStoreDashboardCumulative period={period} />;
}

export default function HongKongStoresDashboardCumulativePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HongKongStoresDashboardCumulativeContent />
    </Suspense>
  );
}

