'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import HongKongStoreDashboard from '@/components/dashboard/hongkong-store-dashboard';

function HongKongStoresDashboardContent() {
  const searchParams = useSearchParams();
  const period = searchParams.get('period') || '2511'; // 기본값 2511

  return <HongKongStoreDashboard period={period} />;
}

export default function HongKongStoresDashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HongKongStoresDashboardContent />
    </Suspense>
  );
}
















