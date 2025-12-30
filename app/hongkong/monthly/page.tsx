'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import HongKongCEODashboard from '@/components/dashboard/hongkong-ceo-dashboard';

function MonthlyPageContent() {
  const searchParams = useSearchParams();
  const period = searchParams.get('period') || '2511';

  return <HongKongCEODashboard period={period} hideInsights={true} />;
}

export default function MonthlyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MonthlyPageContent />
    </Suspense>
  );
}

