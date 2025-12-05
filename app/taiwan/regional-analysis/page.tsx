import TaiwanRegionalAnalysis from '@/components/dashboard/taiwan-regional-analysis';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '대만법인 지역별 분석',
  description: 'Taiwan Regional Analysis - 지역별 효율성 비교',
};

export default function TaiwanRegionalAnalysisPage() {
  return <TaiwanRegionalAnalysis />;
}



