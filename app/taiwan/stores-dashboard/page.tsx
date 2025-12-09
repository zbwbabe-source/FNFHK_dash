'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import TaiwanStoreDashboard from '@/components/dashboard/taiwan-store-dashboard';

function TaiwanStoresDashboardContent() {
  const searchParams = useSearchParams();
  const period = searchParams.get('period') || '2511'; // 기본값 2511

  return <TaiwanStoreDashboard period={period} />;
}

export default function TaiwanStoresDashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TaiwanStoresDashboardContent />
    </Suspense>
  );
}

