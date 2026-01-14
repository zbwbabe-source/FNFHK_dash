'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Treemap,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, ChevronRight, ArrowRight } from 'lucide-react';
import storeStatusData from './hongkong-store-status.json';
import storeAreasData from './hongkong-store-areas.json';
import storeTurnoverTargetsData from './hongkong-store-turnover-targets.json';
import plData from './hongkong-pl-data.json';

type StoreCategoryKey = 'profit_improving' | 'profit_deteriorating' | 'loss_improving' | 'loss_deteriorating';

interface StoreRecord {
  shop_cd: string;
  shop_nm: string;
  country: string;
  current: {
    net_sales: number;
    direct_profit: number;
    rent_labor_ratio: number;
    rent?: number;
    labor_cost?: number;
    cumulative?: {
      net_sales?: number;
      direct_profit?: number;
    };
  };
  previous?: {
    net_sales?: number;
    direct_profit?: number;
  };
  yoy: number;
  cumulative_yoy?: number;
  category: StoreCategoryKey;
}

interface FlattenedStoreRow {
  store_code: string;
  store_name: string;
  category: StoreCategoryKey;
  net_sales: number;
  direct_profit: number;
  yoy: number;
  rent_labor_ratio: number;
  rent_rate: number; // 임차료율 (%)
  labor_rate: number; // 인건비율 (%)
  sales_per_pyeong: number; // 평당매출
  turnover_rate_achievement: number; // 턴오버율 달성률 (0-100, 목표 대비 달성률)
  turnover_target_sales: number; // 턴오버 목표 매출 (고정임차료 / 턴오버 기준율)
  turnover_shortfall: number; // 턴오버 목표 대비 부족 매출 (목표 매출 - 실제 매출, 음수면 초과)
  efficiency_score: number; // 종합 효율성 점수 (0-100)
  efficiency_grade: string; // 효율성 등급 (S, A, B, C, D)
  // 턴오버 달성시 시나리오
  turnover_achievement_rent_rate: number; // 턴오버 달성시 임차료율 (%)
  turnover_achievement_labor_rate: number; // 턴오버 달성시 인건비율 (%)
  turnover_achievement_direct_profit: number; // 턴오버 달성시 직접이익
  turnover_achievement_direct_profit_rate: number; // 턴오버 달성시 직접이익률 (%)
  is_closed?: boolean; // 폐점 매장 여부
}

const CATEGORY_LABEL: Record<StoreCategoryKey, string> = {
  profit_improving: '흑자 & 매출개선',
  profit_deteriorating: '흑자 & 매출악화',
  loss_improving: '적자 & 매출개선',
  loss_deteriorating: '적자 & 매출악화',
};

// 효율성 점수에 따른 등급 계산 함수 (백분위 기반 - 상대 평가)
const getEfficiencyGrade = (score: number, allScores: number[]): string => {
  if (allScores.length === 0) return 'D';
  
  // 점수 배열을 내림차순 정렬
  const sortedScores = [...allScores].sort((a, b) => b - a);
  
  // 현재 점수보다 높은 점수의 개수 계산
  const higherCount = sortedScores.filter(s => s > score).length;
  
  // 백분위 계산 (상위 몇 %인지)
  const percentile = (higherCount / allScores.length) * 100;
  
  // 백분위 기반 등급 부여 (상위 20%씩 구분)
  if (percentile < 20) return 'S';  // 상위 20%
  if (percentile < 40) return 'A';  // 상위 21-40%
  if (percentile < 60) return 'B';  // 상위 41-60%
  if (percentile < 80) return 'C';  // 상위 61-80%
  return 'D';  // 하위 20%
};

// 등급별 색상 및 스타일
const getGradeStyle = (grade: string) => {
  switch (grade) {
    case 'S':
      return { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' };
    case 'A':
      return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' };
    case 'B':
      return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' };
    case 'C':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' };
    case 'D':
      return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' };
  }
};

interface HongKongStoreDashboardProps {
  period?: string;
}

const HongKongStoreDashboard: React.FC<HongKongStoreDashboardProps> = ({ period = '2511' }) => {
  const ALL_CATEGORY_KEYS: StoreCategoryKey[] = ['profit_improving', 'profit_deteriorating', 'loss_improving', 'loss_deteriorating'];
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [sortBy, setSortBy] = useState<'category' | 'sales' | 'yoy' | 'direct_profit_rate' | 'sales_per_pyeong' | 'turnover'>('category'); // 정렬 기준 (기본값: 카테고리별)
  const [showCurrentDetails, setShowCurrentDetails] = useState(true); // 현재 지표 상세 컬럼 표시 (엑셀 그룹처럼) - 기본값: 펼침
  const [showTurnoverDetails, setShowTurnoverDetails] = useState(false); // 턴오버 달성시 상세 컬럼 표시 (엑셀 그룹처럼) - 사용 안 함
  const [showTurnoverSummary, setShowTurnoverSummary] = useState(true); // 상단 요약(턴오버 달성 효과) 토글
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['profit_improving', 'profit_deteriorating', 'loss_improving', 'loss_deteriorating'])); // 펼쳐진 카테고리 목록 (기본값: 전체 펼침)
  const [showSalesPerPyeongAnalysis, setShowSalesPerPyeongAnalysis] = useState(true); // 1번 섹션 접기/펼치기
  const [expandedCategoriesSalesPerPyeong, setExpandedCategoriesSalesPerPyeong] = useState<Set<string>>(new Set()); // 1번 섹션 펼쳐진 카테고리 목록
  const [showTurnoverRentExplanation, setShowTurnoverRentExplanation] = useState(false); // 턴오버 임차료 설명 접기/펼치기
  const [showMonthlyOrCumulative, setShowMonthlyOrCumulative] = useState<'monthly' | 'cumulative'>('monthly'); // 당월/누적 토글
  
  // 동적 데이터 로드
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [cumulativeData, setCumulativeData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // 당월 데이터 로드
        const response = await fetch(`/dashboard/hongkong-store-status-${period}.json`);
        if (!response.ok) {
          throw new Error(`Failed to load data for period ${period}`);
        }
        const data = await response.json();
        setDashboardData(data);
        
        // 누적 데이터 로드
        const cumulativeResponse = await fetch(`/dashboard/hongkong-store-status-${period}-cumulative.json`);
        if (cumulativeResponse.ok) {
          const cumulativeDataJson = await cumulativeResponse.json();
          setCumulativeData(cumulativeDataJson);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        // 폴백: 기본 데이터 로드 시도
        try {
          const fallbackResponse = await fetch('/dashboard/hongkong-store-status.json');
          const fallbackData = await fallbackResponse.json();
          setDashboardData(fallbackData);
        } catch (fallbackError) {
          console.error('Error loading fallback data:', fallbackError);
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [period]);
  
  // AI 분석 편집 상태
  const [editingAiAnalysis, setEditingAiAnalysis] = useState<string | null>(null);
  const [aiAnalysisTexts, setAiAnalysisTexts] = useState<{[key: string]: string}>({});
  
  // AI 분석 로컬 스토리지에서 로드
  useEffect(() => {
    const saved = localStorage.getItem('hongkong-store-ai-analysis');
    if (saved) {
      try {
        setAiAnalysisTexts(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse AI analysis from localStorage', e);
      }
    }
  }, []);
  
  // AI 분석 로컬 스토리지에 저장
  const saveAiAnalysis = (section: string, text: string) => {
    const newTexts = { ...aiAnalysisTexts, [section]: text };
    setAiAnalysisTexts(newTexts);
    localStorage.setItem('hongkong-store-ai-analysis', JSON.stringify(newTexts));
    setEditingAiAnalysis(null);
  };
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, string>>(() => {
    // 로컬스토리지에서 AI 분석 데이터 로드
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hk_store_ai_analysis');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });
  const [editingStoreCode, setEditingStoreCode] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  
  const allStores: FlattenedStoreRow[] = useMemo(() => {
    const result: FlattenedStoreRow[] = [];
    const storeAreas = (storeAreasData as any)?.store_areas || {};
    
    // 당월/누적 선택에 따라 데이터 소스 결정
    const sourceData = showMonthlyOrCumulative === 'cumulative' && cumulativeData ? cumulativeData : dashboardData;
    if (!sourceData) return [];

    // 모든 매장을 먼저 수집 (카테고리 무관)
    const allStoreRecords: StoreRecord[] = [];
    const categories = ['profit_improving', 'profit_deteriorating', 'loss_improving', 'loss_deteriorating'] as StoreCategoryKey[];
    categories.forEach((cat) => {
      const catData = sourceData?.categories?.[cat];
      if (!catData?.stores) return;
      allStoreRecords.push(...(catData.stores as StoreRecord[]));
    });

    // 모든 매장 처리
    allStoreRecords.forEach((s) => {
        const area = storeAreas[s.shop_cd] || 0; // 평 단위
        const netSales = s.current?.net_sales ?? 0;
        const salesPerPyeong = area > 0 ? netSales / area : 0; // 평당매출 (1K HKD/평)
        
        const rent = s.current?.rent ?? 0;
        const laborCost = s.current?.labor_cost ?? 0;
        const rentRate = netSales > 0 ? (rent / netSales) * 100 : 0;
        const laborRate = netSales > 0 ? (laborCost / netSales) * 100 : 0;
        
        // 턴오버 기준 달성률 계산
        const storeTurnoverTargets = (storeTurnoverTargetsData as any)?.store_turnover_targets || {};
        const turnoverTarget = storeTurnoverTargets[s.shop_cd];
        let turnoverTargetSales = 0;
        let turnoverShortfall = 0;
        let turnoverAchievement = 0;
        
        // 턴오버 달성시 시나리오 계산 변수
        let turnoverAchievementRentRate = 0;
        let turnoverAchievementLaborRate = laborRate; // 인건비율은 동일
        const directProfit = s.current?.direct_profit ?? 0;
        let turnoverAchievementDirectProfit = directProfit;
        let turnoverAchievementDirectProfitRate = 0;
        
        if (turnoverTarget && turnoverTarget.turnover_rate > 0) {
          // 턴오버 기준: 매출 × 턴오버 기준율 >= 고정임차료
          // 목표 매출 = 고정임차료 / 턴오버 기준율 (턴오버 기준을 달성하기 위한 최소 매출)
          turnoverTargetSales = turnoverTarget.fixed_rent / turnoverTarget.turnover_rate;
          // 부족 매출 = 목표 매출 - 실제 매출 (음수면 초과)
          turnoverShortfall = turnoverTargetSales - netSales;
          // 달성률 = (매출 × 턴오버 기준율 / 고정임차료) × 100
          // 100% 이상이면 턴오버 기준 달성 (매출 × 턴오버 기준율 >= 고정임차료)
          const turnoverBasedRent = netSales * turnoverTarget.turnover_rate;
          turnoverAchievement = turnoverTarget.fixed_rent > 0 
            ? (turnoverBasedRent / turnoverTarget.fixed_rent) * 100 
            : 0;
          
          // 턴오버 달성시 직접이익 계산 (누적 기준)
          // 1. 현재 매출총이익 = 누적 직접이익 + 현재 임차료 + 인건비
          const currentGrossProfit = cumulativeDirectProfit + rent + laborCost;
          // 2. 현재 매출원가 = 현재 매출 - 현재 매출총이익 (최소 0)
          const currentCogs = Math.max(0, netSales - currentGrossProfit);
          // 3. 현재 매출원가율 = 현재 매출원가 / 현재 매출 (0-1 사이로 제한)
          const currentCogsRate = netSales > 0 ? Math.max(0, Math.min(1, currentCogs / netSales)) : 0;
          
          // 4. 턴오버 달성시 매출 = 목표 매출 (현재 매출이 목표보다 높으면 현재 매출 유지)
          const turnoverAchievementSales = Math.max(netSales, turnoverTargetSales);
          // 5. 턴오버 달성시 매출원가 = 턴오버 달성시 매출 × 현재 매출원가율
          const turnoverAchievementCogs = turnoverAchievementSales * currentCogsRate;
          // 6. 턴오버 달성시 매출총이익 = 턴오버 달성시 매출 - 턴오버 달성시 매출원가
          const turnoverAchievementGrossProfit = turnoverAchievementSales - turnoverAchievementCogs;
          
          // 7. 턴오버 달성시 임차료 = 현재 임차료 금액 동일
          const turnoverAchievementRent = rent;
          
          // 8. 턴오버 달성시 인건비 = 현재 인건비 금액 동일 (고정)
          const turnoverAchievementLaborCost = laborCost;
          
          // 9. 턴오버 달성시 직접이익 = 턴오버 달성시 매출총이익 - 임차료 - 인건비
          turnoverAchievementDirectProfit = turnoverAchievementGrossProfit - turnoverAchievementRent - turnoverAchievementLaborCost;
          
          // 턴오버 달성시 임차료율
          turnoverAchievementRentRate = turnoverAchievementSales > 0 ? (turnoverAchievementRent / turnoverAchievementSales) * 100 : 0;
          // 턴오버 달성시 인건비율 (매출 증가로 인해 비율은 감소)
          turnoverAchievementLaborRate = turnoverAchievementSales > 0 ? (turnoverAchievementLaborCost / turnoverAchievementSales) * 100 : 0;
          // 턴오버 달성시 직접이익률
          turnoverAchievementDirectProfitRate = turnoverAchievementSales > 0 ? (turnoverAchievementDirectProfit / turnoverAchievementSales) * 100 : 0;
        }
        
        // 누적 기준으로 카테고리 재분류
        const reclassifiedCategory = categorizeByCumulative(s);
        const cumulativeYoy = s.cumulative_yoy ?? s.yoy ?? 0;
        
        result.push({
          store_code: s.shop_cd,
          store_name: s.shop_nm.trim(),
          category: s.category,
          net_sales: netSales,
          direct_profit: directProfit,
          yoy: s.yoy,
          rent_labor_ratio: s.current?.rent_labor_ratio ?? 0,
          rent_rate: rentRate,
          labor_rate: laborRate,
          sales_per_pyeong: salesPerPyeong,
          turnover_rate_achievement: turnoverAchievement,
          turnover_target_sales: turnoverTargetSales,
          turnover_shortfall: turnoverShortfall,
          efficiency_score: 0, // 나중에 계산
          efficiency_grade: 'D', // 나중에 계산
          turnover_achievement_rent_rate: turnoverAchievementRentRate,
          turnover_achievement_labor_rate: turnoverAchievementLaborRate,
          turnover_achievement_direct_profit: turnoverAchievementDirectProfit,
          turnover_achievement_direct_profit_rate: turnoverAchievementDirectProfitRate,
          is_closed: (s as any).is_closed || false, // 폐점 매장 여부
        });
    });

    // 종합 효율성 점수 계산을 위해 전체 데이터의 최소/최대값 필요
    const allYoy = result.map(s => s.yoy);
    const allDirectProfitRate = result.map(s => s.net_sales > 0 ? (s.direct_profit / s.net_sales) * 100 : 0);
    const allSalesPerPyeong = result.map(s => s.sales_per_pyeong);
    const allRentRatio = result.map(s => s.rent_labor_ratio);

    const minYoy = Math.min(...allYoy);
    const maxYoy = Math.max(...allYoy);
    const minDirectProfitRate = Math.min(...allDirectProfitRate);
    const maxDirectProfitRate = Math.max(...allDirectProfitRate);
    const minSalesPerPyeong = Math.min(...allSalesPerPyeong);
    const maxSalesPerPyeong = Math.max(...allSalesPerPyeong);
    const minRentRatio = Math.min(...allRentRatio);
    const maxRentRatio = Math.max(...allRentRatio);

    // 각 매장의 종합 효율성 점수 계산
    result.forEach(store => {
      const directProfitRate = store.net_sales > 0 ? (store.direct_profit / store.net_sales) * 100 : 0;
      
      // 각 지표를 0-100 점수로 정규화
      const yoyScore = maxYoy > minYoy ? ((store.yoy - minYoy) / (maxYoy - minYoy)) * 100 : 50;
      const directProfitRateScore = maxDirectProfitRate > minDirectProfitRate 
        ? ((directProfitRate - minDirectProfitRate) / (maxDirectProfitRate - minDirectProfitRate)) * 100 
        : 50;
      const salesPerPyeongScore = maxSalesPerPyeong > minSalesPerPyeong
        ? ((store.sales_per_pyeong - minSalesPerPyeong) / (maxSalesPerPyeong - minSalesPerPyeong)) * 100
        : 50;
      // 턴오버율 달성률 (높을수록 좋음)
      const turnoverScore = store.turnover_rate_achievement || 0;

      // 가중 평균: 매출 YOY 30%, 직접이익률 30%, 평당매출 30%, 턴오버율 달성 10%
      store.efficiency_score = 
        yoyScore * 0.3 +
        directProfitRateScore * 0.3 +
        salesPerPyeongScore * 0.3 +
        turnoverScore * 0.1;
    });

    // 모든 점수를 계산한 후 등급 부여 (백분위 기반 상대 평가)
    const allScores = result.map(s => s.efficiency_score);
    result.forEach(store => {
      store.efficiency_grade = getEfficiencyGrade(store.efficiency_score, allScores);
    });

    return result;
  }, [showMonthlyOrCumulative, dashboardData, cumulativeData]);

  // 기본값 설정
  useEffect(() => {
    // 기본값은 '전체' 선택
    if (!selectedStore) {
      setSelectedStore('ALL');
    }
  }, [selectedStore]);


  const formatNumber = (num: number) =>
    (Number.isFinite(num) ? Math.round(num).toLocaleString('ko-KR') : '0');
  const formatPercent = (num: number, decimals: number = 0) => {
    if (!Number.isFinite(num)) return '0%';
    return `${Number(num).toFixed(decimals)}%`;
  };

  // 로딩 중 표시
  if (isLoading || !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Period 표시를 위한 포맷팅
  const periodYear = period.substring(0, 2);
  const periodMonth = period.substring(2, 4);
  const periodLabel = `${periodYear}년 ${periodMonth}월`;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 헤더 */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-gradient-to-r from-slate-800 to-slate-600 text-white rounded-lg p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">매장효율성 분석 ({periodLabel} 기준)</h1>
            <p className="text-sm text-slate-200">
              매장별 평당매출, 턴오버 달성률, 손익구조를 분석하여 효율성을 한눈에 파악하는 화면입니다.
            </p>
          </div>
          {/* 당월/누적 토글 버튼 */}
          <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg p-1">
            <button
              onClick={() => setShowMonthlyOrCumulative('monthly')}
              className={`px-4 py-2 text-sm font-semibold rounded transition-colors ${
                showMonthlyOrCumulative === 'monthly'
                  ? 'bg-white text-slate-800'
                  : 'bg-transparent text-white hover:bg-slate-600'
              }`}
            >
              당월
            </button>
            <button
              onClick={() => setShowMonthlyOrCumulative('cumulative')}
              className={`px-4 py-2 text-sm font-semibold rounded transition-colors ${
                showMonthlyOrCumulative === 'cumulative'
                  ? 'bg-white text-slate-800'
                  : 'bg-transparent text-white hover:bg-slate-600'
              }`}
            >
              누적
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. 매장별 평당매출 분석 */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">1. 매장별 평당매출 분석</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const allCategoryKeys = ['profit_improving', 'profit_deteriorating', 'loss_improving', 'loss_deteriorating'];
                if (expandedCategoriesSalesPerPyeong.size === allCategoryKeys.length) {
                  setExpandedCategoriesSalesPerPyeong(new Set());
                } else {
                  setExpandedCategoriesSalesPerPyeong(new Set(allCategoryKeys));
                }
              }}
              className="px-3 py-1 text-xs rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            >
              {expandedCategoriesSalesPerPyeong.size === 4 ? '전체 접기' : '전체 펼치기'}
            </button>
          </div>
        </div>
        
        {/* AI 분석 */}
        {(() => {
          const profitStores = allStores.filter(s => s.direct_profit > 0 && s.sales_per_pyeong > 0);
          const lossStores = allStores.filter(s => s.direct_profit <= 0 && s.sales_per_pyeong > 0);
          
          if (profitStores.length === 0 && lossStores.length === 0) return null;
          
          const avgProfitSalesPerPyeong = profitStores.length > 0
            ? profitStores.reduce((sum, s) => sum + s.sales_per_pyeong, 0) / profitStores.length
            : 0;
          const minProfitSalesPerPyeong = profitStores.length > 0
            ? Math.min(...profitStores.map(s => s.sales_per_pyeong))
            : 0;
          const maxLossSalesPerPyeong = lossStores.length > 0
            ? Math.max(...lossStores.map(s => s.sales_per_pyeong))
            : 0;
          
          const breakEvenThreshold = Math.max(minProfitSalesPerPyeong, maxLossSalesPerPyeong);
          
          const defaultText = `평당매출이 ${formatNumber(breakEvenThreshold)}K HKD/평 이상이어야 흑자 전환 가능성이 높습니다. 현재 흑자 매장(${profitStores.length}개)의 평균 평당매출은 ${formatNumber(avgProfitSalesPerPyeong)}K HKD/평입니다.`;
          const displayText = aiAnalysisTexts['section1'] || defaultText;
          
          return (
            <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
              {editingAiAnalysis === 'section1' ? (
                <div>
                  <textarea
                    className="w-full text-xs p-2 border border-blue-300 rounded"
                    rows={3}
                    value={displayText}
                    onChange={(e) => setAiAnalysisTexts({ ...aiAnalysisTexts, section1: e.target.value })}
                    onBlur={() => saveAiAnalysis('section1', displayText)}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => saveAiAnalysis('section1', displayText)}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => {
                        const newTexts = { ...aiAnalysisTexts };
                        delete newTexts['section1'];
                        setAiAnalysisTexts(newTexts);
                        localStorage.setItem('hongkong-store-ai-analysis', JSON.stringify(newTexts));
                        setEditingAiAnalysis(null);
                      }}
                      className="px-2 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500"
                    >
                      기본값으로 복원
                    </button>
                    <button
                      onClick={() => setEditingAiAnalysis(null)}
                      className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <p className="text-xs text-gray-700 flex-1">
                    <span className="font-semibold text-blue-700">💡 AI 분석:</span> {displayText}
                  </p>
                  <button
                    onClick={() => setEditingAiAnalysis('section1')}
                    className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    수정
                  </button>
                </div>
              )}
            </div>
          );
        })()}
        
        
        {showSalesPerPyeongAnalysis && (() => {
          // 평당매출 기준으로 정렬된 매장 목록 (높은 순)
          const sortedStoresBySalesPerPyeong = [...allStores]
            .filter(s => s.sales_per_pyeong > 0) // 면적이 있는 매장만
            .sort((a, b) => (b.sales_per_pyeong || 0) - (a.sales_per_pyeong || 0));
          
          // 통계 계산
          const validStores = sortedStoresBySalesPerPyeong.filter(s => s.sales_per_pyeong > 0);
          const maxSalesPerPyeong = validStores.length > 0
            ? Math.max(...validStores.map(s => s.sales_per_pyeong))
            : 0;
          const minSalesPerPyeong = validStores.length > 0
            ? Math.min(...validStores.map(s => s.sales_per_pyeong))
            : 0;
          
          // 카테고리별 그룹화
          const categoryGroups: Record<string, typeof sortedStoresBySalesPerPyeong> = {
            profit_improving: [],
            profit_deteriorating: [],
            loss_improving: [],
            loss_deteriorating: [],
          };
          
          sortedStoresBySalesPerPyeong.forEach(store => {
            if (categoryGroups[store.category]) {
              categoryGroups[store.category].push(store);
            }
          });
          
          // 색상 강도 계산 함수
          const getHeatmapColor = (value: number) => {
            const ratio = maxSalesPerPyeong > minSalesPerPyeong
              ? (value - minSalesPerPyeong) / (maxSalesPerPyeong - minSalesPerPyeong)
              : 0.5;
            
            // 초록 계열 (높은 값)
            if (ratio >= 0.8) return { bg: 'bg-green-600', text: 'text-white' };
            if (ratio >= 0.6) return { bg: 'bg-green-400', text: 'text-white' };
            if (ratio >= 0.4) return { bg: 'bg-green-200', text: 'text-gray-800' };
            // 노랑 계열 (중간)
            if (ratio >= 0.3) return { bg: 'bg-yellow-200', text: 'text-gray-800' };
            if (ratio >= 0.2) return { bg: 'bg-yellow-100', text: 'text-gray-800' };
            // 빨강 계열 (낮은 값)
            if (ratio >= 0.1) return { bg: 'bg-red-100', text: 'text-gray-800' };
            if (ratio >= 0.05) return { bg: 'bg-red-200', text: 'text-gray-800' };
            return { bg: 'bg-red-300', text: 'text-gray-800' };
          };
          
          return (
        <div className="overflow-x-auto">
              <table className="min-w-full text-xs border-collapse">
            <thead>
                  <tr className="bg-gray-200 border-b-2 border-gray-400">
                    <th className="p-2 text-left font-semibold">매장명</th>
                    <th className="p-2 text-right font-semibold">평당매출</th>
                    <th className="p-2 text-right font-semibold">매출액</th>
                    <th className="p-2 text-right font-semibold">당월직접이익</th>
                    <th className="p-2 text-right font-semibold">면적(평)</th>
                    <th className="p-2 text-right font-semibold">순위</th>
                    <th className="p-2 text-left font-semibold">개선전략</th>
              </tr>
            </thead>
            <tbody>
                  {Object.entries(categoryGroups).map(([catKey, stores]) => {
                    if (stores.length === 0) return null;
                    const categoryName = CATEGORY_LABEL[catKey as StoreCategoryKey];
                    const isExpanded = expandedCategoriesSalesPerPyeong.has(catKey);
                    
                    // 카테고리별 합계 계산
                    const totalSales = stores.reduce((sum, s) => sum + s.net_sales, 0);
                    const totalDirectProfit = stores.reduce((sum, s) => sum + s.direct_profit, 0);
                    const totalArea = stores.reduce((sum, s) => {
                      const area = (storeAreasData as any)?.store_areas?.[s.store_code] || 0;
                      return sum + area;
                    }, 0);
                    const avgSalesPerPyeong = totalArea > 0 ? totalSales / totalArea : 0;
                    
                    const toggleCategory = () => {
                      setExpandedCategoriesSalesPerPyeong((prev) => {
                        const newSet = new Set(prev);
                        if (newSet.has(catKey)) {
                          newSet.delete(catKey);
                        } else {
                          newSet.add(catKey);
                        }
                        return newSet;
                      });
                    };
                      
                      return (
                      <React.Fragment key={catKey}>
                        {/* 카테고리 합계 행 */}
                        <tr
                          className="border-b-2 border-gray-400 bg-gray-100 hover:bg-gray-200 font-bold"
                          onClick={toggleCategory}
                          style={{ cursor: 'pointer' }}
                        >
                          <td className="p-2 font-semibold border-r border-gray-300 sticky left-0 bg-gray-100 z-10">
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                              <span>{categoryName}</span>
                              <span className="text-xs font-normal text-gray-600">({stores.length}개 매장)</span>
                            </div>
                        </td>
                          <td className={`p-2 text-right border-r border-gray-300 font-bold ${getHeatmapColor(avgSalesPerPyeong).bg} ${getHeatmapColor(avgSalesPerPyeong).text}`}>
                            {avgSalesPerPyeong.toFixed(1)}K HKD/평
                          </td>
                          <td className="p-2 text-right border-r border-gray-300 bg-white">
                            {formatNumber(totalSales)}K
                          </td>
                          <td className={`p-2 text-right border-r border-gray-300 bg-white font-semibold ${
                            totalDirectProfit >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatNumber(totalDirectProfit)}K
                          </td>
                          <td className="p-2 text-right border-r border-gray-300 bg-white">
                            {totalArea > 0 ? `${totalArea}평` : '-'}
                          </td>
                          <td className="p-2 text-right border-r border-gray-300 bg-white">
                            -
                          </td>
                          <td className="p-2 text-left bg-white text-gray-500">
                            -
                          </td>
                        </tr>
                        
                        {/* 매장별 행 (펼쳐진 경우만 표시) */}
                        {isExpanded && stores.map((store, index) => {
                          const area = (storeAreasData as any)?.store_areas?.[store.store_code] || 0;
                          const globalRank = sortedStoresBySalesPerPyeong.findIndex(s => s.store_code === store.store_code) + 1;
                          const colorStyle = getHeatmapColor(store.sales_per_pyeong);
                          
                          return (
                            <tr key={store.store_code} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="p-2 text-gray-600">{store.store_name}</td>
                              <td className={`p-2 text-right font-bold ${colorStyle.bg} ${colorStyle.text}`}>
                                {store.sales_per_pyeong.toFixed(1)}K HKD/평
                              </td>
                              <td className="p-2 text-right bg-white">{formatNumber(store.net_sales)}K</td>
                              <td className={`p-2 text-right bg-white font-semibold ${
                                store.direct_profit >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {formatNumber(store.direct_profit)}K
                              </td>
                              <td className="p-2 text-right bg-white">{area > 0 ? `${area}평` : '-'}</td>
                              <td className="p-2 text-right bg-white font-medium">#{globalRank}</td>
                              <td className="p-2 text-left bg-white text-gray-500">
                                {/* 개선전략은 나중에 추가할 수 있도록 빈 셀로 유지 */}
                                -
                    </td>
                  </tr>
                          );
                        })}
                      </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
          );
        })()}
      </div>

      {/* 2. 턴오버임차료 기준매출 달성시 매장별 지표변화 */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            2. 턴오버임차료 기준매출 달성시 매장별 지표변화
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const allExpanded = ALL_CATEGORY_KEYS.every((key) => expandedCategories.has(key));
                if (allExpanded) {
                  setExpandedCategories(new Set());
                } else {
                  setExpandedCategories(new Set(ALL_CATEGORY_KEYS));
                }
              }}
              className="px-3 py-1 text-xs rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            >
              {ALL_CATEGORY_KEYS.every((key) => expandedCategories.has(key)) ? '전체 접기' : '전체 펼치기'}
            </button>
          </div>
        </div>
        
        {/* 턴오버 임차료 기준 매출 설명 */}
        <div className="mb-4 bg-gray-50 border border-gray-200 rounded">
          <button
            type="button"
            onClick={() => setShowTurnoverRentExplanation(!showTurnoverRentExplanation)}
            className="w-full p-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-blue-600 text-sm">ℹ️</span>
              <h3 className="text-xs font-semibold text-gray-800">턴오버 기준율</h3>
            </div>
            {showTurnoverRentExplanation ? (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
          </button>
          {showTurnoverRentExplanation && (
            <div className="px-3 pb-3">
              <p className="text-xs text-gray-600 leading-relaxed">
                <span className="font-semibold">턴오버 임차료(Turnover Rent)</span>는 매출의 일정 비율을 임차료로 지불하는 방식입니다.
                <br /><br />
                일반적으로 <span className="font-semibold text-blue-700">"기본임대료 + 초과 매출의 일정 %"</span> 또는 
                <span className="font-semibold text-blue-700 underline">"매출의 일정 % 중 더 높은 금액(Max)"</span>으로 계산됩니다.
                <br /><br />
                따라서 턴오버 기준 100% 달성 시점은 현재 고정임대료가 매출의 일정 비율에 해당하는 매출 수준을 의미하며,
                <br /><br />
                이 매출에 도달하면 <span className="font-semibold text-green-700 underline">임차료 비중이 안정화(약 17-18%)되어 고정비 부담이 완화되고 수익성이 크게 개선</span>됩니다.
              </p>
            </div>
          )}
        </div>
        
        {/* AI 분석 */}
            {(() => {
          const storesWithTurnover = allStores.filter(s => s.turnover_rate_achievement > 0);
          const belowTarget = storesWithTurnover.filter(s => s.turnover_rate_achievement < 100);
          
          // 전체 합계 행과 동일한 계산 방식
          const totalNetSales = storesWithTurnover.reduce((sum, s) => sum + s.net_sales, 0);
          const totalRent = storesWithTurnover.reduce((sum, s) => {
            const storeRecord = (storeStatusData as any)?.categories?.[s.category]?.stores?.find((st: any) => st.shop_cd === s.store_code);
            return sum + (storeRecord?.current?.rent || 0);
          }, 0);
          
          const avgCurrentRentRate = totalNetSales > 0 ? (totalRent / totalNetSales) * 100 : 0;
          
          const totalTurnoverSales = storesWithTurnover.reduce((sum, s) => {
            return sum + (s.turnover_target_sales > 0 ? Math.max(s.net_sales, s.turnover_target_sales) : s.net_sales);
          }, 0);
          
          const avgTargetRentRate = totalTurnoverSales > 0 ? (totalRent / totalTurnoverSales) * 100 : 0;
          
          const avgAchievement = storesWithTurnover.length > 0
            ? storesWithTurnover.reduce((sum, s) => sum + s.turnover_rate_achievement, 0) / storesWithTurnover.length
            : 0;
          
          const defaultText = `턴오버 100% 달성 시 임차료율이 평균 ${formatPercent(avgTargetRentRate, 1)}로 하락합니다 (현재 ${formatPercent(avgCurrentRentRate, 1)}, ${formatPercent(avgCurrentRentRate - avgTargetRentRate, 1)}%p 개선). 현재 평균 달성률은 ${formatPercent(avgAchievement, 1)}이며, ${belowTarget.length}개 매장이 목표 미달 상태입니다.`;
          const displayText = aiAnalysisTexts['section2'] || defaultText;
          
          return (
            <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 rounded">
              {editingAiAnalysis === 'section2' ? (
                <div>
                  <textarea
                    className="w-full text-xs p-2 border border-green-300 rounded"
                    rows={3}
                    value={displayText}
                    onChange={(e) => setAiAnalysisTexts({ ...aiAnalysisTexts, section2: e.target.value })}
                    onBlur={() => saveAiAnalysis('section2', displayText)}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => saveAiAnalysis('section2', displayText)}
                      className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => {
                        const newTexts = { ...aiAnalysisTexts };
                        delete newTexts['section2'];
                        setAiAnalysisTexts(newTexts);
                        localStorage.setItem('hongkong-store-ai-analysis', JSON.stringify(newTexts));
                        setEditingAiAnalysis(null);
                      }}
                      className="px-2 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500"
                    >
                      기본값으로 복원
                    </button>
                    <button
                      onClick={() => setEditingAiAnalysis(null)}
                      className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <p className="text-xs text-gray-700 flex-1">
                    <span className="font-semibold text-green-700">💡 AI 분석:</span> {displayText}
                  </p>
                  <button
                    onClick={() => setEditingAiAnalysis('section2')}
                    className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    수정
                  </button>
                </div>
              )}
            </div>
          );
        })()}
        
        
        {/* 통합 테이블 (카테고리별 합계 + 매장별 내역) */}
        <div>
          <div className="mb-4">
            <div className="overflow-x-auto">
                <table className="min-w-full text-xs border-collapse">
                  <thead>
                    {/* 그룹 헤더 행 (엑셀 그룹처럼) */}
                    <tr className="bg-gray-200 border-b-2 border-gray-400">
                      <th rowSpan={2} className="text-center p-2 font-semibold border-r border-gray-300 sticky left-0 bg-gray-100 z-10">매장명<br/>(면적, YOY)</th>
                      <th rowSpan={2} className="text-center p-2 font-semibold border-r border-gray-300">턴오버율<br/>달성률 (%)</th>
                      <th colSpan={4} className="text-center p-2 font-bold border-r-2 border-gray-400 bg-blue-50">
                        <span>현재 지표</span>
                      </th>
                      <th colSpan={1} className="text-center p-2 font-bold bg-green-50 w-24">
                        <span>턴오버 100% 달성시</span>
                      </th>
                    </tr>
                    {/* 컬럼 헤더 행 */}
                    <tr className="bg-gray-100 border-b-2 border-gray-300">
                      {/* 현재 지표 그룹 */}
                      <th className="text-right p-2 font-semibold border-r border-gray-300 bg-blue-50 w-24">직접이익률<br/>(%)</th>
                      <th className="text-right p-2 font-semibold border-r border-gray-300 bg-blue-50 w-24">임차료율<br/>(%)</th>
                      <th className="text-right p-2 font-semibold border-r border-gray-300 bg-purple-100 w-24">턴오버기준율<br/>(%)</th>
                      <th className="text-right p-2 font-semibold border-r-2 border-gray-400 bg-blue-50 w-24">인건비율<br/>(%)</th>
                      
                      {/* 턴오버 달성시 지표 그룹 */}
                      <th className="text-right p-2 font-semibold bg-green-50 w-24">임차료율<br/>(%)</th>
                    </tr>
                  </thead>
                  <tbody>
            {(() => {
                      // 필터링된 매장 데이터 가져오기
                      let filteredStores = allStores;
                      if (selectedStore !== 'ALL') {
                        filteredStores = allStores.filter((s) => s.category === selectedStore);
                      }

                      // 카테고리 순서 정의
                      const categoryOrder: Record<StoreCategoryKey, number> = {
                        profit_improving: 1,
                        profit_deteriorating: 2,
                        loss_improving: 3,
                        loss_deteriorating: 4,
                      };
                      
                      // 카테고리별로 그룹화
                      const categoryGroups: Record<string, typeof allStores> = {
                        profit_improving: [],
                        profit_deteriorating: [],
                        loss_improving: [],
                        loss_deteriorating: [],
                      };
                      
                      filteredStores.forEach(store => {
                        if (categoryGroups[store.category]) {
                          categoryGroups[store.category].push(store);
                        }
                      });
                      
                      // 각 카테고리 내에서 정렬
                      Object.keys(categoryGroups).forEach(catKey => {
                        categoryGroups[catKey].sort((a, b) => {
                          switch (sortBy) {
                            case 'sales':
                              return (b.net_sales || 0) - (a.net_sales || 0);
                            case 'yoy':
                              return (b.yoy || 0) - (a.yoy || 0);
                            case 'direct_profit_rate': {
                              const aRate = a.net_sales > 0 ? (a.direct_profit / a.net_sales) * 100 : 0;
                              const bRate = b.net_sales > 0 ? (b.direct_profit / b.net_sales) * 100 : 0;
                              return bRate - aRate;
                            }
                            case 'sales_per_pyeong':
                              return (b.sales_per_pyeong || 0) - (a.sales_per_pyeong || 0);
                            case 'turnover':
                              return (b.turnover_rate_achievement || 0) - (a.turnover_rate_achievement || 0);
                            default:
                              return (b.turnover_rate_achievement || 0) - (a.turnover_rate_achievement || 0);
                          }
                        });
                      });

                      // 행 전체 색상 함수 (효율성 점수 기반) - 흰색으로 통일
                      const getRowColor = (score: number) => {
                        return 'bg-white hover:bg-gray-50';
                      };

                      // 각 지표별 최소/최대값 계산 (전체 매장 기준)
                      const allYoyValues = filteredStores.map((s) => s.yoy);
                      const allDirectProfitRateValues = filteredStores.map((s) => 
                        s.net_sales > 0 ? (s.direct_profit / s.net_sales) * 100 : 0
                      );
                      const allRentRateValues = filteredStores.map((s) => s.rent_rate);
                      const allLaborRateValues = filteredStores.map((s) => s.labor_rate);
                      const allTurnoverValues = filteredStores.map((s) => s.turnover_rate_achievement || 0);

                      const minYoy = Math.min(...allYoyValues);
                      const maxYoy = Math.max(...allYoyValues);
                      const minDirectProfitRate = Math.min(...allDirectProfitRateValues);
                      const maxDirectProfitRate = Math.max(...allDirectProfitRateValues);
                      const minRentRate = Math.min(...allRentRateValues);
                      const maxRentRate = Math.max(...allRentRateValues);
                      const minLaborRate = Math.min(...allLaborRateValues);
                      const maxLaborRate = Math.max(...allLaborRateValues);
                      const minTurnover = Math.min(...allTurnoverValues);
                      const maxTurnover = Math.max(...allTurnoverValues);

                      const storeAreas = (storeAreasData as any)?.store_areas || {};
                      
                      // 카테고리 토글 함수
                      const toggleCategory = (categoryKey: string) => {
                        setExpandedCategories(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(categoryKey)) {
                            newSet.delete(categoryKey);
                          } else {
                            newSet.add(categoryKey);
                          }
                          return newSet;
                        });
                      };
                      
                      // 카테고리별로 렌더링
                      return Object.entries(categoryGroups).map(([catKey, stores]) => {
                        if (stores.length === 0) return null;
                        
                        const isExpanded = expandedCategories.has(catKey);
                        const categoryName = CATEGORY_LABEL[catKey as StoreCategoryKey];
                        
                        // 카테고리별 합계 계산
                        const totalSales = stores.reduce((sum, s) => sum + s.net_sales, 0);
                        const totalDirectProfit = stores.reduce((sum, s) => sum + s.direct_profit, 0);
                        const avgYoy = stores.reduce((sum, s) => sum + s.yoy, 0) / stores.length;
                        const avgDirectProfitRate = totalSales > 0 ? (totalDirectProfit / totalSales) * 100 : 0;
                        const avgTurnoverAchievement = stores.reduce((sum, s) => sum + (s.turnover_rate_achievement || 0), 0) / stores.length;
                        const avgRentRate = totalSales > 0 ? stores.reduce((sum, s) => sum + (s.rent_rate * s.net_sales), 0) / totalSales : 0;
                        const avgLaborRate = totalSales > 0 ? stores.reduce((sum, s) => sum + (s.labor_rate * s.net_sales), 0) / totalSales : 0;
                        
                        // 턴오버 달성시 평균 계산
                        const storesWithTurnover = stores.filter(s => s.turnover_rate_achievement > 0);
                        const avgTurnoverDirectProfitRate = storesWithTurnover.length > 0
                          ? storesWithTurnover.reduce((sum, s) => sum + s.turnover_achievement_direct_profit_rate, 0) / storesWithTurnover.length
                          : 0;
                        const avgTurnoverRentRate = storesWithTurnover.length > 0
                          ? storesWithTurnover.reduce((sum, s) => sum + s.turnover_achievement_rent_rate, 0) / storesWithTurnover.length
                          : 0;
                        const storesWithTurnoverLabor = stores.filter(s => s.turnover_rate_achievement > 0 && s.turnover_achievement_labor_rate > 0);
                        const avgTurnoverLaborRate = storesWithTurnoverLabor.length > 0
                          ? storesWithTurnoverLabor.reduce((sum, s) => sum + s.turnover_achievement_labor_rate, 0) / storesWithTurnoverLabor.length
                          : 0;

              return (
                          <React.Fragment key={catKey}>
                            {/* 카테고리 합계 행 */}
                            <tr
                              className="border-b-2 border-gray-400 bg-gray-100 hover:bg-gray-200 font-bold"
                              onClick={() => toggleCategory(catKey)}
                              style={{ cursor: 'pointer' }}
                            >
                              <td className="p-2 font-semibold border-r border-gray-300 sticky left-0 bg-gray-100 z-10">
                                <div className="flex items-center gap-2">
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                  <span>{categoryName}</span>
                                  <span className="text-xs font-normal text-gray-600">({stores.length}개 매장)</span>
                        </div>
                              </td>
                              <td className="p-2 border-r border-gray-300 bg-white">
                                <div className="flex items-center gap-2 px-2">
                                  <div className="flex-1 min-w-[60px]">
                                    <div className="w-full bg-gray-200 rounded-full h-4 relative overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full transition-all ${
                                          avgTurnoverAchievement >= 100 ? 'bg-green-500' :
                                          avgTurnoverAchievement >= 80 ? 'bg-yellow-500' :
                                          'bg-red-500'
                                        }`}
                                        style={{ 
                                          width: `${Math.min(avgTurnoverAchievement, 150)}%` 
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <span className="text-xs font-semibold min-w-[45px] text-right">
                                {formatPercent(avgTurnoverAchievement, 1)}
                                  </span>
                                </div>
                              </td>
                              <td className={`p-2 text-right border-r border-gray-300 bg-white ${avgDirectProfitRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPercent(avgDirectProfitRate, 1)}
                              </td>
                              <td className="p-2 text-right border-r border-gray-300 bg-white">
                                {avgRentRate.toFixed(1)}%
                              </td>
                              <td className="p-2 text-right border-r border-gray-300 bg-white text-blue-600">
                                {(() => {
                                  const storesWithRate = stores.filter(s => {
                                    const turnoverData = (storeTurnoverTargetsData as any)?.store_turnover_targets?.[s.store_code];
                                    return turnoverData?.turnover_rate;
                                  });
                                  const avgTurnoverRate = storesWithRate.length > 0
                                    ? storesWithRate.reduce((sum, s) => {
                                        const turnoverData = (storeTurnoverTargetsData as any)?.store_turnover_targets?.[s.store_code];
                                        return sum + (turnoverData?.turnover_rate || 0) * 100;
                                      }, 0) / storesWithRate.length
                                    : 0;
                                  return avgTurnoverRate > 0 ? avgTurnoverRate.toFixed(1) + '%' : '-';
                                })()}
                              </td>
                              <td className="p-2 text-right border-r-2 border-gray-400 bg-white">
                                {avgLaborRate > 0 ? avgLaborRate.toFixed(1) + '%' : '-'}
                              </td>
                              <td className="p-2 text-right bg-white">
                                {avgTurnoverRentRate > 0 ? avgTurnoverRentRate.toFixed(1) + '%' : '-'}
                              </td>
                            </tr>
                            
                            {/* 매장별 내역 (펼쳐진 경우만 표시) */}
                            {isExpanded && stores.map((store) => {
                              const directProfitRate = store.net_sales > 0 
                                ? (store.direct_profit / store.net_sales) * 100 
                                : 0;
                              const area = storeAreas[store.store_code] || 0;

                      return (
                                <React.Fragment key={store.store_code}>
                                  <tr
                                    className={`border-b border-gray-200 bg-white hover:bg-gray-50`}
                                  >
                                    <td className="p-2 font-medium border-r border-gray-300 sticky left-0 bg-white z-10">
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-600">{store.store_name}</span>
                                        {store.is_closed && (
                                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-gray-200 text-gray-700 font-semibold">
                                            영업종료
                                          </span>
                                        )}
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                                          store.category === 'profit_improving' ? 'bg-green-100 text-green-800' :
                                          store.category === 'profit_deteriorating' ? 'bg-yellow-100 text-yellow-800' :
                                          store.category === 'loss_improving' ? 'bg-blue-100 text-blue-800' :
                                          'bg-red-100 text-red-800'
                                        }`}>
                                          {CATEGORY_LABEL[store.category]}
                                        </span>
                        </div>
                                      <div className="flex items-center gap-2 mt-1">
                                        {area > 0 && (
                                          <div className="text-[10px] text-gray-500">{area}평</div>
                                        )}
                                        <div className="text-[10px] font-semibold text-gray-700 px-1.5 py-0.5 rounded">
                                          YOY {formatPercent(store.yoy)}
                                        </div>
                        </div>
                                    </td>
                                    <td className="p-2 text-right border-r border-gray-300 bg-white">
                                      <div className="flex items-center justify-end gap-2">
                                        <div className="flex-1 min-w-[60px]">
                                          <div className="w-full bg-gray-200 rounded-full h-4 relative overflow-hidden">
                                            <div 
                                              className={`h-full rounded-full transition-all ${
                                                (store.turnover_rate_achievement || 0) >= 100 ? 'bg-green-500' :
                                                (store.turnover_rate_achievement || 0) >= 80 ? 'bg-yellow-500' :
                                                'bg-red-500'
                                              }`}
                                              style={{ 
                                                width: `${Math.min((store.turnover_rate_achievement || 0), 150)}%` 
                                              }}
                                            />
                                          </div>
                                        </div>
                                        <span className="text-xs font-semibold min-w-[45px] text-right">
                                          {(store.turnover_rate_achievement || 0).toFixed(1)}%
                                        </span>
                                      </div>
                                    </td>
                                    
                                    {/* 현재 지표: 직접이익률, 임차료율, 인건비율 */}
                                    <td className={`p-2 text-right border-r border-gray-300 bg-white ${directProfitRate >= 0 ? 'text-green-600' : 'text-red-600'} font-semibold`}>
                                      {directProfitRate.toFixed(1)}%
                                    </td>
                                    <td
                                      className={`
                                        p-2 text-right border-r border-gray-300 bg-white font-semibold
                                        ${store.rent_rate >= 25 ? 'text-red-600' : store.rent_rate >= 20 ? 'text-yellow-600' : 'text-green-600'}
                                      `}
                                    >
                                      {store.rent_rate.toFixed(1)}%
                                    </td>
                                    <td className="p-2 text-right border-r border-gray-300 bg-white font-semibold text-blue-600">
                                      {(() => {
                                        const turnoverData = (storeTurnoverTargetsData as any)?.store_turnover_targets?.[store.store_code];
                                        return turnoverData?.turnover_rate ? (turnoverData.turnover_rate * 100).toFixed(1) + '%' : '-';
                                      })()}
                                    </td>
                                    <td
                                      className={`
                                        p-2 text-right border-r-2 border-gray-400 bg-white font-semibold
                                        ${store.labor_rate === 0 ? 'text-gray-400' : store.labor_rate > 12 ? 'text-red-600' : store.labor_rate > 10 ? 'text-yellow-600' : 'text-green-600'}
                                      `}
                                    >
                                      {store.labor_rate > 0 ? `${store.labor_rate.toFixed(1)}%` : '-'}
                                    </td>
                                    
                                    {/* 턴오버 달성시 지표: 직접이익률, 임차료율, 인건비율 */}
                                    <td
                                      className={`
                                        p-2 text-right bg-white font-semibold
                                        ${
                                          store.turnover_rate_achievement > 0
                                            ? store.turnover_achievement_rent_rate <= 20
                                              ? 'text-green-600'
                                              : store.turnover_achievement_rent_rate <= 25
                                                ? 'text-yellow-600'
                                                : 'text-red-600'
                                            : 'text-gray-400'
                                        }
                                      `}
                                    >
                                      {store.turnover_rate_achievement > 0 ? store.turnover_achievement_rent_rate.toFixed(1) + '%' : '-'}
                                    </td>
                                  </tr>
                                </React.Fragment>
                              );
                            })}
                          </React.Fragment>
                        );
                      }).filter(Boolean);
            })()}
                    
                    {/* 전체 합계 행 */}
                    {(() => {
                      const allStoresWithTurnover = allStores.filter(s => s.turnover_rate_achievement > 0);
                      
                      // 전체 합계 계산
                      const totalNetSales = allStoresWithTurnover.reduce((sum, s) => sum + s.net_sales, 0);
                      const totalDirectProfit = allStoresWithTurnover.reduce((sum, s) => sum + s.direct_profit, 0);
                      const totalRent = allStoresWithTurnover.reduce((sum, s) => {
                        const storeRecord = (storeStatusData as any)?.categories?.[s.category]?.stores?.find((st: any) => st.shop_cd === s.store_code);
                        return sum + (storeRecord?.current?.rent || 0);
                      }, 0);
                      const totalLaborCost = allStoresWithTurnover.reduce((sum, s) => {
                        const storeRecord = (storeStatusData as any)?.categories?.[s.category]?.stores?.find((st: any) => st.shop_cd === s.store_code);
                        return sum + (storeRecord?.current?.labor_cost || 0);
                      }, 0);
                      
                      // 현재 지표 평균
                      const avgCurrentDirectProfitRate = totalNetSales > 0 ? (totalDirectProfit / totalNetSales) * 100 : 0;
                      const avgCurrentRentRate = totalNetSales > 0 ? (totalRent / totalNetSales) * 100 : 0;
                      const avgCurrentLaborRate = totalNetSales > 0 ? (totalLaborCost / totalNetSales) * 100 : 0;
                      
                      // 턴오버 달성시 합계
                      const totalTurnoverSales = allStoresWithTurnover.reduce((sum, s) => {
                        return sum + (s.turnover_target_sales > 0 ? Math.max(s.net_sales, s.turnover_target_sales) : s.net_sales);
                      }, 0);
                      const totalTurnoverDirectProfit = allStoresWithTurnover.reduce((sum, s) => sum + s.turnover_achievement_direct_profit, 0);
                      const totalTurnoverRent = totalRent; // 임차료는 고정
                      const totalTurnoverLaborCost = totalLaborCost; // 인건비는 고정
                      
                      // 턴오버 달성시 지표
                      const avgTurnoverDirectProfitRate = totalTurnoverSales > 0 ? (totalTurnoverDirectProfit / totalTurnoverSales) * 100 : 0;
                      const avgTurnoverRentRate = totalTurnoverSales > 0 ? (totalTurnoverRent / totalTurnoverSales) * 100 : 0;
                      const avgTurnoverLaborRate = totalTurnoverSales > 0 ? (totalTurnoverLaborCost / totalTurnoverSales) * 100 : 0;
                      
                      // 평균 달성률
                      const avgAchievement = allStoresWithTurnover.length > 0
                        ? allStoresWithTurnover.reduce((sum, s) => sum + s.turnover_rate_achievement, 0) / allStoresWithTurnover.length
                        : 0;
                      
                      return (
                        <tr className="bg-gradient-to-r from-blue-100 to-blue-50 border-t-4 border-blue-500 font-bold text-sm">
                          <td className="p-3 border-r border-gray-300 sticky left-0 bg-blue-100 z-10">
                            전체 합계 ({allStoresWithTurnover.length}개 매장)
                          </td>
                          <td className="p-3 border-r border-gray-300 text-blue-800">
                            <div className="flex items-center gap-2 px-2">
                              <div className="flex-1 min-w-[60px]">
                                <div className="w-full bg-gray-200 rounded-full h-4 relative overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all ${
                                      avgAchievement >= 100 ? 'bg-green-500' :
                                      avgAchievement >= 80 ? 'bg-yellow-500' :
                                      'bg-red-500'
                                    }`}
                                    style={{ 
                                      width: `${Math.min(avgAchievement, 150)}%` 
                                    }}
                                  />
                                </div>
                              </div>
                              <span className="text-xs font-semibold min-w-[45px] text-right">
                            {formatPercent(avgAchievement, 1)}
                              </span>
                            </div>
                          </td>
                          
                          {/* 현재 지표 */}
                          <td className="p-3 text-right border-r border-gray-300 bg-blue-50">
                            {formatPercent(avgCurrentDirectProfitRate, 1)}
                          </td>
                          <td className="p-3 text-right border-r border-gray-300 bg-blue-50">
                            {formatPercent(avgCurrentRentRate, 1)}
                          </td>
                          <td className="p-3 text-right border-r border-gray-300 bg-blue-50 font-semibold text-blue-800">
                            {(() => {
                              const allStoresWithRate = allStoresWithTurnover.filter(s => {
                                const turnoverData = (storeTurnoverTargetsData as any)?.store_turnover_targets?.[s.store_code];
                                return turnoverData?.turnover_rate;
                              });
                              const avgTurnoverRate = allStoresWithRate.length > 0
                                ? allStoresWithRate.reduce((sum, s) => {
                                    const turnoverData = (storeTurnoverTargetsData as any)?.store_turnover_targets?.[s.store_code];
                                    return sum + (turnoverData?.turnover_rate || 0) * 100;
                                  }, 0) / allStoresWithRate.length
                                : 0;
                              return avgTurnoverRate > 0 ? avgTurnoverRate.toFixed(1) + '%' : '-';
                            })()}
                          </td>
                          <td className="p-3 text-right border-r-2 border-gray-400 bg-blue-50">
                            {formatPercent(avgCurrentLaborRate, 1)}
                          </td>
                          
                          {/* 턴오버 달성시 지표 */}
                          <td className="p-3 text-right bg-green-50">
                            {formatPercent(avgTurnoverRentRate, 1)}
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
        {/* 홍콩 현재 영업이익/직접이익 및 턴오버 달성시 영업이익 요약 */}
                {(() => {
          // 홍콩 전체 현재 영업이익, 직접이익
          const hkCurrentOperatingProfit = (plData as any)?.current_month?.hk?.operating_profit || 0;
          const hkCurrentDirectProfit = (plData as any)?.current_month?.hk?.direct_profit || 0;
          
          // 필터링된 매장 데이터 가져오기
          let filteredStores = allStores;
          if (selectedStore !== 'ALL') {
            filteredStores = allStores.filter((s) => s.category === selectedStore);
          }
          
          // 홍콩 오프라인 매장만 필터링 (country === 'HK')
          const hkOfflineStores = filteredStores.filter((s) => {
            const storeRecord = (storeStatusData as any)?.categories?.[s.category]?.stores?.find((st: any) => st.shop_cd === s.store_code);
            return storeRecord?.country === 'HK';
          });
          
          // 홍콩 전체 직접이익 및 영업이익 (pl-data 기준)
          const hkTotalDirectProfit = (plData as any)?.current_month?.hk?.direct_profit || 0;
          const hkTotalOperatingProfit = (plData as any)?.current_month?.hk?.operating_profit || 0;
          const hkTotalSgA = (plData as any)?.current_month?.hk?.sg_a || 0;
          const hkTotalSales = (plData as any)?.current_month?.hk?.net_sales || 0;
          
          // 직접이익률 및 영업이익률 계산
          const hkCurrentDirectProfitRate = hkTotalSales > 0 ? (hkTotalDirectProfit / hkTotalSales) * 100 : 0;
          const hkCurrentOperatingProfitRate = hkTotalSales > 0 ? (hkTotalOperatingProfit / hkTotalSales) * 100 : 0;
          
          // 현재 홍콩 오프라인 직접이익 (pl-data 기준 사용)
          const currentHkOfflineDirectProfit = (plData as any)?.channel_direct_profit?.hk_offline?.direct_profit || 0;
          
          // 턴오버 달성시 매출 증가분 계산 (오프라인 매장들의 목표 매출 합계)
          const currentHkOfflineSales = hkOfflineStores.reduce((sum, s) => sum + s.net_sales, 0);
          
          // 홍콩 전체 임차료 및 인건비 계산 (오프라인 매장 합계)
          const hkTotalRent = hkOfflineStores.reduce((sum, s) => {
            const storeRecord = (storeStatusData as any)?.categories?.[s.category]?.stores?.find((st: any) => st.shop_cd === s.store_code);
            return sum + (storeRecord?.current?.rent || 0);
          }, 0);
          const hkTotalLaborCost = hkOfflineStores.reduce((sum, s) => {
            const storeRecord = (storeStatusData as any)?.categories?.[s.category]?.stores?.find((st: any) => st.shop_cd === s.store_code);
            return sum + (storeRecord?.current?.labor_cost || 0);
          }, 0);
          
          // 임차료율 및 인건비율 계산 (오프라인 매출 기준)
          const hkCurrentRentRate = currentHkOfflineSales > 0 ? (hkTotalRent / currentHkOfflineSales) * 100 : 0;
          const hkCurrentLaborCostRate = currentHkOfflineSales > 0 ? (hkTotalLaborCost / currentHkOfflineSales) * 100 : 0;
          
          // 턴오버 달성시 홍콩 오프라인 직접이익 합계 (모든 매장 포함)
          const turnoverAchievementHkOfflineDirectProfit = hkOfflineStores.reduce((sum, s) => {
            return sum + s.turnover_achievement_direct_profit;
          }, 0);
          
          // 오프라인 직접이익 증가분
          const offlineDirectProfitIncrease = turnoverAchievementHkOfflineDirectProfit - currentHkOfflineDirectProfit;
          const turnoverAchievementHkOfflineSales = hkOfflineStores.reduce((sum, s) => {
            if (s.turnover_target_sales > 0) {
              return sum + Math.max(s.net_sales, s.turnover_target_sales);
            }
            return sum + s.net_sales;
          }, 0);
          const offlineSalesIncrease = turnoverAchievementHkOfflineSales - currentHkOfflineSales;
          
          // 턴오버 달성시 홍콩 전체 매출 = 현재 전체 매출 + 오프라인 매출 증가분
          const turnoverAchievementHkTotalSales = hkTotalSales + offlineSalesIncrease;
          
          // 턴오버 달성시 홍콩 전체 직접이익 = 현재 전체 직접이익 + 오프라인 직접이익 증가분
          const turnoverAchievementHkTotalDirectProfit = hkTotalDirectProfit + offlineDirectProfitIncrease;
          
          // 턴오버 달성시 홍콩 전체 영업이익 = 턴오버 달성시 전체 직접이익 - 전체 영업비 (고정)
          const turnoverAchievementHkTotalOperatingProfit = turnoverAchievementHkTotalDirectProfit - hkTotalSgA;
          
          // 턴오버 달성시 임차료 및 인건비 (고정)
          const turnoverAchievementHkTotalRent = hkTotalRent;
          const turnoverAchievementHkTotalLaborCost = hkTotalLaborCost;
          
          // 턴오버 달성시 임차료율 및 인건비율 계산 (오프라인 매출 기준)
          const turnoverAchievementHkTotalRentRate = turnoverAchievementHkOfflineSales > 0 
            ? (turnoverAchievementHkTotalRent / turnoverAchievementHkOfflineSales) * 100 
            : 0;
          const turnoverAchievementHkTotalLaborCostRate = turnoverAchievementHkOfflineSales > 0 
            ? (turnoverAchievementHkTotalLaborCost / turnoverAchievementHkOfflineSales) * 100 
            : 0;
          
          // 턴오버 달성시 직접이익률 및 영업이익률 계산
          const turnoverAchievementHkTotalDirectProfitRate = turnoverAchievementHkTotalSales > 0 
            ? (turnoverAchievementHkTotalDirectProfit / turnoverAchievementHkTotalSales) * 100 
            : 0;
          const turnoverAchievementHkTotalOperatingProfitRate = turnoverAchievementHkTotalSales > 0 
            ? (turnoverAchievementHkTotalOperatingProfit / turnoverAchievementHkTotalSales) * 100 
            : 0;
          
          // 변화량 계산
          return null;
                })()}
              </div>
                </div>
    </div>
  );
};

export default HongKongStoreDashboard;


