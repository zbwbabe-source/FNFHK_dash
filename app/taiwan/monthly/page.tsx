'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import TaiwanCEODashboard from '@/components/dashboard/taiwan-ceo-dashboard';

function MonthlyPageContent() {
  const searchParams = useSearchParams();
  const period = searchParams.get('period') || '2511';

  return <TaiwanCEODashboard period={period} hideInsights={true} />;
}

export default function MonthlyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MonthlyPageContent />
    </Suspense>
  );
}
