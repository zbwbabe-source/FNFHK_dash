import TaiwanStoreDashboard from '@/components/dashboard/taiwan-store-dashboard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '대만법인 매장효율성 분석',
  description: 'Taiwan Store Efficiency Analysis - 평당매출 중심 분석',
};

export default function TaiwanStoresDashboardPage() {
  return <TaiwanStoreDashboard />;
}

