'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import HongKongCEODashboard from '@/components/dashboard/hongkong-ceo-dashboard';

function HongKongPageContent() {
  const searchParams = useSearchParams();
  const period = searchParams.get('period') || '2511'; // 기본값 2511

  return <HongKongCEODashboard period={period} />;
}

export default function HongKongPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HongKongPageContent />
    </Suspense>
  );
}


