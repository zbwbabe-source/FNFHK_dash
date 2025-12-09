'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import TaiwanCEODashboard from '@/components/dashboard/taiwan-ceo-dashboard';

function TaiwanPageContent() {
  const searchParams = useSearchParams();
  const period = searchParams.get('period') || '2511'; // 기본값 2511

  return <TaiwanCEODashboard period={period} />;
}

export default function TaiwanPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TaiwanPageContent />
    </Suspense>
  );
}


