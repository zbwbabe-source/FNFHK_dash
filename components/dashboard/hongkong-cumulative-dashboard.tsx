'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ComposedChart, Legend, LabelList, ReferenceLine, Cell, Layer } from 'recharts';
import { TrendingDown, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import storeAreasData from './hongkong-store-areas.json';

interface HongKongCumulativeDashboardProps {
  period?: string;
}

const HongKongCumulativeDashboard: React.FC<HongKongCumulativeDashboardProps> = ({ period = '2511' }) => {
  // 동적 데이터 로드
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [monthlyDashboardData, setMonthlyDashboardData] = useState<any>(null);  // 재고 카드용 당월 데이터
  const [plData, setPlData] = useState<any>(null);
  const [plStoreData, setPlStoreData] = useState<any>(null);
  const [storeStatusData, setStoreStatusData] = useState<any>(null);
  const [ceoInsightsData, setCeoInsightsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // CEO 인사이트 편집 상태 - 각 항목별로 관리
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [ceoInsights, setCeoInsights] = useState<Record<string, string>>({});
  // 카드 전체 편집 모드
  const [editingCard, setEditingCard] = useState<string | null>(null);
  
  // Period에서 년도와 월 추출
  const getYearFromPeriod = (periodStr: string) => {
    const year = parseInt(periodStr.substring(0, 2));
    return 2000 + year;
  };
  
  const getMonthFromPeriod = (periodStr: string) => {
    return parseInt(periodStr.substring(2, 4));
  };
  
  const currentYear = getYearFromPeriod(period);
  const currentMonth = getMonthFromPeriod(period);
  
  // 월 이름을 영어로 변환
  const monthNames: { [key: number]: string } = {
    1: 'january', 2: 'february', 3: 'march', 4: 'april', 5: 'may', 6: 'june',
    7: 'july', 8: 'august', 9: 'september', 10: 'october', 11: 'november', 12: 'december'
  };
  const currentMonthKey = monthNames[currentMonth] || 'october';

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // 캐시 무효화를 위한 타임스탬프 추가
        const cacheBuster = `?_=${Date.now()}`;
        
        // Dashboard 데이터 로드 (누적)
        try {
        const dashboardResponse = await fetch(`/dashboard/hongkong-dashboard-cumulative-${period}.json${cacheBuster}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        if (!dashboardResponse.ok) {
            console.error(`❌ 누적 대시보드 파일 로드 실패: ${dashboardResponse.status} ${dashboardResponse.statusText}`);
            console.error(`파일 경로: /dashboard/hongkong-dashboard-cumulative-${period}.json`);
            throw new Error(`Failed to load cumulative dashboard data for period ${period}: ${dashboardResponse.status} ${dashboardResponse.statusText}`);
        }
        const dashData = await dashboardResponse.json();
          console.log('✅ 누적 대시보드 데이터 로드 성공:', {
            period,
            has_sales_summary: !!dashData?.sales_summary,
            has_season_summary: !!dashData?.season_summary
          });
        setDashboardData(dashData);
        } catch (fetchError: any) {
          console.error('❌ 누적 대시보드 데이터 fetch 실패:', fetchError);
          console.error('파일 경로: /dashboard/hongkong-dashboard-cumulative-${period}.json');
          throw fetchError;
        }
        
        // PL 데이터 로드 (당월 - 영업비/재고 카드용)
        let plResponse = await fetch(`/dashboard/hongkong-pl-data-${period}.json`);
        
        // period별 PL 파일이 없으면 기본 파일 사용
        if (!plResponse.ok) {
          plResponse = await fetch('/dashboard/hongkong-pl-data.json');
        }
        
        if (plResponse.ok) {
          const plDataResult = await plResponse.json();
          setPlData(plDataResult);
        }
        
        // 당월 대시보드 데이터 로드 (재고 카드용)
        const monthlyDashboardResponse = await fetch(`/dashboard/hongkong-dashboard-data-${period}.json${cacheBuster}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        if (monthlyDashboardResponse.ok) {
          const monthlyDashData = await monthlyDashboardResponse.json();
          console.log('✅ monthlyDashboardData 로드됨:', {
            has_monthly_channel_data: !!monthlyDashData?.monthly_channel_data,
            has_monthly_item_data: !!monthlyDashData?.monthly_item_data,
            has_monthly_inventory_data: !!monthlyDashData?.monthly_inventory_data,
            monthly_channel_data_length: monthlyDashData?.monthly_channel_data?.length || 0,
            monthly_item_data_length: monthlyDashData?.monthly_item_data?.length || 0,
            monthly_inventory_data_length: monthlyDashData?.monthly_inventory_data?.length || 0
          });
          setMonthlyDashboardData(monthlyDashData);
        } else {
          console.error('❌ monthlyDashboardResponse 실패:', monthlyDashboardResponse.status, monthlyDashboardResponse.statusText);
        }
        
        // 매장별 PL 데이터 로드 (직접비 상세 - 당월)
        const plStoreResponse = await fetch(`/dashboard/hongkong-pl-stores-${period}.json`);
        if (plStoreResponse.ok) {
          const plStoreDataResult = await plStoreResponse.json();
          // 누적 데이터도 로드
          const plCumulativeResponse = await fetch(`/dashboard/hongkong-pl-cumulative-${period}.json`);
          if (plCumulativeResponse.ok) {
            const plCumulativeDataResult = await plCumulativeResponse.json();
            // 당월 데이터와 누적 데이터 합치기
            setPlStoreData({
              ...plStoreDataResult,
              cumulative_stores: plCumulativeDataResult.cumulative_stores,
              cumulative_opex: plCumulativeDataResult.cumulative_opex
            });
          } else {
            setPlStoreData(plStoreDataResult);
          }
        }
        
        // 매장 상태 데이터 로드
        let storeStatusResponse = await fetch(`/dashboard/hongkong-store-status-${period}.json`);
        
        // period별 파일이 없으면 기본 파일 사용
        if (!storeStatusResponse.ok) {
          storeStatusResponse = await fetch('/dashboard/hongkong-store-status.json');
        }
        
        if (storeStatusResponse.ok) {
          const storeStatusDataResult = await storeStatusResponse.json();
          setStoreStatusData(storeStatusDataResult);
        }
        
        // CEO 인사이트 데이터 로드 (period별)
        const ceoInsightsResponse = await fetch(`/dashboard/hongkong-ceo-insights-${period}.json`);
        if (ceoInsightsResponse.ok) {
          const ceoInsightsResult = await ceoInsightsResponse.json();
          setCeoInsightsData(ceoInsightsResult);
        }
        
      } catch (error: any) {
        console.error('❌ 누적 대시보드 데이터 로딩 에러:', error);
        console.error('에러 상세:', {
          message: error?.message,
          name: error?.name,
          stack: error?.stack,
          period
        });
        // alert는 한 번만 표시하도록 개선
        const errorMessage = error?.message || String(error);
        alert(`누적 대시보드 데이터를 불러올 수 없습니다.\n\n에러: ${errorMessage}\n\n파일 경로: /dashboard/hongkong-dashboard-cumulative-${period}.json\n\nPython 스크립트로 JSON 파일을 생성했는지 확인해주세요.`);
        // 폴백: 기본 데이터 로드 시도
        try {
          const fallbackDashboard = await fetch('/dashboard/hongkong-dashboard-data.json');
          const fallbackPl = await fetch('/dashboard/hongkong-pl-data.json');
          
          if (fallbackDashboard.ok) {
            const dashData = await fallbackDashboard.json();
            setDashboardData(dashData);
          }
          if (fallbackPl.ok) {
            const plDataResult = await fallbackPl.json();
            setPlData(plDataResult);
          }
        } catch (fallbackError) {
          console.error('Error loading fallback data:', fallbackError);
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
    
    // 저장된 CEO 인사이트 불러오기
    const savedInsights = localStorage.getItem(`ceo-insights-${period}`);
    if (savedInsights) {
      try {
        setCeoInsights(JSON.parse(savedInsights));
      } catch (e) {
        console.error('Error loading saved insights:', e);
      }
    }
  }, [period]);
  
  // CEO 인사이트 항목 저장 함수
  const saveInsightItem = (itemId: string, content: string) => {
    const updated = { ...ceoInsights, [itemId]: content };
    setCeoInsights(updated);
    localStorage.setItem(`ceo-insights-${period}`, JSON.stringify(updated));
    setEditingItemId(null);
  };

  // 카드 전체 저장 함수
  const saveCardFull = (cardId: string, content: string) => {
    const updated = { ...ceoInsights, [cardId]: content };
    setCeoInsights(updated);
    localStorage.setItem(`ceo-insights-${period}`, JSON.stringify(updated));
    setEditingCard(null);
  };

  // DataStatusBadge 컴포넌트 (당월 대시보드와 동일)
  const DataStatusBadge = ({ status, label }: { status: 'connected' | 'hardcoded', label: string }) => {
    return (
      <span className={`absolute top-2 right-2 px-2 py-0.5 text-[9px] font-semibold rounded-full ${
        status === 'connected' 
          ? 'bg-green-100 text-green-700 border border-green-300' 
          : 'bg-orange-100 text-orange-700 border border-orange-300'
      }`}>
        {status === 'connected' ? '✓ CSV 연결' : '⚠ 수동 입력'}
      </span>
    );
  };

  // 숫자 포맷팅 헬퍼 함수들 (컴포넌트 전체에서 사용)
  const formatNumber = (num: number | undefined | null, decimals: number = 0) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return num.toLocaleString('ko-KR', { maximumFractionDigits: decimals });
  };

  const formatPercent = (num: number | undefined | null, decimals: number = 0) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return Number(num).toFixed(decimals);
  };

  // ============================================================
  // CEO 인사이트 자동 생성 함수 - Executive Summary 스타일
  // ============================================================
  const generateExecutiveSummary = useMemo(() => {
    if (!plData || !dashboardData) return null;

    const pl = plData?.cumulative?.total || {};
    const plYoy = plData?.cumulative?.yoy || {};
    const plChange = plData?.cumulative?.change || {};
    const plPrev = plData?.cumulative?.prev_cumulative?.total || {};
    const salesSummary = dashboardData?.sales_summary || {};
    const seasonSales = dashboardData?.season_sales || {};
    const endingInventory = dashboardData?.ending_inventory || {};
    const pastSeasonFW = endingInventory?.past_season_fw || {};
    const countryChannel = dashboardData?.country_channel_summary || {};
    const hkOnline = countryChannel?.HK_Online || {};
    const mcRetail = countryChannel?.MO_Retail || {};
    const mcOutlet = countryChannel?.MO_Outlet || {};

    // 핵심 성과 분석
    const generatePerformanceInsight = () => {
      const operatingProfit = pl?.operating_profit || 0;
      const prevOperatingProfit = plPrev?.operating_profit || 0;
      const salesYoy = salesSummary?.total_yoy || 0;
      const profitImproved = operatingProfit > prevOperatingProfit;
      
      // 핵심 메시지 생성
      let keyMessage = '';
      let keyDrivers: string[] = [];
      
      if (operatingProfit >= 0) {
        if (prevOperatingProfit < 0) {
          keyMessage = '당월 영업흑자 전환 달성 - 매출 성장과 비용 효율화가 동시 기여';
          keyDrivers = ['적자→흑자 전환', '영업이익률 개선'];
        } else {
          keyMessage = `당월 영업흑자 ${formatNumber(operatingProfit)}K 기록 - 수익성 안정 기조 유지`;
          keyDrivers = ['흑자 지속', profitImproved ? '이익 증가' : '이익 감소 주의'];
        }
      } else {
        if (profitImproved) {
          keyMessage = `당월 영업적자 ${formatNumber(Math.abs(operatingProfit))}K - 전월 대비 적자폭 축소, 개선 추세`;
          keyDrivers = ['적자 축소', '손익분기 접근 중'];
        } else {
          keyMessage = `당월 영업적자 ${formatNumber(Math.abs(operatingProfit))}K - 적자폭 확대, 비용 구조 점검 시급`;
          keyDrivers = ['적자 확대', '긴급 대응 필요'];
        }
      }

      // 시사점 생성
      let implication = '';
      if (operatingProfit >= 0 && salesYoy >= 100) {
        implication = '매출과 수익성이 동반 성장하는 건전한 성장 패턴. 현 전략 유지하며 마진 관리에 집중 권고.';
      } else if (operatingProfit >= 0 && salesYoy < 100) {
        implication = '매출 역성장 속 흑자 유지는 비용 절감 효과. 단, 매출 회복 전략 병행 필요.';
      } else if (operatingProfit < 0 && salesYoy >= 100) {
        implication = '매출 성장에도 적자 지속은 비용 구조 문제. 고정비 절감 및 마진 개선 우선 검토.';
      } else {
        implication = '매출 감소와 적자 동시 발생은 사업 구조적 이슈. 채널/상품 포트폴리오 전면 재검토 권고.';
      }

      return { keyMessage, keyDrivers, implication };
    };

    // 리스크 분석
    const generateRiskInsight = () => {
      const risks: Array<{
        title: string;
        severity: 'high' | 'medium' | 'low';
        impact: string;
        action: string;
      }> = [];

      // 1. 과시즌 재고 리스크
      const pastSeasonYoy = pastSeasonFW?.total?.yoy || 0;
      if (pastSeasonYoy > 120) {
        risks.push({
          title: '과시즌 재고 급증',
          severity: pastSeasonYoy > 150 ? 'high' : 'medium',
          impact: `재고자산 ${formatNumber(pastSeasonFW?.total?.current || 0)}K (YOY ${formatPercent(pastSeasonYoy)}%) - 현금흐름 압박 및 진부화 손실 우려`,
          action: '즉시 판촉 강화, 할인 정책 재검토, 불용재고 처분 계획 수립'
        });
      }

      // 2. 마카오 채널 리스크
      const mcCurrentTotal = (mcRetail?.current?.net_sales || 0) + (mcOutlet?.current?.net_sales || 0);
      const mcPreviousTotal = (mcRetail?.previous?.net_sales || 0) + (mcOutlet?.previous?.net_sales || 0);
      const mcYoy = mcPreviousTotal > 0 ? (mcCurrentTotal / mcPreviousTotal) * 100 : 0;
      if (mcYoy < 100) {
        risks.push({
          title: '마카오 채널 부진',
          severity: mcYoy < 85 ? 'high' : 'medium',
          impact: `매출 ${formatNumber(mcCurrentTotal / 1000)}K (YOY ${formatPercent(mcYoy)}%) - 지역 매출 다변화 필요`,
          action: '마카오 시장 환경 분석, 현지 프로모션 강화, 관광객 타겟 마케팅'
        });
      }

      // 3. 영업비 증가 리스크
      const sgaYoy = plYoy?.sg_a || 0;
      const salesYoy = salesSummary?.total_yoy || 0;
      if (sgaYoy > salesYoy && sgaYoy > 105) {
        risks.push({
          title: '영업비 증가율 > 매출 증가율',
          severity: (sgaYoy - salesYoy) > 15 ? 'high' : 'medium',
          impact: `영업비 YOY ${formatPercent(sgaYoy)}% vs 매출 YOY ${formatPercent(salesYoy)}% - 비용 효율성 저하`,
          action: '비용 항목별 분석, 비효율 지출 식별, 고정비 구조 개선'
        });
      }

      // 4. 적자 리스크 (영업이익 적자인 경우)
      const operatingProfit = pl?.operating_profit || 0;
      if (operatingProfit < 0) {
        risks.push({
          title: '영업손실 지속',
          severity: operatingProfit < -500 ? 'high' : 'medium',
          impact: `당월 ${formatNumber(operatingProfit)}K 적자 - 지속시 자본잠식 우려`,
          action: '손익분기 분석, 채널/매장별 수익성 점검, 구조조정 검토'
        });
      }

      // 핵심 메시지 생성
      const highRisks = risks.filter(r => r.severity === 'high');
      let keyMessage = '';
      if (highRisks.length > 0) {
        keyMessage = `긴급 대응 필요: ${highRisks.map(r => r.title).join(', ')} - 경영진 즉각 개입 권고`;
      } else if (risks.length > 0) {
        keyMessage = `주의 관찰 항목 ${risks.length}건 - 월간 모니터링 강화 필요`;
      } else {
        keyMessage = '주요 리스크 지표 안정권 - 현 운영 기조 유지';
      }

      return { keyMessage, risks };
    };

    // 전략 방향 분석
    const generateStrategyInsight = () => {
      const operatingProfit = pl?.operating_profit || 0;
      const salesYoy = salesSummary?.total_yoy || 0;
      const onlineYoy = hkOnline?.yoy || 0;
      const pastSeasonYoy = pastSeasonFW?.total?.yoy || 0;

      // 핵심 메시지
      let keyMessage = '';
      if (operatingProfit >= 0 && salesYoy >= 100) {
        keyMessage = '성장-수익 균형 모드: 현 전략 유지하며 시장 점유율 확대에 집중';
      } else if (operatingProfit >= 0 && salesYoy < 100) {
        keyMessage = '수익 방어 모드: 마진 관리 우선, 매출 회복 전략 병행 추진';
      } else if (operatingProfit < 0 && salesYoy >= 100) {
        keyMessage = '구조 개선 모드: 매출 성장을 레버리지로 비용 효율화 가속';
      } else {
        keyMessage = '턴어라운드 모드: 핵심 채널/상품 집중, 비핵심 영역 과감한 구조조정';
      }

      // 시간축별 전략
      const strategies = {
        immediate: [] as string[],
        shortTerm: [] as string[],
        midTerm: [] as string[]
      };

      // 즉시 실행 (이번 달)
      if (pastSeasonYoy > 130) {
        strategies.immediate.push('과시즌 재고 집중 판촉 (목표: 재고 20% 감축)');
      }
      if (operatingProfit < 0) {
        strategies.immediate.push('비용 긴급 점검 및 불요불급 지출 동결');
      }
      strategies.immediate.push('월말 재고실사 및 판매율 점검');

      // 단기 (분기)
      if (onlineYoy > 110) {
        strategies.shortTerm.push(`온라인 채널 확대 투자 (현 YOY ${formatPercent(onlineYoy)}% 성장 가속)`);
      }
      strategies.shortTerm.push('26SS 시즌 상품 기획 및 발주 확정');
      strategies.shortTerm.push('매장별 손익분석 기반 효율화 계획 수립');

      // 중기 (반기)
      strategies.midTerm.push('채널 포트폴리오 최적화 (온/오프라인 비중 재조정)');
      strategies.midTerm.push('마카오 시장 전략 재검토');
      strategies.midTerm.push('26년 사업계획 반영 및 투자 우선순위 조정');

      return { keyMessage, strategies };
    };

    return {
      performance: generatePerformanceInsight(),
      risk: generateRiskInsight(),
      strategy: generateStrategyInsight()
    };
  }, [plData, dashboardData]);

  // Period 표시를 위한 포맷팅
  const periodYear = period.substring(0, 2);
  const periodMonth = period.substring(2, 4);
  const periodLabel = `${periodYear}년 ${periodMonth}월`;

  // 전월 period 계산
  const getPrevMonthPeriod = (currentPeriod: string) => {
    const year = parseInt(currentPeriod.substring(0, 2));
    const month = parseInt(currentPeriod.substring(2, 4));
    if (month === 1) {
      return `${(year - 1).toString().padStart(2, '0')}12`;
    }
    return `${year.toString().padStart(2, '0')}${(month - 1).toString().padStart(2, '0')}`;
  };
  
  const prevMonthPeriod = getPrevMonthPeriod(period);
  const [prevMonthData, setPrevMonthData] = useState<any>(null);

  // 전월 데이터 로드
  useEffect(() => {
    fetch(`/dashboard/hongkong-dashboard-data-${prevMonthPeriod}.json`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setPrevMonthData(data))
      .catch(err => console.log('전월 데이터 없음:', err));
  }, [prevMonthPeriod]);

  // 보고일자 관리 (localStorage에서 읽기)
  const [reportDate, setReportDate] = useState('2024-11-17');
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDate = localStorage.getItem('reportDate');
      if (savedDate) {
        setReportDate(savedDate);
      }
    }
  }, []);

  // 카테고리를 짧은 기호와 색상으로 변환하는 헬퍼 함수
  const getCategoryBadge = (category: string) => {
    const badges: Record<string, { symbol: string; color: string; text: string }> = {
      'profit_improving': { symbol: '흑↑', color: 'bg-green-300', text: 'text-green-800' },
      'profit_deteriorating': { symbol: '흑↓', color: 'bg-blue-300', text: 'text-blue-800' },
      'loss_improving': { symbol: '적↑', color: 'bg-amber-300', text: 'text-amber-800' },
      'loss_deteriorating': { symbol: '적↓', color: 'bg-red-300', text: 'text-red-800' }
    };
    return badges[category] || { symbol: '-', color: 'bg-gray-300', text: 'text-gray-800' };
  };

  // 날짜 포맷 함수 (년도 포함)
  const formatReportDateWithYear = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}년 ${month}월 ${day}일`;
  };

  useEffect(() => {
    document.title = `홍콩법인 ${periodLabel} 경영실적`;
  }, [periodLabel]);

  // ============================================================
  // STATE 관리 - 상세보기 토글 상태
  // ============================================================
  const [showSalesDetail, setShowSalesDetail] = useState(true);
  const [showProfitDetail, setShowProfitDetail] = useState(true);
  const [showItemProfitDetail, setShowItemProfitDetail] = useState(false);
  const [showExpenseDetail, setShowExpenseDetail] = useState(true);
  const [showOtherDetail, setShowOtherDetail] = useState(false);  // 당월 기타 상세
  const [showOtherDetailCumulative, setShowOtherDetailCumulative] = useState(false);  // 누적 기타 상세
  const [showDiscountDetail, setShowDiscountDetail] = useState(true);
  const [showStoreDetail, setShowStoreDetail] = useState(true);
  const [showSeasonSalesDetail, setShowSeasonSalesDetail] = useState(true);
  const [showAccInventoryDetail, setShowAccInventoryDetail] = useState(true);
  const [showEndInventoryDetail, setShowEndInventoryDetail] = useState(true);
  const [showEndSalesDetail, setShowEndSalesDetail] = useState(true);
  const [showPastSeasonDetail, setShowPastSeasonDetail] = useState(true);
  const [showCurrentSeasonDetail, setShowCurrentSeasonDetail] = useState(true);
  const [showDiscoveryDetail, setShowDiscoveryDetail] = useState(false);
  const [showStoreCalcDetail, setShowStoreCalcDetail] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [expenseType, setExpenseType] = useState<'당월' | '누적'>('누적');  // 누적 대시보드는 누적이 기본
  const [opexType, setOpexType] = useState<'당월' | '누적'>('누적');  // 누적 대시보드는 누적이 기본
  const [showDirectCostItemAnalysis, setShowDirectCostItemAnalysis] = useState<{[key: string]: boolean}>({});
  const [showOperatingExpenseItemAnalysis, setShowOperatingExpenseItemAnalysis] = useState<{[key: string]: boolean}>({});
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);  // 선택된 채널 (범례 클릭 시)
  const [salesPriceType, setSalesPriceType] = useState<'실판' | '택가' | '할인율'>('실판');  // 아이템별 추세 가격 타입
  
  // 초기 로딩 시 실판가 강제 설정
  useEffect(() => {
    setSalesPriceType('실판');
  }, [period]);

  // 클라이언트 사이드 렌더링 확인
  useEffect(() => {
    setIsClient(true);
  }, []);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);  // 선택된 아이템 (범례 클릭 시)
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<string | null>(null);  // 선택된 재고 아이템 (범례 클릭 시)
  const [selectedChannelTrend, setSelectedChannelTrend] = useState<string | null>(null);  // 채널별 추세 선택
  const [selectedSalesItem, setSelectedSalesItem] = useState<string | null>(null);  // 아이템별 매출 선택
  const [hoveredBar, setHoveredBar] = useState<{month: string, data: any, x: number, y: number} | null>(null);  // 툴팁 상태
  const [isClient, setIsClient] = useState(false);  // 클라이언트 사이드 렌더링 확인
  const [expandedStoreCategories, setExpandedStoreCategories] = useState<{[key: string]: {stores: boolean, rentLabor: boolean}}>({
    profit_improving: {stores: true, rentLabor: false},  // 매장별 상세: 펼침, 임차료/인건비율 상세: 접힘
    profit_deteriorating: {stores: true, rentLabor: false},  // 매장별 상세: 펼침, 임차료/인건비율 상세: 접힘
    loss_improving: {stores: true, rentLabor: false},  // 매장별 상세: 펼침, 임차료/인건비율 상세: 접힘
    loss_deteriorating: {stores: true, rentLabor: false},  // 매장별 상세: 펼침, 임차료/인건비율 상세: 접힘
    mc_summary: {stores: true, rentLabor: false}  // 매장별 상세: 펼침, 임차료/인건비율 상세: 접힘
  });
  const [expandedSummary, setExpandedSummary] = useState({
    calculationBasis: false,
    hkDetails: false,
    mcDetails: false,
    excludedStores: false,
    insights: false
  });
  const [showYoyTrend, setShowYoyTrend] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`hk_store_ai_analysis_${period}`);
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });
  const [editingStoreCode, setEditingStoreCode] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [yoyTrendSummary, setYoyTrendSummary] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`hk_yoy_trend_summary_${period}`);
      return saved || '';
    }
    return '';
  });
  const [isEditingYoySummary, setIsEditingYoySummary] = useState(false);
  const [showStockWeeksModal, setShowStockWeeksModal] = useState(false);
  const [showStagnantInventoryModal, setShowStagnantInventoryModal] = useState(false);
  const [showPastSeasonDetailModal, setShowPastSeasonDetailModal] = useState(false);
  const [stagnantModalView, setStagnantModalView] = useState<'detail' | 'stagnant'>('detail'); // 'detail' = 과시즌F 상세분석, 'stagnant' = 정체재고
  const [showPastSeasonSalesDetail, setShowPastSeasonSalesDetail] = useState(true);

  // 정체재고 데이터 (매출/재고 비율 기준)
  const filteredStagnantInventory = useMemo(() => {
    const stagnant24F_sales = (dashboardData as any)?.stagnant_inventory?.['24F'] || [];
    const stagnant23F_sales = (dashboardData as any)?.stagnant_inventory?.['23F'] || [];
    const stagnant22F_sales = (dashboardData as any)?.stagnant_inventory?.['22F~'] || [];
    
    return {
      '24F': stagnant24F_sales,
      '23F': stagnant23F_sales,
      '22F~': stagnant22F_sales
    };
  }, [dashboardData]);

  // ============================================================
  // 헬퍼 함수
  // ============================================================
  const toggleAllDetails = () => {
    const newState = !showSalesDetail;
    setShowSalesDetail(newState);
    setShowProfitDetail(newState);
    setShowExpenseDetail(newState);
    setShowStoreDetail(newState);
    setShowDiscountDetail(newState);
    setShowSeasonSalesDetail(newState);
    setShowCurrentSeasonDetail(newState);
    setShowAccInventoryDetail(newState);
    setShowEndInventoryDetail(newState);
    setShowPastSeasonDetail(newState);
  };

  const toggleActionItem = (index: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // ============================================================
  // 데이터 추출
  // ============================================================
  // 디버깅: 데이터 확인
  useEffect(() => {
    console.log('dashboardData:', dashboardData);
    console.log('plData:', plData);
    console.log('storeStatusData:', storeStatusData);
    console.log('prev_monthly_inventory_data:', (dashboardData as any)?.prev_monthly_inventory_data);
    console.log('prev_monthly_inventory_data 길이:', ((dashboardData as any)?.prev_monthly_inventory_data || []).length);
    const prev2401 = ((dashboardData as any)?.prev_monthly_inventory_data || []).find((p: any) => p.period === '2401');
    console.log('2401월 모자 데이터:', prev2401?.모자);
  }, []);
  
  const salesSummary = dashboardData?.sales_summary || {};
  const countryChannel = dashboardData?.country_channel_summary || {};
  // 전체요약페이지와 동일한 데이터 소스 사용: monthlyDashboardData?.offline_store_efficiency (hongkong-dashboard-data-${period}.json)
  // 하지만 monthlyDashboardData에는 sales_per_pyeong_per_day가 없으므로, 채널별 평당매출/일과 YOY를 직접 계산
  const monthlyOfflineEfficiency = monthlyDashboardData?.offline_store_efficiency || {};
  const cumulativeOfflineEfficiency = dashboardData?.offline_store_efficiency || {};
  
  // 전체요약페이지와 동일한 데이터 소스 사용: monthlyDashboardData?.store_summary (hongkong-dashboard-data-${period}.json)
  // 채널별 면적 계산을 위해 먼저 선언
  const storeSummaryForArea = monthlyDashboardData?.store_summary || dashboardData?.store_summary;
  const storeAreas = (storeAreasData as any)?.store_areas || {};
  
  // 채널별 면적 계산 (전체요약페이지와 동일한 기준으로 재계산)
  const calculateChannelArea = (country: string, channel: string, isPrevious: boolean = false) => {
    let area = 0;
    if (storeSummaryForArea) {
      Object.keys(storeSummaryForArea).forEach((storeCode) => {
        const store = storeSummaryForArea[storeCode];
        
        // M10A는 M10에 합쳐서 계산하므로 건너뛰기
        if (storeCode === 'M10A') {
          return;
        }
        
        // 국가 필터 (HK 또는 MO)
        const isTargetCountry = (country === 'HK' && storeCode.startsWith('M') && !storeCode.startsWith('MC')) ||
                                 (country === 'MO' && storeCode.startsWith('MC'));
        
        // 채널 필터
        const isTargetChannel = store?.channel === channel;
        
        // 매출 필터 (현재 또는 전년)
        const netSales = isPrevious ? (store?.previous?.net_sales || 0) : (store?.current?.net_sales || 0);
        
        // 홍콩+마카오, MLB 브랜드만, 온라인 제외, 해당 채널만
        if (store?.brand === 'MLB' && isTargetCountry && isTargetChannel && netSales > 0) {
          const storeArea = storeAreas[storeCode] || 0;
          
          // 폐점이면서 매출이 매우 적은 매장 제외
          if (store?.closed === true && storeArea > 0) {
            const salesPerPyeong = (netSales / 1000) / storeArea;
            if (salesPerPyeong < 1) {
              return;
            }
          }
          
          if (storeArea > 0) {
            area += storeArea;
          }
        }
      });
    }
    return area;
  };
  
  // 누적 일수 계산
  const getCumulativeDays = (year: number, month: number) => {
    const fullYear = 2000 + year;
    let totalDays = 0;
    for (let m = 1; m <= month; m++) {
      totalDays += new Date(fullYear, m, 0).getDate();
    }
    return totalDays;
  };
  const cumulativeDays = getCumulativeDays(currentYear, currentMonth);
  
  // 채널별 평당매출/일과 YOY 계산 (면적 재계산)
  const channelEfficiencyWithPyeong: any = {};
  if (monthlyOfflineEfficiency?.by_channel) {
    Object.entries(monthlyOfflineEfficiency.by_channel).forEach(([key, channel]: [string, any]) => {
      const country = channel?.country === 'HK' ? 'HK' : 'MO';
      const channelType = channel?.channel || 'Retail';
      
      // 누적 데이터에서 해당 채널의 누적 매출 가져오기
      const cumulativeChannel = cumulativeOfflineEfficiency?.by_channel?.[key];
      const currentNetSales = cumulativeChannel?.current?.net_sales || 0; // HKD 단위
      const previousNetSales = cumulativeChannel?.previous?.net_sales || 0; // HKD 단위
      
      // 면적 재계산 (전체요약페이지와 동일한 기준)
      const currentArea = calculateChannelArea(country, channelType, false);
      const previousArea = calculateChannelArea(country, channelType, true);
      
      // 평당매출/일 계산: (누적 매출 / 면적) / 누적 일수
      const currentPyeongPerDay = (currentArea > 0 && cumulativeDays > 0) 
        ? (currentNetSales / currentArea) / cumulativeDays 
        : 0;
      const previousPyeongPerDay = (previousArea > 0 && cumulativeDays > 0) 
        ? (previousNetSales / previousArea) / cumulativeDays 
        : 0;
      
      // YOY 계산
      const pyeongYoy = previousPyeongPerDay > 0 ? (currentPyeongPerDay / previousPyeongPerDay) * 100 : 0;
      
      // 디버깅: 채널별 면적 및 평당매출 계산 확인
      console.log(`🔍 [${country} ${channelType}] 면적 및 평당매출 재계산:`, {
        '현재 면적': currentArea.toFixed(2) + '평',
        '전년 면적': previousArea.toFixed(2) + '평',
        '현재 누적 매출': (currentNetSales / 1000).toFixed(2) + 'K HKD',
        '전년 누적 매출': (previousNetSales / 1000).toFixed(2) + 'K HKD',
        '누적 일수': cumulativeDays + '일',
        '현재 평당매출/일': currentPyeongPerDay.toFixed(1) + ' HKD/평/일',
        '전년 평당매출/일': previousPyeongPerDay.toFixed(1) + ' HKD/평/일',
        'YOY': pyeongYoy.toFixed(2) + '%'
      });
      
      channelEfficiencyWithPyeong[key] = {
        ...channel,
        current: {
          ...channel.current,
          total_area: currentArea,
          sales_per_pyeong_per_day: currentPyeongPerDay
        },
        previous: {
          ...channel.previous,
          total_area: previousArea,
          sales_per_pyeong_per_day: previousPyeongPerDay
        },
        yoy: pyeongYoy  // 평당매출/일 기준 YOY
      };
    });
  }
  
  // 전체 YOY도 누적 데이터에서 가져오기
  const totalYoy = cumulativeOfflineEfficiency?.total?.yoy || 0;
  
  const offlineEfficiency = {
    total: {
      ...monthlyOfflineEfficiency.total,
      yoy: totalYoy  // 누적 데이터의 전체 YOY 사용
    },
    by_channel: channelEfficiencyWithPyeong
  };
  
  // 디버깅: offline_store_efficiency 데이터 소스 확인
  const byChannelValues = offlineEfficiency?.by_channel ? Object.values(offlineEfficiency.by_channel) : [];
  const sampleChannel = byChannelValues.length > 0 ? (byChannelValues[0] as any) : null;
  const sampleChannelYoy = sampleChannel?.yoy !== undefined ? sampleChannel.yoy.toFixed(2) + '%' : 'N/A';
  console.log('🔍 offline_store_efficiency 데이터 소스:', {
    has_monthly_offline_efficiency: !!monthlyOfflineEfficiency,
    has_cumulative_offline_efficiency: !!cumulativeOfflineEfficiency,
    by_channel_keys: Object.keys(offlineEfficiency?.by_channel || {}),
    total_yoy: totalYoy.toFixed(2) + '%',
    sample_channel_yoy: sampleChannelYoy
  });
  
  const storeEfficiencySummary = offlineEfficiency?.total;
  const totalStoreCurrent = storeEfficiencySummary?.current?.store_count ?? storeStatusData?.summary?.total_stores ?? 0;
  const totalStorePrevious = storeEfficiencySummary?.previous?.store_count ?? offlineEfficiency?.total?.previous?.store_count ?? storeStatusData?.summary?.total_stores ?? 0;
  const totalSalesPerStore = storeEfficiencySummary?.current?.sales_per_store ?? storeStatusData?.summary?.sales_per_store ?? 0;
  const prevSalesPerStore = storeEfficiencySummary?.previous?.sales_per_store ?? offlineEfficiency?.total?.previous?.sales_per_store ?? storeStatusData?.summary?.sales_per_store ?? 0;
  const totalSalesPerStoreYoy = offlineEfficiency?.total?.yoy ?? (prevSalesPerStore ? (totalSalesPerStore / prevSalesPerStore) * 100 : 0);

  // 평당매출 계산 (누적) - 홍콩+마카오, 온라인 제외 - 전체요약페이지와 동일한 로직
  // storeAreas는 위에서 이미 선언됨
  const currentMonthDays = new Date(currentYear, currentMonth, 0).getDate(); // 해당 월의 일수
  
  // 홍콩+마카오 오프라인 매출 (누적 PL 데이터 사용) - 전체요약페이지와 동일
  const hkMcOfflineSales = (plData?.cumulative?.hk?.net_sales || 0) + (plData?.cumulative?.mc?.net_sales || 0); // K HKD
  const hkMcOfflineSalesPrev = (plData?.cumulative?.prev_cumulative?.hk?.net_sales || 0) + (plData?.cumulative?.prev_cumulative?.mc?.net_sales || 0); // K HKD (전년)
  
  // 면적 계산: 홍콩+마카오, MLB 브랜드만, M10A 제외, 온라인 제외, 폐점+저매출 매장 제외 - 전체요약페이지와 완전히 동일
  // 전체요약페이지는 hongkong-dashboard-data-${period}.json의 store_summary를 사용하므로, 동일한 데이터 소스 사용
  const isHongKongOrMacauStore = (storeCode: string): boolean => {
    return storeCode.startsWith('M');
  };
  
  let totalArea = 0;
  const storesWithArea: string[] = [];
  const storesWithoutArea: string[] = [];
  
  // storeSummaryForArea는 위에서 이미 선언됨
  
  if (storeSummaryForArea) {
    Object.keys(storeSummaryForArea).forEach((storeCode) => {
      const store = storeSummaryForArea[storeCode];
      
      // M10A는 M10에 합쳐서 계산하므로 건너뛰기
      if (storeCode === 'M10A') {
        return;
      }
      
      // 홍콩+마카오, MLB 브랜드만, 온라인 제외, 오프라인만 (Retail, Outlet)
      if (store?.brand === 'MLB' && isHongKongOrMacauStore(storeCode) && store?.channel !== 'Online' && (store?.current?.net_sales || 0) > 0) {
        const area = storeAreas[storeCode] || 0;
        
        // 폐점이면서 매출이 매우 적은 매장 제외 (정리 매출만 있는 경우)
        // 평당매출이 1 K HKD/평 미만이면 제외
          if (store?.closed === true && area > 0) {
          const salesPerPyeong = ((store.current.net_sales || 0) / 1000) / area;
          if (salesPerPyeong < 1) {
            return; // 폐점 + 저매출 매장 제외
          }
          }
        
        if (area > 0) {
          totalArea += area;
          storesWithArea.push(storeCode);
        } else {
          storesWithoutArea.push(storeCode);
        }
      }
    });
  }
  
  // 디버깅: 면적 계산 확인 (전체요약페이지와 동일한 로그)
  console.log('=== [누적 대시보드] 홍콩+마카오 오프라인 면적 계산 (평당매출용, 온라인만 제외) ===');
  console.log('데이터 소스:', monthlyDashboardData?.store_summary ? 'monthlyDashboardData (hongkong-dashboard-data)' : 'dashboardData (hongkong-dashboard-cumulative)');
  console.log('전체 매장 수:', storeSummaryForArea ? Object.keys(storeSummaryForArea).length : 0, '개');
  console.log('총 면적:', totalArea, '평');
  console.log('면적 있는 매장:', storesWithArea.length, '개', storesWithArea);
  console.log('면적 없는 매장:', storesWithoutArea.length, '개', storesWithoutArea);
  console.log('=====================================');
  
  // 전년 면적 계산 (전년 매출이 있는 매장의 실제 면적 합계) - 전체요약페이지와 완전히 동일
  // 전체요약페이지와 동일한 데이터 소스 사용: monthlyDashboardData?.store_summary
  let prevTotalArea = 0;
  if (storeSummaryForArea) {
    Object.keys(storeSummaryForArea).forEach((storeCode) => {
      const store = storeSummaryForArea[storeCode];
      
      // M10A는 M10에 합쳐서 계산하므로 건너뛰기
      if (storeCode === 'M10A') {
        return;
      }
      
      // 홍콩+마카오, MLB 브랜드만, 온라인 제외
      if (store?.brand === 'MLB' && isHongKongOrMacauStore(storeCode) && store?.channel !== 'Online' && (store?.previous?.net_sales || 0) > 0) {
        const area = storeAreas[storeCode] || 0;
          if (store?.closed === true && area > 0) {
          const salesPerPyeong = ((store.previous.net_sales || 0) / 1000) / area;
          if (salesPerPyeong < 1) {
            return;
          }
        }
        if (area > 0) {
          prevTotalArea += area;
        }
      }
    });
  }
  
  // 누적 평당매출 계산 - 전체요약페이지와 동일
  // 전체요약페이지: hkCumulativeAvgArea = hkOfflineTotalArea (당월 면적 사용)
  const hkCumulativeAvgArea = totalArea; // 당월 면적 사용 (전체요약페이지와 동일)
  const hkOfflineCumulative = hkMcOfflineSales; // 기존 변수명 호환
  const hkSalesPerPyeongCumulative = hkCumulativeAvgArea > 0 ? hkOfflineCumulative / hkCumulativeAvgArea : 0; // 누적 평당매출 (K HKD/평 단위)
  const dailySalesPerPyeong = cumulativeDays > 0 && hkSalesPerPyeongCumulative > 0 ? (hkSalesPerPyeongCumulative * 1000) / cumulativeDays : 0; // 누적은 누적 일수로 나누기
  
  // 디버깅: 평당매출 계산 확인 (전체요약페이지와 동일한 로직)
  console.log('=== [누적 대시보드] 홍콩+마카오 평당매출 계산 (전체요약페이지와 동일) ===');
  console.log('[누적]');
  console.log('누적 오프라인 매출 (홍콩+마카오):', hkOfflineCumulative.toFixed(2), 'K HKD (PL 데이터, 이미 K HKD 단위)');
  console.log('당월 오프라인 면적:', hkCumulativeAvgArea.toFixed(2), '평');
  console.log('누적 평균 면적:', hkCumulativeAvgArea.toFixed(2), '평 (당월 면적 사용, 홍콩+마카오)');
  console.log('평당매출:', hkSalesPerPyeongCumulative.toFixed(2), 'K HKD/평');
  console.log('누적 일수:', cumulativeDays, '일');
  console.log('1일 평당매출:', dailySalesPerPyeong.toFixed(1), 'HKD/평/일');
  console.log('계산식: ' + hkOfflineCumulative.toFixed(2) + ' / ' + hkCumulativeAvgArea.toFixed(2) + ' = ' + hkSalesPerPyeongCumulative.toFixed(2) + ' K HKD/평');
  console.log('일평균 계산식: (' + hkSalesPerPyeongCumulative.toFixed(2) + ' * 1000) / ' + cumulativeDays + ' = ' + dailySalesPerPyeong.toFixed(1) + ' HKD/평/일');
  console.log('=====================================');
  
  // 기존 변수명 호환 (salesPerPyeong)
  const salesPerPyeong = hkSalesPerPyeongCumulative;
  
  // 전년 평당매출 계산 (홍콩+마카오) - 누적 일수 사용
  const prevSalesPerPyeong = prevTotalArea > 0 ? hkMcOfflineSalesPrev / prevTotalArea : 0; // K HKD/평
  const prevDailySalesPerPyeong = prevSalesPerPyeong > 0 ? (prevSalesPerPyeong * 1000) / cumulativeDays : 0; // HKD/평/일 (누적 일수 사용)
  const dailySalesPerPyeongYoy = prevDailySalesPerPyeong > 0 ? (dailySalesPerPyeong / prevDailySalesPerPyeong) * 100 : 0;

  // 누적 대시보드용: storeStatusData의 매장별 직접이익을 누적 데이터로 변환
  const allHKStores = useMemo(() => {
    if (!storeStatusData?.categories) return [];
    
    // 모든 매장 수집 (누적 대시보드에서는 LCX 포함)
    const allStores = [
      ...(storeStatusData?.categories?.profit_improving?.stores || []),
      ...(storeStatusData?.categories?.profit_deteriorating?.stores || []),
      ...(storeStatusData?.categories?.loss_improving?.stores || []),
      ...(storeStatusData?.categories?.loss_deteriorating?.stores || [])
    ];
    
    // 누적 대시보드에서는 LCX(M05) 포함 (excluded_stores에서 추가)
    const excludedStores = storeStatusData?.excluded_stores?.stores || [];
    const lcxStore = excludedStores.find((s: any) => s.shop_cd === 'M05');
    if (lcxStore && !allStores.find((s: any) => s.shop_cd === 'M05')) {
      allStores.push(lcxStore);
    }
    
    // 누적 데이터로 변환: 누적 직접이익 계산
    // 직접이익 = 매출총이익 - 직접비
    // 매출총이익 = 매출 - 원가
    const cumulativeStores = plStoreData?.cumulative_stores || {};
    const storeSummary = dashboardData?.store_summary || {};
    
    return allStores.map((store: any) => {
      const storeCode = store.shop_cd || store.shop_code;
      
      // JSON에 추가된 cumulative 데이터가 있으면 우선 사용 (CSV에서 계산된 정확한 값)
      if (store.current?.cumulative?.direct_profit !== undefined) {
        const cumulativeData = store.current.cumulative;
        const prevCumulativeData = store.previous?.cumulative || {};
        
        return {
          ...store,
          current: {
            ...store.current,
            direct_profit: cumulativeData.direct_profit,
            net_sales: cumulativeData.net_sales,
            rent: cumulativeData.rent || store.current.rent,
            labor_cost: cumulativeData.labor_cost || store.current.labor_cost
          },
          previous: {
            ...store.previous,
            direct_profit: prevCumulativeData.direct_profit || 0,
            net_sales: prevCumulativeData.net_sales || 0,
            rent: prevCumulativeData.rent || store.previous?.rent,
            labor_cost: prevCumulativeData.labor_cost || store.previous?.labor_cost
          },
          yoy: store.cumulative_yoy || store.yoy || 0
        };
      }
      
      // cumulative 데이터가 없으면 기존 방식 사용 (fallback)
      const cumulativeStoreCosts = cumulativeStores[storeCode];
      const cumulativeStoreSales = storeSummary[storeCode];
      
      if (cumulativeStoreCosts && cumulativeStoreSales) {
        // 누적 직접비 계산 (plStoreData.cumulative_stores에서)
        const cumulativeDirectCost = (
          (cumulativeStoreCosts.labor_cost || 0) +
          (cumulativeStoreCosts.rent || 0) +
          (cumulativeStoreCosts.logistics || 0) +
          (cumulativeStoreCosts.other_fee || 0) +
          (cumulativeStoreCosts.marketing || 0) +
          (cumulativeStoreCosts.fee || 0) +
          (cumulativeStoreCosts.maintenance || 0) +
          (cumulativeStoreCosts.insurance || 0) +
          (cumulativeStoreCosts.utilities || 0) +
          (cumulativeStoreCosts.supplies || 0) +
          (cumulativeStoreCosts.travel || 0) +
          (cumulativeStoreCosts.communication || 0) +
          (cumulativeStoreCosts.uniform || 0) +
          (cumulativeStoreCosts.depreciation || 0)
        ) / 1000; // K HKD
        
        // 전년 누적 직접비 계산
        const prevCumulativeDirectCost = (
          (cumulativeStoreCosts.labor_cost_prev || 0) +
          (cumulativeStoreCosts.rent_prev || 0) +
          (cumulativeStoreCosts.logistics_prev || 0) +
          (cumulativeStoreCosts.other_fee_prev || 0) +
          (cumulativeStoreCosts.marketing_prev || 0) +
          (cumulativeStoreCosts.fee_prev || 0) +
          (cumulativeStoreCosts.maintenance_prev || 0) +
          (cumulativeStoreCosts.insurance_prev || 0) +
          (cumulativeStoreCosts.utilities_prev || 0) +
          (cumulativeStoreCosts.supplies_prev || 0) +
          (cumulativeStoreCosts.travel_prev || 0) +
          (cumulativeStoreCosts.communication_prev || 0) +
          (cumulativeStoreCosts.uniform_prev || 0) +
          (cumulativeStoreCosts.depreciation_prev || 0)
        ) / 1000; // K HKD
        
        // 누적 매출 (dashboardData?.store_summary에서 - 이미 누적 데이터)
        const cumulativeNetSales = (cumulativeStoreSales.current?.net_sales || 0) / 1000; // K HKD
        const prevCumulativeNetSales = (cumulativeStoreSales.previous?.net_sales || 0) / 1000; // K HKD
        
        // 누적 매출총이익 계산: 원가율을 사용하여 추정
        // 전체 PL 데이터의 누적 원가율 사용
        const totalCogsRate = plData?.cumulative?.total?.cogs_rate || 0;
        const prevTotalCogsRate = plData?.cumulative?.prev_cumulative?.total?.cogs_rate || 0;
        
        // 누적 매출총이익 = 누적 매출 * (1 - 원가율)
        const cumulativeGrossProfit = cumulativeNetSales * (1 - totalCogsRate / 100);
        const prevCumulativeGrossProfit = prevCumulativeNetSales * (1 - prevTotalCogsRate / 100);
        
        // 누적 직접이익 = 누적 매출총이익 - 누적 직접비
        const cumulativeDirectProfit = cumulativeGrossProfit - cumulativeDirectCost;
        const prevCumulativeDirectProfit = prevCumulativeGrossProfit - prevCumulativeDirectCost;
        
        // 누적 YOY 계산
        let cumulativeYoy = 0;
        if (prevCumulativeDirectProfit > 0) {
          cumulativeYoy = (cumulativeDirectProfit / prevCumulativeDirectProfit * 100);
        } else if (prevCumulativeDirectProfit < 0 && cumulativeDirectProfit >= 0) {
          // 적자에서 흑자로 전환: 원본 YOY 사용
          cumulativeYoy = store.yoy || 0;
        } else if (prevCumulativeDirectProfit < 0 && cumulativeDirectProfit < 0) {
          // 적자에서 적자: 손실이 개선되면 YOY > 100, 악화되면 YOY < 100
          cumulativeYoy = prevCumulativeDirectProfit !== 0 
            ? (cumulativeDirectProfit / prevCumulativeDirectProfit * 100)
            : 0;
        } else {
          // 기타 경우: 원본 YOY 사용
          cumulativeYoy = store.yoy || 0;
        }
        
        return {
          ...store,
          current: {
            ...store.current,
            direct_profit: cumulativeDirectProfit,
            net_sales: cumulativeNetSales,
            rent: (cumulativeStoreCosts.rent || 0) / 1000,
            labor_cost: (cumulativeStoreCosts.labor_cost || 0) / 1000
          },
          previous: {
            ...store.previous,
            direct_profit: prevCumulativeDirectProfit,
            net_sales: prevCumulativeNetSales,
            rent: (cumulativeStoreCosts.rent_prev || 0) / 1000,
            labor_cost: (cumulativeStoreCosts.labor_cost_prev || 0) / 1000
          },
          yoy: cumulativeYoy
        };
      }
      
      // 누적 데이터가 없으면 원본 유지
      return store;
    });
  }, [storeStatusData, dashboardData, plData, plStoreData]);

  const activeHKStores = useMemo(
    () => allHKStores.filter((store: any) => (store?.current?.net_sales || 0) > 0),
    [allHKStores]
  );
  
  // 누적 대시보드용: storeStatusData의 summary와 categories를 누적 데이터로 재계산
  const cumulativeStoreStatusData = useMemo(() => {
    if (!storeStatusData || !allHKStores.length) return storeStatusData;
    
    // 누적 직접이익 합계: JSON에서 가져온 cumulative_direct_profit 값 사용 (CSV에서 계산된 누적 데이터)
    const totalDirectProfit = storeStatusData?.summary?.cumulative_direct_profit ?? 
      allHKStores.reduce((sum: number, store: any) => sum + (store?.current?.direct_profit || 0), 0);
    
    // 카테고리별 재분류 (누적 직접이익 기준)
    const profitImproving: any[] = [];
    const profitDeteriorating: any[] = [];
    const lossImproving: any[] = [];
    const lossDeteriorating: any[] = [];
    
    allHKStores.forEach((store: any) => {
      const directProfit = store?.current?.direct_profit || 0;
      const yoy = store?.yoy || 0;
      
      // 카테고리 결정 및 store 객체에 category 추가
      let category: string;
      if (directProfit >= 0) {
        // 흑자
        if (yoy >= 100) {
          category = 'profit_improving';
          profitImproving.push({ ...store, category });
        } else {
          category = 'profit_deteriorating';
          profitDeteriorating.push({ ...store, category });
        }
      } else {
        // 적자
        if (yoy >= 100) {
          category = 'loss_improving';
          lossImproving.push({ ...store, category });
        } else {
          category = 'loss_deteriorating';
          lossDeteriorating.push({ ...store, category });
        }
      }
    });
    
    // 카테고리별 평균 YOY 및 임차료/인건비율 계산
    // 임차료/인건비율은 store.current의 월별 데이터(원본 JSON 데이터)를 사용 (K HKD 단위)
    const calculateCategoryStats = (stores: any[]) => {
      if (stores.length === 0) return { avg_yoy: 0, avg_rent_labor_ratio: 0 };
      
      const validYoyStores = stores.filter((s: any) => s.yoy !== null && s.yoy !== undefined);
      const avgYoy = validYoyStores.length > 0 
        ? validYoyStores.reduce((sum: number, s: any) => sum + (s.yoy || 0), 0) / validYoyStores.length
        : 0;
      
      // 임차료/인건비율 계산: 원본 JSON의 월별 데이터 사용 (K HKD 단위)
      // allHKStores는 cumulative 데이터로 변환되어 net_sales가 HKD 원본 단위일 수 있으므로,
      // 원본 JSON의 월별 데이터(storeStatusData.categories)에서 직접 가져와야 함
      let totalRent = 0;
      let totalLabor = 0;
      let totalSales = 0;
      
      stores.forEach((s: any) => {
        // 원본 JSON에서 해당 매장 찾기
        const originalStore = storeStatusData?.categories?.['profit_improving']?.stores?.find((st: any) => st.shop_cd === s.shop_cd) ||
                              storeStatusData?.categories?.['profit_deteriorating']?.stores?.find((st: any) => st.shop_cd === s.shop_cd) ||
                              storeStatusData?.categories?.['loss_improving']?.stores?.find((st: any) => st.shop_cd === s.shop_cd) ||
                              storeStatusData?.categories?.['loss_deteriorating']?.stores?.find((st: any) => st.shop_cd === s.shop_cd);
        
        if (originalStore?.current) {
          // 원본 JSON의 월별 데이터 사용 (K HKD 단위로 통일됨)
          totalRent += originalStore.current.rent || 0;
          totalLabor += originalStore.current.labor_cost || 0;
          totalSales += originalStore.current.net_sales || 0;
        }
      });
      
      const avgRentLaborRatio = totalSales > 0 ? ((totalRent + totalLabor) / totalSales * 100) : 0;
      
      return { avg_yoy: avgYoy, avg_rent_labor_ratio: avgRentLaborRatio };
    };
    
    const profitImprovingStats = calculateCategoryStats(profitImproving);
    const profitDeterioratingStats = calculateCategoryStats(profitDeteriorating);
    const lossImprovingStats = calculateCategoryStats(lossImproving);
    const lossDeterioratingStats = calculateCategoryStats(lossDeteriorating);
    
    return {
      ...storeStatusData,
      summary: {
        ...storeStatusData.summary,
        total_direct_profit: totalDirectProfit
      },
      categories: {
        profit_improving: {
          ...storeStatusData.categories?.profit_improving,
          stores: profitImproving,
          count: profitImproving.length,
          total_direct_profit: profitImproving.reduce((sum: number, s: any) => sum + (s?.current?.direct_profit || 0), 0),
          avg_yoy: profitImprovingStats.avg_yoy,
          avg_rent_labor_ratio: storeStatusData.categories?.profit_improving?.avg_rent_labor_ratio || 0  // JSON 원본 값 사용 (월별 데이터 기준)
        },
        profit_deteriorating: {
          ...storeStatusData.categories?.profit_deteriorating,
          stores: profitDeteriorating,
          count: profitDeteriorating.length,
          total_direct_profit: profitDeteriorating.reduce((sum: number, s: any) => sum + (s?.current?.direct_profit || 0), 0),
          avg_yoy: profitDeterioratingStats.avg_yoy,
          avg_rent_labor_ratio: profitDeterioratingStats.avg_rent_labor_ratio  // 재분류된 매장 기준으로 계산
        },
        loss_improving: {
          ...storeStatusData.categories?.loss_improving,
          stores: lossImproving,
          count: lossImproving.length,
          total_direct_profit: lossImproving.reduce((sum: number, s: any) => sum + (s?.current?.direct_profit || 0), 0),
          avg_yoy: lossImprovingStats.avg_yoy,
          avg_rent_labor_ratio: storeStatusData.categories?.loss_improving?.avg_rent_labor_ratio || 0  // JSON 원본 값 사용
        },
        loss_deteriorating: {
          ...storeStatusData.categories?.loss_deteriorating,
          stores: lossDeteriorating,
          count: lossDeteriorating.length,
          total_direct_profit: lossDeteriorating.reduce((sum: number, s: any) => sum + (s?.current?.direct_profit || 0), 0),
          avg_yoy: lossDeterioratingStats.avg_yoy,
          avg_rent_labor_ratio: lossDeterioratingStats.avg_rent_labor_ratio  // 재분류된 매장 기준으로 계산
        }
      }
    };
  }, [storeStatusData, allHKStores]);
  const seasonSales = dashboardData?.season_sales || {};
  const seasonSalesSummary = dashboardData?.season_sales_summary || {};  // 누적 대시보드용
  const seasonSummary = dashboardData?.season_summary || {};  // 11월 누적 데이터용
  const accStock = monthlyDashboardData?.acc_stock_summary || {};
  const endingInventory = monthlyDashboardData?.ending_inventory || {};
  const pastSeasonFW = endingInventory?.past_season_fw || {};
  const pastSeasonSS = endingInventory?.by_season?.과시즌_SS || {};
  const pastSeasonSales = endingInventory?.past_season_sales || {};
  
  // 11월 누적: season_summary에서 25S와 25F 데이터 가져오기
  const season25S = seasonSummary['25S_당시즌S'] || {};
  const season25F = seasonSummary['25F_과시즌F'] || {};
  
  // 판매율 계산용: 누적 대시보드 JSON의 season_sales_summary에서 가져오기 (입고 대비 판매율)
  const season25FSalesRate = seasonSalesSummary?.current_season_f?.sales_rate ?? 0;
  const season25SSalesRate = seasonSalesSummary?.current_season_s?.sales_rate ?? 0;
  
  // 디버깅: 데이터 확인
  useEffect(() => {
    if (dashboardData && seasonSalesSummary) {
      console.log('🔍 seasonSalesSummary:', seasonSalesSummary);
      console.log('🔍 season25FSalesRate:', season25FSalesRate);
      console.log('🔍 season25SSalesRate:', season25SSalesRate);
      console.log('🔍 current_season_f:', seasonSalesSummary?.current_season_f);
      console.log('🔍 current_season_s:', seasonSalesSummary?.current_season_s);
    }
  }, [dashboardData, seasonSalesSummary, season25FSalesRate, season25SSalesRate]);
  
  // 누적 대시보드용: 누적 데이터 사용
  const pl = {
    net_sales: salesSummary.total_net_sales || 0,
    tag_sales: plData?.cumulative?.total?.tag_sales || 0,
    gross_sales: plData?.cumulative?.total?.tag_sales || 0, // 누적에서는 tag_sales와 동일
    gross_profit: plData?.cumulative?.total?.gross_profit || 0,
    discount: (plData?.cumulative?.total?.tag_sales || 0) - (plData?.cumulative?.total?.net_sales || 0),
    discount_rate: plData?.cumulative?.total?.discount_rate || 0,
    cogs: (plData?.cumulative?.total?.tag_sales || 0) - (plData?.cumulative?.total?.gross_profit || 0) - ((plData?.cumulative?.total?.tag_sales || 0) - (plData?.cumulative?.total?.net_sales || 0)),
    direct_cost: plData?.cumulative?.total?.direct_cost || 0,
    direct_profit: plData?.cumulative?.total?.direct_profit || 0,
    direct_profit_rate: plData?.cumulative?.total?.direct_profit_rate || 0,
    operating_profit: plData?.cumulative?.total?.operating_profit || 0,
    operating_profit_rate: plData?.cumulative?.total?.operating_profit_rate || 0,
    sg_a: plData?.cumulative?.total?.sg_a || 0,
  };
  const plYoy = plData?.cumulative?.yoy || {};
  const plChange = {
    net_sales: salesSummary.total_change || 0,
    tag_sales: (plData?.cumulative?.total?.tag_sales || 0) - (plData?.cumulative?.prev_cumulative?.total?.tag_sales || 0),
    gross_profit: (plData?.cumulative?.total?.gross_profit || 0) - (plData?.cumulative?.prev_cumulative?.total?.gross_profit || 0),
    direct_cost: (plData?.cumulative?.total?.direct_cost || 0) - (plData?.cumulative?.prev_cumulative?.total?.direct_cost || 0),
    direct_profit: (plData?.cumulative?.total?.direct_profit || 0) - (plData?.cumulative?.prev_cumulative?.total?.direct_profit || 0),
    operating_profit: (plData?.cumulative?.total?.operating_profit || 0) - (plData?.cumulative?.prev_cumulative?.total?.operating_profit || 0),
    sg_a: (plData?.cumulative?.total?.sg_a || 0) - (plData?.cumulative?.prev_cumulative?.total?.sg_a || 0),
  };

  // 전년 할인율 계산 (prev_month에 discount_rate가 없는 경우)
  const prevMonthDiscountRate = useMemo(() => {
    const prevMonth = plData?.prev_month?.total;
    if (!prevMonth) return 0;
    if ((prevMonth as any).discount_rate !== undefined) return (prevMonth as any).discount_rate;
    if (prevMonth.tag_sales > 0) {
      return ((prevMonth.tag_sales - prevMonth.net_sales) / prevMonth.tag_sales) * 100;
    }
    return 0;
  }, [plData]);

  // HK 전년 할인율 계산
  const prevMonthHKDiscountRate = useMemo(() => {
    const prevMonth = plData?.prev_month?.hk;
    if (!prevMonth) return 0;
    if ((prevMonth as any).discount_rate !== undefined) return (prevMonth as any).discount_rate;
    if (prevMonth.tag_sales > 0) {
      return ((prevMonth.tag_sales - prevMonth.net_sales) / prevMonth.tag_sales) * 100;
    }
    return 0;
  }, [plData]);

  // MC 전년 할인율 계산
  const prevMonthMCDiscountRate = useMemo(() => {
    const prevMonth = plData?.prev_month?.mc;
    if (!prevMonth) return 0;
    if ((prevMonth as any).discount_rate !== undefined) return (prevMonth as any).discount_rate;
    if (prevMonth.tag_sales > 0) {
      return ((prevMonth.tag_sales - prevMonth.net_sales) / prevMonth.tag_sales) * 100;
    }
    return 0;
  }, [plData]);

  // 직접비 계산 (당월 - 매장별 데이터 합계)
  const directCostCurrent = useMemo(() => {
    if (!plStoreData || !plStoreData.stores) return null;
    
    const stores = plStoreData.stores;
    const total = {
      labor_cost: 0,
      rent: 0,
      logistics: 0,
      other_fee: 0,
      marketing: 0,
      fee: 0,
      maintenance: 0,
      insurance: 0,
      utilities: 0,
      supplies: 0,
      travel: 0,
      communication: 0,
      uniform: 0,
      depreciation: 0
    };
    
    const prev = {
      labor_cost: 0,
      rent: 0,
      logistics: 0,
      other_fee: 0,
      marketing: 0,
      fee: 0,
      maintenance: 0,
      insurance: 0,
      utilities: 0,
      supplies: 0,
      travel: 0,
      communication: 0,
      uniform: 0,
      depreciation: 0
    };
    
    Object.values(stores).forEach((store: any) => {
      total.labor_cost += store.labor_cost || 0;
      total.rent += store.rent || 0;
      total.logistics += store.logistics || 0;
      total.other_fee += store.other_fee || 0;
      total.marketing += store.marketing || 0;
      total.fee += store.fee || 0;
      total.maintenance += store.maintenance || 0;
      total.insurance += store.insurance || 0;
      total.utilities += store.utilities || 0;
      total.supplies += store.supplies || 0;
      total.travel += store.travel || 0;
      total.communication += store.communication || 0;
      total.uniform += store.uniform || 0;
      total.depreciation += store.depreciation || 0;
      
      prev.labor_cost += store.labor_cost_prev || 0;
      prev.rent += store.rent_prev || 0;
      prev.logistics += store.logistics_prev || 0;
      prev.other_fee += store.other_fee_prev || 0;
      prev.marketing += store.marketing_prev || 0;
      prev.fee += store.fee_prev || 0;
      prev.maintenance += store.maintenance_prev || 0;
      prev.insurance += store.insurance_prev || 0;
      prev.utilities += store.utilities_prev || 0;
      prev.supplies += store.supplies_prev || 0;
      prev.travel += store.travel_prev || 0;
      prev.communication += store.communication_prev || 0;
      prev.uniform += store.uniform_prev || 0;
      prev.depreciation += store.depreciation_prev || 0;
    });
    
    const totalDirectCost = Object.values(total).reduce((sum, val) => sum + val, 0);
    const totalDirectCostPrev = Object.values(prev).reduce((sum, val) => sum + val, 0);
    
    return { current: total, prev, totalDirectCost, totalDirectCostPrev };
  }, [plStoreData]);

  // 영업비 계산 (당월 - M99 본사)
  const opexCurrent = useMemo(() => {
    if (!plStoreData || !plStoreData.opex) return null;
    
    const opex = plStoreData.opex;
    return {
      salary: opex.salary || 0,
      marketing: opex.marketing || 0,
      fee: opex.fee || 0,
      rent: opex.rent || 0,
      insurance: opex.insurance || 0,
      travel: opex.travel || 0,
      other: opex.other || 0,
      total: (opex.salary || 0) + (opex.marketing || 0) + (opex.fee || 0) + (opex.rent || 0) + (opex.insurance || 0) + (opex.travel || 0) + (opex.other || 0)
    };
  }, [plStoreData]);

  // 직접비 계산 (누적 - 매장별 데이터 합계)
  const directCostCumulative = useMemo(() => {
    if (!plStoreData || !plStoreData.cumulative_stores) return null;
    
    const stores = plStoreData.cumulative_stores;
    const total = {
      labor_cost: 0,
      rent: 0,
      logistics: 0,
      other_fee: 0,
      marketing: 0,
      fee: 0,
      maintenance: 0,
      insurance: 0,
      utilities: 0,
      supplies: 0,
      travel: 0,
      communication: 0,
      uniform: 0,
      depreciation: 0
    };
    
    const prev = {
      labor_cost: 0,
      rent: 0,
      logistics: 0,
      other_fee: 0,
      marketing: 0,
      fee: 0,
      maintenance: 0,
      insurance: 0,
      utilities: 0,
      supplies: 0,
      travel: 0,
      communication: 0,
      uniform: 0,
      depreciation: 0
    };
    
    Object.values(stores).forEach((store: any) => {
      total.labor_cost += store.labor_cost || 0;
      total.rent += store.rent || 0;
      total.logistics += store.logistics || 0;
      total.other_fee += store.other_fee || 0;
      total.marketing += store.marketing || 0;
      total.fee += store.fee || 0;
      total.maintenance += store.maintenance || 0;
      total.insurance += store.insurance || 0;
      total.utilities += store.utilities || 0;
      total.supplies += store.supplies || 0;
      total.travel += store.travel || 0;
      total.communication += store.communication || 0;
      total.uniform += store.uniform || 0;
      total.depreciation += store.depreciation || 0;
      
      prev.labor_cost += store.labor_cost_prev || 0;
      prev.rent += store.rent_prev || 0;
      prev.logistics += store.logistics_prev || 0;
      prev.other_fee += store.other_fee_prev || 0;
      prev.marketing += store.marketing_prev || 0;
      prev.fee += store.fee_prev || 0;
      prev.maintenance += store.maintenance_prev || 0;
      prev.insurance += store.insurance_prev || 0;
      prev.utilities += store.utilities_prev || 0;
      prev.supplies += store.supplies_prev || 0;
      prev.travel += store.travel_prev || 0;
      prev.communication += store.communication_prev || 0;
      prev.uniform += store.uniform_prev || 0;
      prev.depreciation += store.depreciation_prev || 0;
    });
    
    const totalDirectCost = Object.values(total).reduce((sum, val) => sum + val, 0);
    const totalDirectCostPrev = Object.values(prev).reduce((sum, val) => sum + val, 0);
    
    return { current: total, prev, totalDirectCost, totalDirectCostPrev };
  }, [plStoreData]);

  // 영업비 계산 (누적 - M99 본사)
  const opexCumulative = useMemo(() => {
    if (!plStoreData || !plStoreData.cumulative_opex) return null;
    
    const opex = plStoreData.cumulative_opex;
    return {
      salary: opex.salary || 0,
      salary_prev: opex.salary_prev || 0,
      marketing: opex.marketing || 0,
      marketing_prev: opex.marketing_prev || 0,
      fee: opex.fee || 0,
      fee_prev: opex.fee_prev || 0,
      rent: opex.rent || 0,
      rent_prev: opex.rent_prev || 0,
      insurance: opex.insurance || 0,
      insurance_prev: opex.insurance_prev || 0,
      travel: opex.travel || 0,
      travel_prev: opex.travel_prev || 0,
      other: opex.other || 0,
      other_prev: opex.other_prev || 0,
      total: (opex.salary || 0) + (opex.marketing || 0) + (opex.fee || 0) + (opex.rent || 0) + (opex.insurance || 0) + (opex.travel || 0) + (opex.other || 0),
      total_prev: (opex.salary_prev || 0) + (opex.marketing_prev || 0) + (opex.fee_prev || 0) + (opex.rent_prev || 0) + (opex.insurance_prev || 0) + (opex.travel_prev || 0) + (opex.other_prev || 0)
    };
  }, [plStoreData]);

  // 전년 누적 할인율 계산
  const prevCumulativeDiscountRate = useMemo(() => {
    const prevCumulative = plData?.cumulative?.prev_cumulative?.total;
    if (!prevCumulative) return 0;
    if ((prevCumulative as any).discount_rate !== undefined) return (prevCumulative as any).discount_rate;
    if (prevCumulative.tag_sales > 0) {
      return ((prevCumulative.tag_sales - prevCumulative.net_sales) / prevCumulative.tag_sales) * 100;
    }
    return 0;
  }, [plData]);

  // HK 누적 전년 할인율 계산
  const prevCumulativeHKDiscountRate = useMemo(() => {
    const prevCumulative = plData?.cumulative?.prev_cumulative?.hk;
    if (!prevCumulative) return 0;
    if ((prevCumulative as any).discount_rate !== undefined) return (prevCumulative as any).discount_rate;
    if (prevCumulative.tag_sales > 0) {
      return ((prevCumulative.tag_sales - prevCumulative.net_sales) / prevCumulative.tag_sales) * 100;
    }
    return 0;
  }, [plData]);

  // MC 누적 전년 할인율 계산
  const prevCumulativeMCDiscountRate = useMemo(() => {
    const prevCumulative = plData?.cumulative?.prev_cumulative?.mc;
    if (!prevCumulative) return 0;
    if ((prevCumulative as any).discount_rate !== undefined) return (prevCumulative as any).discount_rate;
    if (prevCumulative.tag_sales > 0) {
      return ((prevCumulative.tag_sales - prevCumulative.net_sales) / prevCumulative.tag_sales) * 100;
    }
    return 0;
  }, [plData]);

  // 전년 당월 total의 원가율 계산 (HK + MC 합산)
  const prevMonthTotalCogsRate = useMemo(() => {
    const prevMonthHK = plData?.prev_month?.hk;
    const prevMonthMC = plData?.prev_month?.mc;
    if (!prevMonthHK || !prevMonthMC) return 0;
    
    // HK와 MC의 cogs_rate가 있으면 가중평균 계산, 없으면 cogs/net_sales로 계산
    const hkCogsRate = prevMonthHK.cogs_rate !== undefined ? prevMonthHK.cogs_rate : 
      (prevMonthHK.net_sales > 0 && (prevMonthHK as any).cogs !== undefined ? 
        ((prevMonthHK as any).cogs / prevMonthHK.net_sales) * 100 : 0);
    const mcCogsRate = prevMonthMC.cogs_rate !== undefined ? prevMonthMC.cogs_rate : 
      (prevMonthMC.net_sales > 0 && (prevMonthMC as any).cogs !== undefined ? 
        ((prevMonthMC as any).cogs / prevMonthMC.net_sales) * 100 : 0);
    
    // HK와 MC의 net_sales 합산
    const totalNetSales = prevMonthHK.net_sales + prevMonthMC.net_sales;
    if (totalNetSales <= 0) return 0;
    
    // 가중평균으로 계산
    return ((prevMonthHK.net_sales * hkCogsRate + prevMonthMC.net_sales * mcCogsRate) / totalNetSales);
  }, [plData]);

  // 전년 당월 total의 매출총이익률 계산 (HK + MC 합산)
  const prevMonthTotalGrossProfitRate = useMemo(() => {
    const prevMonthHK = plData?.prev_month?.hk;
    const prevMonthMC = plData?.prev_month?.mc;
    if (!prevMonthHK || !prevMonthMC) return 0;
    
    // HK와 MC의 gross_profit_rate가 있으면 가중평균 계산
    const hkGrossProfitRate = prevMonthHK.gross_profit_rate !== undefined ? prevMonthHK.gross_profit_rate : 
      (prevMonthHK.net_sales > 0 && prevMonthHK.gross_profit !== undefined ? 
        (prevMonthHK.gross_profit / prevMonthHK.net_sales) * 100 : 0);
    const mcGrossProfitRate = prevMonthMC.gross_profit_rate !== undefined ? prevMonthMC.gross_profit_rate : 
      (prevMonthMC.net_sales > 0 && prevMonthMC.gross_profit !== undefined ? 
        (prevMonthMC.gross_profit / prevMonthMC.net_sales) * 100 : 0);
    
    // HK와 MC의 net_sales 합산
    const totalNetSales = prevMonthHK.net_sales + prevMonthMC.net_sales;
    if (totalNetSales <= 0) return 0;
    
    // 가중평균으로 계산
    return ((prevMonthHK.net_sales * hkGrossProfitRate + prevMonthMC.net_sales * mcGrossProfitRate) / totalNetSales);
  }, [plData]);

  // 전년 누적 total의 원가율 계산 (HK + MC 합산)
  const prevCumulativeTotalCogsRate = useMemo(() => {
    const prevCumulativeHK = plData?.cumulative?.prev_cumulative?.hk;
    const prevCumulativeMC = plData?.cumulative?.prev_cumulative?.mc;
    if (!prevCumulativeHK || !prevCumulativeMC) return 0;
    
    // HK와 MC의 cogs_rate가 있으면 가중평균 계산, 없으면 cogs/net_sales로 계산
    const hkCogsRate = prevCumulativeHK.cogs_rate !== undefined ? prevCumulativeHK.cogs_rate : 
      (prevCumulativeHK.net_sales > 0 && (prevCumulativeHK as any).cogs !== undefined ? 
        ((prevCumulativeHK as any).cogs / prevCumulativeHK.net_sales) * 100 : 0);
    const mcCogsRate = prevCumulativeMC.cogs_rate !== undefined ? prevCumulativeMC.cogs_rate : 
      (prevCumulativeMC.net_sales > 0 && (prevCumulativeMC as any).cogs !== undefined ? 
        ((prevCumulativeMC as any).cogs / prevCumulativeMC.net_sales) * 100 : 0);
    
    // HK와 MC의 net_sales 합산
    const totalNetSales = prevCumulativeHK.net_sales + prevCumulativeMC.net_sales;
    if (totalNetSales <= 0) return 0;
    
    // 가중평균으로 계산
    return ((prevCumulativeHK.net_sales * hkCogsRate + prevCumulativeMC.net_sales * mcCogsRate) / totalNetSales);
  }, [plData]);

  // 전년 누적 total의 매출총이익률 계산 (HK + MC 합산)
  const prevCumulativeTotalGrossProfitRate = useMemo(() => {
    const prevCumulativeHK = plData?.cumulative?.prev_cumulative?.hk;
    const prevCumulativeMC = plData?.cumulative?.prev_cumulative?.mc;
    if (!prevCumulativeHK || !prevCumulativeMC) return 0;
    
    // HK와 MC의 gross_profit_rate가 있으면 가중평균 계산
    const hkGrossProfitRate = prevCumulativeHK.gross_profit_rate !== undefined ? prevCumulativeHK.gross_profit_rate : 
      (prevCumulativeHK.net_sales > 0 && prevCumulativeHK.gross_profit !== undefined ? 
        (prevCumulativeHK.gross_profit / prevCumulativeHK.net_sales) * 100 : 0);
    const mcGrossProfitRate = prevCumulativeMC.gross_profit_rate !== undefined ? prevCumulativeMC.gross_profit_rate : 
      (prevCumulativeMC.net_sales > 0 && prevCumulativeMC.gross_profit !== undefined ? 
        (prevCumulativeMC.gross_profit / prevCumulativeMC.net_sales) * 100 : 0);
    
    // HK와 MC의 net_sales 합산
    const totalNetSales = prevCumulativeHK.net_sales + prevCumulativeMC.net_sales;
    if (totalNetSales <= 0) return 0;
    
    // 가중평균으로 계산
    return ((prevCumulativeHK.net_sales * hkGrossProfitRate + prevCumulativeMC.net_sales * mcGrossProfitRate) / totalNetSales);
  }, [plData]);

  // 전년 당월 total의 직접이익률 계산 (HK + MC 합산)
  const prevMonthTotalDirectProfitRate = useMemo(() => {
    const prevMonthHK = plData?.prev_month?.hk;
    const prevMonthMC = plData?.prev_month?.mc;
    if (!prevMonthHK || !prevMonthMC) return 0;
    
    // HK와 MC의 direct_profit_rate가 있으면 가중평균 계산
    const hkDirectProfitRate = prevMonthHK.direct_profit_rate !== undefined ? prevMonthHK.direct_profit_rate : 
      (prevMonthHK.net_sales > 0 && prevMonthHK.direct_profit !== undefined ? 
        (prevMonthHK.direct_profit / prevMonthHK.net_sales) * 100 : 0);
    const mcDirectProfitRate = prevMonthMC.direct_profit_rate !== undefined ? prevMonthMC.direct_profit_rate : 
      (prevMonthMC.net_sales > 0 && prevMonthMC.direct_profit !== undefined ? 
        (prevMonthMC.direct_profit / prevMonthMC.net_sales) * 100 : 0);
    
    // HK와 MC의 net_sales 합산
    const totalNetSales = prevMonthHK.net_sales + prevMonthMC.net_sales;
    if (totalNetSales <= 0) return 0;
    
    // 가중평균으로 계산
    return ((prevMonthHK.net_sales * hkDirectProfitRate + prevMonthMC.net_sales * mcDirectProfitRate) / totalNetSales);
  }, [plData]);

  // 전년 누적 total의 직접이익률 계산 (HK + MC 합산)
  const prevCumulativeTotalDirectProfitRate = useMemo(() => {
    const prevCumulativeHK = plData?.cumulative?.prev_cumulative?.hk;
    const prevCumulativeMC = plData?.cumulative?.prev_cumulative?.mc;
    if (!prevCumulativeHK || !prevCumulativeMC) return 0;
    
    // HK와 MC의 direct_profit_rate가 있으면 가중평균 계산
    const hkDirectProfitRate = prevCumulativeHK.direct_profit_rate !== undefined ? prevCumulativeHK.direct_profit_rate : 
      (prevCumulativeHK.net_sales > 0 && prevCumulativeHK.direct_profit !== undefined ? 
        (prevCumulativeHK.direct_profit / prevCumulativeHK.net_sales) * 100 : 0);
    const mcDirectProfitRate = prevCumulativeMC.direct_profit_rate !== undefined ? prevCumulativeMC.direct_profit_rate : 
      (prevCumulativeMC.net_sales > 0 && prevCumulativeMC.direct_profit !== undefined ? 
        (prevCumulativeMC.direct_profit / prevCumulativeMC.net_sales) * 100 : 0);
    
    // HK와 MC의 net_sales 합산
    const totalNetSales = prevCumulativeHK.net_sales + prevCumulativeMC.net_sales;
    if (totalNetSales <= 0) return 0;
    
    // 가중평균으로 계산
    return ((prevCumulativeHK.net_sales * hkDirectProfitRate + prevCumulativeMC.net_sales * mcDirectProfitRate) / totalNetSales);
  }, [plData]);

  // 전년 당월 total의 영업이익률 계산 (HK + MC 합산)
  const prevMonthTotalOperatingProfitRate = useMemo(() => {
    const prevMonthHK = plData?.prev_month?.hk;
    const prevMonthMC = plData?.prev_month?.mc;
    if (!prevMonthHK || !prevMonthMC) return 0;
    
    // HK와 MC의 operating_profit_rate가 있으면 가중평균 계산
    const hkOperatingProfitRate = prevMonthHK.operating_profit_rate !== undefined ? prevMonthHK.operating_profit_rate : 
      (prevMonthHK.net_sales > 0 && prevMonthHK.operating_profit !== undefined ? 
        (prevMonthHK.operating_profit / prevMonthHK.net_sales) * 100 : 0);
    const mcOperatingProfitRate = prevMonthMC.operating_profit_rate !== undefined ? prevMonthMC.operating_profit_rate : 
      (prevMonthMC.net_sales > 0 && prevMonthMC.operating_profit !== undefined ? 
        (prevMonthMC.operating_profit / prevMonthMC.net_sales) * 100 : 0);
    
    // HK와 MC의 net_sales 합산
    const totalNetSales = prevMonthHK.net_sales + prevMonthMC.net_sales;
    if (totalNetSales <= 0) return 0;
    
    // 가중평균으로 계산
    return ((prevMonthHK.net_sales * hkOperatingProfitRate + prevMonthMC.net_sales * mcOperatingProfitRate) / totalNetSales);
  }, [plData]);

  // 전년 누적 total의 영업이익률 계산 (HK + MC 합산)
  const prevCumulativeTotalOperatingProfitRate = useMemo(() => {
    const prevCumulativeHK = plData?.cumulative?.prev_cumulative?.hk;
    const prevCumulativeMC = plData?.cumulative?.prev_cumulative?.mc;
    if (!prevCumulativeHK || !prevCumulativeMC) return 0;
    
    // HK와 MC의 operating_profit_rate가 있으면 가중평균 계산
    const hkOperatingProfitRate = prevCumulativeHK.operating_profit_rate !== undefined ? prevCumulativeHK.operating_profit_rate : 
      (prevCumulativeHK.net_sales > 0 && prevCumulativeHK.operating_profit !== undefined ? 
        (prevCumulativeHK.operating_profit / prevCumulativeHK.net_sales) * 100 : 0);
    const mcOperatingProfitRate = prevCumulativeMC.operating_profit_rate !== undefined ? prevCumulativeMC.operating_profit_rate : 
      (prevCumulativeMC.net_sales > 0 && prevCumulativeMC.operating_profit !== undefined ? 
        (prevCumulativeMC.operating_profit / prevCumulativeMC.net_sales) * 100 : 0);
    
    // HK와 MC의 net_sales 합산
    const totalNetSales = prevCumulativeHK.net_sales + prevCumulativeMC.net_sales;
    if (totalNetSales <= 0) return 0;
    
    // 가중평균으로 계산
    return ((prevCumulativeHK.net_sales * hkOperatingProfitRate + prevCumulativeMC.net_sales * mcOperatingProfitRate) / totalNetSales);
  }, [plData]);

  // 아이템/재고 전체합계 YOY (백엔드 값이 없을 경우 대비)
  const overallItemYoy: number[] = useMemo(() => {
    const monthlyData = (dashboardData?.monthly_item_data || []) as any[];
    const yoy = (dashboardData?.monthly_item_yoy || {}) as any;
    if (!monthlyData.length) return [];
    const keys = ['당시즌F', '당시즌S', '과시즌F', '과시즌S', '모자', '신발', '가방', '기타ACC'];

    const result = monthlyData.map((item: any, idx: number) => {
      let currentTotal = 0;
      let prevTotal = 0;
      keys.forEach((k) => {
        const cur = (item?.[k]?.net_sales as number) || 0;
        const yoyVal = (yoy?.[k]?.[idx] as number) || 0;
        currentTotal += cur;
        if (yoyVal > 0) {
          prevTotal += (cur * 100) / yoyVal;
        }
      });
      if (prevTotal <= 0) return 0;
      return Math.round((currentTotal / prevTotal) * 100);
    });

    // 마지막 월 전체합계는 PL 카드의 실판매 YOY와 동일하게 사용
    const yoyNetSales = plYoy?.net_sales;
    if (!isNaN(Number(yoyNetSales)) && result.length > 0) {
      result[result.length - 1] = Math.round(Number(yoyNetSales));
    }

    return result;
  }, [dashboardData, plYoy]);

  const overallInventoryYoy: (number | null)[] = useMemo(() => {
    const months = (dashboardData?.monthly_inventory_data || []) as any[];
    const yoy = (dashboardData?.monthly_inventory_yoy || {}) as any;
    if (!months.length) return [];
    const keys = ['F당시즌', 'S당시즌', '과시즌FW', '과시즌SS', '모자', '신발', '가방', '기타ACC'];
    return months.map((item: any, idx: number) => {
      let currentTotal = 0;
      let prevTotal = 0;
      keys.forEach((k) => {
        const cur = (item?.[k]?.stock_price as number) || 0;
        const yoyVal = (yoy?.[k]?.[idx] as number) || 0;
        currentTotal += cur;
        if (yoyVal && yoyVal > 0) {
          prevTotal += (cur * 100) / yoyVal;
        }
      });
      if (prevTotal <= 0) return null;
      return Math.round((currentTotal / prevTotal) * 100);
    });
  }, [dashboardData]);

  // 채널별 데이터
  const hkRetail = countryChannel?.HK_Retail || {};
  const hkOutlet = countryChannel?.HK_Outlet || {};
  const hkOnline = countryChannel?.HK_Online || {};
  const mcRetail = countryChannel?.MO_Retail || {};
  const mcOutlet = countryChannel?.MO_Outlet || {};

  // 재고주수 포맷팅 (소수점 첫째자리까지)
  const formatStockWeeks = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return '0.0';
    return num.toFixed(1);
  };

  // 전년비 증감금액 포맷팅 (증가: +, 감소: △, 색상 강조)
  const formatChange = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return { text: '0', className: 'text-gray-600' };
    const value = Math.round(num);
    if (value > 0) {
      return { text: `+${formatNumber(value)}`, className: 'text-green-600 font-semibold' };
    } else if (value < 0) {
      return { text: `△${formatNumber(Math.abs(value))}`, className: 'text-red-600 font-semibold' };
    } else {
      return { text: '0', className: 'text-gray-600' };
    }
  };

  // YOY 포맷팅 (소수점 없이)
  const formatYoy = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return Math.round(num).toString();
  };

  // 비율 포맷팅 (소수점 첫째 자리까지)
  const formatRate = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return '0.0';
    return num.toFixed(1);
  };

  // 소수점 첫째자리 항목의 증감 포맷팅 (증가: +, 감소: △, 소수점 첫째자리까지, 색상 강조)
  const formatChangeRate = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return { text: '0.0', className: 'text-gray-600' };
    const value = Number(num);
    if (value > 0) {
      return { text: `+${formatPercent(value, 1)}`, className: 'text-green-600 font-semibold' };
    } else if (value < 0) {
      return { text: `△${formatPercent(Math.abs(value), 1)}`, className: 'text-red-600 font-semibold' };
    } else {
      return { text: '0.0', className: 'text-gray-600' };
    }
  };

  // 그래프용 데이터 생성 (당월 대시보드 데이터 사용)
  const months: string[] = useMemo(() => {
    // monthly_item_data가 있으면 그것을 사용, 없으면 monthly_channel_data 사용
    const sourceData = monthlyDashboardData?.monthly_item_data || monthlyDashboardData?.monthly_channel_data;
    if (!sourceData) {
      // 데이터가 아직 로드 중일 때는 조용히 빈 배열 반환 (경고 제거)
      return [];
    }
    const result = sourceData.map((item: any) => `${item.period.slice(2, 4)}월`);
    return result;
  }, [monthlyDashboardData]);

  const monthly_channel_sales = useMemo(() => {
    if (!monthlyDashboardData?.monthly_channel_data) {
      // 데이터가 아직 로드 중일 때는 조용히 빈 배열 반환 (경고 제거)
      return [];
    }
    const result = monthlyDashboardData.monthly_channel_data.map((item: any) => ({
      month: `${item.period.slice(2, 4)}월`,
      'HK Retail': Math.round((item.HK_Retail || 0) / 1000),
      'HK Outlet': Math.round((item.HK_Outlet || 0) / 1000),
      'HK Online': Math.round((item.HK_Online || 0) / 1000),
      'MO Retail': Math.round((item.MC_Retail || 0) / 1000),
      'MO Outlet': Math.round((item.MC_Outlet || 0) / 1000),
      total: Math.round((item.total || 0) / 1000)
    }));
    return result;
  }, [monthlyDashboardData]);

  const monthly_item_inventory = useMemo(() => {
    if (!monthlyDashboardData?.monthly_inventory_data) {
      // 데이터가 아직 로드 중일 때는 조용히 빈 배열 반환 (경고 제거)
      return [];
    }
    const result = monthlyDashboardData.monthly_inventory_data.map((item: any) => ({
      month: `${item.period.slice(2, 4)}월`,
      'F당시즌': Math.round((item.F당시즌?.stock_price || 0) / 1000),
      'S당시즌': Math.round((item.S당시즌?.stock_price || 0) / 1000),
      '과시즌FW': Math.round((item.과시즌FW?.stock_price || 0) / 1000),
      '과시즌SS': Math.round((item.과시즌SS?.stock_price || 0) / 1000),
      '모자': Math.round((item.모자?.stock_price || 0) / 1000),
      '신발': Math.round((item.신발?.stock_price || 0) / 1000),
      '가방외': Math.round(((item.가방?.stock_price || 0) + (item.기타ACC?.stock_price || 0)) / 1000),
      total: Math.round((item.total?.stock_price || 0) / 1000)
    }));
    return result;
  }, [monthlyDashboardData]);

  const channelYOY = useMemo(() => {
    const yoy = monthlyDashboardData?.monthly_channel_yoy || {};
    return {
      'HK Retail': yoy.HK_Retail || [],
      'HK Outlet': yoy.HK_Outlet || [],
      'HK Online': yoy.HK_Online || [],
      'MC Retail': yoy.MC_Retail || [],
      'MC Outlet': yoy.MC_Outlet || []
    };
  }, [monthlyDashboardData]);

  const netSalesData = useMemo(() => {
    if (!monthlyDashboardData?.monthly_item_data) {
      // 데이터가 아직 로드 중일 때는 조용히 빈 배열 반환 (경고 제거)
      return [];
    }
    const result = monthlyDashboardData.monthly_item_data.map((item: any, idx: number) => {
      const month = `${item.period.slice(2, 4)}월`;
      return {
        month,
        '당시즌F': idx < 6 
          ? Math.round((item.당시즌S?.net_sales || 0) / 1000)
          : Math.round((item.당시즌F?.net_sales || 0) / 1000),
        '당시즌S': Math.round((item.당시즌S?.net_sales || 0) / 1000),
        '과시즌의류': Math.round(((item.과시즌F?.net_sales || 0) + (item.과시즌S?.net_sales || 0)) / 1000),
        '모자': Math.round((item.모자?.net_sales || 0) / 1000),
        '신발': Math.round((item.신발?.net_sales || 0) / 1000),
        '가방외': Math.round(((item.가방?.net_sales || 0) + (item.기타ACC?.net_sales || 0)) / 1000)
      };
    });
    return result;
  }, [monthlyDashboardData]);

  const grossSalesData = useMemo(() => {
    if (!monthlyDashboardData?.monthly_item_data) return [];
    return monthlyDashboardData.monthly_item_data.map((item: any, idx: number) => {
      const month = `${item.period.slice(2, 4)}월`;
      return {
        month,
        '당시즌F': idx < 6 
          ? Math.round((item.당시즌S?.gross_sales || 0) / 1000)
          : Math.round((item.당시즌F?.gross_sales || 0) / 1000),
        '당시즌S': Math.round((item.당시즌S?.gross_sales || 0) / 1000),
        '과시즌의류': Math.round(((item.과시즌F?.gross_sales || 0) + (item.과시즌S?.gross_sales || 0)) / 1000),
        '모자': Math.round((item.모자?.gross_sales || 0) / 1000),
        '신발': Math.round((item.신발?.gross_sales || 0) / 1000),
        '가방외': Math.round(((item.가방?.gross_sales || 0) + (item.기타ACC?.gross_sales || 0)) / 1000)
      };
    });
  }, [monthlyDashboardData]);

  const discountRateData = useMemo(() => {
    if (!grossSalesData || grossSalesData.length === 0 || !netSalesData || netSalesData.length === 0) return [];
    return grossSalesData.map((grossItem: any, idx: number) => ({
      month: grossItem.month,
      '당시즌F': grossItem['당시즌F'] > 0 
        ? Number(((grossItem['당시즌F'] - netSalesData[idx]['당시즌F']) / grossItem['당시즌F'] * 100).toFixed(1))
        : 0,
      '당시즌S': grossItem['당시즌S'] > 0
        ? Number(((grossItem['당시즌S'] - netSalesData[idx]['당시즌S']) / grossItem['당시즌S'] * 100).toFixed(1))
        : 0,
      '과시즌의류': grossItem['과시즌의류'] > 0
        ? Number(((grossItem['과시즌의류'] - netSalesData[idx]['과시즌의류']) / grossItem['과시즌의류'] * 100).toFixed(1))
        : 0,
      '모자': grossItem['모자'] > 0
        ? Number(((grossItem['모자'] - netSalesData[idx]['모자']) / grossItem['모자'] * 100).toFixed(1))
        : 0,
      '신발': grossItem['신발'] > 0
        ? Number(((grossItem['신발'] - netSalesData[idx]['신발']) / grossItem['신발'] * 100).toFixed(1))
        : 0,
      '가방외': grossItem['가방외'] > 0
        ? Number(((grossItem['가방외'] - netSalesData[idx]['가방외']) / grossItem['가방외'] * 100).toFixed(1))
        : 0
    }));
  }, [netSalesData, grossSalesData]);

  const salesItemYOY = useMemo(() => {
    const yoy = monthlyDashboardData?.monthly_item_yoy || {};
    return {
      '당시즌F': yoy.당시즌F || [],
      '당시즌S': yoy.당시즌S || [],
      '과시즌의류': yoy.과시즌의류 || [],
      '모자': yoy.모자 || [],
      '신발': yoy.신발 || [],
      '가방외': yoy.가방외 || [],
      '합계': yoy.합계 || []
    };
  }, [monthlyDashboardData]);

  const inventoryItemYOY = useMemo(() => {
    return monthlyDashboardData?.monthly_inventory_yoy || {
      'F당시즌': [],
      'S당시즌': [],
      '과시즌FW': [],
      '과시즌SS': [],
      '모자': [],
      '신발': [],
      '가방외': []
    };
  }, [monthlyDashboardData]);

  // 로딩 중 표시
  if (isLoading || !dashboardData || !plData || !monthlyDashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">누적 대시보드 데이터를 불러오는 중...</p>
          <p className="text-gray-500 text-sm mt-2">1~{currentMonth}월 누적 데이터 로딩</p>
        </div>
      </div>
    );
  }

  if (!dashboardData || !plData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">데이터를 불러올 수 없습니다</h2>
          <p className="text-gray-600 mb-4">누적 대시보드 JSON 파일이 없거나 형식이 올바르지 않습니다.</p>
          <div className="bg-gray-100 rounded p-3 text-left text-sm mb-4">
            <p className="font-semibold mb-2">필요한 파일:</p>
            <ul className="list-disc list-inside text-gray-700">
              <li>hongkong-dashboard-cumulative-{period}.json</li>
              <li>hongkong-pl-cumulative-{period}.json</li>
            </ul>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-purple-800 to-purple-600 text-white rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">홍콩법인 2025년 1~{currentMonth}월 누적 경영실적</h1>
          </div>
          <a 
            href="/"
            className="bg-white text-purple-800 hover:bg-purple-50 px-6 py-2 rounded-lg font-semibold transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            홈으로
          </a>
        </div>
      </div>

      {/* 홍콩법인 경영실적 (5개 카드) */}
      <div className="mb-4">
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <span className="text-3xl mr-3">🏢</span>
              홍콩법인 경영실적 (MLB 기준, 1K HKD)
            </h2>
            <button
              onClick={toggleAllDetails}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm font-semibold"
            >
              <span>{showSalesDetail ? '전체 접기' : '전체 펼치기'}</span>
              {showSalesDetail ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>
          
          {/* 첫 번째 줄 */}
          <div className="grid grid-cols-5 gap-4 mb-4">
            {/* 실판매출 카드 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-blue-500 hover:shadow-xl transition-shadow min-h-[400px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">📊</span>
                <h3 className="text-sm font-semibold text-gray-600">실판매출</h3>
              </div>
              <div className="text-3xl font-bold mb-2">
                {formatNumber(pl?.net_sales)}
              </div>
              <div className={`text-sm font-semibold mb-3 ${(plYoy?.net_sales || 0) >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                YOY {formatPercent(plYoy?.net_sales)}% ({formatChange(plChange?.net_sales || 0).text})
              </div>
              
              {/* 채널별 상세보기 */}
              <div className="border-t pt-3">
                <button 
                  onClick={() => setShowSalesDetail(!showSalesDetail)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                >
                  <span>채널별 상세보기</span>
                  {showSalesDetail ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              {showSalesDetail && (
                <div className="mt-3 pt-3 border-t space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-gray-700 mb-2">
                    <span>HK (홍콩)</span>
                    <span>
                      {(() => {
                        const hkCurrentTotal = ((hkRetail?.current?.net_sales || 0) + (hkOutlet?.current?.net_sales || 0) + (hkOnline?.current?.net_sales || 0)) / 1000;
                        const hkPrevTotal = ((hkRetail?.previous?.net_sales || 0) + (hkOutlet?.previous?.net_sales || 0) + (hkOnline?.previous?.net_sales || 0)) / 1000;
                        const hkYoy = hkPrevTotal > 0 ? (hkCurrentTotal / hkPrevTotal) * 100 : 0;
                        const colorClass = hkYoy >= 100 ? 'text-green-600' : 'text-red-600';
                        return (
                          <>
                            {formatNumber(hkCurrentTotal)} <span className={colorClass}>({formatPercent(hkYoy)}%)</span>
                          </>
                        );
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- 정상</span>
                    <span className="font-semibold">
                      {formatNumber((hkRetail?.current?.net_sales || 0) / 1000)} 
                      <span className={(hkRetail?.yoy || 0) >= 100 ? 'text-green-600' : 'text-red-600'}> ({formatPercent(hkRetail?.yoy || 0)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- 아울렛</span>
                    <span className="font-semibold">
                      {formatNumber((hkOutlet?.current?.net_sales || 0) / 1000)} 
                      <span className={(hkOutlet?.yoy || 0) >= 100 ? 'text-green-600' : 'text-red-600'}> ({formatPercent(hkOutlet?.yoy || 0)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- 온라인</span>
                    <span className="font-semibold">
                      {formatNumber((hkOnline?.current?.net_sales || 0) / 1000)} 
                      <span className={(hkOnline?.yoy || 0) >= 100 ? 'text-green-600' : 'text-red-600'}> ({formatPercent(hkOnline?.yoy || 0)}%)</span>
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-xs font-semibold text-gray-700 mt-3 pt-2 border-t">
                    <span>MC (마카오)</span>
                    <span>
                      {(() => {
                        const mcCurrentTotal = (mcRetail?.current?.net_sales || 0) + (mcOutlet?.current?.net_sales || 0);
                        const mcPreviousTotal = (mcRetail?.previous?.net_sales || 0) + (mcOutlet?.previous?.net_sales || 0);
                        const mcYoy = mcPreviousTotal > 0 ? (mcCurrentTotal / mcPreviousTotal) * 100 : 0;
                        const colorClass = mcYoy >= 100 ? 'text-green-600' : 'text-red-600';
                        return (
                          <>
                            {formatNumber(mcCurrentTotal / 1000)} <span className={colorClass}>({formatPercent(mcYoy)}%)</span>
                          </>
                        );
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- 정상</span>
                    <span className="font-semibold">
                      {formatNumber((mcRetail?.current?.net_sales || 0) / 1000)} 
                      <span className={(mcRetail?.yoy || 0) >= 100 ? 'text-green-600' : 'text-red-600'}> ({formatPercent(mcRetail?.yoy || 0)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- 아울렛</span>
                    <span className="font-semibold">
                      {formatNumber((mcOutlet?.current?.net_sales || 0) / 1000)} 
                      <span className={(mcOutlet?.yoy || 0) >= 100 ? 'text-green-600' : 'text-red-600'}> ({formatPercent(mcOutlet?.yoy || 0)}%)</span>
                    </span>
                  </div>
                </div>
              )}
              
            </div>

            {/* 할인율 카드 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-purple-500 hover:shadow-xl transition-shadow min-h-[400px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">🏷️</span>
                <h3 className="text-sm font-semibold text-gray-600">할인율</h3>
              </div>
              <div className={`text-3xl font-bold mb-2 ${((plData?.cumulative?.total?.discount_rate || 0) - prevCumulativeDiscountRate) <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercent(plData?.cumulative?.total?.discount_rate || 0, 1)}%
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className={((plData?.cumulative?.total?.discount_rate || 0) - prevCumulativeDiscountRate) <= 0 ? 'text-green-600' : 'text-red-600'}> {((plData?.cumulative?.total?.discount_rate || 0) - prevCumulativeDiscountRate) <= 0 ? '△' : '+'}{formatPercent(Math.abs((plData?.cumulative?.total?.discount_rate || 0) - prevCumulativeDiscountRate), 1)}%p</span>
              </div>
              
              {/* 할인 상세보기 */}
              <div className="border-t pt-3">
                <button 
                  onClick={() => setShowDiscountDetail(!showDiscountDetail)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                >
                  <span>채널별 할인율</span>
                  {showDiscountDetail ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              {showDiscountDetail && (
                <div className="mt-3 pt-3 border-t space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">HK (홍콩)</span>
                    <span className="font-semibold text-purple-600">
                      {formatPercent(plData?.cumulative?.hk?.discount_rate || 0, 1)}%
                      <span className={((plData?.cumulative?.hk?.discount_rate || 0) - prevCumulativeHKDiscountRate) <= 0 ? 'text-green-600' : 'text-red-600'}> ({((plData?.cumulative?.hk?.discount_rate || 0) - prevCumulativeHKDiscountRate) <= 0 ? '△' : '+'}{formatPercent(Math.abs((plData?.cumulative?.hk?.discount_rate || 0) - prevCumulativeHKDiscountRate), 1)}%p)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- 정상</span>
                    <span className="font-semibold">
                      {formatPercent(hkRetail?.current?.discount_rate || 0, 1)}%
                      {(() => {
                        const current = hkRetail?.current?.discount_rate || 0;
                        const previous = hkRetail?.previous?.discount_rate || 0;
                        const change = current - previous;
                        return change !== 0 ? (
                          <span className={change <= 0 ? 'text-green-600' : 'text-red-600'}> ({change <= 0 ? '△' : '+'}{formatPercent(Math.abs(change), 1)}%p)</span>
                        ) : null;
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- 아울렛</span>
                    <span className="font-semibold">
                      {formatPercent(hkOutlet?.current?.discount_rate || 0, 1)}%
                      {(() => {
                        const current = hkOutlet?.current?.discount_rate || 0;
                        const previous = hkOutlet?.previous?.discount_rate || 0;
                        const change = current - previous;
                        return change !== 0 ? (
                          <span className={change <= 0 ? 'text-green-600' : 'text-red-600'}> ({change <= 0 ? '△' : '+'}{formatPercent(Math.abs(change), 1)}%p)</span>
                        ) : null;
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- 온라인</span>
                    <span className="font-semibold">
                      {formatPercent(hkOnline?.current?.discount_rate || 0, 1)}%
                      {(() => {
                        const current = hkOnline?.current?.discount_rate || 0;
                        const previous = hkOnline?.previous?.discount_rate || 0;
                        const change = current - previous;
                        return change !== 0 ? (
                          <span className={change <= 0 ? 'text-green-600' : 'text-red-600'}> ({change <= 0 ? '△' : '+'}{formatPercent(Math.abs(change), 1)}%p)</span>
                        ) : null;
                      })()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-xs font-semibold mt-3 pt-2 border-t">
                    <span className="text-gray-700">MC (마카오)</span>
                    <span className="text-purple-600">
                      {formatPercent(plData?.cumulative?.mc?.discount_rate || 0, 1)}%
                      <span className={((plData?.cumulative?.mc?.discount_rate || 0) - prevCumulativeMCDiscountRate) <= 0 ? 'text-green-600' : 'text-red-600'}> ({((plData?.cumulative?.mc?.discount_rate || 0) - prevCumulativeMCDiscountRate) <= 0 ? '△' : '+'}{formatPercent(Math.abs((plData?.cumulative?.mc?.discount_rate || 0) - prevCumulativeMCDiscountRate), 1)}%p)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- 정상</span>
                    <span className="font-semibold">
                      {formatPercent(mcRetail?.current?.discount_rate || 0, 1)}%
                      {(() => {
                        const current = mcRetail?.current?.discount_rate || 0;
                        const previous = mcRetail?.previous?.discount_rate || 0;
                        const change = current - previous;
                        return change !== 0 ? (
                          <span className={change <= 0 ? 'text-green-600' : 'text-red-600'}> ({change <= 0 ? '△' : '+'}{formatPercent(Math.abs(change), 1)}%p)</span>
                        ) : null;
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- 아울렛</span>
                    <span className="font-semibold">
                      {formatPercent(mcOutlet?.current?.discount_rate || 0, 1)}%
                      {(() => {
                        const current = mcOutlet?.current?.discount_rate || 0;
                        const previous = mcOutlet?.previous?.discount_rate || 0;
                        const change = current - previous;
                        return change !== 0 ? (
                          <span className={change <= 0 ? 'text-green-600' : 'text-red-600'}> ({change <= 0 ? '△' : '+'}{formatPercent(Math.abs(change), 1)}%p)</span>
                        ) : null;
                      })()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 영업이익 카드 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-orange-500 hover:shadow-xl transition-shadow min-h-[400px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">💰</span>
                <h3 className="text-sm font-semibold text-gray-600">영업이익</h3>
              </div>
              <div className={`text-3xl font-bold mb-2 ${(plData?.cumulative?.total?.operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatNumber(plData?.cumulative?.total?.operating_profit)}
              </div>
              <div className="text-sm font-semibold mb-3">
                {(plData?.cumulative?.total?.operating_profit || 0) >= 0 ? (
                  <span className="text-green-600">흑자전환</span>
                ) : (
                  <span className="text-red-600">{(plData?.cumulative?.change?.operating_profit || 0) < 0 ? '적자악화' : '적자개선'}</span>
                )} | <span className={(plData?.cumulative?.total?.operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>이익률 {formatPercent(plData?.cumulative?.total?.operating_profit_rate, 1)}%</span>
              </div>
              
              {/* 채널별 직접이익[이익률] */}
              <div className="border-t pt-3">
                <button 
                  onClick={() => setShowProfitDetail(!showProfitDetail)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                >
                  <span>채널별 직접이익[이익률]</span>
                  {showProfitDetail ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              {showProfitDetail && (
                <div className="mt-3 pt-3 border-t space-y-1">
                  {(() => {
                    // 누적 데이터 사용 (손익요약표와 동일)
                    const cumHK = plData?.cumulative?.hk || {};
                    const cumMC = plData?.cumulative?.mc || {};
                    const cumPrevHK = plData?.cumulative?.prev_cumulative?.hk || {};
                    const cumPrevMC = plData?.cumulative?.prev_cumulative?.mc || {};
                    
                    // HK 오프라인: HK 전체에서 온라인 제외 (누적 데이터로 온라인 비율 계산)
                    // 누적 채널별 매출 데이터 사용
                    const monthlyChannelData = monthlyDashboardData?.monthly_channel_data || [];
                    const hkOnlineCumulative = monthlyChannelData.reduce((sum: number, item: any) => sum + (item.HK_Online || 0), 0);
                    const hkTotalCumulative = monthlyChannelData.reduce((sum: number, item: any) => sum + (item.HK_Retail || 0) + (item.HK_Outlet || 0) + (item.HK_Online || 0), 0);
                    const hkOnlineRate = hkTotalCumulative > 0 ? (hkOnlineCumulative / hkTotalCumulative) : 0;
                    const hkTotalCurrent = cumHK.net_sales || 0;
                    const hkOfflineDirectProfit = (cumHK.direct_profit || 0) * (1 - hkOnlineRate);
                    const hkOfflineNetSales = hkTotalCurrent * (1 - hkOnlineRate);
                    const hkOfflinePrevDirectProfit = (cumPrevHK.direct_profit || 0) * (1 - hkOnlineRate);
                    const hkOfflinePrevNetSales = (cumPrevHK.net_sales || 0) * (1 - hkOnlineRate);
                    const hkOfflineYoy = hkOfflinePrevDirectProfit > 0 ? (hkOfflineDirectProfit / hkOfflinePrevDirectProfit * 100) : (hkOfflinePrevDirectProfit < 0 && hkOfflineDirectProfit >= 0 ? null : 0);
                    const hkOfflineRate = hkOfflineNetSales > 0 ? (hkOfflineDirectProfit / hkOfflineNetSales * 100) : 0;
                    
                    // HK 온라인
                    const hkOnlineDirectProfit = (cumHK.direct_profit || 0) * hkOnlineRate;
                    const hkOnlineNetSales = hkTotalCurrent * hkOnlineRate;
                    const hkOnlinePrevDirectProfit = (cumPrevHK.direct_profit || 0) * hkOnlineRate;
                    const hkOnlinePrevNetSales = (cumPrevHK.net_sales || 0) * hkOnlineRate;
                    const hkOnlineYoy = hkOnlinePrevDirectProfit > 0 ? (hkOnlineDirectProfit / hkOnlinePrevDirectProfit * 100) : (hkOnlinePrevDirectProfit < 0 && hkOnlineDirectProfit >= 0 ? null : 0);
                    const hkOnlineRateValue = hkOnlineNetSales > 0 ? (hkOnlineDirectProfit / hkOnlineNetSales * 100) : 0;
                    
                    // MC 오프라인 (MC는 오프라인만)
                    const mcOfflineDirectProfit = cumMC.direct_profit || 0;
                    const mcOfflineNetSales = cumMC.net_sales || 0;
                    const mcOfflinePrevDirectProfit = cumPrevMC.direct_profit || 0;
                    const mcOfflinePrevNetSales = cumPrevMC.net_sales || 0;
                    const mcOfflineYoy = mcOfflinePrevDirectProfit > 0 ? (mcOfflineDirectProfit / mcOfflinePrevDirectProfit * 100) : (mcOfflinePrevDirectProfit < 0 && mcOfflineDirectProfit >= 0 ? null : 0);
                    const mcOfflineRate = mcOfflineNetSales > 0 ? (mcOfflineDirectProfit / mcOfflineNetSales * 100) : 0;
                    
                    // 전체 직접이익 (누적)
                    const totalDirectProfit = (cumHK.direct_profit || 0) + (cumMC.direct_profit || 0);
                    const totalPrevDirectProfit = (cumPrevHK.direct_profit || 0) + (cumPrevMC.direct_profit || 0);
                    const totalYoy = totalPrevDirectProfit > 0 ? (totalDirectProfit / totalPrevDirectProfit * 100) : 0;
                    const totalNetSales = (cumHK.net_sales || 0) + (cumMC.net_sales || 0);
                    const totalRate = totalNetSales > 0 ? (totalDirectProfit / totalNetSales * 100) : 0;
                    
                    return (
                      <>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">HK 오프라인</span>
                          <span className={`font-semibold ${hkOfflineDirectProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatNumber(hkOfflineDirectProfit)} 
                            <span className={hkOfflineYoy === null || hkOfflineYoy === undefined ? 'text-green-600' : ((hkOfflineYoy || 0) >= 100 ? 'text-green-600' : 'text-red-600')}> ({hkOfflineYoy === null || hkOfflineYoy === undefined ? '흑자전환' : `${formatPercent(hkOfflineYoy)}%`})</span> 
                            <span className="text-blue-600"> [{formatPercent(hkOfflineRate, 1)}%]</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">MC 오프라인</span>
                          <span className={`font-semibold ${mcOfflineDirectProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatNumber(mcOfflineDirectProfit)} 
                            <span className={mcOfflineYoy === null || mcOfflineYoy === undefined ? 'text-green-600' : ((mcOfflineYoy || 0) >= 100 ? 'text-green-600' : 'text-red-600')}> ({mcOfflineYoy === null || mcOfflineYoy === undefined ? '흑자전환' : `${formatPercent(mcOfflineYoy)}%`})</span> 
                            <span className="text-blue-600"> [{formatPercent(mcOfflineRate, 1)}%]</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">HK 온라인</span>
                          <span className={`font-semibold ${hkOnlineDirectProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatNumber(hkOnlineDirectProfit)} 
                            <span className={hkOnlineYoy === null || hkOnlineYoy === undefined ? 'text-green-600' : ((hkOnlineYoy || 0) >= 100 ? 'text-green-600' : 'text-red-600')}> ({hkOnlineYoy === null || hkOnlineYoy === undefined ? '흑자전환' : `${formatPercent(hkOnlineYoy)}%`})</span> 
                            <span className="text-blue-600"> [{formatPercent(hkOnlineRateValue, 1)}%]</span>
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-xs font-semibold mt-2 pt-2 border-t">
                    <span className="text-gray-700">전체 직접이익</span>
                          <span className={totalDirectProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatNumber(totalDirectProfit)} 
                            <span className={(totalYoy || 0) >= 100 ? 'text-green-600' : 'text-red-600'}> ({formatPercent(totalYoy)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-700">직접이익률</span>
                          <span className={totalDirectProfit >= 0 ? 'text-green-600' : 'text-red-600'}>{formatPercent(totalRate, 1)}%</span>
                  </div>
                      </>
                    );
                  })()}
                </div>
              )}
              
              {/* 손익 구조 */}
              <div className="border-t pt-3 mt-3">
                <button 
                  onClick={() => setShowItemProfitDetail(!showItemProfitDetail)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                >
                  <span>손익 구조</span>
                  {showItemProfitDetail ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              {showItemProfitDetail && (
                <div className="mt-2 pt-2 border-t">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg">
                    <div className="text-xs text-gray-600 mb-3 font-semibold">
                      💰 Tag매출대비 백분율 기준 PL
                    </div>
                      {(() => {
                        // 누적 데이터 사용 (손익요약표와 동일)
                        const cumTotal = plData?.cumulative?.total || {};
                        const tagSales = cumTotal?.tag_sales || 1;
                        const discount = (cumTotal?.tag_sales || 0) - (cumTotal?.net_sales || 0);
                        const discountPct = (discount / tagSales * 100);
                        const netSalesPct = ((cumTotal?.net_sales || 0) / tagSales * 100);
                        const cogsPct = ((cumTotal?.cogs || 0) / tagSales * 100);
                        const grossProfitPct = ((cumTotal?.gross_profit || 0) / tagSales * 100);
                        const directCostPct = ((cumTotal?.direct_cost || 0) / tagSales * 100);
                        const directProfitPct = ((cumTotal?.direct_profit || 0) / tagSales * 100);
                        const sgaPct = ((cumTotal?.sg_a || 0) / tagSales * 100);
                        const opProfitPct = ((cumTotal?.operating_profit || 0) / tagSales * 100);
                      
                      const maxHeight = 200; // 최대 높이 (px)
                        
                        return (
                        <div className="flex items-start justify-center gap-2 py-4">
                            {/* 택매출 */}
                          <div className="flex flex-col items-center w-16">
                            <div className="text-xs font-bold text-blue-900 mb-1">{formatNumber(cumTotal?.tag_sales || 0)}K</div>
                            <div className="w-12 bg-blue-600 rounded-t-md flex items-start justify-center pt-2" style={{height: `${maxHeight}px`}}>
                              <span className="text-white text-sm font-bold">100%</span>
                                </div>
                            <div className="text-[10px] font-semibold text-gray-700 mt-2 h-5">택매출</div>
                            <div className="text-xs text-blue-900 font-bold h-6 flex items-center">100.0%</div>
                            <div className="text-[10px] text-gray-600 h-10">&nbsp;</div>
                            </div>

                            {/* 실판매출 */}
                          <div className="flex flex-col items-center w-16">
                            <div className="text-xs font-bold text-blue-700 mb-1">{formatNumber(cumTotal?.net_sales || 0)}K</div>
                            <div className="w-12 rounded-t-md flex flex-col overflow-hidden" style={{height: `${maxHeight}px`}}>
                              <div className="bg-gray-400 flex items-center justify-center flex-shrink-0" style={{height: `${maxHeight * discountPct / 100}px`}}>
                                <span className="text-gray-900 text-[9px] font-semibold">할인<br/>{formatPercent(discountPct, 1)}%</span>
                                </div>
                              <div className="bg-blue-500 flex-1 flex items-start justify-center pt-2">
                                <span className="text-white text-sm font-bold">{formatPercent(netSalesPct, 1)}%</span>
                              </div>
                                  </div>
                            <div className="text-[10px] font-semibold text-gray-700 mt-2 h-5 whitespace-nowrap">실판매출</div>
                            <div className="text-xs text-blue-700 font-bold h-6 flex items-center">{formatPercent(netSalesPct, 1)}%</div>
                            <div className="text-[10px] text-gray-600 h-10 flex flex-col items-center justify-start">
                              <div>할인</div>
                              <div>({formatPercent(discountPct, 1)}%)</div>
                              </div>
                            </div>

                          {/* 총이익 */}
                          <div className="flex flex-col items-center w-16">
                            <div className="text-xs font-bold text-green-700 mb-1">{formatNumber(cumTotal?.gross_profit || 0)}K</div>
                            <div className="w-12 rounded-t-md flex flex-col overflow-hidden" style={{height: `${maxHeight}px`}}>
                              <div className="bg-gray-400 flex items-center justify-center flex-shrink-0" style={{height: `${maxHeight * discountPct / 100}px`}}>
                                <span className="text-gray-900 text-[9px] font-semibold">할인<br/>{formatPercent(discountPct, 1)}%</span>
                                </div>
                              <div className="bg-gray-500 flex items-center justify-center flex-shrink-0" style={{height: `${maxHeight * cogsPct / 100}px`}}>
                                <span className="text-white text-[9px] font-semibold">원가<br/>{formatPercent(cogsPct, 1)}%</span>
                              </div>
                              <div className="bg-green-600 flex-1 flex items-start justify-center pt-2">
                                <span className="text-white text-sm font-bold">{formatPercent(grossProfitPct, 1)}%</span>
                                  </div>
                                  </div>
                            <div className="text-[10px] font-semibold text-gray-700 mt-2 h-5">총이익</div>
                            <div className="text-xs text-green-700 font-bold h-6 flex items-center">{formatPercent(grossProfitPct, 1)}%</div>
                            <div className="text-[10px] text-gray-600 h-10 flex flex-col items-center justify-start">
                              <div>원가</div>
                              <div>({formatPercent(cogsPct, 1)}%)</div>
                              </div>
                            </div>

                            {/* 직접이익 */}
                          <div className="flex flex-col items-center w-16">
                            <div className={`text-xs font-bold mb-1 ${(cumTotal?.direct_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatNumber(cumTotal?.direct_profit || 0)}K</div>
                            <div className="w-12 rounded-t-md flex flex-col overflow-hidden" style={{height: `${maxHeight}px`}}>
                              <div className="bg-gray-400 flex items-center justify-center flex-shrink-0" style={{height: `${maxHeight * discountPct / 100}px`}}>
                                <span className="text-gray-900 text-[9px] font-semibold">할인<br/>{formatPercent(discountPct, 1)}%</span>
                                </div>
                              <div className="bg-gray-500 flex items-center justify-center flex-shrink-0" style={{height: `${maxHeight * cogsPct / 100}px`}}>
                                <span className="text-white text-[9px] font-semibold">원가<br/>{formatPercent(cogsPct, 1)}%</span>
                              </div>
                              <div className="bg-gray-600 flex items-center justify-center flex-shrink-0" style={{height: `${maxHeight * directCostPct / 100}px`}}>
                                <span className="text-white text-[9px] font-semibold">직접비<br/>{formatPercent(directCostPct, 1)}%</span>
                                  </div>
                              <div className={`flex-1 ${(cumTotal?.direct_profit || 0) >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                                  </div>
                                  </div>
                            <div className="text-[10px] font-semibold text-gray-700 mt-2 h-5 whitespace-nowrap">직접이익</div>
                            <div className={`text-xs font-bold h-6 flex items-center ${(cumTotal?.direct_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercent(directProfitPct, 1)}%</div>
                            <div className="text-[10px] text-gray-600 h-10 flex flex-col items-center justify-start">
                              <div>직접비</div>
                              <div>({formatPercent(directCostPct, 1)}%)</div>
                              </div>
                            </div>

                            {/* 영업이익 */}
                          <div className="flex flex-col items-center w-16">
                            <div className={`text-xs font-bold mb-1 ${(cumTotal?.operating_profit || 0) >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                              {formatNumber(cumTotal?.operating_profit || 0)}K
                                </div>
                            <div className="w-12 rounded-t-md flex flex-col overflow-hidden" style={{height: `${maxHeight}px`}}>
                              <div className="bg-gray-400 flex items-center justify-center flex-shrink-0" style={{height: `${maxHeight * discountPct / 100}px`}}>
                                <span className="text-gray-900 text-[9px] font-semibold">할인<br/>{formatPercent(discountPct, 1)}%</span>
                              </div>
                              <div className="bg-gray-500 flex items-center justify-center flex-shrink-0" style={{height: `${maxHeight * cogsPct / 100}px`}}>
                                <span className="text-white text-[9px] font-semibold">원가<br/>{formatPercent(cogsPct, 1)}%</span>
                                  </div>
                              <div className="bg-gray-600 flex items-center justify-center flex-shrink-0" style={{height: `${maxHeight * directCostPct / 100}px`}}>
                                <span className="text-white text-[9px] font-semibold">직접비<br/>{formatPercent(directCostPct, 1)}%</span>
                                  </div>
                              <div className="bg-gray-700 flex items-center justify-center flex-shrink-0" style={{height: `${maxHeight * sgaPct / 100}px`}}>
                                <span className="text-white text-[9px] font-semibold">영업비<br/>{formatPercent(sgaPct, 1)}%</span>
                                  </div>
                              <div className={`flex-1 ${(cumTotal?.operating_profit || 0) >= 0 ? 'bg-green-400' : 'bg-red-600'}`}>
                                  </div>
                                  </div>
                            <div className="text-[10px] font-semibold text-gray-700 mt-2 h-5 whitespace-nowrap">영업이익</div>
                            <div className={`text-xs font-bold h-6 flex items-center ${(cumTotal?.operating_profit || 0) >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                              {formatPercent(opProfitPct, 1)}%
                                </div>
                            <div className="text-[10px] text-gray-600 h-10 flex flex-col items-center justify-start">
                              <div>영업비</div>
                              <div>({formatPercent(sgaPct, 1)}%)</div>
                              </div>
                              </div>
                            </div>
                        );
                      })()}
                  </div>
                </div>
              )}
              
              {/* 디스커버리 참고 실적 */}
              {plData.discovery && (
                <div className="border-t pt-3 mt-3">
                  <button 
                    onClick={() => setShowDiscoveryDetail(!showDiscoveryDetail)}
                    className="text-xs text-purple-600 hover:text-purple-800 font-semibold flex items-center w-full justify-between mb-2"
                  >
                    <span>📊 참고: 디스커버리 실적 (1K HKD)</span>
                    {showDiscoveryDetail ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  
                  {showDiscoveryDetail && (
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                      <div className="text-[10px] text-purple-600 mb-2">
                        온라인{plData?.discovery?.store_count?.online || 0}개, 오프라인{plData?.discovery?.store_count?.offline || 0}개 (10/1 영업개시)
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-purple-700">실판매출</span>
                          <span className="font-semibold text-purple-900">
                            {formatNumber(plData?.discovery?.net_sales)} 
                            <span className="text-purple-600"> (할인율 {formatPercent(plData?.discovery?.discount_rate, 1)}%)</span>
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-700">직접비</span>
                          <span className="font-semibold text-purple-900">{formatNumber(plData?.discovery?.direct_cost)}</span>
                        </div>
                        <div className="flex justify-between font-semibold bg-purple-100 px-2 py-1 rounded">
                          <span className="text-purple-800">직접손실</span>
                          <span className="text-red-700">{formatNumber(plData?.discovery?.direct_profit)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] pl-2">
                          <span className="text-purple-600">• 마케팅비</span>
                          <span className="text-purple-700">{formatNumber(plData?.discovery?.marketing)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] pl-2">
                          <span className="text-purple-600">• 여비교통비</span>
                          <span className="text-purple-700">{formatNumber(plData?.discovery?.travel)}</span>
                        </div>
                        <div className="flex justify-between font-bold bg-red-100 px-2 py-1 rounded mt-1">
                          <span className="text-red-800">영업손실</span>
                          <span className="text-red-700">{formatNumber(plData?.discovery?.operating_profit)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 영업비 카드 - 다음 파일에서 계속 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-green-500 hover:shadow-xl transition-shadow min-h-[400px]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">📈</span>
                  <h3 className="text-sm font-semibold text-gray-600">영업비</h3>
                </div>
                
                {/* 당월/누적 토글 */}
                <div className="flex gap-1">
                  <button
                    onClick={() => setExpenseType('당월')}
                    className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${
                      expenseType === '당월'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    당월
                  </button>
                  <button
                    onClick={() => setExpenseType('누적')}
                    className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${
                      expenseType === '누적'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    누적
                  </button>
                </div>
              </div>
              
              {expenseType === '당월' ? (
                <>
                  <div className={`text-3xl font-bold mb-2 ${(plYoy?.sg_a || 0) >= 100 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatNumber(pl?.sg_a)}
                  </div>
                  <div className="text-sm font-semibold mb-3">
                    <span className={(plYoy?.sg_a || 0) >= 100 ? 'text-red-600' : 'text-green-600'}>YOY {formatPercent(plYoy?.sg_a)}%</span> | 
                    <span className="text-blue-600"> 영업비율 {formatPercent(((pl?.sg_a || 0) / (pl?.net_sales || 1)) * 100, 1)}%</span>
                  </div>
                  
                  {/* 영업비 상세보기 */}
                  <div className="border-t pt-3">
                    <button 
                      onClick={() => setShowExpenseDetail(!showExpenseDetail)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                    >
                      <span>영업비 상세보기</span>
                      {showExpenseDetail ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {showExpenseDetail && (
                    <div className="mt-3 pt-3 border-t space-y-1">
                      {(() => {
                        // 영업비 상세 데이터 (plData에서 추출)
                        const expenseDetail = plData?.current_month?.total?.expense_detail || {};
                        const expenseDetailPrev = plData?.prev_month?.total?.expense_detail || {};
                        
                        console.log('당월 영업비 상세 렌더링:', {
                          expenseDetail,
                          expenseDetailKeys: Object.keys(expenseDetail),
                          other_detail: expenseDetail.other_detail
                        });
                        
                        // 상세 항목 정의
                        const expenseItems = [
                          { key: 'salary', label: '급여', color: 'red' },
                          { key: 'marketing', label: '마케팅비', color: 'red' },
                          { key: 'fee', label: '지급수수료', color: 'green' },
                          { key: 'rent', label: '임차료', color: 'green' },
                          { key: 'insurance', label: '보험료', color: 'red' },
                          { key: 'travel', label: '여비교통비', color: 'red' },
                          { key: 'other', label: '기타', color: 'gray' }
                        ];
                        
                        // 데이터가 있는지 확인
                        const hasData = expenseItems.some(item => (expenseDetail as any)[item.key] !== undefined);
                        
                        if (!hasData) {
                          // 데이터가 없으면 기본 구조만 표시
                          const otherDetailLabels: {[key: string]: string} = {
                            'depreciation': '감가상각비',
                            'duty_free': '면세점 직접비',
                            'govt_license': '정부세금 및 라이센스',
                            'logistics': '운반비',
                            'maintenance': '유지보수비',
                            'other_fee': '기타 수수료',
                            'rent_free': '임대료 면제/할인',
                            'retirement': '퇴직연금',
                            'supplies': '소모품비',
                            'transport': '운반비(기타)',
                            'uniform': '피복비(유니폼)',
                            'utilities': '수도광열비',
                            'var_rent': '매출연동 임대료',
                            'communication': '통신비',
                            'bonus': '최종지급금'
                          };
                          
                          return (
                            <div className="space-y-1">
                              {expenseItems.map((item) => {
                                console.log('expenseItems.map - item:', item.key, item);
                                const current = (expenseDetail as any)[item.key] || 0;
                                const previous = (expenseDetailPrev as any)[item.key] || 0;
                                // YOY 계산: previous가 0이 아니면 계산 (음수도 포함)
                                let yoy = 0;
                                let showYoy = false;
                                if (previous !== 0) {
                                  yoy = (current / previous) * 100;
                                  showYoy = true;
                                } else if (previous === 0 && current !== 0) {
                                  // 전년도가 0이고 현재가 0이 아니면 증가로 표시
                                  yoy = Infinity;
                                  showYoy = true;
                                }
                                const colorClass = yoy >= 100 ? 'text-red-600' : 'text-green-600';
                                
                                // 기타 항목인 경우 토글 기능 추가
                                if (item.key === 'other') {
                                  const otherDetail = expenseDetail.other_detail || {};
                                  const otherDetailPrev = expenseDetailPrev.other_detail || {};
                                  // otherDetail에 0보다 큰 값이 있는지 확인
                                  const hasOtherDetail = otherDetail && 
                                    Object.keys(otherDetail).length > 0 && 
                                    Object.values(otherDetail).some((val: any) => {
                                      const numVal = Number(val);
                                      return !isNaN(numVal) && numVal > 0;
                                    });
                                  
                                  // 디버깅 로그
                                  console.log('기타 항목 렌더링:', { 
                                    itemKey: item.key,
                                    hasOtherDetail, 
                                    otherDetailKeys: Object.keys(otherDetail),
                                    otherDetailValues: Object.values(otherDetail),
                                    showOtherDetail,
                                    otherDetail
                                  });
                                  
                                  return (
                                    <div key={item.key}>
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          console.log('기타 토글 클릭:', { 
                                            showOtherDetail, 
                                            hasOtherDetail, 
                                            otherDetail,
                                            currentShowOtherDetail: showOtherDetail
                                          });
                                          setShowOtherDetail(!showOtherDetail);
                                        }}
                                        className="flex justify-between items-center w-full text-xs hover:bg-gray-50 rounded px-1 py-0.5 -mx-1"
                                      >
                                        <span className="text-gray-600">{item.label}</span>
                                        <span className="font-semibold flex items-center gap-1">
                                          {formatNumber(current)} 
                                          {showYoy && (
                                            <span className={colorClass}>
                                              ({yoy === Infinity ? '신규' : formatPercent(yoy)}%)
                                            </span>
                                          )}
                                          {hasOtherDetail ? (
                                            showOtherDetail ? (
                                              <ChevronDown className="w-3 h-3 text-gray-400" />
                                            ) : (
                                              <ChevronRight className="w-3 h-3 text-gray-400" />
                                            )
                                          ) : null}
                                        </span>
                                      </button>
                                      {showOtherDetail && hasOtherDetail && (
                                        <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-gray-200 pl-2">
                                          {Object.entries(otherDetail)
                                            .filter(([key, value]: [string, any]) => value !== 0)
                                            .sort(([, a]: [string, any], [, b]: [string, any]) => Number(b) - Number(a))
                                            .map(([key, value]: [string, any]) => {
                                            const prevValue = (otherDetailPrev as any)[key] || 0;
                                            let detailYoy = 0;
                                            let showDetailYoy = false;
                                            if (prevValue !== 0) {
                                              detailYoy = (value / prevValue) * 100;
                                              showDetailYoy = true;
                                            } else if (prevValue === 0 && value !== 0) {
                                              detailYoy = Infinity;
                                              showDetailYoy = true;
                                            }
                                            const detailColorClass = detailYoy >= 100 ? 'text-red-600' : 'text-green-600';
                                            
                                            return (
                                              <div key={key} className="flex justify-between text-[10px]">
                                                <span className="text-gray-500">{otherDetailLabels[key] || key}</span>
                                                <span className="font-semibold">
                                                  {formatNumber(value)}
                                                  {showDetailYoy && (
                                                    <span className={`ml-1 ${detailColorClass}`}>
                                                      ({detailYoy === Infinity ? '신규' : formatPercent(detailYoy)}%)
                                                    </span>
                                                  )}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                                
                                return (
                                  <div key={item.key} className="flex justify-between text-xs">
                                    <span className="text-gray-600">{item.label}</span>
                                    <span className="font-semibold">
                                      {formatNumber(current)} 
                                      {showYoy && (
                                        <span className={`ml-1 ${colorClass}`}>
                                          ({yoy === Infinity ? '신규' : formatPercent(yoy)}%)
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }
                        
                        // 데이터가 있으면 실제 값 표시
                        return (
                          <div className="space-y-1">
                            {expenseItems.map((item) => {
                              console.log('expenseItems.map (hasData=true) - item:', item.key, item);
                              const current = (expenseDetail as any)[item.key] || 0;
                              const previous = (expenseDetailPrev as any)[item.key] || 0;
                              const yoy = previous > 0 ? ((current / previous) * 100) : 0;
                              const colorClass = yoy >= 100 ? 'text-red-600' : 'text-green-600';
                              
                              // 기타 항목인 경우 토글 기능 추가
                              if (item.key === 'other') {
                                console.log('기타 항목 처리 시작:', { itemKey: item.key, current, previous });
                                const otherDetail = expenseDetail.other_detail || {};
                                const otherDetailPrev = expenseDetailPrev.other_detail || {};
                                const hasOtherDetail = otherDetail && 
                                  Object.keys(otherDetail).length > 0 && 
                                  Object.values(otherDetail).some((val: any) => {
                                    const numVal = Number(val);
                                    return !isNaN(numVal) && numVal > 0;
                                  });
                                
                                console.log('기타 항목 렌더링 (hasData=true):', { 
                                  hasOtherDetail, 
                                  otherDetailKeys: Object.keys(otherDetail),
                                  otherDetailValues: Object.values(otherDetail),
                                  showOtherDetail,
                                  otherDetail
                                });
                                
                                return (
                                  <div key={item.key}>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        console.log('기타 토글 클릭 (hasData=true):', { 
                                          showOtherDetail, 
                                          hasOtherDetail, 
                                          otherDetail,
                                          currentShowOtherDetail: showOtherDetail
                                        });
                                        setShowOtherDetail(!showOtherDetail);
                                      }}
                                      className="flex justify-between items-center w-full text-xs hover:bg-gray-50 rounded px-1 py-0.5 -mx-1"
                                    >
                                      <span className="text-gray-600">{item.label}</span>
                                      <span className="font-semibold flex items-center gap-1">
                                        {formatNumber(current)} 
                                        {yoy > 0 && (
                                          <span className={colorClass}>
                                            ({formatPercent(yoy)}%)
                                          </span>
                                        )}
                                        {hasOtherDetail ? (
                                          showOtherDetail ? (
                                            <ChevronDown className="w-3 h-3 text-gray-400" />
                                          ) : (
                                            <ChevronRight className="w-3 h-3 text-gray-400" />
                                          )
                                        ) : null}
                                      </span>
                                    </button>
                                    {showOtherDetail && hasOtherDetail && (
                                      <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-gray-200 pl-2">
                                        {Object.entries(otherDetail)
                                          .filter(([key, value]: [string, any]) => value !== 0)
                                          .sort(([, a]: [string, any], [, b]: [string, any]) => Number(b) - Number(a))
                                          .map(([key, value]: [string, any]) => {
                                          const prevValue = (otherDetailPrev as any)[key] || 0;
                                          const detailYoy = prevValue > 0 ? ((value / prevValue) * 100) : 0;
                                          const detailColorClass = detailYoy >= 100 ? 'text-red-600' : 'text-green-600';
                                          
                                          const otherDetailLabels: {[key: string]: string} = {
                                            'depreciation': '감가상각비',
                                            'duty_free': '면세점 직접비',
                                            'govt_license': '정부세금 및 라이센스',
                                            'logistics': '운반비',
                                            'maintenance': '유지보수비',
                                            'other_fee': '기타 수수료',
                                            'rent_free': '임대료 면제/할인',
                                            'retirement': '퇴직연금',
                                            'supplies': '소모품비',
                                            'transport': '운반비(기타)',
                                            'uniform': '피복비(유니폼)',
                                            'utilities': '수도광열비',
                                            'var_rent': '매출연동 임대료',
                                            'communication': '통신비',
                                            'bonus': '최종지급금'
                                          };
                                          
                                          return (
                                            <div key={key} className="flex justify-between text-[10px]">
                                              <span className="text-gray-500">{otherDetailLabels[key] || key}</span>
                                              <span className="font-semibold">
                                                {formatNumber(value)}
                                                {prevValue > 0 && (
                                                  <span className={`ml-1 ${detailColorClass}`}>
                                                    ({formatPercent(detailYoy)}%)
                                                  </span>
                                                )}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              
                              return (
                                <div key={item.key} className="flex justify-between text-xs">
                                  <span className="text-gray-600">{item.label}</span>
                                  <span className="font-semibold">
                                    {formatNumber(current)} 
                                    {yoy > 0 && (
                                      <span className={`ml-1 ${colorClass}`}>
                                        ({formatPercent(yoy)}%)
                                      </span>
                                    )}
                                  </span>
                                </div>
                              );
                            })}
                            
                            {/* 당월 급여 증가 사유 */}
                            {(() => {
                              const salaryCurrent = (expenseDetail as any).salary || 0;
                              const salaryPrev = (expenseDetailPrev as any).salary || 0;
                              const salaryChange = salaryCurrent - salaryPrev;
                              
                              if (salaryChange > 0) {
                                return (
                                  <div className="mt-3 pt-3 border-t border-blue-200">
                                    <div className="text-xs font-semibold text-blue-700 mb-2">당월 급여 증가 {formatNumber(salaryChange)}K</div>
                                    <div className="text-xs text-gray-600 space-y-1">
                                      <div>인원수 11명 → 15명 (136%)</div>
                                      <div>MD+1, VM+1, Logi+1, Ecom+1</div>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className={`text-3xl font-bold mb-2 ${(plData?.cumulative?.yoy?.sg_a || 0) >= 100 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatNumber(plData?.cumulative?.total?.sg_a || 0)}
                  </div>
                  <div className="text-sm font-semibold mb-3">
                    <span className={(plData?.cumulative?.yoy?.sg_a || 0) >= 100 ? 'text-red-600' : 'text-green-600'}>YOY {formatPercent(plData?.cumulative?.yoy?.sg_a || 0)}%</span> | 
                    <span className="text-blue-600"> 영업비율 {formatPercent(((plData?.cumulative?.total?.sg_a || 0) / (plData?.cumulative?.total?.net_sales || 1)) * 100, 1)}%</span>
                  </div>
                  
                  {/* 영업비 상세보기 */}
                  <div className="border-t pt-3">
                    <button 
                      onClick={() => setShowExpenseDetail(!showExpenseDetail)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                    >
                      <span>영업비 상세보기</span>
                      {showExpenseDetail ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {showExpenseDetail && (
                    <div className="mt-3 pt-3 border-t space-y-1">
                      {(() => {
                        // 누적 영업비 상세 데이터
                        const expenseDetail = plData?.cumulative?.total?.expense_detail || {};
                        const expenseDetailPrev = plData?.cumulative?.prev_cumulative?.total?.expense_detail || {};
                        
                        // 상세 항목 정의
                        const expenseItems = [
                          { key: 'salary', label: '급여', color: 'red' },
                          { key: 'marketing', label: '마케팅비', color: 'red' },
                          { key: 'fee', label: '지급수수료', color: 'green' },
                          { key: 'rent', label: '임차료', color: 'green' },
                          { key: 'insurance', label: '보험료', color: 'red' },
                          { key: 'travel', label: '여비교통비', color: 'red' },
                          { key: 'other', label: '기타', color: 'gray' }
                        ];
                        
                        const otherDetailLabels: {[key: string]: string} = {
                          'depreciation': '감가상각비',
                          'duty_free': '면세점 직접비',
                          'govt_license': '정부세금 및 라이센스',
                          'logistics': '운반비',
                          'maintenance': '유지보수비',
                          'other_fee': '기타 수수료',
                          'rent_free': '임대료 면제/할인',
                          'retirement': '퇴직연금',
                          'supplies': '소모품비',
                          'transport': '운반비(기타)',
                          'uniform': '피복비(유니폼)',
                          'utilities': '수도광열비',
                          'var_rent': '매출연동 임대료',
                          'communication': '통신비',
                          'bonus': '최종지급금'
                        };
                        
                        return (
                          <div className="space-y-1">
                            {expenseItems.map((item) => {
                              const current = (expenseDetail as any)[item.key] || 0;
                              const previous = (expenseDetailPrev as any)[item.key] || 0;
                              // YOY 계산: previous가 0이 아니면 계산 (음수도 포함)
                              let yoy = 0;
                              let showYoy = false;
                              if (previous !== 0) {
                                yoy = (current / previous) * 100;
                                showYoy = true;
                              } else if (previous === 0 && current !== 0) {
                                // 전년도가 0이고 현재가 0이 아니면 증가로 표시
                                yoy = Infinity;
                                showYoy = true;
                              }
                              const colorClass = yoy >= 100 ? 'text-red-600' : 'text-green-600';
                              
                              // 기타 항목인 경우 토글 기능 추가
                              if (item.key === 'other') {
                                const otherDetail = expenseDetail.other_detail || {};
                                const otherDetailPrev = expenseDetailPrev.other_detail || {};
                                
                                return (
                                  <div key={item.key}>
                                    <button
                                      onClick={() => setShowOtherDetailCumulative(!showOtherDetailCumulative)}
                                      className="flex justify-between items-center w-full text-xs hover:bg-gray-50 rounded px-1 py-0.5 -mx-1"
                                    >
                                      <span className="text-gray-600">{item.label}</span>
                                      <span className="font-semibold flex items-center gap-1">
                                        {formatNumber(current)} 
                                        {showYoy && (
                                          <span className={colorClass}>
                                            ({yoy === Infinity ? '신규' : formatPercent(yoy)}%)
                                          </span>
                                        )}
                                        {showOtherDetailCumulative ? (
                                          <ChevronDown className="w-3 h-3 text-gray-400" />
                                        ) : (
                                          <ChevronRight className="w-3 h-3 text-gray-400" />
                                        )}
                                      </span>
                                    </button>
                                    {(showOtherDetailCumulative && otherDetail && Object.keys(otherDetail).length > 0) && (
                                      <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-gray-200 pl-2">
                                        {Object.entries(otherDetail)
                                          .filter(([key, value]: [string, any]) => value !== 0)
                                          .sort(([, a]: [string, any], [, b]: [string, any]) => Number(b) - Number(a))
                                          .map(([key, value]: [string, any]) => {
                                          const prevValue = (otherDetailPrev as any)[key] || 0;
                                          let detailYoy = 0;
                                          let showDetailYoy = false;
                                          if (prevValue !== 0) {
                                            detailYoy = (value / prevValue) * 100;
                                            showDetailYoy = true;
                                          } else if (prevValue === 0 && value !== 0) {
                                            detailYoy = Infinity;
                                            showDetailYoy = true;
                                          }
                                          const detailColorClass = detailYoy >= 100 ? 'text-red-600' : 'text-green-600';
                                          
                                          return (
                                            <div key={key} className="flex justify-between text-[10px]">
                                              <span className="text-gray-500">{otherDetailLabels[key] || key}</span>
                                              <span className="font-semibold">
                                                {formatNumber(value)}
                                                {showDetailYoy && (
                                                  <span className={`ml-1 ${detailColorClass}`}>
                                                    ({detailYoy === Infinity ? '신규' : formatPercent(detailYoy)}%)
                                                  </span>
                                                )}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              
                              return (
                                <div key={item.key} className="flex justify-between text-xs">
                                  <span className="text-gray-600">{item.label}</span>
                                  <span className="font-semibold">
                                    {formatNumber(current)} 
                                    {showYoy && (
                                      <span className={`ml-1 ${colorClass}`}>
                                        ({yoy === Infinity ? '신규' : formatPercent(yoy)}%)
                                      </span>
                                    )}
                                  </span>
                                </div>
                              );
                            })}
                            
                            {/* 누적 지급수수료 증가 사유 */}
                            {(() => {
                              const feeCurrent = (expenseDetail as any).fee || 0;
                              const feePrev = (expenseDetailPrev as any).fee || 0;
                              const feeChange = feeCurrent - feePrev;
                              
                              if (feeChange > 0) {
                                return (
                                  <div className="mt-3 pt-3 border-t border-orange-200">
                                    <div className="text-xs font-semibold text-orange-700 mb-2">누적 지급수수료 증가 {formatNumber(feeChange)}K</div>
                                    <div className="text-xs text-gray-600 space-y-1">
                                      <div>3월 재고소각 895, 물류담당자 외주비 88 (1-4월)</div>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 매장효율성 카드 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-indigo-500 hover:shadow-xl transition-shadow min-h-[400px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">🏪</span>
                <h3 className="text-sm font-semibold text-gray-600">매장효율성</h3>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                {formatNumber(dailySalesPerPyeong)} HKD
              </div>
              <div className="text-sm text-green-600 font-semibold mb-1">
                평당매출/1일
              </div>
              <div className="text-xs text-gray-600 mb-3">
                전년 {formatNumber(prevDailySalesPerPyeong)} HKD 
                <span className={dailySalesPerPyeongYoy >= 100 ? 'text-green-600' : 'text-red-600'}>
                  {' '}({formatPercent(dailySalesPerPyeongYoy)}%)
                </span>
              </div>
              
              {/* 매장효율성 상세보기 */}
              <div className="border-t pt-3">
                <button 
                  onClick={() => setShowStoreDetail(!showStoreDetail)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                >
                  <span>채널별 평당매출</span>
                  {showStoreDetail ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              {showStoreDetail && (
                <>
                  <div className="mt-3 pt-3 border-t space-y-1">
                    {Object.entries(offlineEfficiency?.by_channel || {}).map(([key, channel]: [string, any]) => {
                      const channelName = channel?.channel === 'Retail' ? '정상' : 
                                        channel?.channel === 'Outlet' ? '아울렛' : 
                                        channel?.channel === 'Online' ? '온라인' : channel?.channel;
                      
                      // 매출 기준 YOY 계산 (검증용)
                      const currentSales = channel?.current?.net_sales || 0;
                      const previousSales = channel?.previous?.net_sales || 0;
                      const salesYoy = previousSales > 0 ? (currentSales / previousSales) * 100 : 0;
                      
                      // 평당매출 기준 YOY (현재 표시 중)
                      const pyeongYoy = channel?.yoy || 0;
                      
                      // 전체 YOY (평당매출 기준)
                      const totalYoy = offlineEfficiency?.total?.yoy || 0;
                      
                      // 디버깅: 채널별 YOY 검증
                      console.log(`🔍 [${channel?.country === 'HK' ? 'HK' : 'MC'} ${channelName}] YOY 검증:`, {
                        '매출 기준 YOY': salesYoy.toFixed(2) + '%',
                        '평당매출 기준 YOY': pyeongYoy.toFixed(2) + '%',
                        '전체 YOY': totalYoy.toFixed(2) + '%',
                        '차이': (pyeongYoy - totalYoy).toFixed(2) + '%p',
                        '현재 매출': (currentSales / 1000).toFixed(2) + 'K HKD',
                        '전년 매출': (previousSales / 1000).toFixed(2) + 'K HKD',
                        '현재 평당매출/일': channel?.current?.sales_per_pyeong_per_day?.toFixed(1) || '0',
                        '전년 평당매출/일': channel?.previous?.sales_per_pyeong_per_day?.toFixed(1) || '0',
                        '현재 면적': channel?.current?.total_area || 0,
                        '전년 면적': channel?.previous?.total_area || 0
                      });
                      
                      return (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="text-gray-600">
                            {channel?.country === 'HK' ? 'HK' : 'MC'} {channelName}
                          </span>
                          <span className="font-semibold">
                            {formatNumber(channel?.current?.sales_per_pyeong_per_day || 0)} 
                            <span className={(pyeongYoy || 0) >= 100 ? 'text-green-600' : 'text-red-600'}>
                              {' '}({formatPercent(pyeongYoy || 0)}%)
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* 평당매출 계산 기준 설명 */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="bg-amber-50 rounded">
                      <button
                        onClick={() => setShowStoreCalcDetail(!showStoreCalcDetail)}
                        className="w-full flex items-center justify-between p-2 hover:bg-amber-100 rounded transition-colors"
                      >
                        <span className="text-xs font-semibold text-amber-800">📊 평당매출 계산기준</span>
                        {showStoreCalcDetail ? (
                          <ChevronDown className="w-4 h-4 text-amber-600" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-amber-600" />
                        )}
                      </button>
                      {showStoreCalcDetail && (
                        <div className="px-2 pb-2 text-xs text-amber-700 space-y-1">
                        <div>• <span className="font-semibold">계산식:</span> (PL 누적 매출 ÷ 총 면적 × 1000) ÷ 누적 일수</div>
                        <div>• <span className="font-semibold">매출:</span> {formatNumber(hkMcOfflineSales)} K HKD (홍콩+마카오, 누적 PL 데이터)</div>
                        <div>• <span className="font-semibold">면적:</span> {formatNumber(totalArea)}평 (홍콩+마카오)</div>
                        <div>• <span className="font-semibold">일수:</span> 1~{currentMonth}월 누적 {cumulativeDays}일</div>
                      </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 두 번째 줄: 5개 카드 추가 */}
          <div className="grid grid-cols-5 gap-4 mt-4">
            {/* 당시즌 판매 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-cyan-500 hover:shadow-xl transition-shadow min-h-[150px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">📈</span>
                <h3 className="text-sm font-semibold text-gray-600">당시즌 판매 (누적)</h3>
              </div>
              
              {/* 25F (당시즌) + ACC */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* 25F (당시즌) */}
                <div>
                  <div className="text-xs text-gray-500 mb-1">25F (당시즌)</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatNumber(Math.round((season25F?.current?.net_sales || 0) / 1000))}
                  </div>
                  <div className="text-xs font-semibold">
                    {(() => {
                      const current = season25F?.current?.net_sales || 0;
                      const previous = season25F?.previous?.net_sales || 0;
                      const yoy = previous > 0 ? (current / previous * 100) : 0;
                      return (
                        <span className={yoy >= 100 ? 'text-green-600' : 'text-red-600'}>
                          YOY {formatPercent(yoy)}%
                        </span>
                      );
                    })()}
                  </div>
                </div>
                
                {/* ACC */}
                <div>
                  <div className="text-xs text-gray-500 mb-1">ACC</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatNumber(Math.round((dashboardData?.acc_sales_data?.current?.total?.net_sales || 0) / 1000))}
                  </div>
                  <div className="text-xs font-semibold">
                    {(() => {
                      const current = dashboardData?.acc_sales_data?.current?.total?.net_sales || 0;
                      const previous = dashboardData?.acc_sales_data?.previous?.total?.net_sales || 0;
                      const yoy = previous > 0 ? (current / previous * 100) : 0;
                      return (
                        <span className={yoy >= 100 ? 'text-green-600' : 'text-red-600'}>
                          YOY {formatPercent(yoy)}%
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
              
              {/* 아이템별 상세보기 */}
              <div className="mt-3 pt-3 border-t">
                <div className="text-xs text-gray-600 mb-2 font-semibold">아이템별</div>
                {(() => {
                  // 누적 대시보드 JSON에서 누적 데이터 사용
                  const cumulativeSeasonSales = dashboardData?.season_sales || {};
                  const cumulativeAccSales = dashboardData?.acc_sales_data || {};
                  
                  // 25F 카테고리별 누적 판매금액 TOP 5
                  const f25Accumulated = (cumulativeSeasonSales?.current_season_f as any)?.accumulated || {};
                  const f25Top5 = (f25Accumulated?.subcategory_top5 || []).slice(0, 5);
                  const f25PrevAccumulated = (cumulativeSeasonSales?.previous_season_f as any)?.accumulated || {};
                  
                  // ACC 카테고리별 누적 판매
                  const accCategories = ['신발', '모자', '가방', '기타ACC'];
                  
                  return (
                    <div className="space-y-2">
                      {/* 25F 카테고리별 TOP 5 */}
                      {f25Top5.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-gray-700 mb-1">25F 카테고리별 TOP 5</div>
                          <div className="space-y-0.5">
                            {f25Top5.map((item: any, idx: number) => {
                              // 전년 누적 데이터에서 찾기
                              const prevItem = f25PrevAccumulated?.subcategory_top5?.find((p: any) => p.subcategory_code === item.subcategory_code);
                              const yoy = prevItem && prevItem.net_sales > 0 ? ((item.net_sales / prevItem.net_sales) * 100) : 0;
                              return (
                                <div key={idx} className="flex justify-between text-xs">
                                  <span className="text-gray-600">{item.subcategory_code}</span>
                                  <span className="font-semibold">
                                    {formatNumber(Math.round(item.net_sales))}  {/* 이미 1K HKD 단위 */}
                                    <span className={yoy >= 100 ? 'text-green-600' : 'text-red-600'}> ({formatPercent(yoy)}%)</span>
                                  </span>
                </div>
                              );
                            })}
              </div>
            </div>
                      )}
                      
                      {/* ACC 카테고리별 판매 (누적 데이터 사용) */}
                      {cumulativeAccSales?.current && (
                        <div className="pt-2 border-t">
                          <div className="text-xs font-semibold text-gray-700 mb-1">ACC 카테고리별</div>
                          <div className="space-y-0.5">
                            {accCategories.map((category) => {
                              const categoryData = cumulativeAccSales?.current?.categories?.[category];
                              const prevCategoryData = cumulativeAccSales?.previous?.categories?.[category];
                              const yoy = prevCategoryData && prevCategoryData.net_sales > 0 
                                ? ((categoryData?.net_sales || 0) / prevCategoryData.net_sales * 100) 
                                : 0;
                              
                              return (
                                <div key={category} className="flex justify-between text-xs">
                                  <span className="text-gray-600">{category}</span>
                                  <span className="font-semibold">
                                    {formatNumber(Math.round((categoryData?.net_sales || 0) / 1000))}  {/* HKD -> 1K HKD 변환 */}
                                    <span className={yoy >= 100 ? 'text-green-600' : 'text-red-600'}> ({formatPercent(yoy)}%)</span>
                                  </span>
                                </div>
                              );
                            })}
                            <div className="flex justify-between text-xs font-semibold border-t pt-0.5 mt-0.5">
                              <span className="text-gray-700">악세 합계</span>
                              <span className="text-indigo-600">
                                {formatNumber(Math.round((cumulativeAccSales?.current?.total?.net_sales || 0) / 1000))}  {/* HKD -> 1K HKD 변환 */}
                                <span className={(() => {
                                  const currentTotal = cumulativeAccSales?.current?.total?.net_sales || 0;
                                  const previousTotal = cumulativeAccSales?.previous?.total?.net_sales || 1;
                                  const yoy = (currentTotal / previousTotal) * 100;
                                  return yoy >= 100 ? 'text-green-600' : 'text-red-600';
                                })()}> ({formatPercent((() => {
                                  const currentTotal = cumulativeAccSales?.current?.total?.net_sales || 0;
                                  const previousTotal = cumulativeAccSales?.previous?.total?.net_sales || 1;
                                  return (currentTotal / previousTotal) * 100;
                                })())}%)</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 당시즌 판매율(25S, 25F) */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-indigo-500 hover:shadow-xl transition-shadow min-h-[150px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">🎯</span>
                <h3 className="text-sm font-semibold text-gray-600">당시즌 판매율 (25S, 25F)</h3>
              </div>
              
              {/* 25S와 25F 판매율 표시 */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">25S 판매율</div>
                  {(() => {
                    // 판매율 = (누적 판매액(택가) / 누적 입고액(택가)) × 100
                    // 누적 대시보드 JSON의 season_sales_summary에서 가져오기
                    const rate = season25SSalesRate || 0;
                    const prevRate = seasonSalesSummary?.previous_season_s?.sales_rate || 0;
                    const change = rate - prevRate;
                    
                    // 검증: 판매율은 0-100% 범위여야 함
                    const isValid = rate >= 0 && rate <= 100 && !isNaN(rate) && isFinite(rate);
                    return isValid ? (
                      <>
                        <div className="text-2xl font-bold text-indigo-600">
                          {formatPercent(rate, 1)}%
              </div>
                        <div className={`text-xs font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {change >= 0 ? '+' : ''}{formatPercent(change, 1)}%p
                        </div>
                      </>
                    ) : (
                      <div className="text-sm font-semibold text-red-600">
                        데이터 오류
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">25F 판매율</div>
                  {(() => {
                    // 판매율 = (누적 판매액(택가) / 누적 입고액(택가)) × 100
                    // 누적 대시보드 JSON의 season_sales_summary에서 가져오기
                    const rate = season25FSalesRate || 0;
                    const prevRate = seasonSalesSummary?.previous_season_f?.sales_rate || 0;
                    const change = rate - prevRate;
                    
                    // 검증: 판매율은 0-100% 범위여야 함
                    const isValid = rate >= 0 && rate <= 100 && !isNaN(rate) && isFinite(rate);
                    return isValid ? (
                      <>
                        <div className="text-2xl font-bold text-orange-600">
                          {formatPercent(rate, 1)}%
                        </div>
                        <div className={`text-xs font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {change >= 0 ? '+' : ''}{formatPercent(change, 1)}%p
                        </div>
                      </>
                    ) : (
                      <div className="text-sm font-semibold text-red-600">
                        데이터 오류
                      </div>
                    );
                  })()}
                </div>
              </div>
              
              {/* 시각적 표현 */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">25S 매출</span>
                  <div className="text-right">
                    {(() => {
                      const current = season25S?.current?.net_sales || 0;
                      const previous = season25S?.previous?.net_sales || 0;
                      const yoy = previous > 0 ? (current / previous * 100) : 0;
                      return (
                        <>
                          <span className={`text-sm font-bold ${yoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatNumber(Math.round(current / 1000))}
                  </span>
                          <div className={`text-xs font-semibold ${yoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                            YOY {formatPercent(yoy)}%
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">25F 매출</span>
                  <div className="text-right">
                    {(() => {
                      const current = season25F?.current?.net_sales || 0;
                      const previous = season25F?.previous?.net_sales || 0;
                      const yoy = previous > 0 ? (current / previous * 100) : 0;
                      return (
                        <>
                          <span className={`text-sm font-bold ${yoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatNumber(Math.round(current / 1000))}
                  </span>
                          <div className={`text-xs font-semibold ${yoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                            YOY {formatPercent(yoy)}%
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* ACC 재고주수 (누적) */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-pink-500 hover:shadow-xl transition-shadow min-h-[150px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">📦</span>
                <h3 className="text-sm font-semibold text-gray-600">ACC 재고주수 (누적)</h3>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                {formatStockWeeks(accStock?.total?.current?.stock_weeks || 0)}주
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">전년 {formatStockWeeks(accStock?.total?.previous?.stock_weeks || 0)}주</span> | 
                <span className="text-green-600"> YOY △{formatNumber((accStock?.total?.stock_weeks_change || 0) * -1, 1)}주</span>
              </div>
              
              <div className="bg-pink-50 rounded p-2 mb-3">
                <div className="text-xs text-pink-800">
                  <span className="font-semibold">📌 계산기준:</span> 직전 6개월간 누적매출 기준
                </div>
              </div>
              
              {/* 아이템별 상세보기 */}
              <div className="border-t pt-3">
                <button 
                  onClick={() => setShowAccInventoryDetail(!showAccInventoryDetail)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                >
                  <span>아이템별 재고주수</span>
                  {showAccInventoryDetail ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              {showAccInventoryDetail && (
                <>
                  <div className="mt-3 pt-3 border-t space-y-1">
                    {(() => {
                      const byCategory = accStock?.by_category || {};
                      const shoes = byCategory.SHO || {};
                      const cap = byCategory.HEA || {};
                      const bagOthers = Object.values(byCategory).filter((cat: any) => 
                        cat.category !== 'SHO' && cat.category !== 'HEA'
                      ).reduce((sum: number, cat: any) => sum + (cat?.current?.stock_weeks || 0), 0);
                      const bagOthersChange = Object.values(byCategory).filter((cat: any) => 
                        cat.category !== 'SHO' && cat.category !== 'HEA'
                      ).reduce((sum: number, cat: any) => sum + ((cat?.current?.stock_weeks || 0) - (cat?.previous?.stock_weeks || 0)), 0);
                      
                      return (
                        <>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">신발</span>
                            <span className="font-semibold text-green-600">
                              {formatStockWeeks(shoes?.current?.stock_weeks || 0)}주 
                              <span className="text-gray-500"> (△{formatNumber(((shoes?.current?.stock_weeks || 0) - (shoes?.previous?.stock_weeks || 0)) * -1, 1)}주)</span>
                  </span>
                </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">모자</span>
                            <span className="font-semibold text-green-600">
                              {formatStockWeeks(cap?.current?.stock_weeks || 0)}주 
                              <span className="text-gray-500"> (△{formatNumber(((cap?.current?.stock_weeks || 0) - (cap?.previous?.stock_weeks || 0)) * -1, 1)}주)</span>
                  </span>
                </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">가방외</span>
                            <span className="font-semibold text-green-600">
                              {formatStockWeeks(bagOthers)}주 
                              <span className="text-gray-500"> (△{formatNumber(bagOthersChange * -1, 1)}주)</span>
                            </span>
                          </div>
                        </>
                      );
                    })()}
              </div>
                  
                  {/* 누적 매출 */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs font-semibold text-gray-700 mb-2">누적 매출 (1K HKD)</div>
                    <div className="space-y-1">
                      {(() => {
                        // 누적 대시보드 JSON의 acc_sales_data 사용 (N시즌만 포함)
                        const cumulativeAccSales = dashboardData?.acc_sales_data || {};
                        const shoesData = cumulativeAccSales?.current?.categories?.신발 || {};
                        const capData = cumulativeAccSales?.current?.categories?.모자 || {};
                        const bagData = cumulativeAccSales?.current?.categories?.가방 || {};
                        const otherAccData = cumulativeAccSales?.current?.categories?.기타ACC || {};
                        const bagOthers = (bagData?.net_sales || 0) + (otherAccData?.net_sales || 0);
                        
                        const shoesPrev = cumulativeAccSales?.previous?.categories?.신발 || {};
                        const capPrev = cumulativeAccSales?.previous?.categories?.모자 || {};
                        const bagPrev = cumulativeAccSales?.previous?.categories?.가방 || {};
                        const otherAccPrev = cumulativeAccSales?.previous?.categories?.기타ACC || {};
                        const bagOthersPrev = (bagPrev?.net_sales || 0) + (otherAccPrev?.net_sales || 0);
                        
                        const shoesYoy = shoesPrev?.net_sales > 0 
                          ? ((shoesData?.net_sales || 0) / shoesPrev.net_sales * 100) : 0;
                        const capYoy = capPrev?.net_sales > 0 
                          ? ((capData?.net_sales || 0) / capPrev.net_sales * 100) : 0;
                        const bagOthersYoy = bagOthersPrev > 0 
                          ? (bagOthers / bagOthersPrev * 100) : 0;
                        const totalYoy = cumulativeAccSales?.previous?.total?.net_sales > 0
                          ? ((cumulativeAccSales?.current?.total?.net_sales || 0) / cumulativeAccSales.previous.total.net_sales * 100) : 0;
                        
                        return (
                          <>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">신발</span>
                              <span className="font-semibold">
                                {formatNumber(Math.round((shoesData?.net_sales || 0) / 1000))} 
                                <span className={shoesYoy >= 100 ? 'text-green-600' : 'text-red-600'}> ({formatPercent(shoesYoy)}%)</span>
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">모자</span>
                              <span className="font-semibold">
                                {formatNumber(Math.round((capData?.net_sales || 0) / 1000))} 
                                <span className={capYoy >= 100 ? 'text-green-600' : 'text-red-600'}> ({formatPercent(capYoy)}%)</span>
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">가방외</span>
                              <span className="font-semibold">
                                {formatNumber(Math.round(bagOthers / 1000))}
                                <span className={bagOthersYoy >= 100 ? 'text-green-600' : 'text-red-600'}> ({formatPercent(bagOthersYoy)}%)</span>
                              </span>
                            </div>
                            <div className="flex justify-between text-xs font-semibold border-t pt-1 mt-1">
                              <span className="text-gray-700">악세 합계</span>
                              <span className="text-indigo-600">
                                {formatNumber(Math.round((cumulativeAccSales?.current?.total?.net_sales || 0) / 1000))}
                                <span className={totalYoy >= 100 ? 'text-green-600' : 'text-red-600'}> ({formatPercent(totalYoy)}%)</span>
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </>
              )}
              
              <div className="bg-pink-50 rounded p-2 mt-3">
                <div className="text-xs text-pink-800">
                  <span className="font-semibold">★누적 기준:</span> ACC 재고 ÷ (누적 ACC 매출 ÷ 누적 개월 수)
                </div>
              </div>
            </div>

            {/* 기말재고 (TAG) */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-amber-500 hover:shadow-xl transition-shadow min-h-[150px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">🏭</span>
                <h3 className="text-sm font-semibold text-gray-600">기말재고 (TAG)</h3>
              </div>
              <div className={`text-3xl font-bold mb-2 ${(endingInventory?.total?.yoy || 0) >= 100 ? 'text-red-600' : 'text-green-600'}`}>
                {formatNumber(Math.round(endingInventory?.total?.current || 0))}
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">전년 {formatNumber(Math.round(endingInventory?.total?.previous || 0))}</span> | 
                <span className={(endingInventory?.total?.yoy || 0) >= 100 ? 'text-red-600' : 'text-green-600'}> YOY {formatPercent(endingInventory?.total?.yoy || 0)}%</span>
              </div>
              
              {/* 아이템별 상세보기 */}
              <div className="border-t pt-3">
                <button 
                  onClick={() => setShowEndInventoryDetail(!showEndInventoryDetail)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                >
                  <span>아이템별 기말재고</span>
                  {showEndInventoryDetail ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              {showEndInventoryDetail && (
                <div className="mt-3 pt-3 border-t space-y-1">
                  {(() => {
                    const currentSeasonF = Math.round((endingInventory?.by_season?.당시즌_의류?.current?.stock_price || 0) / 1000);
                    const currentSeasonFYoy = endingInventory?.by_season?.당시즌_의류?.yoy || 0;
                    const currentSeasonS = Math.round((endingInventory?.by_season?.당시즌_SS?.current?.stock_price || 0) / 1000);
                    const currentSeasonSYoy = endingInventory?.by_season?.당시즌_SS?.yoy || 0;
                    const pastSeasonFW = Math.round((endingInventory?.by_season?.과시즌_FW?.current?.stock_price || 0) / 1000);
                    const pastSeasonFWYoy = endingInventory?.by_season?.과시즌_FW?.yoy || 0;
                    const pastSeasonSS = Math.round((endingInventory?.by_season?.과시즌_SS?.current?.stock_price || 0) / 1000);
                    const pastSeasonSSYoy = endingInventory?.by_season?.과시즌_SS?.yoy || 0;
                    const accTotal = Math.round((Object.values(endingInventory?.acc_by_category || {}).reduce((sum: number, cat: any) => sum + (cat?.current?.stock_price || 0), 0)) / 1000);
                    const accTotalPrev = Math.round((Object.values(endingInventory?.acc_by_category || {}).reduce((sum: number, cat: any) => sum + (cat?.previous?.stock_price || 0), 0)) / 1000);
                    const accTotalYoy = accTotalPrev > 0 ? (accTotal / accTotalPrev * 100) : 0;
                    const shoes = Math.round((endingInventory?.acc_by_category?.SHO?.current?.stock_price || 0) / 1000);
                    const shoesYoy = endingInventory?.acc_by_category?.SHO?.yoy || 0;
                    const cap = Math.round((endingInventory?.acc_by_category?.HEA?.current?.stock_price || 0) / 1000);
                    const capYoy = endingInventory?.acc_by_category?.HEA?.yoy || 0;
                    
                    return (
                      <>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">당시즌 의류 (25F)</span>
                          <span className="font-semibold">
                            {formatNumber(currentSeasonF)} 
                            <span className={currentSeasonFYoy >= 100 ? 'text-red-600' : 'text-green-600'}> ({formatPercent(currentSeasonFYoy)}%)</span>
                  </span>
                </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">당시즌 SS (25S)</span>
                          <span className="font-semibold">
                            {formatNumber(currentSeasonS)} 
                            <span className={currentSeasonSYoy >= 100 ? 'text-red-600' : 'text-green-600'}> ({formatPercent(currentSeasonSYoy)}%)</span>
                  </span>
                </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">과시즌 FW</span>
                          <span className="font-semibold">
                            {formatNumber(pastSeasonFW)} 
                            <span className={pastSeasonFWYoy >= 100 ? 'text-red-600' : 'text-green-600'}> ({formatPercent(pastSeasonFWYoy)}%)</span>
                  </span>
                </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">과시즌 SS</span>
                          <span className="font-semibold">
                            {formatNumber(pastSeasonSS)} 
                            <span className={pastSeasonSSYoy >= 100 ? 'text-red-600' : 'text-green-600'}> ({formatPercent(pastSeasonSSYoy)}%)</span>
                          </span>
              </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">악세 합계</span>
                          <span className="font-semibold">
                            {formatNumber(accTotal)} 
                            <span className={accTotalYoy >= 100 ? 'text-red-600' : 'text-green-600'}> ({formatPercent(accTotalYoy)}%)</span>
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">신발 (SHO)</span>
                          <span className="font-semibold">
                            {formatNumber(shoes)} 
                            <span className={shoesYoy >= 100 ? 'text-red-600' : 'text-green-600'}> ({formatPercent(shoesYoy)}%)</span>
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">모자 (HEA)</span>
                          <span className="font-semibold">
                            {formatNumber(cap)} 
                            <span className={capYoy >= 100 ? 'text-red-600' : 'text-green-600'}> ({formatPercent(capYoy)}%)</span>
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* 과시즌 재고 (FW) */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-red-500 hover:shadow-xl transition-shadow min-h-[150px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">⚠️</span>
                <h3 className="text-sm font-semibold text-gray-600">과시즌 재고 (FW)</h3>
              </div>
              {(() => {
                const fwCurrent = (endingInventory?.by_season?.과시즌_FW?.current?.stock_price || 0) / 1000;
                const fwPrevious = (endingInventory?.by_season?.과시즌_FW?.previous?.stock_price || 0) / 1000;
                const fwYoy = endingInventory?.by_season?.과시즌_FW?.yoy || 0;
                const totalCurrent = endingInventory?.total?.current || 1;
                const pastSeasonTotal = ((endingInventory?.by_season?.과시즌_FW?.current?.stock_price || 0) + (endingInventory?.by_season?.과시즌_SS?.current?.stock_price || 0)) / 1000;
                
                return (
                  <>
                    <div className={`text-3xl font-bold mb-2 ${fwYoy >= 100 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatNumber(Math.round(fwCurrent))}
              </div>
              <div className="text-sm font-semibold mb-3">
                      <span className="text-gray-600">전년 {formatNumber(Math.round(fwPrevious))}</span> | 
                      <span className={fwYoy >= 100 ? 'text-red-600' : 'text-green-600'}> YOY {formatPercent(fwYoy)}% {fwYoy >= 100 ? '🔴' : ''}</span>
              </div>
                    
                    {/* 재고 시즌별 상세보기 */}
                    <div className="border-t pt-3">
                      <button 
                        onClick={() => setShowPastSeasonDetail(!showPastSeasonDetail)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                      >
                        <span>시즌별 재고</span>
                        {showPastSeasonDetail ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {showPastSeasonDetail && (
                      <>
                        <div className="mt-3 pt-3 border-t space-y-1">
                          {(() => {
                            const byYear = pastSeasonFW?.by_year || {};
                            const year1 = byYear['1년차'] || {};
                            const year2 = byYear['2년차'] || {};
                            const year3 = byYear['3년차_이상'] || {};
                            
                            return (
                              <>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">1년차 (24FW)</span>
                                  <span className="font-semibold">
                                    {formatNumber(Math.round((year1?.current?.stock_price || 0) / 1000))} 
                                    <span className={(year1?.yoy || 0) >= 100 ? 'text-red-600' : 'text-green-600'}> ({formatPercent(year1?.yoy || 0)}%)</span>
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">2년차 (23FW)</span>
                                  <span className="font-semibold">
                                    {formatNumber(Math.round((year2?.current?.stock_price || 0) / 1000))} 
                                    <span className={(year2?.yoy || 0) >= 100 ? 'text-red-600' : 'text-green-600'}> ({formatPercent(year2?.yoy || 0)}%)</span>
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">3년차 이상 (22FW~)</span>
                                  <span className="font-semibold">
                                    {formatNumber(Math.round((year3?.current?.stock_price || 0) / 1000))} 
                                    <span className="text-red-600"> (+{formatNumber(Math.round((year3?.change || 0) / 1000))})</span>
                                  </span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                        
                        {/* 핵심 인사이트 */}
                        {(() => {
                          const subcat1Year = pastSeasonFW?.['1year_subcategory'] || {};
                          const mt = subcat1Year.MT || {};
                          const dj = subcat1Year.DJ || {};
                          const kc = subcat1Year.KC || {};
                          
                          if (Object.keys(subcat1Year).length === 0) return null;
                          
                          return (
                            <div className="mt-3 pt-3 border-t">
                              <div className="bg-red-50 rounded p-2">
                                <div className="text-xs font-semibold text-red-800 mb-2">⚠️ 25년 1년차 과시즌재고</div>
                                <div className="text-xs text-red-700 space-y-1">
                                  {mt.current && (
                                    <div className="flex justify-between items-center">
                                      <span>• SWEAT SHIRTS</span>
                                      <span className="font-semibold text-red-600">YOY {formatPercent(mt.yoy || 0)}%</span>
                                    </div>
                                  )}
                                  {dj.current && (
                                    <div className="flex justify-between items-center">
                                      <span>• JUMPER</span>
                                      <span className="font-semibold text-red-600">YOY {formatPercent(dj.yoy || 0)}%</span>
                                    </div>
                                  )}
                                  {kc.current && (
                                    <div className="flex justify-between items-center">
                                      <span>• Knit Cardigan</span>
                                      <span className="font-semibold text-red-600">YOY {formatPercent(kc.yoy || 0)}%</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    )}
              
              {/* 구성 상세 */}
                    <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-3 space-y-2 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">전체 재고 대비</span>
                  <span className="text-sm font-bold text-red-600">
                          {formatPercent((fwCurrent / totalCurrent) * 100, 1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">과시즌 중 FW 비중</span>
                  <span className="text-sm font-bold text-orange-600">
                          {formatPercent((fwCurrent / (pastSeasonTotal || 1)) * 100, 1)}%
                  </span>
                </div>
              </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* 두 번째 줄 그리드 끝 */}
        </div>
      </div>

      {/* 손익요약 */}
      <div className="mb-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            손익요약 (단위: 1K HKD)
          </h3>
          
          {/* 요약 박스 */}
          <div className="space-y-2 mb-4">
            {(() => {
              const currentOpProfit = pl?.operating_profit || 0;
              const isCurrentProfit = currentOpProfit >= 0;
              return (
                <div className={`p-3 rounded border-l-4 ${isCurrentProfit ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
              <p className="text-sm font-semibold text-gray-800 mb-1">
                    <strong>당월:</strong> {isCurrentProfit ? '영업이익' : '영업손실'} {formatNumber(Math.abs(currentOpProfit))}K HKD, 영업이익률 {formatPercent(pl?.operating_profit_rate || 0, 2)}%
              </p>
              <p className="text-xs text-gray-700">
                    {isCurrentProfit ? '흑자 개선' : '적자 악화'} 원인: ① 매출 YOY {formatPercent(plYoy?.net_sales || 0)}% (MC 오프라인 YOY {formatPercent((() => {
                  const mcOfflineCurrent = (mcRetail?.current?.net_sales || 0) + (mcOutlet?.current?.net_sales || 0);
                  const mcOfflinePrevious = (mcRetail?.previous?.net_sales || 0) + (mcOutlet?.previous?.net_sales || 0);
                  return mcOfflinePrevious > 0 ? (mcOfflineCurrent / mcOfflinePrevious) * 100 : 0;
                })())}%) ② 영업비 YOY {formatPercent(plYoy?.sg_a || 0)}% ({formatChange(plChange?.sg_a || 0).text}K) ③ 직접이익 YOY {formatPercent(plYoy?.direct_profit || 0)}% (직접이익률 {(() => {
                  const prevMonthTotal = plData?.prev_month?.total || {};
                  const prevDirectProfitRate = (prevMonthTotal as any)?.direct_profit_rate !== undefined 
                    ? (prevMonthTotal as any).direct_profit_rate
                    : (prevMonthTotal.net_sales > 0 ? ((prevMonthTotal.direct_profit || 0) / prevMonthTotal.net_sales) * 100 : 0);
                  return formatPercent(prevDirectProfitRate, 1);
                })()}% → {formatPercent(pl?.direct_profit_rate || 0, 1)}%)
              </p>
            </div>
              );
            })()}
            {(() => {
              const cumulativeOpProfit = plData?.cumulative?.total?.operating_profit || 0;
              const isCumulativeProfit = cumulativeOpProfit >= 0;
              return (
                <div className={`p-3 rounded border-l-4 ${isCumulativeProfit ? 'bg-green-50 border-green-500' : 'bg-blue-50 border-blue-500'}`}>
              <p className="text-sm font-semibold text-gray-800 mb-1">
                    <strong>누적:</strong> {isCumulativeProfit ? '영업이익' : '영업손실'} {formatNumber(Math.abs(cumulativeOpProfit))}K HKD, 영업이익률 {formatPercent(plData?.cumulative?.total?.operating_profit_rate || 0, 2)}%
              </p>
              <p className="text-xs text-gray-700">
                    {isCumulativeProfit ? '흑자 유지' : '적자 지속'}: ① 매출 YOY {formatPercent(plData?.cumulative?.yoy?.net_sales || 0)}% (전년비 {formatChange((() => {
                  // HK + MC 합계로 계산 (1K HKD 단위로 변환)
                  const currentNetSales = (plData?.cumulative?.hk?.net_sales || 0) + (plData?.cumulative?.mc?.net_sales || 0);
                  const prevNetSales = (plData?.cumulative?.prev_cumulative?.hk?.net_sales || 0) + (plData?.cumulative?.prev_cumulative?.mc?.net_sales || 0);
                  return (currentNetSales - prevNetSales) / 1000; // 1K HKD 단위
                })()).text}K) ② 영업비 YOY {formatPercent(plData?.cumulative?.yoy?.sg_a || 0)}% ({formatChange((() => {
                  // HK + MC 합계로 계산 (1K HKD 단위로 변환)
                  const currentSgA = (plData?.cumulative?.hk?.sg_a || 0) + (plData?.cumulative?.mc?.sg_a || 0);
                  const prevSgA = (plData?.cumulative?.prev_cumulative?.hk?.sg_a || 0) + (plData?.cumulative?.prev_cumulative?.mc?.sg_a || 0);
                  return (currentSgA - prevSgA) / 1000; // 1K HKD 단위
                })()).text}K) ③ 직접이익 YOY {formatPercent(plData?.cumulative?.yoy?.direct_profit || 0)}% (직접이익률 {(() => {
                  // HK + MC 합계로 계산
                  const prevCumulativeHK = plData?.cumulative?.prev_cumulative?.hk || {};
                  const prevCumulativeMC = plData?.cumulative?.prev_cumulative?.mc || {};
                  const prevNetSales = (prevCumulativeHK.net_sales || 0) + (prevCumulativeMC.net_sales || 0);
                  const prevDirectProfit = (prevCumulativeHK.direct_profit || 0) + (prevCumulativeMC.direct_profit || 0);
                  const prevCumulativeDirectProfitRate = prevNetSales > 0 ? (prevDirectProfit / prevNetSales) * 100 : 0;
                  return formatPercent(prevCumulativeDirectProfitRate, 1);
                })()}% → {formatPercent(plData?.cumulative?.total?.direct_profit_rate || 0, 1)}%)
              </p>
            </div>
              );
            })()}
          </div>

          {/* 상세 테이블 */}
          <div className="overflow-x-auto">
            <style>{`
              .hk-pl-summary-table tbody tr td:nth-child(8),
              .hk-pl-summary-table tbody tr td:nth-child(15),
              .hk-pl-summary-table thead tr:first-child th:nth-child(8),
              .hk-pl-summary-table thead tr:first-child th:nth-child(15) {
                background-color: #f3f4f6 !important;
              }
              .hk-pl-summary-table thead tr:nth-child(2) th {
                background-color: inherit !important;
              }
            `}</style>
            <table className="min-w-full text-xs border-collapse hk-pl-summary-table">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th rowSpan={2} className="text-left p-2 font-semibold border-r border-gray-300">항목</th>
                  <th colSpan={3} className="text-center p-2 font-semibold border-r border-gray-300 bg-green-50">당월</th>
                  <th colSpan={3} className="text-center p-2 font-semibold border-r border-gray-300 bg-orange-50">당월 전년비</th>
                  <th rowSpan={2} className="text-center p-2 font-semibold border-r border-gray-300 bg-gray-100">YOY</th>
                  <th colSpan={3} className="text-center p-2 font-semibold border-r border-gray-300 bg-cyan-50">누적</th>
                  <th colSpan={3} className="text-center p-2 font-semibold border-r border-gray-300 bg-amber-50">누적 전년비</th>
                  <th rowSpan={2} className="text-center p-2 font-semibold bg-gray-100">누적 YOY</th>
                </tr>
                <tr className="border-b border-gray-300">
                  <th className="bg-green-50 p-1 text-center border-r border-gray-300">홍콩</th>
                  <th className="bg-green-50 p-1 text-center border-r border-gray-300">마카오</th>
                  <th className="bg-green-50 p-1 text-center border-r border-gray-300">합계</th>
                  <th className="bg-orange-50 p-1 text-center border-r border-gray-300">홍콩</th>
                  <th className="bg-orange-50 p-1 text-center border-r border-gray-300">마카오</th>
                  <th className="bg-orange-50 p-1 text-center border-r border-gray-300">합계</th>
                  <th className="bg-cyan-50 p-1 text-center border-r border-gray-300">홍콩</th>
                  <th className="bg-cyan-50 p-1 text-center border-r border-gray-300">마카오</th>
                  <th className="bg-cyan-50 p-1 text-center border-r border-gray-300">합계</th>
                  <th className="bg-amber-50 p-1 text-center border-r border-gray-300">홍콩</th>
                  <th className="bg-amber-50 p-1 text-center border-r border-gray-300">마카오</th>
                  <th className="bg-amber-50 p-1 text-center border-r border-gray-300">합계</th>
                </tr>
              </thead>
              <tbody>
                {/* TAG */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">TAG</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.hk?.tag_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.mc?.tag_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.current_month?.total?.tag_sales || 0)}</td>
                  {(() => {
                    const change = formatChange((plData?.current_month?.hk?.tag_sales || 0) - (plData?.prev_month?.hk?.tag_sales || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.current_month?.mc?.tag_sales || 0) - (plData?.prev_month?.mc?.tag_sales || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    // 합계 전년비: HK + MC 직접 계산
                    const hkChange = (plData?.current_month?.hk?.tag_sales || 0) - (plData?.prev_month?.hk?.tag_sales || 0);
                    const mcChange = (plData?.current_month?.mc?.tag_sales || 0) - (plData?.prev_month?.mc?.tag_sales || 0);
                    const change = formatChange(hkChange + mcChange);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className="p-2 text-right border-r border-gray-300">{formatYoy(plYoy?.tag_sales || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.hk?.tag_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.mc?.tag_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.cumulative?.total?.tag_sales || 0)}</td>
                  {(() => {
                    // HK 전년비 직접 계산
                    const change = formatChange((plData?.cumulative?.hk?.tag_sales || 0) - (plData?.cumulative?.prev_cumulative?.hk?.tag_sales || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.mc?.tag_sales || 0) - (plData?.cumulative?.prev_cumulative?.mc?.tag_sales || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    // 합계 전년비: HK + MC 직접 계산
                    const hkChange = (plData?.cumulative?.hk?.tag_sales || 0) - (plData?.cumulative?.prev_cumulative?.hk?.tag_sales || 0);
                    const mcChange = (plData?.cumulative?.mc?.tag_sales || 0) - (plData?.cumulative?.prev_cumulative?.mc?.tag_sales || 0);
                    const change = formatChange(hkChange + mcChange);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className="p-2 text-right">{formatYoy(plData?.cumulative?.yoy?.tag_sales || 0)}%</td>
                </tr>
                {/* 실판 */}
                <tr className="border-b border-gray-200 bg-gray-100">
                  <td className="p-2 font-semibold border-r border-gray-300">실판</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.hk?.net_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.mc?.net_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.current_month?.total?.net_sales || 0)}</td>
                  {(() => {
                    const change = formatChange((plData?.current_month?.hk?.net_sales || 0) - (plData?.prev_month?.hk?.net_sales || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.current_month?.mc?.net_sales || 0) - (plData?.prev_month?.mc?.net_sales || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    // 합계 전년비: HK + MC 직접 계산
                    const hkChange = (plData?.current_month?.hk?.net_sales || 0) - (plData?.prev_month?.hk?.net_sales || 0);
                    const mcChange = (plData?.current_month?.mc?.net_sales || 0) - (plData?.prev_month?.mc?.net_sales || 0);
                    const change = formatChange(hkChange + mcChange);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className="p-2 text-right border-r border-gray-300">{formatYoy(plYoy?.net_sales || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.hk?.net_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.mc?.net_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.cumulative?.total?.net_sales || 0)}</td>
                  {(() => {
                    // HK 전년비 직접 계산
                    const change = formatChange((plData?.cumulative?.hk?.net_sales || 0) - (plData?.cumulative?.prev_cumulative?.hk?.net_sales || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.mc?.net_sales || 0) - (plData?.cumulative?.prev_cumulative?.mc?.net_sales || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    // 합계 전년비: HK + MC 직접 계산
                    const hkChange = (plData?.cumulative?.hk?.net_sales || 0) - (plData?.cumulative?.prev_cumulative?.hk?.net_sales || 0);
                    const mcChange = (plData?.cumulative?.mc?.net_sales || 0) - (plData?.cumulative?.prev_cumulative?.mc?.net_sales || 0);
                    const change = formatChange(hkChange + mcChange);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className="p-2 text-right">{formatYoy(plData?.cumulative?.yoy?.net_sales || 0)}%</td>
                </tr>
                {/* 할인율 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">할인율</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.current_month?.hk?.discount_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.current_month?.mc?.discount_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatRate(plData?.current_month?.total?.discount_rate || 0)}%</td>
                  {(() => {
                    const change = formatChangeRate((plData?.current_month?.hk?.discount_rate || 0) - prevMonthHKDiscountRate);
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChangeRate((plData?.current_month?.mc?.discount_rate || 0) - prevMonthMCDiscountRate);
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChangeRate((plData?.current_month?.total?.discount_rate || 0) - prevMonthDiscountRate);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}%p</td>;
                  })()}
                  <td className="p-2 text-right border-r border-gray-300">-</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.cumulative?.hk?.discount_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.cumulative?.mc?.discount_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatRate(plData?.cumulative?.total?.discount_rate || 0)}%</td>
                  {(() => {
                    const change = formatChangeRate((plData?.cumulative?.hk?.discount_rate || 0) - prevCumulativeHKDiscountRate);
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChangeRate((plData?.cumulative?.mc?.discount_rate || 0) - prevCumulativeMCDiscountRate);
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChangeRate((plData?.cumulative?.total?.discount_rate || 0) - prevCumulativeDiscountRate);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}%p</td>;
                  })()}
                  <td className="p-2 text-right">-</td>
                </tr>
                {/* (Tag 원가율) */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">(Tag 원가율)</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.current_month?.hk?.cogs_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.current_month?.mc?.cogs_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatRate(plData?.current_month?.total?.cogs_rate || 0)}%</td>
                  {(() => {
                    const change = formatChangeRate((plData?.current_month?.hk?.cogs_rate || 0) - (plData?.prev_month?.hk?.cogs_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChangeRate((plData?.current_month?.mc?.cogs_rate || 0) - (plData?.prev_month?.mc?.cogs_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChangeRate((plData?.current_month?.total?.cogs_rate || 0) - prevMonthTotalCogsRate);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}%p</td>;
                  })()}
                  <td className="p-2 text-right border-r border-gray-300">-</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.cumulative?.hk?.cogs_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.cumulative?.mc?.cogs_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatRate(plData?.cumulative?.total?.cogs_rate || 0)}%</td>
                  {(() => {
                    const change = formatChangeRate((plData?.cumulative?.hk?.cogs_rate || 0) - (plData?.cumulative?.prev_cumulative?.hk?.cogs_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChangeRate((plData?.cumulative?.mc?.cogs_rate || 0) - (plData?.cumulative?.prev_cumulative?.mc?.cogs_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChangeRate((plData?.cumulative?.total?.cogs_rate || 0) - prevCumulativeTotalCogsRate);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}%p</td>;
                  })()}
                  <td className="p-2 text-right">-</td>
                </tr>
                {/* 매출총이익 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">매출총이익</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.hk?.gross_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.mc?.gross_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.current_month?.total?.gross_profit || 0)}</td>
                  {(() => {
                    const change = formatChange((plData?.current_month?.hk?.gross_profit || 0) - (plData?.prev_month?.hk?.gross_profit || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.current_month?.mc?.gross_profit || 0) - (plData?.prev_month?.mc?.gross_profit || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    // 합계 전년비: HK + MC 직접 계산
                    const hkChange = (plData?.current_month?.hk?.gross_profit || 0) - (plData?.prev_month?.hk?.gross_profit || 0);
                    const mcChange = (plData?.current_month?.mc?.gross_profit || 0) - (plData?.prev_month?.mc?.gross_profit || 0);
                    const change = formatChange(hkChange + mcChange);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className="p-2 text-right border-r border-gray-300">{formatYoy(plYoy?.gross_profit || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.hk?.gross_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.mc?.gross_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.cumulative?.total?.gross_profit || 0)}</td>
                  {(() => {
                    // HK 전년비 직접 계산
                    const change = formatChange((plData?.cumulative?.hk?.gross_profit || 0) - (plData?.cumulative?.prev_cumulative?.hk?.gross_profit || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.mc?.gross_profit || 0) - (plData?.cumulative?.prev_cumulative?.mc?.gross_profit || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    // 합계 전년비: HK + MC 직접 계산
                    const hkChange = (plData?.cumulative?.hk?.gross_profit || 0) - (plData?.cumulative?.prev_cumulative?.hk?.gross_profit || 0);
                    const mcChange = (plData?.cumulative?.mc?.gross_profit || 0) - (plData?.cumulative?.prev_cumulative?.mc?.gross_profit || 0);
                    const change = formatChange(hkChange + mcChange);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className="p-2 text-right">{formatYoy(plData?.cumulative?.yoy?.gross_profit || 0)}%</td>
                </tr>
                {/* 매출총이익률 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">매출총이익률</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.current_month?.hk?.gross_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.current_month?.mc?.gross_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatRate(plData?.current_month?.total?.gross_profit_rate || 0)}%</td>
                  {(() => {
                    const change = formatChangeRate((plData?.current_month?.hk?.gross_profit_rate || 0) - (plData?.prev_month?.hk?.gross_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChangeRate((plData?.current_month?.mc?.gross_profit_rate || 0) - (plData?.prev_month?.mc?.gross_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChangeRate((plData?.current_month?.total?.gross_profit_rate || 0) - prevMonthTotalGrossProfitRate);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}%p</td>;
                  })()}
                  <td className="p-2 text-right border-r border-gray-300">-</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.cumulative?.hk?.gross_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.cumulative?.mc?.gross_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatRate(plData?.cumulative?.total?.gross_profit_rate || 0)}%</td>
                  {(() => {
                    const change = formatChangeRate((plData?.cumulative?.hk?.gross_profit_rate || 0) - (plData?.cumulative?.prev_cumulative?.hk?.gross_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChangeRate((plData?.cumulative?.mc?.gross_profit_rate || 0) - (plData?.cumulative?.prev_cumulative?.mc?.gross_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChangeRate((plData?.cumulative?.total?.gross_profit_rate || 0) - prevCumulativeTotalGrossProfitRate);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}%p</td>;
                  })()}
                  <td className="p-2 text-right">-</td>
                </tr>
                {/* 직접비 합계 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">직접비 합계</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.hk?.direct_cost || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.mc?.direct_cost || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.current_month?.total?.direct_cost || 0)}</td>
                  {(() => {
                    const change = formatChange((plData?.current_month?.hk?.direct_cost || 0) - (plData?.prev_month?.hk?.direct_cost || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.current_month?.mc?.direct_cost || 0) - (plData?.prev_month?.mc?.direct_cost || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    // 합계 전년비: HK + MC 직접 계산
                    const hkChange = (plData?.current_month?.hk?.direct_cost || 0) - (plData?.prev_month?.hk?.direct_cost || 0);
                    const mcChange = (plData?.current_month?.mc?.direct_cost || 0) - (plData?.prev_month?.mc?.direct_cost || 0);
                    const change = formatChange(hkChange + mcChange);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className="p-2 text-right border-r border-gray-300">{formatYoy(plYoy?.direct_cost || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.hk?.direct_cost || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.mc?.direct_cost || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.cumulative?.total?.direct_cost || 0)}</td>
                  {(() => {
                    // HK 전년비 직접 계산
                    const change = formatChange((plData?.cumulative?.hk?.direct_cost || 0) - (plData?.cumulative?.prev_cumulative?.hk?.direct_cost || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.mc?.direct_cost || 0) - (plData?.cumulative?.prev_cumulative?.mc?.direct_cost || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    // 합계 전년비: HK + MC 직접 계산
                    const hkChange = (plData?.cumulative?.hk?.direct_cost || 0) - (plData?.cumulative?.prev_cumulative?.hk?.direct_cost || 0);
                    const mcChange = (plData?.cumulative?.mc?.direct_cost || 0) - (plData?.cumulative?.prev_cumulative?.mc?.direct_cost || 0);
                    const change = formatChange(hkChange + mcChange);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className="p-2 text-right">{formatYoy(plData?.cumulative?.yoy?.direct_cost || 0)}%</td>
                </tr>
                {/* 직접이익 */}
                <tr className="border-b border-gray-200 bg-gray-100">
                  <td className="p-2 font-semibold border-r border-gray-300">직접이익</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.hk?.direct_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.mc?.direct_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.current_month?.total?.direct_profit || 0)}</td>
                  {(() => {
                    const change = formatChange((plData?.current_month?.hk?.direct_profit || 0) - (plData?.prev_month?.hk?.direct_profit || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.current_month?.mc?.direct_profit || 0) - (plData?.prev_month?.mc?.direct_profit || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    // 합계 전년비: HK + MC 직접 계산
                    const hkChange = (plData?.current_month?.hk?.direct_profit || 0) - (plData?.prev_month?.hk?.direct_profit || 0);
                    const mcChange = (plData?.current_month?.mc?.direct_profit || 0) - (plData?.prev_month?.mc?.direct_profit || 0);
                    const change = formatChange(hkChange + mcChange);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className="p-2 text-right border-r border-gray-300">{formatYoy(plYoy?.direct_profit || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.hk?.direct_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.mc?.direct_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.cumulative?.total?.direct_profit || 0)}</td>
                  {(() => {
                    // HK 전년비 직접 계산
                    const change = formatChange((plData?.cumulative?.hk?.direct_profit || 0) - (plData?.cumulative?.prev_cumulative?.hk?.direct_profit || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.mc?.direct_profit || 0) - (plData?.cumulative?.prev_cumulative?.mc?.direct_profit || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    // 합계 전년비: HK + MC 직접 계산
                    const hkChange = (plData?.cumulative?.hk?.direct_profit || 0) - (plData?.cumulative?.prev_cumulative?.hk?.direct_profit || 0);
                    const mcChange = (plData?.cumulative?.mc?.direct_profit || 0) - (plData?.cumulative?.prev_cumulative?.mc?.direct_profit || 0);
                    const change = formatChange(hkChange + mcChange);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className="p-2 text-right">{formatYoy(plData?.cumulative?.yoy?.direct_profit || 0)}%</td>
                </tr>
                {/* 직접이익율 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">직접이익율</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.current_month?.hk?.direct_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.current_month?.mc?.direct_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatRate(plData?.current_month?.total?.direct_profit_rate || 0)}%</td>
                  {(() => {
                    const change = formatChangeRate((plData?.current_month?.hk?.direct_profit_rate || 0) - (plData?.prev_month?.hk?.direct_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChangeRate((plData?.current_month?.mc?.direct_profit_rate || 0) - (plData?.prev_month?.mc?.direct_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChangeRate((plData?.current_month?.total?.direct_profit_rate || 0) - prevMonthTotalDirectProfitRate);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}%p</td>;
                  })()}
                  <td className="p-2 text-right border-r border-gray-300">-</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.cumulative?.hk?.direct_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.cumulative?.mc?.direct_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatRate(plData?.cumulative?.total?.direct_profit_rate || 0)}%</td>
                  {(() => {
                    const change = formatChangeRate((plData?.cumulative?.hk?.direct_profit_rate || 0) - (plData?.cumulative?.prev_cumulative?.hk?.direct_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChangeRate((plData?.cumulative?.mc?.direct_profit_rate || 0) - (plData?.cumulative?.prev_cumulative?.mc?.direct_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChangeRate((plData?.cumulative?.total?.direct_profit_rate || 0) - prevCumulativeTotalDirectProfitRate);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}%p</td>;
                  })()}
                  <td className="p-2 text-right">-</td>
                </tr>
                {/* 영업비 소계 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">영업비 소계</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.hk?.sg_a || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.mc?.sg_a || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(pl?.sg_a || 0)}</td>
                  {(() => {
                    const change = formatChange((plData?.current_month?.hk?.sg_a || 0) - (plData?.prev_month?.hk?.sg_a || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.current_month?.mc?.sg_a || 0) - (plData?.prev_month?.mc?.sg_a || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    // 합계 전년비: HK + MC 직접 계산
                    const hkChange = (plData?.current_month?.hk?.sg_a || 0) - (plData?.prev_month?.hk?.sg_a || 0);
                    const mcChange = (plData?.current_month?.mc?.sg_a || 0) - (plData?.prev_month?.mc?.sg_a || 0);
                    const change = formatChange(hkChange + mcChange);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className="p-2 text-right border-r border-gray-300">{formatYoy(plYoy?.sg_a || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.hk?.sg_a || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.mc?.sg_a || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.cumulative?.total?.sg_a || 0)}</td>
                  {(() => {
                    const change = formatChange((plData?.cumulative?.hk?.sg_a || 0) - (plData?.cumulative?.prev_cumulative?.hk?.sg_a || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.mc?.sg_a || 0) - (plData?.cumulative?.prev_cumulative?.mc?.sg_a || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    // 합계 전년비: HK + MC 직접 계산
                    const hkChange = (plData?.cumulative?.hk?.sg_a || 0) - (plData?.cumulative?.prev_cumulative?.hk?.sg_a || 0);
                    const mcChange = (plData?.cumulative?.mc?.sg_a || 0) - (plData?.cumulative?.prev_cumulative?.mc?.sg_a || 0);
                    const change = formatChange(hkChange + mcChange);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className="p-2 text-right">{formatYoy(plData?.cumulative?.yoy?.sg_a || 0)}%</td>
                </tr>
                {/* 영업이익 */}
                <tr className="border-b border-gray-200 bg-gray-100">
                  <td className="p-2 font-semibold border-r border-gray-300">영업이익</td>
                  <td className={`p-2 text-right border-r border-gray-300 ${(plData?.current_month?.hk?.operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(plData?.current_month?.hk?.operating_profit || 0) < 0 
                      ? `(${formatNumber(Math.abs(plData?.current_month?.hk?.operating_profit || 0))})` 
                      : formatNumber(plData?.current_month?.hk?.operating_profit || 0)}
                  </td>
                  <td className={`p-2 text-right border-r border-gray-300 ${(plData?.current_month?.mc?.operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(plData?.current_month?.mc?.operating_profit || 0) < 0 
                      ? `(${formatNumber(Math.abs(plData?.current_month?.mc?.operating_profit || 0))})` 
                      : formatNumber(plData?.current_month?.mc?.operating_profit || 0)}
                  </td>
                  <td className={`p-2 text-right border-r border-gray-300 font-semibold ${(plData?.current_month?.total?.operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(plData?.current_month?.total?.operating_profit || 0) < 0 
                      ? `(${formatNumber(Math.abs(plData?.current_month?.total?.operating_profit || 0))})` 
                      : formatNumber(plData?.current_month?.total?.operating_profit || 0)}
                  </td>
                  {(() => {
                    const change = formatChange((plData?.current_month?.hk?.operating_profit || 0) - (plData?.prev_month?.hk?.operating_profit || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.current_month?.mc?.operating_profit || 0) - (plData?.prev_month?.mc?.operating_profit || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    // 합계 전년비: HK + MC 직접 계산
                    const hkChange = (plData?.current_month?.hk?.operating_profit || 0) - (plData?.prev_month?.hk?.operating_profit || 0);
                    const mcChange = (plData?.current_month?.mc?.operating_profit || 0) - (plData?.prev_month?.mc?.operating_profit || 0);
                    const change = formatChange(hkChange + mcChange);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className={`p-2 text-right border-r border-gray-300 ${(plData?.current_month?.total?.operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(plData?.current_month?.total?.operating_profit || 0) >= 0 ? '흑자전환' : ((plChange?.operating_profit || 0) < 0 ? '적자악화' : '적자개선')}
                  </td>
                  <td className={`p-2 text-right border-r border-gray-300 ${(plData?.cumulative?.hk?.operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(plData?.cumulative?.hk?.operating_profit || 0) < 0 
                      ? `(${formatNumber(Math.abs(plData?.cumulative?.hk?.operating_profit || 0))})` 
                      : formatNumber(plData?.cumulative?.hk?.operating_profit || 0)}
                  </td>
                  <td className={`p-2 text-right border-r border-gray-300 ${(plData?.cumulative?.mc?.operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(plData?.cumulative?.mc?.operating_profit || 0) < 0 
                      ? `(${formatNumber(Math.abs(plData?.cumulative?.mc?.operating_profit || 0))})` 
                      : formatNumber(plData?.cumulative?.mc?.operating_profit || 0)}
                  </td>
                  <td className={`p-2 text-right border-r border-gray-300 font-semibold ${(plData?.cumulative?.total?.operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(plData?.cumulative?.total?.operating_profit || 0) < 0 
                      ? `(${formatNumber(Math.abs(plData?.cumulative?.total?.operating_profit || 0))})` 
                      : formatNumber(plData?.cumulative?.total?.operating_profit || 0)}
                  </td>
                  {(() => {
                    const change = formatChange((plData?.cumulative?.hk?.operating_profit || 0) - (plData?.cumulative?.prev_cumulative?.hk?.operating_profit || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    const change = formatChange((plData?.cumulative?.mc?.operating_profit || 0) - (plData?.cumulative?.prev_cumulative?.mc?.operating_profit || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}</td>;
                  })()}
                  {(() => {
                    // 합계 전년비: HK + MC 직접 계산
                    const hkChange = (plData?.cumulative?.hk?.operating_profit || 0) - (plData?.cumulative?.prev_cumulative?.hk?.operating_profit || 0);
                    const mcChange = (plData?.cumulative?.mc?.operating_profit || 0) - (plData?.cumulative?.prev_cumulative?.mc?.operating_profit || 0);
                    const change = formatChange(hkChange + mcChange);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}</td>;
                  })()}
                  <td className={`p-2 text-right ${(plData?.cumulative?.total?.operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(plData?.cumulative?.total?.operating_profit || 0) >= 0 ? '흑자전환' : ((plData?.cumulative?.change?.operating_profit || 0) < 0 ? '적자악화' : '적자개선')}
                  </td>
                </tr>
                {/* 영업이익율 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">영업이익율</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.current_month?.hk?.operating_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.current_month?.mc?.operating_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatRate(plData?.current_month?.total?.operating_profit_rate || 0)}%</td>
                  {(() => {
                    const change = formatChangeRate((plData?.current_month?.hk?.operating_profit_rate || 0) - (plData?.prev_month?.hk?.operating_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChangeRate((plData?.current_month?.mc?.operating_profit_rate || 0) - (plData?.prev_month?.mc?.operating_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChangeRate((plData?.current_month?.total?.operating_profit_rate || 0) - prevMonthTotalOperatingProfitRate);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}%p</td>;
                  })()}
                  <td className="p-2 text-right border-r border-gray-300">-</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.cumulative?.hk?.operating_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatRate(plData?.cumulative?.mc?.operating_profit_rate || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatRate(plData?.cumulative?.total?.operating_profit_rate || 0)}%</td>
                  {(() => {
                    const change = formatChangeRate((plData?.cumulative?.hk?.operating_profit_rate || 0) - (plData?.cumulative?.prev_cumulative?.hk?.operating_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChangeRate((plData?.cumulative?.mc?.operating_profit_rate || 0) - (plData?.cumulative?.prev_cumulative?.mc?.operating_profit_rate || 0));
                    return <td className={`p-2 text-right border-r border-gray-300 ${change.className}`}>{change.text}%p</td>;
                  })()}
                  {(() => {
                    const change = formatChangeRate((plData?.cumulative?.total?.operating_profit_rate || 0) - prevCumulativeTotalOperatingProfitRate);
                    return <td className={`p-2 text-right border-r border-gray-300 font-semibold ${change.className}`}>{change.text}%p</td>;
                  })()}
                  <td className="p-2 text-right">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 월별 추세 그래프 */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        {/* 월별 채널별 매출 추세 */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-2 h-20 rounded-full mr-2"></div>
            2025년 채널별 실판매출 추세 (1K HKD)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart 
              data={(monthlyDashboardData?.monthly_channel_data || []).map((item: any) => ({
                month: `${item.period.slice(2, 4)}월`,
                'HK Retail': Math.round((item.HK_Retail || 0) / 1000),
                'HK Outlet': Math.round((item.HK_Outlet || 0) / 1000),
                'HK Online': Math.round((item.HK_Online || 0) / 1000),
                'MC Retail': Math.round((item.MC_Retail || 0) / 1000),
                'MC Outlet': Math.round((item.MC_Outlet || 0) / 1000),
                total: Math.round((item.total || 0) / 1000)
              }))} 
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              onClick={(data: any) => {
                if (data && data.activePayload && data.activePayload[0]) {
                  const dataKey = data.activePayload[0].dataKey;
                  // dataKey를 한글 채널 이름으로 변환
                  const channelName = dataKey === 'HK Retail' ? 'HK 정상' :
                                    dataKey === 'HK Outlet' ? 'HK 아울렛' :
                                    dataKey === 'HK Online' ? 'HK 온라인' :
                                    dataKey === 'MC Retail' ? 'MC 정상' :
                                    dataKey === 'MC Outlet' ? 'MC 아울렛' : dataKey;
                  setSelectedChannel(selectedChannel === channelName ? null : channelName);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis 
                tick={{ fontSize: 11 }} 
                domain={[0, 50000]} 
                tickFormatter={(value) => value.toLocaleString()}
                ticks={[0, 10000, 20000, 30000, 40000, 50000]}
              />
              <Tooltip 
                formatter={(value: any, name: string) => [`${Math.round(value).toLocaleString()}K HKD`, name]}
                contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", padding: "8px", fontSize: "11px" }}
              />
              <Bar dataKey="HK Retail" stackId="a" fill="#93C5FD" name="HK 정상">
                {(monthlyDashboardData?.monthly_channel_data || []).map((item: any, index: number) => {
                  const total = (item.total || 0) / 1000;
                  const hkRetail = (item.HK_Retail || 0) / 1000;
                  const pct = total > 0 ? ((hkRetail / total) * 100).toFixed(1) : '0.0';
                  return (
                    <text 
                      key={`label-hk-retail-${index}`} 
                      x={47 + index * 94} 
                      y={140 + (index % 2) * 15} 
                      textAnchor="middle" 
                      fill="#000000" 
                      fontSize="9" 
                      fontWeight="700"
                    >
                      {pct}%
                    </text>
                  );
                })}
              </Bar>
              <Bar dataKey="HK Outlet" stackId="a" fill="#C4B5FD" name="HK 아울렛">
                {(monthlyDashboardData?.monthly_channel_data || []).map((item: any, index: number) => {
                  const total = (item.total || 0) / 1000;
                  const hkOutlet = (item.HK_Outlet || 0) / 1000;
                  const pct = total > 0 ? ((hkOutlet / total) * 100).toFixed(1) : '0.0';
                  return (
                    <text 
                      key={`label-hk-outlet-${index}`} 
                      x={47 + index * 94} 
                      y={215 + (index % 2) * 3} 
                      textAnchor="middle" 
                      fill="#000000" 
                      fontSize="9" 
                      fontWeight="700"
                    >
                      {pct}%
                    </text>
                  );
                })}
              </Bar>
              <Bar dataKey="HK Online" stackId="a" fill="#F9A8D4" name="HK 온라인">
                {(monthlyDashboardData?.monthly_channel_data || []).map((item: any, index: number) => {
                  const total = (item.total || 0) / 1000;
                  const hkOnline = (item.HK_Online || 0) / 1000;
                  const pct = total > 0 ? ((hkOnline / total) * 100).toFixed(1) : '0.0';
                  return (
                    <text 
                      key={`label-hk-online-${index}`} 
                      x={47 + index * 94} 
                      y={240 + (index % 2) * 3} 
                      textAnchor="middle" 
                      fill="#000000" 
                      fontSize="9" 
                      fontWeight="700"
                    >
                      {pct}%
                    </text>
                  );
                })}
              </Bar>
              <Bar dataKey="MC Retail" stackId="a" fill="#A78BFA" name="MC 정상">
                {(monthlyDashboardData?.monthly_channel_data || []).map((item: any, index: number) => {
                  const total = (item.total || 0) / 1000;
                  const mcRetail = (item.MC_Retail || 0) / 1000;
                  const pct = total > 0 ? ((mcRetail / total) * 100).toFixed(1) : '0.0';
                  return (
                    <text 
                      key={`label-mc-retail-${index}`} 
                      x={47 + index * 94} 
                      y={265 + (index % 2) * 3} 
                      textAnchor="middle" 
                      fill="#000000" 
                      fontSize="9" 
                      fontWeight="700"
                    >
                      {pct}%
                    </text>
                  );
                })}
              </Bar>
              <Bar dataKey="MC Outlet" stackId="a" fill="#F472B6" name="MC 아울렛">
                {(monthlyDashboardData?.monthly_channel_data || []).map((item: any, index: number) => {
                  const total = (item.total || 0) / 1000;
                  const mcOutlet = (item.MC_Outlet || 0) / 1000;
                  const pct = total > 0 ? ((mcOutlet / total) * 100).toFixed(1) : '0.0';
                  return (
                    <text 
                      key={`label-mc-outlet-${index}`} 
                      x={47 + index * 94} 
                      y={290 + (index % 2) * 3} 
                      textAnchor="middle" 
                      fill="#000000" 
                      fontSize="9" 
                      fontWeight="700"
                    >
                      {pct}%
                    </text>
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          
          {/* 채널 선택 버튼 */}
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {[
              { name: '전체', color: '#E5E7EB' },
              { name: 'HK 정상', color: '#93C5FD' },
              { name: 'HK 아울렛', color: '#C4B5FD' },
              { name: 'HK 온라인', color: '#F9A8D4' },
              { name: 'MC 정상', color: '#A78BFA' },
              { name: 'MC 아울렛', color: '#F472B6' },
            ].map((channel) => (
              <button
                key={channel.name}
                onClick={() => {
                  setSelectedChannel(selectedChannel === channel.name ? null : channel.name);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${
                  selectedChannel === channel.name
                    ? 'ring-2 ring-blue-600 scale-105'
                    : 'hover:scale-105'
                }`}
                style={{ 
                  backgroundColor: channel.color,
                  color: '#000000'
                }}
              >
                {channel.name}
              </button>
            ))}
          </div>
          
          {/* YOY 꺾은선 그래프 (채널 선택 시) */}
          {selectedChannel && (
            <div className="mt-4">
              <div className="mb-2 text-xs text-gray-600">
                선택된 채널: {selectedChannel}
              </div>
              {selectedChannel === '전체' ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart 
                    data={(monthlyDashboardData?.monthly_channel_data || []).map((item: any, idx: number) => ({
                      month: `${item.period.slice(2, 4)}월`,
                      hkRetail: monthlyDashboardData?.monthly_channel_yoy?.['HK_Retail']?.[idx] || 0,
                      hkOutlet: monthlyDashboardData?.monthly_channel_yoy?.['HK_Outlet']?.[idx] || 0,
                      hkOnline: monthlyDashboardData?.monthly_channel_yoy?.['HK_Online']?.[idx] || 0,
                      mcRetail: monthlyDashboardData?.monthly_channel_yoy?.['MC_Retail']?.[idx] || 0,
                      mcOutlet: monthlyDashboardData?.monthly_channel_yoy?.['MC_Outlet']?.[idx] || 0,
                    }))} 
                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(value) => `${value}%`} />
                    <Tooltip 
                      formatter={(value: any) => [`${value}%`, 'YOY']}
                      contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", padding: "8px", fontSize: "11px" }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="hkRetail" stroke="#93C5FD" strokeWidth={2} name="HK 정상" />
                    <Line type="monotone" dataKey="hkOutlet" stroke="#C4B5FD" strokeWidth={2} name="HK 아울렛" />
                    <Line type="monotone" dataKey="hkOnline" stroke="#F9A8D4" strokeWidth={2} name="HK 온라인" />
                    <Line type="monotone" dataKey="mcRetail" stroke="#A78BFA" strokeWidth={2} name="MC 정상" />
                    <Line type="monotone" dataKey="mcOutlet" stroke="#F472B6" strokeWidth={2} name="MC 아울렛" />
                    <ReferenceLine y={100} stroke="#666" strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart 
                    data={(monthlyDashboardData?.monthly_channel_data || []).map((item: any, idx: number) => {
                      // 채널 이름을 언더스코어 형식으로 변환 (예: 'HK 정상' -> 'HK_Retail')
                      const channelKey = selectedChannel === 'HK 정상' ? 'HK_Retail' : 
                                       selectedChannel === 'HK 아울렛' ? 'HK_Outlet' :
                                       selectedChannel === 'HK 온라인' ? 'HK_Online' :
                                       selectedChannel === 'MC 정상' ? 'MC_Retail' :
                                       selectedChannel === 'MC 아울렛' ? 'MC_Outlet' : selectedChannel.replace(' ', '_');
                      return {
                        month: `${item.period.slice(2, 4)}월`,
                        yoy: monthlyDashboardData?.monthly_channel_yoy ? ((monthlyDashboardData.monthly_channel_yoy as any)[channelKey]?.[idx] || 0) : 0
                      };
                    })} 
                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(value) => `${value}%`} />
                    <Tooltip 
                      formatter={(value: any) => [`${value}%`, 'YOY']}
                      contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", padding: "8px", fontSize: "11px" }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="yoy" stroke="#3B82F6" strokeWidth={2} name={`${selectedChannel} YOY`} />
                    <ReferenceLine y={100} stroke="#666" strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              )}
              
              {/* YOY 테이블 */}
              <div className="mt-4">
                <table className="w-full text-[10px] border-collapse border border-gray-300">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 px-1 py-1 text-left font-semibold">{selectedChannel === '전체' ? '채널' : selectedChannel}</th>
                      {(monthlyDashboardData?.monthly_channel_data || []).map((item: any) => (
                        <th key={item.period} className="border border-gray-300 px-1 py-1 text-center font-semibold">{`${item.period.slice(2, 4)}월`}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedChannel === '전체' ? (
                      <>
                        {['HK 정상', 'HK 아울렛', 'HK 온라인', 'MC 정상', 'MC 아울렛'].map((channel) => {
                          const channelKey = channel === 'HK 정상' ? 'HK_Retail' : 
                                           channel === 'HK 아울렛' ? 'HK_Outlet' :
                                           channel === 'HK 온라인' ? 'HK_Online' :
                                           channel === 'MC 정상' ? 'MC_Retail' :
                                           channel === 'MC 아울렛' ? 'MC_Outlet' : channel.replace(' ', '_');
                          return (
                            <tr key={channel}>
                              <td className="border border-gray-300 px-1 py-1 font-semibold bg-blue-50">{channel}</td>
                              {((monthlyDashboardData?.monthly_channel_yoy ? (monthlyDashboardData.monthly_channel_yoy as any)[channelKey] : undefined) || []).map((yoy: number, idx: number) => (
                                <td 
                                  key={idx} 
                                  className={`border border-gray-300 px-1 py-1 text-center font-bold ${yoy >= 100 ? 'text-green-600' : 'text-red-600'}`}
                                >
                                  {yoy}%
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </>
                    ) : (
                      <tr>
                        <td className="border border-gray-300 px-1 py-1 font-semibold bg-blue-50">YOY</td>
                        {(() => {
                          // 한글 채널 이름을 데이터 키로 변환
                          const channelKey = selectedChannel === 'HK 정상' ? 'HK_Retail' : 
                                           selectedChannel === 'HK 아울렛' ? 'HK_Outlet' :
                                           selectedChannel === 'HK 온라인' ? 'HK_Online' :
                                           selectedChannel === 'MC 정상' ? 'MC_Retail' :
                                           selectedChannel === 'MC 아울렛' ? 'MC_Outlet' : selectedChannel.replace(' ', '_');
                          const yoyData = monthlyDashboardData?.monthly_channel_yoy ? (monthlyDashboardData.monthly_channel_yoy as any)[channelKey] : undefined;
                          return (yoyData || []).map((yoy: number, idx: number) => (
                            <td 
                              key={idx} 
                              className={`border border-gray-300 px-1 py-1 text-center font-bold ${yoy >= 100 ? 'text-green-600' : 'text-red-600'}`}
                            >
                              {yoy}%
                            </td>
                          ));
                        })()}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* 주요 인사이트 */}
          <div className="mt-3 grid grid-cols-3 gap-1">
            {selectedChannel === null || selectedChannel === '전체' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 주요 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    {(() => {
                      const monthlyData = (monthlyDashboardData?.monthly_channel_data || []) as any[];
                      if (monthlyData.length === 0) return <div>데이터 없음</div>;
                      
                      const totals = monthlyData.map((item: any) => Math.round((item.total || 0) / 1000));
                      const maxTotal = Math.max(...totals);
                      const minTotal = Math.min(...totals);
                      const maxMonth = monthlyData[totals.indexOf(maxTotal)]?.period?.slice(2, 4) || '';
                      const minMonth = monthlyData[totals.indexOf(minTotal)]?.period?.slice(2, 4) || '';
                      const latestTotal = totals[totals.length - 1] || 0;
                      const prevTotal = totals[totals.length - 2] || 0;
                      
                      return (
                        <>
                          <div>• {maxMonth}월 최대 {maxTotal.toLocaleString()}K</div>
                          <div>• {minMonth}월 최저 {minTotal.toLocaleString()}K</div>
                          {latestTotal > prevTotal ? (
                            <div>• {monthlyData[monthlyData.length - 1]?.period?.slice(2, 4) || ''}월 회복세</div>
                          ) : (
                            <div>• {monthlyData[monthlyData.length - 1]?.period?.slice(2, 4) || ''}월 하락세</div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 채널 트렌드</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    {(() => {
                      const monthlyData = (monthlyDashboardData?.monthly_channel_data || []) as any[];
                      if (monthlyData.length === 0) return <div>데이터 없음</div>;
                      
                      const latest = monthlyData[monthlyData.length - 1] || {};
                      const total = (latest.total || 0) / 1000;
                      const hkRetail = (latest.HK_Retail || 0) / 1000;
                      const hkOnline = (latest.HK_Online || 0) / 1000;
                      const mcRetail = (latest.MC_Retail || 0) / 1000;
                      
                      const hkRetailPct = total > 0 ? ((hkRetail / total) * 100).toFixed(1) : '0';
                      const hkOnlinePct = total > 0 ? ((hkOnline / total) * 100).toFixed(1) : '0';
                      const mcRetailPct = total > 0 ? ((mcRetail / total) * 100).toFixed(1) : '0';
                      
                      const yoyData = monthlyDashboardData?.monthly_channel_yoy || {};
                      const hkOnlineYoy = yoyData['HK_Online']?.[yoyData['HK_Online'].length - 1] || 0;
                      
                      return (
                        <>
                          <div>• HK 정상: 최대 비중 ({hkRetailPct}%)</div>
                          {hkOnlineYoy > 200 ? (
                            <div>• HK 온라인: 고성장 (YOY {hkOnlineYoy}%)</div>
                          ) : (
                            <div>• HK 온라인: 성장세 (YOY {hkOnlineYoy}%)</div>
                          )}
                          <div>• MC 정상: 안정적 기여 ({mcRetailPct}%)</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 전략 포인트</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    {(() => {
                      const yoyData = monthlyDashboardData?.monthly_channel_yoy || {};
                      const hkOnlineYoy = yoyData['HK_Online']?.[yoyData['HK_Online'].length - 1] || 0;
                      const mcRetailYoy = yoyData['MC_Retail']?.[yoyData['MC_Retail'].length - 1] || 0;
                      
                      const insights = [];
                      if (hkOnlineYoy > 200) {
                        insights.push('• 온라인 채널 집중 육성');
                      }
                      if (mcRetailYoy < 100) {
                        insights.push('• MC 시장 회복 전략');
                      }
                      insights.push('• 채널별 차별화 전략');
                      
                      return insights.map((insight, idx) => <div key={idx}>{insight}</div>);
                    })()}
                  </div>
                </div>
              </>
            ) : selectedChannel === 'HK 정상' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 HK 정상 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    {(() => {
                      const monthlyData = (monthlyDashboardData?.monthly_channel_data || []) as any[];
                      if (monthlyData.length === 0) return <div>데이터 없음</div>;
                      
                      const hkRetailValues = monthlyData.map((item: any) => Math.round((item.HK_Retail || 0) / 1000));
                      const maxValue = Math.max(...hkRetailValues);
                      const maxMonth = monthlyData[hkRetailValues.indexOf(maxValue)]?.period?.slice(2, 4) || '';
                      const yoyData = monthlyDashboardData?.monthly_channel_yoy || {};
                      const yoyValues = yoyData['HK_Retail'] || [];
                      const avgYoy = yoyValues.length > 0 ? Math.round(yoyValues.reduce((a: number, b: number) => a + b, 0) / yoyValues.length) : 0;
                      const latestPct = monthlyData[monthlyData.length - 1] ? 
                        ((monthlyData[monthlyData.length - 1].HK_Retail || 0) / (monthlyData[monthlyData.length - 1].total || 1) * 100).toFixed(1) : '0';
                      
                      return (
                        <>
                          <div>• 최대 비중 채널 ({latestPct}%)</div>
                          <div>• {maxMonth}월 최고 {maxValue.toLocaleString()}K</div>
                          <div>• YOY 평균 {avgYoy}% 수준</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 성과 분석</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    {(() => {
                      const yoyData = monthlyDashboardData?.monthly_channel_yoy || {};
                      const yoyValues = yoyData['HK_Retail'] || [];
                      if (yoyValues.length === 0) return <div>데이터 없음</div>;
                      
                      const firstYoy = yoyValues[0] || 0;
                      const midYoy = yoyValues.length > 5 ? yoyValues[5] : yoyValues[Math.floor(yoyValues.length / 2)] || 0;
                      const latestYoy = yoyValues[yoyValues.length - 1] || 0;
                      
                      return (
                        <>
                          <div>• 1월 {firstYoy}% {firstYoy >= 100 ? '강한 출발' : '부진'}</div>
                          <div>• 중반기 {midYoy}% {midYoy >= 100 ? '회복세' : '부진'}</div>
                          <div>• 10월 {latestYoy}% {latestYoy >= 100 ? '회복세' : '하락세'}</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 액션 아이템</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    {(() => {
                      const yoyData = monthlyDashboardData?.monthly_channel_yoy || {};
                      const yoyValues = yoyData['HK_Retail'] || [];
                      const latestYoy = yoyValues[yoyValues.length - 1] || 0;
                      const avgYoy = yoyValues.length > 0 ? yoyValues.reduce((a: number, b: number) => a + b, 0) / yoyValues.length : 0;
                      
                      const actions = [];
                      if (avgYoy < 100) {
                        actions.push('• 상반기 매출 회복 전략');
                      }
                      actions.push('• 주력 채널 강화 필요');
                      if (latestYoy >= 100) {
                        actions.push('• 모멘텀 지속화');
                      } else {
                        actions.push('• 하반기 회복 전략');
                      }
                      
                      return actions.map((action, idx) => <div key={idx}>{action}</div>);
                    })()}
                  </div>
                </div>
              </>
            ) : selectedChannel === 'HK 아울렛' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 HK 아울렛 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    {(() => {
                      const monthlyData = (monthlyDashboardData?.monthly_channel_data || []) as any[];
                      if (monthlyData.length === 0) return <div>데이터 없음</div>;
                      
                      const hkOutletValues = monthlyData.map((item: any) => Math.round((item.HK_Outlet || 0) / 1000));
                      const maxValue = Math.max(...hkOutletValues);
                      const maxMonth = monthlyData[hkOutletValues.indexOf(maxValue)]?.period?.slice(2, 4) || '';
                      const yoyData = monthlyDashboardData?.monthly_channel_yoy || {};
                      const yoyValues = yoyData['HK_Outlet'] || [];
                      const avgYoy = yoyValues.length > 0 ? Math.round(yoyValues.reduce((a: number, b: number) => a + b, 0) / yoyValues.length) : 0;
                      const latestPct = monthlyData[monthlyData.length - 1] ? 
                        ((monthlyData[monthlyData.length - 1].HK_Outlet || 0) / (monthlyData[monthlyData.length - 1].total || 1) * 100).toFixed(1) : '0';
                      
                      return (
                        <>
                          <div>• 전체의 {latestPct}% 비중</div>
                          <div>• {maxMonth}월 최고 {maxValue.toLocaleString()}K</div>
                          <div>• YOY 평균 {avgYoy}% 수준</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 성과 분석</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    {(() => {
                      const yoyData = monthlyDashboardData?.monthly_channel_yoy || {};
                      const yoyValues = yoyData['HK_Outlet'] || [];
                      if (yoyValues.length === 0) return <div>데이터 없음</div>;
                      
                      const firstYoy = yoyValues[0] || 0;
                      const secondYoy = yoyValues[1] || 0;
                      const latestYoy = yoyValues[yoyValues.length - 1] || 0;
                      const midYoy = yoyValues.length > 6 ? yoyValues[6] : yoyValues[Math.floor(yoyValues.length / 2)] || 0;
                      
                      return (
                        <>
                          <div>• 1월 {firstYoy}% {firstYoy >= 100 ? '양호' : '부진'}</div>
                          <div>• 2월 {secondYoy}% {secondYoy < 60 ? '급감' : '안정'}</div>
                          <div>• {yoyValues.length > 6 ? '7~8월' : '중반기'} {midYoy >= 100 ? `${midYoy}% 회복` : `${midYoy}% 부진`}</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 액션 아이템</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    <div>• 재고 소진 효율화</div>
                    <div>• 할인 전략 최적화</div>
                    <div>• 부진 원인 분석</div>
                  </div>
                </div>
              </>
            ) : selectedChannel === 'HK 온라인' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 HK 온라인 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    {(() => {
                      const monthlyData = (monthlyDashboardData?.monthly_channel_data || []) as any[];
                      if (monthlyData.length === 0) return <div>데이터 없음</div>;
                      
                      const hkOnlineValues = monthlyData.map((item: any) => Math.round((item.HK_Online || 0) / 1000));
                      const maxValue = Math.max(...hkOnlineValues);
                      const maxMonth = monthlyData[hkOnlineValues.indexOf(maxValue)]?.period?.slice(2, 4) || '';
                      const yoyData = monthlyDashboardData?.monthly_channel_yoy || {};
                      const yoyValues = yoyData['HK_Online'] || [];
                      const avgYoy = yoyValues.length > 0 ? Math.round(yoyValues.reduce((a: number, b: number) => a + b, 0) / yoyValues.length) : 0;
                      const latestPct = monthlyData[monthlyData.length - 1] ? 
                        ((monthlyData[monthlyData.length - 1].HK_Online || 0) / (monthlyData[monthlyData.length - 1].total || 1) * 100).toFixed(1) : '0';
                      
                      return (
                        <>
                          <div>• 비중 {latestPct}% 고성장</div>
                          <div>• {maxMonth}월 최고 {maxValue.toLocaleString()}K</div>
                          <div>• YOY 평균 {avgYoy}% 폭발 성장</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 성과 분석</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    {(() => {
                      const yoyData = monthlyDashboardData?.monthly_channel_yoy || {};
                      const yoyValues = yoyData['HK_Online'] || [];
                      if (yoyValues.length === 0) return <div>데이터 없음</div>;
                      
                      const latestYoy = yoyValues[yoyValues.length - 1] || 0;
                      const prevYoy = yoyValues.length > 1 ? yoyValues[yoyValues.length - 2] : 0;
                      const prevPrevYoy = yoyValues.length > 2 ? yoyValues[yoyValues.length - 3] : 0;
                      
                      return (
                        <>
                          {prevPrevYoy > 200 ? <div>• {yoyValues.length - 2}월 {prevPrevYoy}% 급성장</div> : null}
                          {prevYoy > 200 ? <div>• {yoyValues.length - 1}월 {prevYoy}% 지속</div> : null}
                          <div>• 10월 {latestYoy}% {latestYoy > 200 ? '역대 최고' : '성장세'}</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 액션 아이템</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    <div>• 온라인 투자 확대</div>
                    <div>• 성장 모멘텀 극대화</div>
                    <div>• 디지털 마케팅 강화</div>
                  </div>
                </div>
              </>
            ) : selectedChannel === 'MC 정상' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 MC 정상 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    {(() => {
                      const monthlyData = (monthlyDashboardData?.monthly_channel_data || []) as any[];
                      if (monthlyData.length === 0) return <div>데이터 없음</div>;
                      
                      const mcRetailValues = monthlyData.map((item: any) => Math.round((item.MC_Retail || 0) / 1000));
                      const maxValue = Math.max(...mcRetailValues);
                      const maxMonth = monthlyData[mcRetailValues.indexOf(maxValue)]?.period?.slice(2, 4) || '';
                      const yoyData = monthlyDashboardData?.monthly_channel_yoy || {};
                      const yoyValues = yoyData['MC_Retail'] || [];
                      const avgYoy = yoyValues.length > 0 ? Math.round(yoyValues.reduce((a: number, b: number) => a + b, 0) / yoyValues.length) : 0;
                      const latestPct = monthlyData[monthlyData.length - 1] ? 
                        ((monthlyData[monthlyData.length - 1].MC_Retail || 0) / (monthlyData[monthlyData.length - 1].total || 1) * 100).toFixed(1) : '0';
                      
                      return (
                        <>
                          <div>• 전체의 {latestPct}% 비중</div>
                          <div>• {maxMonth}월 최고 {maxValue.toLocaleString()}K</div>
                          <div>• YOY 평균 {avgYoy}% {avgYoy < 100 ? '부진' : '안정'}</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 성과 분석</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    {(() => {
                      const yoyData = monthlyDashboardData?.monthly_channel_yoy || {};
                      const yoyValues = yoyData['MC_Retail'] || [];
                      if (yoyValues.length === 0) return <div>데이터 없음</div>;
                      
                      const latestYoy = yoyValues[yoyValues.length - 1] || 0;
                      const allBelow100 = yoyValues.every((y: number) => y < 100);
                      
                      return (
                        <>
                          {allBelow100 ? <div>• 연중 100% 미달</div> : null}
                          <div>• 10월 {latestYoy}% {latestYoy >= 100 ? '회복세' : '부진 지속'}</div>
                          <div>• 안정적 기여도 유지</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 액션 아이템</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    <div>• MC 시장 회복 전략</div>
                    <div>• 지역별 맞춤 전략</div>
                    <div>• 매출 회복 프로그램</div>
                  </div>
                </div>
              </>
            ) : selectedChannel === 'MC 아울렛' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 MC 아울렛 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    {(() => {
                      const monthlyData = (monthlyDashboardData?.monthly_channel_data || []) as any[];
                      if (monthlyData.length === 0) return <div>데이터 없음</div>;
                      
                      const mcOutletValues = monthlyData.map((item: any) => Math.round((item.MC_Outlet || 0) / 1000));
                      const maxValue = Math.max(...mcOutletValues);
                      const maxMonth = monthlyData[mcOutletValues.indexOf(maxValue)]?.period?.slice(2, 4) || '';
                      const yoyData = monthlyDashboardData?.monthly_channel_yoy || {};
                      const yoyValues = yoyData['MC_Outlet'] || [];
                      const avgYoy = yoyValues.length > 0 ? Math.round(yoyValues.reduce((a: number, b: number) => a + b, 0) / yoyValues.length) : 0;
                      const latestPct = monthlyData[monthlyData.length - 1] ? 
                        ((monthlyData[monthlyData.length - 1].MC_Outlet || 0) / (monthlyData[monthlyData.length - 1].total || 1) * 100).toFixed(1) : '0';
                      
                      return (
                        <>
                          <div>• 최소 비중 채널 ({latestPct}%)</div>
                          <div>• {maxMonth}월 최고 {maxValue.toLocaleString()}K</div>
                          <div>• YOY 평균 {avgYoy}% {avgYoy >= 100 ? '양호' : '부진'}</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 성과 분석</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    {(() => {
                      const yoyData = monthlyDashboardData?.monthly_channel_yoy || {};
                      const yoyValues = yoyData['MC_Outlet'] || [];
                      if (yoyValues.length === 0) return <div>데이터 없음</div>;
                      
                      const firstYoy = yoyValues[0] || 0;
                      const latestYoy = yoyValues[yoyValues.length - 1] || 0;
                      
                      return (
                        <>
                          <div>• 1월 {firstYoy}% {firstYoy >= 150 ? '강한 출발' : '부진'}</div>
                          <div>• 10월 {latestYoy}% {latestYoy >= 100 ? '회복세' : '하락세'}</div>
                          <div>• 변동성 큰 채널</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 액션 아이템</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    <div>• 재고 관리 최적화</div>
                    <div>• 할인 전략 재검토</div>
                    <div>• 안정화 전략 수립</div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
        
        {/* 2025년 아이템별 추세 (1K HKD) - 강제 새로고침 */}
        <div className="bg-white rounded-lg shadow-md p-4" key={`item-chart-${period}-${salesPriceType}-${Date.now()}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center whitespace-nowrap">
              <div className="w-2 h-20 rounded-full mr-2"></div>
              2025년 아이템별 실판매출 추세 (1K HKD)
            </h3>
            
            {/* 실판가/택가/할인율 토글 버튼 */}
            <div className="flex gap-2">
              <button
                onClick={() => setSalesPriceType('실판')}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                  salesPriceType === '실판'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                실판가
              </button>
              <button
                onClick={() => setSalesPriceType('택가')}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                  salesPriceType === '택가'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                택가
              </button>
              <button
                onClick={() => setSalesPriceType('할인율')}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                  salesPriceType === '할인율'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                할인율
              </button>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={250}>
            {salesPriceType === '할인율' ? (
              <LineChart 
                data={(monthlyDashboardData?.monthly_item_data || []).map((item: any) => {
                  const calculateDiscount = (gross: number, net: number) => {
                    if (gross === 0) return 0;
                    return ((gross - net) / gross * 100);
                  };
                  return {
                    month: `${item.period.slice(2, 4)}월`,
                    '당시즌F': calculateDiscount(item.당시즌F.gross_sales, item.당시즌F.net_sales),
                    '당시즌S': calculateDiscount(item.당시즌S.gross_sales, item.당시즌S.net_sales),
                    '과시즌F': calculateDiscount(item.과시즌F.gross_sales, item.과시즌F.net_sales),
                    '과시즌S': calculateDiscount(item.과시즌S.gross_sales, item.과시즌S.net_sales),
                    '모자': calculateDiscount(item.모자.gross_sales, item.모자.net_sales),
                    '신발': calculateDiscount(item.신발.gross_sales, item.신발.net_sales),
                    '가방': calculateDiscount(item.가방.gross_sales, item.가방.net_sales),
                    '기타ACC': calculateDiscount(item.기타ACC.gross_sales, item.기타ACC.net_sales),
                  };
                })} 
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 70]} tickFormatter={(value) => `${Math.round(value)}%`} />
                <Tooltip 
                  formatter={(value: any, name: string) => [`${Math.round(value)}%`, name]}
                  contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", padding: "8px", fontSize: "11px" }}
                />
                <Line type="monotone" dataKey="당시즌F" stroke="#FFD4B3" strokeWidth={3} dot={{ r: 4 }} name="🍂 25F" />
                <Line type="monotone" dataKey="당시즌S" stroke="#B3E5FC" strokeWidth={3} dot={{ r: 4 }} name="☀️ 25S" />
                <Line type="monotone" dataKey="과시즌F" stroke="#FFB3C1" strokeWidth={3} dot={{ r: 4 }} name="🍂 과시즌F" />
                <Line type="monotone" dataKey="과시즌S" stroke="#B2F5EA" strokeWidth={3} dot={{ r: 4 }} name="☀️ 과시즌S" />
                <Line type="monotone" dataKey="모자" stroke="#93C5FD" strokeWidth={3} dot={{ r: 4 }} name="🧢 모자" />
                <Line type="monotone" dataKey="신발" stroke="#FCD34D" strokeWidth={3} dot={{ r: 4 }} name="👟 신발" />
                <Line type="monotone" dataKey="가방" stroke="#C4B5FD" strokeWidth={3} dot={{ r: 4 }} name="👜 가방" />
                <Line type="monotone" dataKey="기타ACC" stroke="#F9A8D4" strokeWidth={3} dot={{ r: 4 }} name="✨ 기타ACC" />
              </LineChart>
            ) : (
              <BarChart 
                data={(() => {
                  const mappedData = (monthlyDashboardData?.monthly_item_data || []).map((item: any) => {
                    // [검증됨] 채널별 매출과 100% 일치하는 아이템별 데이터
                    // 실판가: net_sales 사용 (채널별 매출과 동일)
                    // 택가: gross_sales 사용
                    const isNetSales = salesPriceType === '실판';
                    
                    const f25 = isNetSales ? item.당시즌F.net_sales : item.당시즌F.gross_sales;
                    const s25 = isNetSales ? item.당시즌S.net_sales : item.당시즌S.gross_sales;
                    const fPast = isNetSales ? item.과시즌F.net_sales : item.과시즌F.gross_sales;
                    const sPast = isNetSales ? item.과시즌S.net_sales : item.과시즌S.gross_sales;
                    const cap = isNetSales ? item.모자.net_sales : item.모자.gross_sales;
                    const shoes = isNetSales ? item.신발.net_sales : item.신발.gross_sales;
                    const bag = isNetSales ? item.가방.net_sales : item.가방.gross_sales;
                    const acc = isNetSales ? item.기타ACC.net_sales : item.기타ACC.gross_sales;
                    
                    const total = Math.round(f25 + s25 + fPast + sPast + cap + shoes + bag + acc);
                    
                  return {
                    month: `${item.period.slice(2, 4)}월`,
                      period: item.period,
                      '당시즌F': Math.round(f25),
                      '당시즌S': Math.round(s25),
                      '과시즌F': Math.round(fPast),
                      '과시즌S': Math.round(sPast),
                      '모자': Math.round(cap),
                      '신발': Math.round(shoes),
                      '가방': Math.round(bag),
                      '기타ACC': Math.round(acc),
                      _total: total,
                    };
                  });
                  
                  // 디버깅: 01월 데이터 출력
                  const jan = mappedData.find((d: any) => d.period === '2501');
                  if (jan) {
                    console.log('🔍 [아이템별 그래프] 2501 (01월) 렌더링 데이터:');
                    console.log('  실판가 선택?', salesPriceType === '실판');
                    console.log('  당시즌F:', jan['당시즌F']);
                    console.log('  당시즌S:', jan['당시즌S']);
                    console.log('  과시즌F:', jan['과시즌F']);
                    console.log('  과시즌S:', jan['과시즌S']);
                    console.log('  모자:', jan['모자']);
                    console.log('  신발:', jan['신발']);
                    console.log('  가방:', jan['가방']);
                    console.log('  기타ACC:', jan['기타ACC']);
                    console.log('  → 합계:', jan._total, 'K HKD');
                  }
                  
                  return mappedData;
                })()} 
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                onClick={(data: any) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const itemName = data.activePayload[0].dataKey;
                    setSelectedItem(selectedItem === itemName ? null : itemName);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis 
                  tick={{ fontSize: 11 }} 
                  domain={[0, 50000]} 
                  tickFormatter={(value) => value.toLocaleString()}
                  ticks={[0, 10000, 20000, 30000, 40000, 50000]}
                  allowDecimals={false}
                  width={60}
                />
                <Tooltip 
                  formatter={(value: any, name: string) => [`${Math.round(value).toLocaleString()}K HKD`, name]}
                  contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", padding: "8px", fontSize: "11px" }}
                />
                <Bar dataKey="당시즌F" stackId="a" fill="#FFD4B3" name="🍂 25F" />
                <Bar dataKey="당시즌S" stackId="a" fill="#B3E5FC" name="☀️ 25S" />
                <Bar dataKey="과시즌F" stackId="a" fill="#FFB3C1" name="🍂 과시즌F" />
                <Bar dataKey="과시즌S" stackId="a" fill="#B2F5EA" name="☀️ 과시즌S" />
                <Bar dataKey="모자" stackId="a" fill="#93C5FD" name="🧢 모자" />
                <Bar dataKey="신발" stackId="a" fill="#FCD34D" name="👟 신발" />
                <Bar dataKey="가방" stackId="a" fill="#C4B5FD" name="👜 가방" />
                <Bar dataKey="기타ACC" stackId="a" fill="#F9A8D4" name="✨ 기타ACC" />
              </BarChart>
            )}
          </ResponsiveContainer>
          
          {/* 아이템 선택 버튼 (재고 그래프와 동일한 F/S + ACC 구성) */}
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {[
              { name: '전체', displayName: '전체', color: '#E5E7EB' },
              { name: '당시즌F', displayName: '🍂 25F', color: '#FFD4B3' },
              { name: '당시즌S', displayName: '☀️ 25S', color: '#B3E5FC' },
              { name: '과시즌F', displayName: '🍂 과시즌F', color: '#FFB3C1' },
              { name: '과시즌S', displayName: '☀️ 과시즌S', color: '#B2F5EA' },
              { name: '모자', displayName: '🧢 모자', color: '#93C5FD' },
              { name: '신발', displayName: '👟 신발', color: '#FCD34D' },
              { name: '가방', displayName: '👜 가방', color: '#C4B5FD' },
              { name: '기타ACC', displayName: '✨ 기타ACC', color: '#F9A8D4' },
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  setSelectedItem(selectedItem === item.name ? null : item.name);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${
                  selectedItem === item.name
                    ? 'ring-2 ring-orange-600 scale-105'
                    : 'hover:scale-105'
                }`}
                style={{ 
                  backgroundColor: item.color,
                  color: '#000000'
                }}
              >
                {item.displayName}
              </button>
            ))}
          </div>
          
          {/* YOY 꺾은선 그래프 (아이템 선택 시) */}
          {selectedItem && (
            <div className="mt-4">
              <div className="mb-2 text-xs text-gray-600">
                선택된 아이템: {selectedItem}
              </div>
              {selectedItem === '전체' ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart 
                    data={(monthlyDashboardData?.monthly_item_data || []).map((item: any, idx: number, arr: any[]) => {
                      const yoyData = (monthlyDashboardData?.monthly_item_yoy || {}) as Record<string, number[]>;
                      const seasonSalesData = seasonSales as any;
                      const isLast = idx === arr.length - 1;

                      // 카드용 당시즌F YOY (10월 기준) - season_sales에서 직접 계산
                      let cardSeasonFYoy: number | null = null;
                      const currentF = seasonSalesData?.current_season_f?.october?.total_net_sales;
                      const prevF = seasonSalesData?.previous_season_f?.october?.total_net_sales;
                      if (typeof currentF === 'number' && typeof prevF === 'number' && prevF !== 0) {
                        cardSeasonFYoy = Math.round((currentF / prevF) * 100);
                      }

                      const baseData: any = {
                        month: `${item.period.slice(2, 4)}월`,
                        당시즌F: yoyData['당시즌F']?.[idx] ?? 0,
                        당시즌S: yoyData['당시즌S']?.[idx] ?? 0,
                        과시즌F: yoyData['과시즌F']?.[idx] ?? 0,
                        과시즌S: yoyData['과시즌S']?.[idx] ?? 0,
                        모자: yoyData['모자']?.[idx] ?? 0,
                        신발: yoyData['신발']?.[idx] ?? 0,
                        가방: yoyData['가방']?.[idx] ?? 0,
                        기타ACC: yoyData['기타ACC']?.[idx] ?? 0,
                        전체합계: (overallItemYoy[idx] ?? 0),
                      };

                      // 마지막 월(10월)은 카드와 동일한 당시즌F YOY로 덮어씀
                      if (isLast && cardSeasonFYoy !== null) {
                        baseData['당시즌F'] = cardSeasonFYoy;
                      }

                      return baseData;
                    })} 
                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(value) => `${value}%`} />
                    <Tooltip 
                      formatter={(value: any, name: string) => [`${value}%`, name]}
                      contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", padding: "8px", fontSize: "11px" }}
                    />
                    <Line type="monotone" dataKey="전체합계" stroke="#111827" strokeWidth={2.5} dot={{ r: 4 }} name="전체합계" />
                    <Line type="monotone" dataKey="당시즌F" stroke="#FFD4B3" strokeWidth={2} name="🍂 25F" />
                    <Line type="monotone" dataKey="당시즌S" stroke="#B3E5FC" strokeWidth={2} name="☀️ 25S" />
                    <Line type="monotone" dataKey="과시즌F" stroke="#FFB3C1" strokeWidth={2} name="🍂 과시즌F" />
                    <Line type="monotone" dataKey="과시즌S" stroke="#B2F5EA" strokeWidth={2} name="☀️ 과시즌S" />
                    <Line type="monotone" dataKey="모자" stroke="#93C5FD" strokeWidth={2} name="🧢 모자" />
                    <Line type="monotone" dataKey="신발" stroke="#FCD34D" strokeWidth={2} name="👟 신발" />
                    <Line type="monotone" dataKey="가방" stroke="#C4B5FD" strokeWidth={2} name="👜 가방" />
                    <Line type="monotone" dataKey="기타ACC" stroke="#F9A8D4" strokeWidth={2} name="✨ 기타ACC" />
                    <ReferenceLine y={100} stroke="#666" strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart 
                    data={(monthlyDashboardData?.monthly_item_data || []).map((item: any, idx: number) => ({
                      month: `${item.period.slice(2, 4)}월`,
                      yoy: monthlyDashboardData?.monthly_item_yoy ? ((monthlyDashboardData.monthly_item_yoy as any)[selectedItem]?.[idx] || 0) : 0
                    }))} 
                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(value) => `${value}%`} />
                    <Tooltip 
                      formatter={(value: any) => [`${value}%`, 'YOY']}
                      contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", padding: "8px", fontSize: "11px" }}
                    />
                    <Line type="monotone" dataKey="yoy" stroke="#F59E0B" strokeWidth={2} name={`${selectedItem} YOY`} />
                    <ReferenceLine y={100} stroke="#666" strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              )}
              
              {/* YOY 테이블 */}
              <div className="mt-4">
                <table className="w-full text-[10px] border-collapse border border-gray-300">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 px-1 py-1 text-left font-semibold">
                        {selectedItem === '전체' ? '아이템' : selectedItem}
                      </th>
                      {(monthlyDashboardData?.monthly_item_data || []).map((item: any) => (
                        <th key={item.period} className="border border-gray-300 px-1 py-1 text-center font-semibold">{`${item.period.slice(2, 4)}월`}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItem === '전체' ? (
                      <>
                        {[
                          { key: '전체합계', label: '전체합계' },
                          { key: '당시즌F', label: '🍂 25F' },
                          { key: '당시즌S', label: '☀️ 25S' },
                          { key: '과시즌F', label: '🍂 과시즌F' },
                          { key: '과시즌S', label: '☀️ 과시즌S' },
                          { key: '모자', label: '🧢 모자' },
                          { key: '신발', label: '👟 신발' },
                          { key: '가방', label: '👜 가방' },
                          { key: '기타ACC', label: '✨ 기타ACC' },
                        ].map((row) => (
                          <tr key={row.key}>
                            <td className="border border-gray-300 px-1 py-1 font-semibold">
                              {row.label}
                            </td>
                            {(() => {
                              const yoyArray: number[] =
                                row.key === '전체합계'
                                  ? overallItemYoy
                                  : ((monthlyDashboardData?.monthly_item_yoy
                                      ? ((monthlyDashboardData.monthly_item_yoy as any)[row.key] as number[])
                                      : []) || []);

                              // 당시즌F 10월 값은 카드 기준 95%로 맞추기
                              let overrideArray = yoyArray;
                              if (row.key === '당시즌F' && yoyArray.length > 0) {
                                const seasonSalesData = seasonSales as any;
                                const currentF =
                                  seasonSalesData?.current_season_f?.october?.total_net_sales;
                                const prevF =
                                  seasonSalesData?.previous_season_f?.october?.total_net_sales;
                                if (typeof currentF === 'number' && typeof prevF === 'number' && prevF !== 0) {
                                  const cardYoy = Math.round((currentF / prevF) * 100);
                                  overrideArray = [...yoyArray];
                                  overrideArray[overrideArray.length - 1] = cardYoy;
                                }
                              }

                              return overrideArray.map((yoy: number, idx: number) => (
                                <td
                                  key={idx}
                                  className={`border border-gray-300 px-1 py-1 text-center font-bold ${
                                    yoy >= 100 ? 'text-green-600' : 'text-red-600'
                                  }`}
                                >
                                  {yoy}%
                                </td>
                              ));
                            })()}
                          </tr>
                        ))}
                      </>
                    ) : (
                      <tr>
                        <td className="border border-gray-300 px-1 py-1 font-semibold">YOY</td>
                        {((monthlyDashboardData?.monthly_item_yoy ? (monthlyDashboardData.monthly_item_yoy as any)[selectedItem] : undefined) || []).map((yoy: number, idx: number) => (
                          <td 
                            key={idx} 
                            className={`border border-gray-300 px-1 py-1 text-center font-bold ${yoy >= 100 ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {yoy}%
                          </td>
                        ))}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* 주요 인사이트 */}
          <div className="mt-3 grid grid-cols-3 gap-1">
            {selectedItem === null || selectedItem === '전체' ? (
              <>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-orange-800 mb-1">📈 주요 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-orange-700">
                    {(() => {
                      const monthlyData = (monthlyDashboardData?.monthly_item_data || []) as any[];
                      if (monthlyData.length === 0) return <div>데이터 없음</div>;
                      
                      // [검증됨] 채널별 매출과 100% 일치
                      const isNetSales = salesPriceType === '실판';
                      const totals = monthlyData.map((item: any) => {
                        const f25 = isNetSales ? item.당시즌F.net_sales : item.당시즌F.gross_sales;
                        const s25 = isNetSales ? item.당시즌S.net_sales : item.당시즌S.gross_sales;
                        const fPast = isNetSales ? item.과시즌F.net_sales : item.과시즌F.gross_sales;
                        const sPast = isNetSales ? item.과시즌S.net_sales : item.과시즌S.gross_sales;
                        const cap = isNetSales ? item.모자.net_sales : item.모자.gross_sales;
                        const shoes = isNetSales ? item.신발.net_sales : item.신발.gross_sales;
                        const bag = isNetSales ? item.가방.net_sales : item.가방.gross_sales;
                        const acc = isNetSales ? item.기타ACC.net_sales : item.기타ACC.gross_sales;
                        
                        return Math.round(f25 + s25 + fPast + sPast + cap + shoes + bag + acc);
                      });
                      const maxTotal = Math.max(...totals);
                      const minTotal = Math.min(...totals);
                      const maxMonth = monthlyData[totals.indexOf(maxTotal)]?.period?.slice(2, 4) || '';
                      const minMonth = monthlyData[totals.indexOf(minTotal)]?.period?.slice(2, 4) || '';
                      const latestTotal = totals[totals.length - 1] || 0;
                      const prevTotal = totals[totals.length - 2] || 0;
                      
                      return (
                        <>
                          <div>• {maxMonth}월 최대 {maxTotal.toLocaleString()}K</div>
                          <div>• {minMonth}월 최저 {minTotal.toLocaleString()}K</div>
                          {latestTotal > prevTotal ? (
                            <div>• {monthlyData[monthlyData.length - 1]?.period?.slice(2, 4) || ''}월 회복세</div>
                          ) : (
                            <div>• {monthlyData[monthlyData.length - 1]?.period?.slice(2, 4) || ''}월 하락세</div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 아이템 트렌드</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    {(() => {
                      const monthlyData = (monthlyDashboardData?.monthly_item_data || []) as any[];
                      if (monthlyData.length === 0) return <div>데이터 없음</div>;
                      
                      const latest = monthlyData[monthlyData.length - 1] || {};
                      const isNetSales = salesPriceType === '실판';
                      
                      const 당F = Math.round((isNetSales ? latest.당시즌F?.net_sales : latest.당시즌F?.gross_sales) || 0);
                      const 당S = Math.round((isNetSales ? latest.당시즌S?.net_sales : latest.당시즌S?.gross_sales) || 0);
                      const 과F = Math.round((isNetSales ? latest.과시즌F?.net_sales : latest.과시즌F?.gross_sales) || 0);
                      const 과S = Math.round((isNetSales ? latest.과시즌S?.net_sales : latest.과시즌S?.gross_sales) || 0);
                      const 모자 = Math.round((isNetSales ? latest.모자?.net_sales : latest.모자?.gross_sales) || 0);
                      const 신발 = Math.round((isNetSales ? latest.신발?.net_sales : latest.신발?.gross_sales) || 0);
                      const 가방 = Math.round((isNetSales ? latest.가방?.net_sales : latest.가방?.gross_sales) || 0);
                      const 기타ACC = Math.round((isNetSales ? latest.기타ACC?.net_sales : latest.기타ACC?.gross_sales) || 0);
                      const total = 당F + 당S + 과F + 과S + 모자 + 신발 + 가방 + 기타ACC;
                      
                      const currentSeason = 당F + 당S;
                      const currentSeasonPct = total > 0 ? ((currentSeason / total) * 100).toFixed(1) : '0';
                      const 모자Pct = total > 0 ? ((모자 / total) * 100).toFixed(1) : '0';
                      const 신발Pct = total > 0 ? ((신발 / total) * 100).toFixed(1) : '0';
                      
                      return (
                        <>
                          <div>• 25F/S: 최대 비중 ({currentSeasonPct}%)</div>
                          <div>• 모자: 안정적 기여 ({모자Pct}%)</div>
                          <div>• 신발: 주요 아이템 ({신발Pct}%)</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 전략 포인트</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    <div>• 25F/S 집중 육성</div>
                    <div>• 액세서리(모자·신발·가방외) 라인 강화</div>
                    <div>• 아이템별 차별화 전략</div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
        
        {/* 월별 아이템별 재고 추세 그래프 */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center whitespace-nowrap">
              <div className="w-2 h-20 rounded-full mr-2"></div>
              2025년 월별 아이템별 재고 추세 (TAG, 1K HKD)
            </h3>
            <button
              className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded hover:bg-indigo-700 transition-colors whitespace-nowrap"
              onClick={() => setShowStockWeeksModal(true)}
            >
              재고주수 추세
            </button>
          </div>
          
          <div style={{ position: 'relative' }}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart 
              data={(monthlyDashboardData?.monthly_inventory_data || []).map((item: any) => {
                // 1~6월 (2501~2506)의 경우: F당시즌(24F)을 과시즌FW로 이동
                const periodMonth = parseInt(item.period.slice(2, 4));
                const isFirstHalf = periodMonth >= 1 && periodMonth <= 6;
                
                const f당시즌Value = Math.round(item.F당시즌?.stock_price || 0);
                const 과시즌FWValue = Math.round(item.과시즌FW?.stock_price || 0);
                
                return {
                  month: `${item.period.slice(2, 4)}월`,
                  'F당시즌': isFirstHalf ? 0 : f당시즌Value, // 1~6월은 0 (24F는 과시즌으로 이동)
                  'S당시즌': Math.round(item.S당시즌?.stock_price || 0),
                  '과시즌FW': isFirstHalf ? (과시즌FWValue + f당시즌Value) : 과시즌FWValue, // 1~6월은 F당시즌(24F)을 과시즌에 포함
                  '과시즌SS': Math.round(item.과시즌SS?.stock_price || 0),
                  '모자': Math.round(item.모자?.stock_price || 0),
                  '신발': Math.round(item.신발?.stock_price || 0),
                  '가방': Math.round(item.가방?.stock_price || 0),
                  '기타ACC': Math.round(item.기타ACC?.stock_price || 0),
                  // 재고주수는 레이블용으로만 저장
                  '모자_weeks': item.모자?.stock_weeks || 0,
                  '신발_weeks': item.신발?.stock_weeks || 0,
                  '가방외_weeks': item.가방외?.stock_weeks || 0,
                };
              })} 
              margin={{ top: 40, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis 
                tick={{ fontSize: 11 }} 
                domain={[0, 'dataMax']} 
                tickFormatter={(value) => `${Math.round(value).toLocaleString()}`}
                allowDecimals={false}
                width={80}
              />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name.includes('_weeks')) return null;
                  return [`${Math.round(value).toLocaleString()} HKD`, name];
                }}
                contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", padding: "8px", fontSize: "11px" }}
              />
              {/* 범례 이름을 아이템 판매 그래프와 통일: 25F/S, 과시즌F/S */}
              <Bar dataKey="F당시즌" stackId="a" fill="#FFD4B3" name="🍂 25F" />
              <Bar dataKey="S당시즌" stackId="a" fill="#B3E5FC" name="☀️ 25S" />
              <Bar dataKey="과시즌FW" stackId="a" fill="#FFB3BA" name="🍂 과시즌F" />
              <Bar dataKey="과시즌SS" stackId="a" fill="#B2F5EA" name="☀️ 과시즌S" />
              <Bar dataKey="모자" stackId="a" fill="#93C5FD" name="🧢 모자" />
              <Bar dataKey="신발" stackId="a" fill="#FCD34D" name="👟 신발" />
              <Bar dataKey="가방" stackId="a" fill="#C4B5FD" name="👜 가방" />
              <Bar dataKey="기타ACC" stackId="a" fill="#F9A8D4" name="✨ 기타ACC" />
              <Layer>
                {(monthlyDashboardData?.monthly_inventory_data || []).map((item: any, dataIndex: number) => {
                  // 차트 데이터 매핑 (1~6월: 24F를 과시즌FW로 이동)
                  const chartData = (monthlyDashboardData?.monthly_inventory_data || []).map((d: any) => {
                    const periodMonth = parseInt(d.period.slice(2, 4));
                    const isFirstHalf = periodMonth >= 1 && periodMonth <= 6;
                    
                    const f당시즌Value = Math.round(d.F당시즌?.stock_price || 0);
                    const 과시즌FWValue = Math.round(d.과시즌FW?.stock_price || 0);
                    
                    return {
                      F당시즌: isFirstHalf ? 0 : f당시즌Value,
                      S당시즌: Math.round(d.S당시즌?.stock_price || 0),
                      과시즌FW: isFirstHalf ? (과시즌FWValue + f당시즌Value) : 과시즌FWValue,
                      과시즌SS: Math.round(d.과시즌SS?.stock_price || 0),
                      모자: Math.round(d.모자?.stock_price || 0),
                      신발: Math.round(d.신발?.stock_price || 0),
                      가방: Math.round(d.가방?.stock_price || 0),
                      기타ACC: Math.round(d.기타ACC?.stock_price || 0),
                    };
                  });
                  
                  if (chartData.length === 0) return null;
                  
                  const maxValue = Math.max(...chartData.map((d: any) => 
                    d.F당시즌 + d.S당시즌 + d.과시즌FW + d.과시즌SS + d.모자 + d.신발 + d.가방 + d.기타ACC
                  ));
                  
                  const currentData = chartData[dataIndex];
                  const F당시즌 = currentData.F당시즌;
                  const S당시즌 = currentData.S당시즌;
                  const 과시즌FW = currentData.과시즌FW;
                  const 과시즌SS = currentData.과시즌SS;
                  const 모자 = currentData.모자;
                  const 신발 = currentData.신발;
                  const 가방 = currentData.가방;
                  const 기타ACC = currentData.기타ACC;
                  
                  const 누적_모자 = F당시즌 + S당시즌 + 과시즌FW + 과시즌SS + 모자;
                  const 누적_신발 = 누적_모자 + 신발;
                  const 누적_가방 = 누적_신발 + 가방;
                  const 누적_기타ACC = 누적_가방 + 기타ACC;
                  
                  const 모자Weeks = item.모자?.stock_weeks || 0;
                  const 신발Weeks = item.신발?.stock_weeks || 0;
                  const 가방Weeks = item.가방?.stock_weeks || 0;
                  const 기타ACCWeeks = item.기타ACC?.stock_weeks || 0;
                  
                  // 차트 설정
                  const chartHeight = 205;
                  const marginTop = 40;
                  const marginLeft = 60;
                  const yBase = marginTop + chartHeight;
                  
                  // 막대 너비 및 X 위치 계산 (10개 월 기준)
                  const totalWidth = 175 - marginLeft - 30; // 전체 너비에서 여백 제외
                  const barWidth = totalWidth / chartData.length;
                  const barX = marginLeft + (dataIndex * barWidth) + (barWidth / 2);
                  
                  // Y 위치 계산
                  const 모자Y = yBase - (누적_모자 / maxValue * chartHeight);
                  const 신발Y = yBase - (누적_신발 / maxValue * chartHeight);
                  const 가방Y = yBase - (누적_가방 / maxValue * chartHeight);
                  const 기타ACCY = yBase - (누적_기타ACC / maxValue * chartHeight);
                  
                  return (
                    <g key={`stock-weeks-${dataIndex}`}>
                      {모자Weeks > 0 && (
                        <g>
                          <rect
                            x={barX - 15}
                            y={모자Y - 16}
                            width={30}
                            height={13}
                            fill="white"
                            fillOpacity={0.95}
                            stroke="#93C5FD"
                            strokeWidth={1}
                            rx={2}
                          />
                          <text
                            x={barX}
                            y={모자Y - 5}
                            textAnchor="middle"
                            fill="#1e3a8a"
                            fontSize="9"
                            fontWeight="700"
                            style={{ pointerEvents: 'none' }}
                          >
                            {formatStockWeeks(모자Weeks)}주
                          </text>
                        </g>
                      )}
                      {신발Weeks > 0 && (
                        <g>
                          <rect
                            x={barX - 15}
                            y={신발Y - 16}
                            width={30}
                            height={13}
                            fill="white"
                            fillOpacity={0.95}
                            stroke="#FCD34D"
                            strokeWidth={1}
                            rx={2}
                          />
                          <text
                            x={barX}
                            y={신발Y - 5}
                            textAnchor="middle"
                            fill="#854d0e"
                            fontSize="9"
                            fontWeight="700"
                            style={{ pointerEvents: 'none' }}
                          >
                            {formatStockWeeks(신발Weeks)}주
                          </text>
                        </g>
                      )}
                      {가방Weeks > 0 && (
                        <g>
                          <rect
                            x={barX - 15}
                            y={가방Y - 16}
                            width={30}
                            height={13}
                            fill="white"
                            fillOpacity={0.95}
                            stroke="#C4B5FD"
                            strokeWidth={1}
                            rx={2}
                          />
                          <text
                            x={barX}
                            y={가방Y - 5}
                            textAnchor="middle"
                            fill="#5b21b6"
                            fontSize="9"
                            fontWeight="700"
                            style={{ pointerEvents: 'none' }}
                          >
                            {formatStockWeeks(가방Weeks)}주
                          </text>
                        </g>
                      )}
                      {기타ACCWeeks > 0 && (
                        <g>
                          <rect
                            x={barX - 15}
                            y={기타ACCY - 16}
                            width={30}
                            height={13}
                            fill="white"
                            fillOpacity={0.95}
                            stroke="#F9A8D4"
                            strokeWidth={1}
                            rx={2}
                          />
                          <text
                            x={barX}
                            y={기타ACCY - 5}
                            textAnchor="middle"
                            fill="#831843"
                            fontSize="9"
                            fontWeight="700"
                            style={{ pointerEvents: 'none' }}
                          >
                            {formatStockWeeks(기타ACCWeeks)}주
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </Layer>
            </BarChart>
          </ResponsiveContainer>
          
          </div>
          
          {/* 범례 클릭 가능하게 만들기 */}
          <div className="mt-4">
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { name: '전체', displayName: '전체', color: '#E5E7EB' },
                { name: 'F당시즌', displayName: '🍂 25F', color: '#FFD4B3' },
                { name: 'S당시즌', displayName: '☀️ 25S', color: '#B3E5FC' },
                { name: '과시즌FW', displayName: '🍂 과시즌F', color: '#FFB3BA' },
                { name: '과시즌SS', displayName: '☀️ 과시즌S', color: '#B2F5EA' },
                { name: '모자', displayName: '🧢 모자', color: '#93C5FD' },
                { name: '신발', displayName: '👟 신발', color: '#FCD34D' },
                { name: '가방', displayName: '👜 가방', color: '#C4B5FD' },
                { name: '기타ACC', displayName: '✨ 기타ACC', color: '#F9A8D4' },
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    setSelectedInventoryItem(selectedInventoryItem === item.name ? null : item.name);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${
                    selectedInventoryItem === item.name
                      ? 'ring-2 ring-purple-600 scale-105'
                      : 'hover:scale-105'
                  }`}
                  style={{ 
                    backgroundColor: item.color,
                    color: '#000000'
                  }}
                >
                  {item.displayName}
                </button>
              ))}
            </div>
            
            {selectedInventoryItem && (
              <div className="mt-4">
                {(() => {
                  const months = (monthlyDashboardData?.monthly_inventory_data || []).map((item: any) => `${item.period.slice(2, 4)}월`);
                  const inventoryYOY = monthlyDashboardData?.monthly_inventory_yoy || {};
                  
                  if (selectedInventoryItem === '전체') {
                    return (
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={months.map((month: string, idx: number) => {
                          // 1~6월: F당시즌을 0으로, 과시즌FW는 원본 데이터 유지 (이미 프론트엔드에서 합산됨)
                          const monthNum = idx + 1;
                          const isFirstHalf = monthNum >= 1 && monthNum <= 6;
                          
                          return {
                            month,
                            fSeason: isFirstHalf ? 0 : (inventoryYOY['F당시즌']?.[idx] ?? null),
                            sSeason: inventoryYOY['S당시즌']?.[idx] ?? null,
                            pastFW: inventoryYOY['과시즌FW']?.[idx] ?? null,
                            pastSS: inventoryYOY['과시즌SS']?.[idx] ?? null,
                            cap: inventoryYOY['모자']?.[idx] ?? null,
                            shoes: inventoryYOY['신발']?.[idx] ?? null,
                            bagEtc: inventoryYOY['가방외']?.[idx] ?? null
                          };
                        })} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(value) => `${value}%`} />
                          <Tooltip 
                            formatter={(value: any, name: string) => value !== null ? [`${value}%`, name] : ['N/A', name]}
                            contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", fontSize: "11px" }}
                          />
                          <ReferenceLine y={100} stroke="#000000" strokeWidth={2} strokeDasharray="5 5" label={{ value: '100%', position: 'right', fill: '#000000', fontSize: 10 }} />
                          <Line type="monotone" dataKey="fSeason" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} connectNulls name="F당시즌" />
                          <Line type="monotone" dataKey="sSeason" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} connectNulls name="S당시즌" />
                          <Line type="monotone" dataKey="pastFW" stroke="#9CA3AF" strokeWidth={3} dot={{ r: 4 }} connectNulls name="과시즌FW" />
                          <Line type="monotone" dataKey="pastSS" stroke="#D1D5DB" strokeWidth={3} dot={{ r: 4 }} connectNulls name="과시즌SS" />
                          <Line type="monotone" dataKey="cap" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} connectNulls name="모자" />
                          <Line type="monotone" dataKey="shoes" stroke="#FCD34D" strokeWidth={3} dot={{ r: 4 }} connectNulls name="신발" />
                          <Line type="monotone" dataKey="bagEtc" stroke="#C4B5FD" strokeWidth={3} dot={{ r: 4 }} connectNulls name="가방외" />
                        </LineChart>
                      </ResponsiveContainer>
                    );
                  } else {
                    const itemKey = selectedInventoryItem;
                    const yoyData = (inventoryYOY as any)[itemKey] || [];
                    const itemColors: { [key: string]: string } = {
                      'F당시즌': '#EF4444',
                      'S당시즌': '#10B981',
                      '과시즌FW': '#9CA3AF',
                      '과시즌SS': '#D1D5DB',
                      '모자': '#3B82F6',
                      '신발': '#FCD34D',
                      '가방외': '#C4B5FD'
                    };
                    
                    return (
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={months.map((month: string, idx: number) => ({
                          month,
                          value: yoyData[idx] ?? null
                        }))} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(value) => `${value}%`} />
                          <Tooltip 
                            formatter={(value: any) => value !== null ? [`${value}%`, selectedInventoryItem] : ['N/A', selectedInventoryItem]}
                            contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", fontSize: "11px" }}
                          />
                          <ReferenceLine y={100} stroke="#000000" strokeWidth={2} strokeDasharray="5 5" label={{ value: '100%', position: 'right', fill: '#000000', fontSize: 10 }} />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke={itemColors[itemKey] || '#000000'} 
                            strokeWidth={3} 
                            dot={{ r: 4 }} 
                            connectNulls 
                            name={selectedInventoryItem}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    );
                  }
                })()}
              </div>
            )}
            
            {/* 재고 YOY 데이터 테이블 - 범례 클릭 시에만 표시 */}
            {selectedInventoryItem && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">재고 YOY 데이터</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-1 py-1 text-left font-semibold">아이템</th>
                        {(() => {
                          const months = (monthlyDashboardData?.monthly_inventory_data || []).map((item: any) => `${item.period.slice(2, 4)}월`);
                          return months.map((month: string) => (
                            <th key={month} className="border border-gray-300 px-1 py-1 text-center font-semibold">{month}</th>
                          ));
                        })()}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const months = (monthlyDashboardData?.monthly_inventory_data || []).map((item: any) => `${item.period.slice(2, 4)}월`);
                        const inventoryYOY = monthlyDashboardData?.monthly_inventory_yoy || {};
                        const itemKeys = selectedInventoryItem === '전체' 
                          ? ['전체합계', 'F당시즌', 'S당시즌', '과시즌FW', '과시즌SS', '모자', '신발', '가방', '기타ACC']
                          : [selectedInventoryItem];
                        
                        return itemKeys.map((itemKey: string) => (
                          <tr key={itemKey} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-1 py-1 font-semibold bg-gray-50">
                              {itemKey === '전체합계' && '전체합계'}
                              {itemKey === 'F당시즌' && '🍂 25F'}
                              {itemKey === 'S당시즌' && '☀️ 25S'}
                              {itemKey === '과시즌FW' && '🍂 과시즌F'}
                              {itemKey === '과시즌SS' && '☀️ 과시즌S'}
                              {itemKey === '모자' && '🧢 모자'}
                              {itemKey === '신발' && '👟 신발'}
                              {itemKey === '가방' && '👜 가방'}
                              {itemKey === '기타ACC' && '✨ 기타ACC'}
                            </td>
                            {months.map((month: string, idx: number) => {
                              // 1~6월: F당시즌을 0으로 표시
                              const monthNum = idx + 1;
                              const isFirstHalf = monthNum >= 1 && monthNum <= 6;
                              
                              let yoyValue =
                                itemKey === '전체합계'
                                  ? overallInventoryYoy[idx]
                                  : (inventoryYOY as any)[itemKey]?.[idx];
                              
                              // 1~6월의 F당시즌은 0으로 표시
                              if (itemKey === 'F당시즌' && isFirstHalf) {
                                yoyValue = 0;
                              }
                              
                              const displayValue = yoyValue !== null && yoyValue !== undefined ? `${yoyValue}%` : '-';
                              const isPositive = yoyValue !== null && yoyValue !== undefined && yoyValue < 100;
                              const isNegative = yoyValue !== null && yoyValue !== undefined && yoyValue > 100;
                              
                              return (
                                <td 
                                  key={month}
                                  className={`border border-gray-300 px-1 py-1 text-center ${
                                    isPositive ? 'text-green-600 font-semibold' : 
                                    isNegative ? 'text-red-600 font-semibold' : 
                                    'text-gray-700'
                                  }`}
                                >
                                  {displayValue}
                                </td>
                              );
                            })}
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          
          {/* 주요 인사이트 */}
          <div className="mt-3 grid grid-cols-3 gap-1">
            <div className="bg-red-50 border border-red-200 rounded-lg p-1.5">
              <h4 className="text-xs font-bold text-red-800 mb-1">▲ Critical Alert</h4>
              <div className="space-y-0.5 text-xs text-red-700">
                <div>• 과시즌FW 재고 YOY {Math.round((monthlyDashboardData?.ending_inventory?.past_season_fw?.total?.yoy || 0))}% 급증</div>
                <div>• 과시즌SS 재고 YOY {Math.round((monthlyDashboardData?.ending_inventory?.by_season?.과시즌_SS?.yoy || 0))}% 증가</div>
                <div>• 총재고 {Math.round((monthlyDashboardData?.ending_inventory?.total?.current || 0))}K (YOY {Math.round((monthlyDashboardData?.ending_inventory?.total?.yoy || 0))}%)</div>
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-1.5">
              <h4 className="text-xs font-bold text-orange-800 mb-1">▲ Risk Monitoring</h4>
              <div className="space-y-0.5 text-xs text-orange-700">
                <div>• 신발 재고주수 {formatStockWeeks(monthlyDashboardData?.acc_stock_summary?.by_category?.SHO?.current?.stock_weeks || 0)}주 (전년 {formatStockWeeks(monthlyDashboardData?.acc_stock_summary?.by_category?.SHO?.previous?.stock_weeks || 0)}주)</div>
                {(() => {
                  const current = monthlyDashboardData?.acc_stock_summary?.by_category?.BAG?.current?.stock_weeks || 0;
                  const previous = monthlyDashboardData?.acc_stock_summary?.by_category?.BAG?.previous?.stock_weeks || 0;
                  const isIncrease = current > previous;
                  return (
                    <div>• 가방외 재고주수 {formatStockWeeks(current)}주 (전년 {formatStockWeeks(previous)}주) {isIncrease ? '증가' : '감소'}</div>
                  );
                })()}
                <div>• F당시즌 YOY {Math.round((monthlyDashboardData?.ending_inventory?.by_season?.당시즌_의류?.yoy || 0))}% 정상화 중</div>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
              <h4 className="text-xs font-bold text-green-800 mb-1">✓ Positive Sign</h4>
              <div className="space-y-0.5 text-xs text-green-700">
                <div>• 신발 재고 YOY {Math.round((monthlyDashboardData?.ending_inventory?.acc_by_category?.SHO?.yoy || 0))}% 개선</div>
                <div>• 가방외 재고 YOY {Math.round((monthlyDashboardData?.ending_inventory?.acc_by_category?.BAG?.yoy || 0))}% 개선</div>
                <div>• 9월 임시매장 운영으로 과시즌SS 대폭 소진</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 오프라인 매장별 현황 */}
      <div className="mb-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              오프라인 매장별 현황 (실판V-, {(() => {
                const p = period || '2510';
                const year = parseInt(p.substring(0, 2)) + 2000;
                const month = parseInt(p.substring(2, 4));
                return `${year % 100}년 1월~${month}월 누적`;
              })()} 기준)
            </h3>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors"
                onClick={() => setShowYoyTrend(true)}
              >
                YOY 추세
              </button>
            <button
              className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded hover:bg-purple-700 transition-colors"
              onClick={() => window.open('/hongkong/stores-dashboard', '_blank')}
            >
                평당매출 상세
            </button>
            </div>
          </div>
          
          {/* 배지 설명 */}
          <div className="mb-3 p-2 bg-gray-50 rounded border border-gray-200">
            <div className="flex items-center gap-4 text-xs">
              <span className="font-semibold text-gray-700">배지 설명:</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="bg-green-300 text-green-800 text-[9px] px-1.5 py-0.5 rounded font-bold">흑↑</span>
                  <span className="text-gray-600">흑자&성장</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="bg-blue-300 text-blue-800 text-[9px] px-1.5 py-0.5 rounded font-bold">흑↓</span>
                  <span className="text-gray-600">흑자&역성장</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="bg-amber-300 text-amber-800 text-[9px] px-1.5 py-0.5 rounded font-bold">적↑</span>
                  <span className="text-gray-600">적자&성장</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="bg-red-300 text-red-800 text-[9px] px-1.5 py-0.5 rounded font-bold">적↓</span>
                  <span className="text-gray-600">적자&역성장</span>
                </div>
              </div>
            </div>
          </div>
          
          {(() => {
            // 동적으로 카드 개수 계산 (전체 요약 1 + 홍콩 카드들 + 마카오 1)
            const storeData = cumulativeStoreStatusData || storeStatusData;
            const hkCardCount = [
              storeData?.categories?.profit_improving?.count,
              storeData?.categories?.profit_deteriorating?.count,
              storeData?.categories?.loss_improving?.count,
              storeData?.categories?.loss_deteriorating?.count
            ].filter(count => count && count > 0).length;
            
            const mcCardCount = storeData?.mc_summary?.count > 0 ? 1 : 0;
            const totalCards = 1 + hkCardCount + mcCardCount; // 전체 요약 1 + 홍콩 + 마카오
            
            return (
              <div className="grid gap-3 w-full" style={{ gridTemplateColumns: `repeat(${totalCards}, minmax(0, 1fr))` }}>
            {/* 전체 매장 요약 */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg p-4 border border-slate-600 min-w-0 shadow-lg">
              <h4 className="text-base font-bold text-white mb-3">전체 매장 요약</h4>
              <div className="space-y-3 text-xs">
                {/* 매장 수 */}
                <div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {totalStoreCurrent}개 매장
                  </div>
                  <div className="text-[10px] text-slate-300">
                    (전년 {totalStorePrevious}개)
                  </div>
                </div>
                
                {/* 평당매출 */}
                <div>
                  <div className="text-slate-300 text-[10px] mb-1">평당매출/1일</div>
                  <div className="font-bold text-white text-sm">
                    {formatNumber(dailySalesPerPyeong)} HKD
                  </div>
                  <div className="text-slate-300 text-[10px]">
                    (면적: {formatNumber(totalArea)}평 | 누적: {cumulativeDays}일)
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1">
                    *M10A는 M10 포함, 폐점+저매출 매장 제외
                </div>
                    </div>
                
                {/* 전체 직접이익 */}
                <div className="pt-2 border-t border-slate-600">
                  <div className="flex items-center justify-between">
                    <div className="text-slate-300 text-[10px]">전체 직접이익</div>
                    {(() => {
                      // JSON에서 가져온 누적 직접이익 값 사용 (CSV에서 계산된 값)
                      const cumulativeDirectProfit = (cumulativeStoreStatusData || storeStatusData)?.summary?.cumulative_direct_profit ?? 
                        (cumulativeStoreStatusData || storeStatusData)?.summary?.total_direct_profit ?? 0;
                      return (
                        <div className={`font-bold text-sm ${cumulativeDirectProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatNumber(Math.round(cumulativeDirectProfit))}K HKD
                        </div>
                      );
                    })()}
                  </div>
                </div>
                      </div>
                
                {/* 홍콩 오프라인 */}
                <div className="pt-2 border-t border-slate-600">
                  <div className="text-white font-semibold text-xs mb-2">
                    홍콩 오프라인 ({((cumulativeStoreStatusData || storeStatusData)?.summary?.hk_stores || 0)}개, 리뉴얼 1개 포함)
                      </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-green-600 rounded px-2 py-1.5 flex flex-col items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                      <span className="text-white text-xs font-semibold text-center">흑자 & 성장</span>
                      <span className="text-white text-xs font-bold">{((cumulativeStoreStatusData || storeStatusData)?.categories?.profit_improving?.count || 0)}개</span>
                      </div>
                    <div className="bg-blue-700 rounded px-2 py-1.5 flex flex-col items-center justify-center">
                      <span className="text-orange-300 text-sm">▲</span>
                      <span className="text-white text-xs font-semibold text-center">흑자 & 악화</span>
                      <span className="text-white text-xs font-bold">{((cumulativeStoreStatusData || storeStatusData)?.categories?.profit_deteriorating?.count || 0)}개</span>
                      </div>
                    <div className="bg-amber-700 rounded px-2 py-1.5 flex flex-col items-center justify-center">
                      <span className="text-blue-300 text-sm">↗</span>
                      <span className="text-white text-xs font-semibold text-center">적자 & 성장</span>
                      <span className="text-white text-xs font-bold">{((cumulativeStoreStatusData || storeStatusData)?.categories?.loss_improving?.count || 0)}개</span>
                    </div>
                    <div className="bg-red-600 rounded px-2 py-1.5 flex flex-col items-center justify-center">
                      <span className="text-red-200 text-sm">↓</span>
                      <span className="text-white text-xs font-semibold text-center">적자 & 악화</span>
                      <span className="text-white text-xs font-bold">{((cumulativeStoreStatusData || storeStatusData)?.categories?.loss_deteriorating?.count || 0)}개</span>
                </div>
                  </div>
                  <div className="mt-2">
                    <div className="bg-slate-500 rounded px-2 py-1.5 flex items-center gap-1.5">
                      <span className="text-white text-xs font-semibold">리뉴얼 중</span>
                      <span className="text-white text-xs font-bold ml-auto">1개 (LCX)</span>
                    </div>
                  </div>
                </div>
                
                {/* 마카오 매장 */}
                <div className="pt-2 border-t border-slate-600">
                  <div className="text-white font-semibold text-xs mb-2">
                    마카오 매장 ({((cumulativeStoreStatusData || storeStatusData)?.summary?.mc_stores || 0)}개)
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-green-600 rounded px-2 py-1.5 flex items-center gap-1.5">
                      <span className="text-white text-sm">✓</span>
                      <span className="text-white text-xs font-semibold">흑자</span>
                      <span className="text-white text-xs font-bold ml-auto">{(() => {
                          const storeData = cumulativeStoreStatusData || storeStatusData;
                          const mcStores = storeData?.mc_summary?.stores || [];
                          return mcStores.filter((s: any) => s.current.direct_profit > 0).length;
                        })()}개</span>
                      </div>
                    <div className="bg-red-600 rounded px-2 py-1.5 flex items-center gap-1.5">
                      <span className="text-blue-300 text-sm">↗</span>
                      <span className="text-white text-xs font-semibold">적자 (Senado)</span>
                      <span className="text-white text-xs font-bold ml-auto">{(() => {
                          const storeData = cumulativeStoreStatusData || storeStatusData;
                          const mcStores = storeData?.mc_summary?.stores || [];
                          return mcStores.filter((s: any) => s.current.direct_profit <= 0).length;
                        })()}개</span>
                      </div>
                    </div>
                </div>
                
                {/* YOY 성과 */}
                <div className="pt-2 border-t border-slate-600">
                  <div className="text-white text-[10px] mb-1">최고YOY</div>
                  <div className="font-bold text-green-400 text-xs">
                    {(() => {
                    if (activeHKStores.length === 0) return '-';
                    const maxStore = activeHKStores.reduce((max: any, s: any) => s.yoy > max.yoy ? s : max, activeHKStores[0]);
                      return `${maxStore.shop_nm} ${Math.round(maxStore.yoy)}%`;
                    })()}
                  </div>
                  <div className="text-white text-[10px] mt-2 mb-1">최저YOY</div>
                  <div className="font-bold text-red-400 text-xs">
                    {(() => {
                    if (activeHKStores.length === 0) return '-';
                    const minStore = activeHKStores.reduce((min: any, s: any) => s.yoy < min.yoy ? s : min, activeHKStores[0]);
                      return `${minStore.shop_nm} ${Math.round(minStore.yoy)}%`;
                    })()}
                  </div>
                </div>
                
                {/* 전략 인사이트 */}
                <div className="pt-2 border-t border-slate-600">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-yellow-400 text-sm">💡</span>
                    <span className="text-white font-semibold text-xs">전략 인사이트</span>
                            </div>
                  <div className="text-[10px] text-slate-200 space-y-1.5">
                    <div>적자 {((() => {
                      const storeData = cumulativeStoreStatusData || storeStatusData;
                      return ((storeData?.categories?.loss_improving?.count || 0) + (storeData?.categories?.loss_deteriorating?.count || 0));
                    })())}개 매장 집중 관리 필요 (HK {((() => {
                      const storeData = cumulativeStoreStatusData || storeStatusData;
                      return ((storeData?.categories?.loss_improving?.count || 0) + (storeData?.categories?.loss_deteriorating?.count || 0));
                    })())}개, MC {(() => {
                      const storeData = cumulativeStoreStatusData || storeStatusData;
                      const mcStores = storeData?.mc_summary?.stores || [];
                      return mcStores.filter((s: any) => s.current.direct_profit <= 0).length;
                    })()}개), Yoho-NTP3-Time Sq 우선 개선 대상</div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-orange-400 text-xs">▲</span>
                      <span>BEP 달성 기준: 임차료+인건비율 45% 미만 유지 필요</span>
                          </div>
                        </div>
                    </div>
              </div>
            
            {/* 흑자 & 성장 */}
            {(() => {
              const storeData = cumulativeStoreStatusData || storeStatusData;
              const cat = storeData?.categories?.profit_improving;
              if (!cat || cat.count === 0) return null;
              return (
                <div className="bg-green-50 rounded-lg p-3 border-2 border-green-400 min-w-0">
                  <h4 className="text-sm font-bold text-green-800 mb-2">흑자 & 성장</h4>
                  <div className="text-xs text-green-700 mb-1 font-semibold">최우수</div>
                  <div className="space-y-2 text-xs mb-3">
                    <div>
                      <div className="font-bold text-green-900">{cat.count}개 매장</div>
                    </div>
                    <div>
                      <div className="text-green-700">직접이익 합계</div>
                      <div className="font-bold text-green-900">+{formatNumber(Math.round(cat.total_direct_profit))}K</div>
                      <div className="text-green-600">| 평균 YOY: {Math.round(cat.avg_yoy)}%</div>
                    </div>
                  </div>
                  <div className="border-t border-green-300 pt-2 mb-2">
                    <button
                      onClick={() => setExpandedStoreCategories(prev => ({
                        ...prev,
                        profit_improving: { ...prev.profit_improving, stores: !prev.profit_improving.stores }
                      }))}
                      className="text-xs text-green-700 hover:text-green-800 font-semibold flex items-center w-full justify-between"
                    >
                      <span>매장별 상세</span>
                      {expandedStoreCategories.profit_improving.stores ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {expandedStoreCategories.profit_improving.stores && (
                    <>
                      <div className="text-[10px] text-gray-500 mb-1.5 px-2">전년→당년</div>
                    <div className="space-y-1 text-xs mb-3">
                      {cat.stores.map((store: any, idx: number) => {
                        const prevBadge = getCategoryBadge(store.previous_category);
                          const currentBadge = getCategoryBadge(store.category);
                        return (
                          <div key={idx} className="flex justify-between items-center bg-white rounded px-2 py-1">
                            <div className="flex items-center gap-1.5">
                              {store.previous_category && (
                                <span className={`${prevBadge.color} ${prevBadge.text} text-[9px] px-1.5 py-0.5 rounded font-bold`}>
                                  {prevBadge.symbol}
                                </span>
                              )}
                                {store.category && (
                                  <span className={`${currentBadge.color} ${currentBadge.text} text-[9px] px-1.5 py-0.5 rounded font-bold`}>
                                    {currentBadge.symbol}
                                  </span>
                                )}
                              <span className="font-semibold text-green-900">{store.shop_nm}</span>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold ${store.current.direct_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {store.current.direct_profit >= 0 ? '+' : ''}{formatNumber(Math.round(store.current.direct_profit))}K
                              </div>
                              <div className="text-green-600 text-[10px]">YOY {Math.round(store.yoy)}%</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    </>
                  )}
                  <div className="mt-3 pt-2 border-t border-green-300">
                    <div className="text-green-700 text-[10px] mb-1">임차료/인건비율 합계</div>
                    <div className="font-bold text-green-900 text-xs mb-2">{cat.avg_rent_labor_ratio.toFixed(1)}%</div>
                    <button
                      onClick={() => setExpandedStoreCategories(prev => ({
                        ...prev,
                        profit_improving: { ...prev.profit_improving, rentLabor: !prev.profit_improving.rentLabor }
                      }))}
                      className="text-xs text-green-700 hover:text-green-800 font-semibold flex items-center w-full justify-between mb-1"
                    >
                      <span>상세 보기</span>
                      {expandedStoreCategories.profit_improving.rentLabor ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    {expandedStoreCategories.profit_improving.rentLabor && (() => {
                            const totalRent = cat.stores.reduce((sum: number, s: any) => sum + (s.current.rent || 0), 0);
                            const totalSales = cat.stores.reduce((sum: number, s: any) => sum + (s.current.net_sales || 0), 0);
                      const rentRate = totalSales > 0 ? ((totalRent / totalSales) * 100).toFixed(1) : '0.0';
                            const totalLabor = cat.stores.reduce((sum: number, s: any) => sum + (s.current.labor_cost || 0), 0);
                      const laborRate = totalSales > 0 ? ((totalLabor / totalSales) * 100).toFixed(1) : '0.0';
                      return (
                        <>
                          <div className="text-[10px] text-green-600 mt-1">
                            임차료율: {rentRate}%, 인건비율: {laborRate}%
                        </div>
                        <div className="mt-2 space-y-0.5">
                          {cat.stores.map((store: any, idx: number) => {
                            const rentRatio = store.current.net_sales > 0 ? ((store.current.rent || 0) / store.current.net_sales * 100) : 0;
                            const laborRatio = store.current.net_sales > 0 ? ((store.current.labor_cost || 0) / store.current.net_sales * 100) : 0;
                            const totalRatio = rentRatio + laborRatio;
                            let efficiency = '';
                            if (totalRatio < 35) efficiency = '우수';
                            else if (totalRatio < 45) efficiency = '효율적';
                            else if (totalRatio < 55) efficiency = '양호';
                            else efficiency = '비용 관리 필요';
                            return (
                              <div key={idx} className="text-[9px] text-green-600 flex justify-between">
                                <span>{store.shop_nm}: {totalRatio.toFixed(1)}%</span>
                                <span className={totalRatio < 45 ? 'text-green-700' : 'text-orange-600'}>({efficiency})</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                      );
                    })()}
                  </div>
                  <div className="mt-2 pt-2 border-t border-green-300">
                    <div className="text-green-700 font-semibold text-[10px] mb-1">전략 인사이트</div>
                    <div className="text-[10px] text-green-600">
                      성공 모델 분석하여 타 매장 확산, 베스트 프랙티스 공유
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {/* 흑자 & 역성장 */}
            {(() => {
              const storeData = cumulativeStoreStatusData || storeStatusData;
              const cat = storeData?.categories?.profit_deteriorating;
              if (!cat || cat.count === 0) return null;
              return (
                <div className="bg-blue-50 rounded-lg p-3 border-2 border-blue-400 min-w-0">
                  <h4 className="text-sm font-bold text-blue-800 mb-2">흑자 & 역성장</h4>
                  <div className="text-xs text-blue-700 mb-1 font-semibold">▲주의</div>
                  <div className="space-y-2 text-xs mb-3">
                    <div>
                      <div className="font-bold text-blue-900">{cat.count}개 매장</div>
                    </div>
                    <div>
                      <div className="text-blue-700">직접이익 합계</div>
                      <div className="font-bold text-blue-900">+{formatNumber(Math.round(cat.total_direct_profit))}K</div>
                      <div className="text-blue-600">| 평균 YOY: {Math.round(cat.avg_yoy)}%</div>
                    </div>
                  </div>
                  <div className="border-t border-blue-300 pt-2 mb-2">
                    <button
                      onClick={() => setExpandedStoreCategories(prev => ({
                        ...prev,
                        profit_deteriorating: { ...prev.profit_deteriorating, stores: !prev.profit_deteriorating.stores }
                      }))}
                      className="text-xs text-blue-700 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                    >
                      <span>매장별 상세</span>
                      {expandedStoreCategories.profit_deteriorating.stores ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {expandedStoreCategories.profit_deteriorating.stores && (
                    <>
                      <div className="text-[10px] text-gray-500 mb-1.5 px-2">전년→당년</div>
                    <div className="space-y-1 text-xs mb-3">
                      {cat.stores.map((store: any, idx: number) => {
                        const prevBadge = getCategoryBadge(store.previous_category);
                          const currentBadge = getCategoryBadge(store.category);
                        return (
                          <div key={idx} className="flex justify-between items-center bg-white rounded px-2 py-1">
                            <div className="flex items-center gap-1.5">
                              {store.previous_category && (
                                <span className={`${prevBadge.color} ${prevBadge.text} text-[9px] px-1.5 py-0.5 rounded font-bold`}>
                                  {prevBadge.symbol}
                                </span>
                              )}
                                {store.category && (
                                  <span className={`${currentBadge.color} ${currentBadge.text} text-[9px] px-1.5 py-0.5 rounded font-bold`}>
                                    {currentBadge.symbol}
                                  </span>
                                )}
                              <span className="font-semibold text-blue-900">{store.shop_nm}</span>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold ${store.current.direct_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {store.current.direct_profit >= 0 ? '+' : ''}{formatNumber(Math.round(store.current.direct_profit))}K
                              </div>
                              <div className="text-blue-600 text-[10px]">YOY {Math.round(store.yoy)}%</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    </>
                  )}
                  <div className="mt-3 pt-2 border-t border-blue-300">
                    <div className="text-blue-700 text-[10px] mb-1">임차료/인건비율 합계</div>
                    <div className="font-bold text-blue-900 text-xs mb-2">{cat.avg_rent_labor_ratio.toFixed(1)}%</div>
                    <button
                      onClick={() => setExpandedStoreCategories(prev => ({
                        ...prev,
                        profit_deteriorating: { ...prev.profit_deteriorating, rentLabor: !prev.profit_deteriorating.rentLabor }
                      }))}
                      className="text-xs text-blue-700 hover:text-blue-800 font-semibold flex items-center w-full justify-between mb-1"
                    >
                      <span>상세 보기</span>
                      {expandedStoreCategories.profit_deteriorating.rentLabor ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    {expandedStoreCategories.profit_deteriorating.rentLabor && (() => {
                            const totalRent = cat.stores.reduce((sum: number, s: any) => sum + (s.current.rent || 0), 0);
                            const totalSales = cat.stores.reduce((sum: number, s: any) => sum + (s.current.net_sales || 0), 0);
                      const rentRate = totalSales > 0 ? ((totalRent / totalSales) * 100).toFixed(1) : '0.0';
                            const totalLabor = cat.stores.reduce((sum: number, s: any) => sum + (s.current.labor_cost || 0), 0);
                      const laborRate = totalSales > 0 ? ((totalLabor / totalSales) * 100).toFixed(1) : '0.0';
                      return (
                        <>
                          <div className="text-[10px] text-blue-600 mt-1">
                            임차료율: {rentRate}%, 인건비율: {laborRate}%
                        </div>
                        <div className="mt-2 space-y-0.5">
                          {cat.stores.map((store: any, idx: number) => {
                            const rentRatio = store.current.net_sales > 0 ? ((store.current.rent || 0) / store.current.net_sales * 100) : 0;
                            const laborRatio = store.current.net_sales > 0 ? ((store.current.labor_cost || 0) / store.current.net_sales * 100) : 0;
                            const totalRatio = rentRatio + laborRatio;
                            let efficiency = '';
                            if (totalRatio < 35) efficiency = '우수';
                            else if (totalRatio < 45) efficiency = '효율적';
                            else if (totalRatio < 55) efficiency = '양호';
                            else efficiency = '비용 관리 필요';
                            return (
                              <div key={idx} className="text-[9px] text-blue-600 flex justify-between">
                                <span>{store.shop_nm}: {totalRatio.toFixed(1)}%</span>
                                <span className={totalRatio < 45 ? 'text-blue-700' : 'text-orange-600'}>({efficiency})</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                      );
                    })()}
                  </div>
                  <div className="mt-2 pt-2 border-t border-blue-300">
                    <div className="text-blue-700 font-semibold text-[10px] mb-1">전략 인사이트</div>
                    <div className="text-[10px] text-blue-600">
                      흑자 유지에도 트래픽 감소 원인 분석, 강화된 프로모션으로 매출 반등 유도
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {/* 적자 & 성장 */}
            {(() => {
              const storeData = cumulativeStoreStatusData || storeStatusData;
              const cat = storeData?.categories?.loss_improving;
              if (!cat || cat.count === 0) return null;
              return (
                <div className="bg-yellow-50 rounded-lg p-3 border-2 border-yellow-400 min-w-0">
                  <h4 className="text-sm font-bold text-yellow-800 mb-2">적자 & 성장</h4>
                  <div className="text-xs text-yellow-700 mb-1 font-semibold">개선중</div>
                  <div className="space-y-2 text-xs mb-3">
                    <div>
                      <div className="font-bold text-yellow-900">{cat.count}개 매장</div>
                    </div>
                    <div>
                      <div className="text-yellow-700">직접손실 합계</div>
                      <div className="font-bold text-red-600">{formatNumber(Math.round(cat.total_direct_profit))}K</div>
                      <div className="text-yellow-600">| 평균 YOY: {Math.round(cat.avg_yoy)}%</div>
                    </div>
                  </div>
                  <div className="border-t border-yellow-300 pt-2 mb-2">
                    <button
                      onClick={() => setExpandedStoreCategories(prev => ({
                        ...prev,
                        loss_improving: { ...prev.loss_improving, stores: !prev.loss_improving.stores }
                      }))}
                      className="text-xs text-yellow-700 hover:text-yellow-800 font-semibold flex items-center w-full justify-between"
                    >
                      <span>매장별 상세</span>
                      {expandedStoreCategories.loss_improving.stores ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {expandedStoreCategories.loss_improving.stores && (
                    <>
                      <div className="text-[10px] text-gray-500 mb-1.5 px-2">전년→당년</div>
                    <div className="space-y-1 text-xs mb-3">
                      {cat.stores.map((store: any, idx: number) => {
                        const prevBadge = getCategoryBadge(store.previous_category);
                          const currentBadge = getCategoryBadge(store.category);
                        return (
                          <div key={idx} className="flex justify-between items-center bg-white rounded px-2 py-1">
                            <div className="flex items-center gap-1.5">
                              {store.previous_category && (
                                <span className={`${prevBadge.color} ${prevBadge.text} text-[9px] px-1.5 py-0.5 rounded font-bold`}>
                                  {prevBadge.symbol}
                                </span>
                              )}
                                {store.category && (
                                  <span className={`${currentBadge.color} ${currentBadge.text} text-[9px] px-1.5 py-0.5 rounded font-bold`}>
                                    {currentBadge.symbol}
                                  </span>
                                )}
                              <span className="font-semibold text-yellow-900">{store.shop_nm}</span>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold ${store.current.direct_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {store.current.direct_profit >= 0 ? '+' : ''}{formatNumber(Math.round(store.current.direct_profit))}K
                              </div>
                              <div className="text-yellow-600 text-[10px]">YOY {Math.round(store.yoy)}%</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    </>
                  )}
                  <div className="mt-3 pt-2 border-t border-yellow-300">
                    <div className="text-yellow-700 text-[10px] mb-1">임차료/인건비율 합계</div>
                    <div className="font-bold text-yellow-900 text-xs mb-2">{cat.avg_rent_labor_ratio.toFixed(1)}%</div>
                    <button
                      onClick={() => setExpandedStoreCategories(prev => ({
                        ...prev,
                        loss_improving: { ...prev.loss_improving, rentLabor: !prev.loss_improving.rentLabor }
                      }))}
                      className="text-xs text-yellow-700 hover:text-yellow-800 font-semibold flex items-center w-full justify-between mb-1"
                    >
                      <span>상세 보기</span>
                      {expandedStoreCategories.loss_improving.rentLabor ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    {expandedStoreCategories.loss_improving.rentLabor && (() => {
                            const totalRent = cat.stores.reduce((sum: number, s: any) => sum + (s.current.rent || 0), 0);
                            const totalSales = cat.stores.reduce((sum: number, s: any) => sum + (s.current.net_sales || 0), 0);
                      const rentRate = totalSales > 0 ? ((totalRent / totalSales) * 100).toFixed(1) : '0.0';
                            const totalLabor = cat.stores.reduce((sum: number, s: any) => sum + (s.current.labor_cost || 0), 0);
                      const laborRate = totalSales > 0 ? ((totalLabor / totalSales) * 100).toFixed(1) : '0.0';
                      return (
                        <>
                          <div className="text-[10px] text-yellow-600 mt-1">
                            임차료율: {rentRate}%, 인건비율: {laborRate}%
                        </div>
                        <div className="mt-2 space-y-0.5">
                          {cat.stores.map((store: any, idx: number) => {
                            const rentRatio = store.current.net_sales > 0 ? ((store.current.rent || 0) / store.current.net_sales * 100) : 0;
                            const laborRatio = store.current.net_sales > 0 ? ((store.current.labor_cost || 0) / store.current.net_sales * 100) : 0;
                            const totalRatio = rentRatio + laborRatio;
                            let efficiency = '';
                            if (totalRatio < 60) efficiency = '매출 확대 시 개선 가능';
                            else if (totalRatio < 100) efficiency = '고비용 구조';
                            else efficiency = '특수 매장, 과재고 소진 목적';
                            return (
                              <div key={idx} className="text-[9px] text-yellow-600 flex justify-between">
                                <span>{store.shop_nm}: {totalRatio.toFixed(1)}%</span>
                                <span className="text-orange-600">({efficiency})</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                      );
                    })()}
                  </div>
                  <div className="mt-2 pt-2 border-t border-yellow-300">
                    <div className="text-yellow-700 font-semibold text-[10px] mb-1">전략 인사이트</div>
                    <div className="text-[10px] text-yellow-600">
                      고성장 모멘텀 유지, 직접비 효율 개선으로 조기 BEP 달성
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {/* 적자 & 역성장 */}
            {(() => {
              const storeData = cumulativeStoreStatusData || storeStatusData;
              const cat = storeData?.categories?.loss_deteriorating;
              if (!cat || cat.count === 0) return null;
              // 누적 대시보드에서는 LCX 포함
              const avgYoy = cat.stores.length > 0 
                ? cat.stores.reduce((sum: number, s: any) => sum + (s.yoy || 0), 0) / cat.stores.length 
                : 0;
              return (
                <div className="bg-red-50 rounded-lg p-3 border-2 border-red-400 min-w-0">
                  <h4 className="text-sm font-bold text-red-800 mb-2">적자 & 역성장</h4>
                  <div className="text-xs text-red-700 mb-1 font-semibold">긴급</div>
                  <div className="space-y-2 text-xs mb-3">
                    <div>
                      <div className="font-bold text-red-900">{cat.count}개 매장</div>
                    </div>
                    <div>
                      <div className="text-red-700">직접손실 합계</div>
                      <div className="font-bold text-red-600">{formatNumber(Math.round(cat.total_direct_profit))}K</div>
                      <div className="text-red-600">| 평균 YOY: {Math.round(avgYoy)}%</div>
                    </div>
                  </div>
                  <div className="border-t border-red-300 pt-2 mb-2">
                    <button
                      onClick={() => setExpandedStoreCategories(prev => ({
                        ...prev,
                        loss_deteriorating: { ...prev.loss_deteriorating, stores: !prev.loss_deteriorating.stores }
                      }))}
                      className="text-xs text-red-700 hover:text-red-800 font-semibold flex items-center w-full justify-between"
                    >
                      <span>매장별 상세</span>
                      {expandedStoreCategories.loss_deteriorating.stores ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {expandedStoreCategories.loss_deteriorating.stores && (
                    <>
                      <div className="text-[10px] text-gray-500 mb-1.5 px-2">전년→당년</div>
                    <div className="space-y-1 text-xs mb-3">
                      {cat.stores.map((store: any, idx: number) => {
                        const prevBadge = getCategoryBadge(store.previous_category);
                          const currentBadge = getCategoryBadge(store.category);
                        return (
                          <div key={idx} className={`flex justify-between items-center rounded px-2 py-1 ${store.shop_cd === 'M05' ? 'bg-gray-100 opacity-60' : 'bg-white'}`}>
                            <div className="flex items-center gap-1.5">
                              {store.previous_category && (
                                <span className={`${prevBadge.color} ${prevBadge.text} text-[9px] px-1.5 py-0.5 rounded font-bold`}>
                                  {prevBadge.symbol}
                                </span>
                              )}
                                {store.category && (
                                  <span className={`${currentBadge.color} ${currentBadge.text} text-[9px] px-1.5 py-0.5 rounded font-bold`}>
                                    {currentBadge.symbol}
                                  </span>
                                )}
                              <span className={`font-semibold ${store.shop_cd === 'M05' ? 'text-gray-500' : 'text-red-900'}`}>
                                {store.shop_nm}{store.shop_cd === 'M05' ? ' (리뉴얼)' : ''}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold ${store.current.direct_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {store.current.direct_profit >= 0 ? '+' : ''}{formatNumber(Math.round(store.current.direct_profit))}K
                              </div>
                              <div className="text-red-600 text-[10px]">YOY {Math.round(store.yoy)}%</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    </>
                  )}
                  <div className="mt-3 pt-2 border-t border-red-300">
                    <div className="text-red-700 text-[10px] mb-1">임차료/인건비율 합계</div>
                    <div className="font-bold text-red-900 text-xs mb-2">{cat.avg_rent_labor_ratio.toFixed(1)}%</div>
                    <button
                      onClick={() => setExpandedStoreCategories(prev => ({
                        ...prev,
                        loss_deteriorating: { ...prev.loss_deteriorating, rentLabor: !prev.loss_deteriorating.rentLabor }
                      }))}
                      className="text-xs text-red-700 hover:text-red-800 font-semibold flex items-center w-full justify-between mb-1"
                    >
                      <span>상세 보기</span>
                      {expandedStoreCategories.loss_deteriorating.rentLabor ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    {expandedStoreCategories.loss_deteriorating.rentLabor && (() => {
                            const totalRent = cat.stores.reduce((sum: number, s: any) => sum + (s.current.rent || 0), 0);
                            const totalSales = cat.stores.reduce((sum: number, s: any) => sum + (s.current.net_sales || 0), 0);
                      const rentRate = totalSales > 0 ? ((totalRent / totalSales) * 100).toFixed(1) : '0.0';
                            const totalLabor = cat.stores.reduce((sum: number, s: any) => sum + (s.current.labor_cost || 0), 0);
                      const laborRate = totalSales > 0 ? ((totalLabor / totalSales) * 100).toFixed(1) : '0.0';
                      return (
                        <>
                          <div className="text-[10px] text-red-600 mt-1">
                            임차료율: {rentRate}%, 인건비율: {laborRate}%
                        </div>
                        <div className="mt-2 space-y-0.5">
                          {cat.stores.map((store: any, idx: number) => {
                            const rentRatio = store.current.net_sales > 0 ? ((store.current.rent || 0) / store.current.net_sales * 100) : 0;
                            const laborRatio = store.current.net_sales > 0 ? ((store.current.labor_cost || 0) / store.current.net_sales * 100) : 0;
                            const totalRatio = rentRatio + laborRatio;
                            let note = '';
                            if (totalRatio >= 40) note = '임차료율 40% 이상';
                            if (store.shop_cd === 'M05' || store.shop_cd === 'M12') note = '종료/리뉴얼';
                            return (
                              <div key={idx} className="text-[9px] text-red-600 flex justify-between">
                                <span>{store.shop_nm}: {totalRatio.toFixed(1)}%</span>
                                {note && <span className="text-orange-600">({note})</span>}
                              </div>
                            );
                          })}
                        </div>
                      </>
                      );
                    })()}
                  </div>
                  <div className="mt-2 pt-2 border-t border-red-300">
                    <div className="text-red-700 font-semibold text-[10px] mb-1">전략 인사이트</div>
                    <div className="text-[10px] text-red-600">
                      Time Square-Yoho-Hysan 우선 개선, 임차료 협상 및 직접비 절감 집중
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {/* 마카오 매장 종합 */}
            {(() => {
              const mc = storeStatusData?.mc_summary;
              if (!mc || mc.count === 0) return null;
              return (
                <div className="bg-purple-50 rounded-lg p-3 border-2 border-purple-400 min-w-0">
                  <h4 className="text-sm font-bold text-purple-800 mb-2">마카오 매장 종합</h4>
                  <div className="text-xs text-purple-700 mb-1 font-semibold">MC:</div>
                  <div className="space-y-2 text-xs mb-3">
                    <div>
                      <div className="font-bold text-purple-900">{mc.count}개 매장</div>
                    </div>
                    <div>
                      <div className="text-purple-700">직접이익 합계</div>
                      <div className={`font-bold ${mc.total_direct_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {mc.total_direct_profit >= 0 ? '+' : ''}{formatNumber(Math.round(mc.total_direct_profit))}K
                      </div>
                      <div className="text-purple-600">| 전체 YOY: {Math.round(mc.overall_yoy)}%</div>
                    </div>
                  </div>
                  <div className="border-t border-purple-300 pt-2 mb-2">
                    <button
                      onClick={() => setExpandedStoreCategories(prev => ({
                        ...prev,
                        mc_summary: { ...prev.mc_summary, stores: !prev.mc_summary.stores }
                      }))}
                      className="text-xs text-purple-700 hover:text-purple-800 font-semibold flex items-center w-full justify-between"
                    >
                      <span>매장별 상세</span>
                      {expandedStoreCategories.mc_summary.stores ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {expandedStoreCategories.mc_summary.stores && (
                    <>
                      <div className="text-[10px] text-gray-500 mb-1.5 px-2">전년→당년</div>
                    <div className="space-y-1 text-xs mb-3">
                      {mc.stores.map((store: any, idx: number) => {
                        const prevBadge = getCategoryBadge(store.previous_category);
                          const currentBadge = getCategoryBadge(store.category);
                        return (
                          <div key={idx} className="flex justify-between items-center bg-white rounded px-2 py-1">
                            <div className="flex items-center gap-1.5">
                              {store.previous_category && (
                                <span className={`${prevBadge.color} ${prevBadge.text} text-[9px] px-1.5 py-0.5 rounded font-bold`}>
                                  {prevBadge.symbol}
                                </span>
                              )}
                                {store.category && (
                                  <span className={`${currentBadge.color} ${currentBadge.text} text-[9px] px-1.5 py-0.5 rounded font-bold`}>
                                    {currentBadge.symbol}
                                  </span>
                                )}
                              <span className="font-semibold text-purple-900">{store.shop_nm}</span>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold ${store.current.direct_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {store.current.direct_profit >= 0 ? '+' : ''}{formatNumber(Math.round(store.current.direct_profit))}K
                              </div>
                              <div className="text-purple-600 text-[10px]">YOY {Math.round(store.yoy)}%</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    </>
                  )}
                  <div className="mt-3 pt-2 border-t border-purple-300">
                    <div className="text-purple-700 text-[10px] mb-1">임차료/인건비율 합계</div>
                    <div className="font-bold text-purple-900 text-xs mb-2">{mc.avg_rent_labor_ratio.toFixed(1)}%</div>
                    <button
                      onClick={() => setExpandedStoreCategories(prev => ({
                        ...prev,
                        mc_summary: { ...prev.mc_summary, rentLabor: !prev.mc_summary.rentLabor }
                      }))}
                      className="text-xs text-purple-700 hover:text-purple-800 font-semibold flex items-center w-full justify-between mb-1"
                    >
                      <span>상세 보기</span>
                      {expandedStoreCategories.mc_summary.rentLabor ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    {expandedStoreCategories.mc_summary.rentLabor && (() => {
                            const totalRent = mc.stores.reduce((sum: number, s: any) => sum + (s.current.rent || 0), 0);
                            const totalSales = mc.stores.reduce((sum: number, s: any) => sum + (s.current.net_sales || 0), 0);
                      const rentRate = totalSales > 0 ? ((totalRent / totalSales) * 100).toFixed(1) : '0.0';
                            const totalLabor = mc.stores.reduce((sum: number, s: any) => sum + (s.current.labor_cost || 0), 0);
                      const laborRate = totalSales > 0 ? ((totalLabor / totalSales) * 100).toFixed(1) : '0.0';
                      return (
                        <>
                          <div className="text-[10px] text-purple-600 mt-1">
                            임차료율: {rentRate}%, 인건비율: {laborRate}%
                        </div>
                        <div className="mt-2 space-y-0.5">
                          {mc.stores.map((store: any, idx: number) => {
                            const rentRatio = store.current.net_sales > 0 ? ((store.current.rent || 0) / store.current.net_sales * 100) : 0;
                            const laborRatio = store.current.net_sales > 0 ? ((store.current.labor_cost || 0) / store.current.net_sales * 100) : 0;
                            const totalRatio = rentRatio + laborRatio;
                            return (
                              <div key={idx} className="text-[9px] text-purple-600 flex justify-between">
                                <span>{store.shop_nm}: {totalRatio.toFixed(1)}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                      );
                    })()}
                  </div>
                  <div className="mt-2 pt-2 border-t border-purple-300">
                    <div className="text-purple-700 font-semibold text-[10px] mb-1">전략 인사이트</div>
                    <div className="text-[10px] text-purple-600">
                      현지 VMD 채용 및 프로모션 대응 속도 개선으로 전체 매출 반등 유도
                    </div>
                  </div>
                </div>
              );
            })()}
              </div>
            );
          })()}
        </div>
      </div>

      {/* 직접비 상세 (오프라인 매장별 현황 아래) */}
      <div className="mt-4 bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <div className="w-2 h-20 rounded-full mr-2"></div>
            직접비 상세 (1K HKD)
          </h3>
        </div>
        
        <div className="grid grid-cols-5 gap-4 mb-6">
          {/* 전체 직접비용 */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg shadow-md p-4 border-l-4 border-indigo-600">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-indigo-800">전체 직접비용</div>
              
              {/* 당월/누적 토글 버튼 */}
              <div className="flex gap-1">
                <button
                  onClick={() => setExpenseType('당월')}
                  className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${
                    expenseType === '당월'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  당월
                </button>
                <button
                  onClick={() => setExpenseType('누적')}
                  className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${
                    expenseType === '누적'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  누적
                </button>
              </div>
            </div>
            
            {expenseType === '당월' ? (
              <>
                <div className="text-2xl font-bold mb-2 text-indigo-900">{formatNumber(Math.round(directCostCurrent?.totalDirectCost || 0))}K</div>
                <div className="text-xs mb-3 text-red-600">YOY {Math.round((directCostCurrent?.totalDirectCost || 0) / (directCostCurrent?.totalDirectCostPrev || 1) * 100)}% (▼ {formatNumber(Math.round((directCostCurrent?.totalDirectCostPrev || 0) - (directCostCurrent?.totalDirectCost || 0)))}K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-indigo-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-indigo-700">매출대비율</span>
                    <span className="text-xs font-semibold text-indigo-900">{((directCostCurrent?.totalDirectCost || 0) / (pl?.net_sales || 1) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-indigo-700">전년비</span>
                    <span className={`text-xs font-semibold ${((directCostCurrent?.totalDirectCost || 0) / (pl?.net_sales || 1) * 100) - ((directCostCurrent?.totalDirectCostPrev || 0) / (plData?.prev_month?.total?.net_sales || 1) * 100) > 0 ? 'text-red-600' : 'text-green-600'}`}>{((directCostCurrent?.totalDirectCost || 0) / (pl?.net_sales || 1) * 100) - ((directCostCurrent?.totalDirectCostPrev || 0) / (plData?.prev_month?.total?.net_sales || 1) * 100) > 0 ? '+' : ''}{(((directCostCurrent?.totalDirectCost || 0) / (pl?.net_sales || 1) * 100) - ((directCostCurrent?.totalDirectCostPrev || 0) / (plData?.prev_month?.total?.net_sales || 1) * 100)).toFixed(1)}%p</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-indigo-900">115,680K</div>
                <div className="text-xs mb-3 text-blue-600">YOY 95% (▼ 6,426K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-indigo-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-indigo-700">매출대비율</span>
                    <span className="text-xs font-semibold text-indigo-900">57.0%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-indigo-700">전년비</span>
                    <span className="text-xs font-semibold text-red-600">+5.1%p</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 급여 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-cyan-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">급여</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-cyan-100 text-cyan-700">
                {expenseType}
              </div>
            </div>
            
            {expenseType === '당월' ? (
              <>
                {(() => {
                  const current = Math.round(directCostCurrent?.current.labor_cost || 0);
                  const prev = Math.round(directCostCurrent?.prev.labor_cost || 0);
                  const change = current - prev;
                  const yoy = prev !== 0 ? Math.round((current / prev) * 100) : 0;
                  const currentSales = plData?.current_month?.total?.net_sales || 1;
                  const prevSales = plData?.prev_month?.total?.net_sales || 1;
                  const currentRatio = (current / currentSales) * 100;
                  const prevRatio = (prev / prevSales) * 100;
                  const ratioChange = currentRatio - prevRatio;
                  
                  return (
                    <>
                      <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(current)}K</div>
                      <div className={`text-xs mb-3 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        YOY {yoy}% ({change >= 0 ? '▲' : '▼'} {Math.abs(change)}K)
                      </div>
                      
                      <div className="border-t pt-3 space-y-1 border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600 w-24">매출대비율</span>
                          <span className="text-xs font-semibold text-gray-800 text-right">{currentRatio.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600 w-24">전년비</span>
                          <span className={`text-xs font-semibold text-right ${ratioChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {ratioChange >= 0 ? '+' : ''}{ratioChange.toFixed(1)}%p
                          </span>
                        </div>
                      </div>

                      {/* 당월 증감 분석 */}
                      <div className="mt-3 pt-3 border-t">
                        <button
                          onClick={() => setShowDirectCostItemAnalysis(prev => ({ ...prev, salary: !prev.salary }))}
                          className="w-full flex items-center justify-between text-xs text-cyan-600 hover:text-cyan-800 font-semibold"
                        >
                          <span>당월 증감 분석</span>
                          {showDirectCostItemAnalysis.salary ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        {showDirectCostItemAnalysis.salary && (
                          <div className="mt-3 pt-3 border-t rounded p-2">
                            <div className="space-y-1.5 text-xs">
                              <div className="flex items-start">
                                <span className="text-cyan-600 mr-1">•</span>
                                <span className="text-gray-700">인건비 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {yoy}%)</span>
                              </div>
                              <div className="flex items-start">
                                <span className="text-cyan-600 mr-1">•</span>
                                <span className="text-gray-700">매출 대비 비율: {currentRatio.toFixed(1)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{ratioChange.toFixed(1)}%p)</span>
                              </div>
                              <div className="flex items-start">
                                <span className="text-cyan-600 mr-1">•</span>
                                <span className="text-gray-700">인원수 변화 및 매출 대비 효율성 분석</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </>
            ) : (
              <>
                {(() => {
                  const current = Math.round(directCostCumulative?.current.labor_cost || 0);
                  const prev = Math.round(directCostCumulative?.prev.labor_cost || 0);
                  const change = current - prev;
                  const yoy = prev !== 0 ? Math.round((current / prev) * 100) : 0;
                  const currentSales = plData?.cumulative?.total?.net_sales || 1;
                  const prevSales = plData?.cumulative?.prev_cumulative?.total?.net_sales || 1;
                  const currentRatio = (current / currentSales) * 100;
                  const prevRatio = (prev / prevSales) * 100;
                  const ratioChange = currentRatio - prevRatio;
                  
                  return (
                    <>
                      <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(current)}K</div>
                      <div className={`text-xs mb-3 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        YOY {yoy}% ({change >= 0 ? '▲' : '▼'} {Math.abs(change)}K)
                      </div>
                      
                      <div className="border-t pt-3 space-y-1 border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600 w-24">매출대비율</span>
                          <span className="text-xs font-semibold text-gray-800 text-right">{currentRatio.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600 w-24">전년비</span>
                          <span className={`text-xs font-semibold text-right ${ratioChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {ratioChange >= 0 ? '+' : ''}{ratioChange.toFixed(1)}%p
                          </span>
                        </div>
                      </div>

                      {/* 누적 증감 분석 */}
                      <div className="mt-3 pt-3 border-t">
                        <button
                          onClick={() => setShowDirectCostItemAnalysis(prev => ({ ...prev, salary: !prev.salary }))}
                          className="w-full flex items-center justify-between text-xs text-cyan-600 hover:text-cyan-800 font-semibold"
                        >
                          <span>누적 증감 분석</span>
                          {showDirectCostItemAnalysis.salary ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        {showDirectCostItemAnalysis.salary && (
                          <div className="mt-3 pt-3 border-t rounded p-2">
                            <div className="space-y-1.5 text-xs">
                              <div className="flex items-start">
                                <span className="text-cyan-600 mr-1">•</span>
                                <span className="text-gray-700">인건비 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {yoy}%)</span>
                              </div>
                              <div className="flex items-start">
                                <span className="text-cyan-600 mr-1">•</span>
                                <span className="text-gray-700">매출 대비 비율: {currentRatio.toFixed(1)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{ratioChange.toFixed(1)}%p)</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>

          {/* 임차료 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-teal-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">임차료</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-teal-100 text-teal-700">
                {expenseType}
              </div>
            </div>
            
            {expenseType === '당월' ? (
              <>
                {(() => {
                  const current = Math.round(directCostCurrent?.current.rent || 0);
                  const prev = Math.round(directCostCurrent?.prev.rent || 0);
                  const change = current - prev;
                  const yoy = prev !== 0 ? Math.round((current / prev) * 100) : 0;
                  const currentSales = plData?.current_month?.total?.net_sales || 1;
                  const prevSales = plData?.prev_month?.total?.net_sales || 1;
                  const currentRatio = (current / currentSales) * 100;
                  const prevRatio = (prev / prevSales) * 100;
                  const ratioChange = currentRatio - prevRatio;
                  
                  return (
                    <>
                      <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(current)}K</div>
                      <div className={`text-xs mb-3 ${change >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                        YOY {yoy}% ({change >= 0 ? '▲' : '▼'} {Math.abs(change)}K)
                      </div>
                      
                      <div className="border-t pt-3 space-y-1.5 border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">매출대비율</span>
                          <span className="text-xs font-semibold text-gray-800">{currentRatio.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">전년비</span>
                          <span className={`text-xs font-semibold ${ratioChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {ratioChange >= 0 ? '+' : ''}{ratioChange.toFixed(1)}%p
                          </span>
                        </div>
                      </div>

                      {/* 당월 증감 분석 */}
                      <div className="mt-3 pt-3 border-t">
                        <button
                          onClick={() => setShowDirectCostItemAnalysis(prev => ({ ...prev, rent: !prev.rent }))}
                          className="w-full flex items-center justify-between text-xs text-teal-600 hover:text-teal-800 font-semibold"
                        >
                          <span>당월 증감 분석</span>
                          {showDirectCostItemAnalysis.rent ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        {showDirectCostItemAnalysis.rent && (
                          <div className="mt-3 pt-3 border-t bg-teal-50 rounded p-2">
                            <div className="space-y-1.5 text-xs">
                              <div className="font-semibold text-teal-800 mb-1">임차료 {change >= 0 ? '증가' : '감소'} 분석</div>
                              <div className="flex items-start">
                                <span className="text-teal-600 mr-1">•</span>
                                <span className="text-gray-700">임차료 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {yoy}%)</span>
                              </div>
                              <div className="flex items-start">
                                <span className="text-teal-600 mr-1">•</span>
                                <span className="text-gray-700">매출 대비 비율: {currentRatio.toFixed(1)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{ratioChange.toFixed(1)}%p)</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </>
            ) : (
              <>
                {(() => {
                  const current = Math.round(directCostCumulative?.current.rent || 0);
                  const prev = Math.round(directCostCumulative?.prev.rent || 0);
                  const change = current - prev;
                  const yoy = prev !== 0 ? Math.round((current / prev) * 100) : 0;
                  const currentSales = plData?.cumulative?.total?.net_sales || 1;
                  const prevSales = plData?.cumulative?.prev_cumulative?.total?.net_sales || 1;
                  const currentRatio = (current / currentSales) * 100;
                  const prevRatio = (prev / prevSales) * 100;
                  const ratioChange = currentRatio - prevRatio;
                  
                  return (
                    <>
                      <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(current)}K</div>
                      <div className={`text-xs mb-3 ${change >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                        YOY {yoy}% ({change >= 0 ? '▲' : '▼'} {Math.abs(change)}K)
                      </div>
                      
                      <div className="border-t pt-3 space-y-1.5 border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">매출대비율</span>
                          <span className="text-xs font-semibold text-gray-800">{currentRatio.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">전년비</span>
                          <span className={`text-xs font-semibold ${ratioChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {ratioChange >= 0 ? '+' : ''}{ratioChange.toFixed(1)}%p
                          </span>
                        </div>
                      </div>

                      {/* 누적 증감 분석 */}
                      <div className="mt-3 pt-3 border-t">
                        <button
                          onClick={() => setShowDirectCostItemAnalysis(prev => ({ ...prev, rent: !prev.rent }))}
                          className="w-full flex items-center justify-between text-xs text-teal-600 hover:text-teal-800 font-semibold"
                        >
                          <span>누적 증감 분석</span>
                          {showDirectCostItemAnalysis.rent ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        {showDirectCostItemAnalysis.rent && (
                          <div className="mt-3 pt-3 border-t bg-teal-50 rounded p-2">
                            <div className="space-y-1.5 text-xs">
                              <div className="font-semibold text-teal-800 mb-1">임차료 {change >= 0 ? '증가' : '감소'} 분석</div>
                              <div className="flex items-start">
                                <span className="text-teal-600 mr-1">•</span>
                                <span className="text-gray-700">임차료 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {yoy}%)</span>
                              </div>
                              <div className="flex items-start">
                                <span className="text-teal-600 mr-1">•</span>
                                <span className="text-gray-700">매출 대비 비율: {currentRatio.toFixed(1)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{ratioChange.toFixed(1)}%p)</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>

          {/* 물류비 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-amber-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">물류비</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-amber-100 text-amber-700">
                {expenseType}
              </div>
            </div>
            
            {expenseType === '당월' ? (
              <>
                {(() => {
                  const current = Math.round(directCostCurrent?.current.logistics || 0);
                  const prev = Math.round(directCostCurrent?.prev.logistics || 0);
                  const change = current - prev;
                  const yoy = prev !== 0 ? Math.round((current / prev) * 100) : 0;
                  const currentSales = plData?.current_month?.total?.net_sales || 1;
                  const prevSales = plData?.prev_month?.total?.net_sales || 1;
                  const currentRatio = (current / currentSales) * 100;
                  const prevRatio = (prev / prevSales) * 100;
                  const ratioChange = currentRatio - prevRatio;
                  
                  return (
                    <>
                      <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(current)}K</div>
                      <div className={`text-xs mb-3 ${change >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                        YOY {yoy}% ({change >= 0 ? '▲' : '▼'} {Math.abs(change)}K)
                      </div>
                      
                      <div className="border-t pt-3 space-y-1.5 border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">매출대비율</span>
                          <span className="text-xs font-semibold text-gray-800">{currentRatio.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">전년비</span>
                          <span className={`text-xs font-semibold ${ratioChange >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                            {ratioChange >= 0 ? '+' : '△'}{Math.abs(ratioChange).toFixed(1)}%p
                          </span>
                        </div>
                      </div>

                      {/* 당월 증감 분석 */}
                      <div className="mt-3 pt-3 border-t">
                        <button
                          onClick={() => setShowDirectCostItemAnalysis(prev => ({ ...prev, logistics: !prev.logistics }))}
                          className="w-full flex items-center justify-between text-xs text-amber-600 hover:text-amber-800 font-semibold"
                        >
                          <span>당월 증감 분석</span>
                          {showDirectCostItemAnalysis.logistics ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        {showDirectCostItemAnalysis.logistics && (
                          <div className="mt-3 pt-3 border-t rounded p-2">
                            <div className="space-y-1.5 text-xs">
                              <div className="flex items-start">
                                <span className="text-amber-600 mr-1">•</span>
                                <span className="text-gray-700">물류비 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {yoy}%)</span>
                              </div>
                              <div className="flex items-start">
                                <span className="text-amber-600 mr-1">•</span>
                                <span className="text-gray-700">매출 대비 비율: {currentRatio.toFixed(1)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{ratioChange.toFixed(1)}%p)</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </>
            ) : (
              <>
                {(() => {
                  const current = Math.round(directCostCumulative?.current.logistics || 0);
                  const prev = Math.round(directCostCumulative?.prev.logistics || 0);
                  const change = current - prev;
                  const yoy = prev !== 0 ? Math.round((current / prev) * 100) : 0;
                  const currentSales = plData?.cumulative?.total?.net_sales || 1;
                  const prevSales = plData?.cumulative?.prev_cumulative?.total?.net_sales || 1;
                  const currentRatio = (current / currentSales) * 100;
                  const prevRatio = (prev / prevSales) * 100;
                  const ratioChange = currentRatio - prevRatio;
                  
                  return (
                    <>
                      <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(current)}K</div>
                      <div className={`text-xs mb-3 ${change >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                        YOY {yoy}% ({change >= 0 ? '▲' : '▼'} {Math.abs(change)}K)
                      </div>
                      
                      <div className="border-t pt-3 space-y-1.5 border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">매출대비율</span>
                          <span className="text-xs font-semibold text-gray-800">{currentRatio.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">전년비</span>
                          <span className={`text-xs font-semibold ${ratioChange >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                            {ratioChange >= 0 ? '+' : '△'}{Math.abs(ratioChange).toFixed(1)}%p
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>

          {/* 기타 직접비 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">기타 직접비</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-purple-100 text-purple-700">
                {expenseType}
              </div>
            </div>
            
            {expenseType === '당월' ? (
              <>
                {(() => {
                  const current = (directCostCurrent?.current || {}) as any;
                  const totalRent = Math.round(current.rent || 0);
                  const totalSalary = Math.round(current.labor_cost || 0);
                  const totalDirectCost = Math.round(directCostCurrent?.totalDirectCost || 0);
                  // 기타직접비 = 총 직접비 - 급여 - 임차료 (logistics는 기타직접비에 포함)
                  const otherDirectCost = totalDirectCost - totalRent - totalSalary;
                  
                  const prev = (directCostCurrent?.prev || {}) as any;
                  const totalRentPrev = Math.round(prev.rent || 0);
                  const totalSalaryPrev = Math.round(prev.labor_cost || 0);
                  const totalDirectCostPrev = Math.round(directCostCurrent?.totalDirectCostPrev || 0);
                  // 기타직접비 = 총 직접비 - 급여 - 임차료 (logistics는 기타직접비에 포함)
                  const otherDirectCostPrev = totalDirectCostPrev - totalRentPrev - totalSalaryPrev;
                  
                  const change = otherDirectCost - otherDirectCostPrev;
                  const yoy = otherDirectCostPrev !== 0 ? Math.round((otherDirectCost / otherDirectCostPrev) * 100) : 0;
                  
                  // 기타 직접비 상세 항목
                  const otherDetailItems = [
                    { label: '매장관리비', value: Math.round(current.other_fee || 0) },
                    { label: '감가상각비', value: Math.round(current.depreciation || 0) },
                    { label: '지급수수료', value: Math.round(current.fee || 0) },
                    { label: '유니폼', value: Math.round(current.uniform || 0) },
                    { label: '수도광열비', value: Math.round(current.utilities || 0) },
                    { label: '광고선전비', value: Math.round(current.marketing || 0) },
                    { label: '소모품비', value: Math.round(current.supplies || 0) },
                    { label: '보험료', value: Math.round(current.insurance || 0) },
                    { label: '여비교통비', value: Math.round(current.travel || 0) },
                    { label: '유지보수비', value: Math.round(current.maintenance || 0) },
                    { label: '통신비', value: Math.round(current.communication || 0) }
                  ].filter(item => item.value > 0).sort((a, b) => b.value - a.value);
                  
                  return (
                    <>
                      <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(otherDirectCost)}K</div>
                      <div className={`text-xs mb-3 ${change >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        YOY {yoy}% ({change >= 0 ? '▲' : '▼'} {Math.abs(change)}K)
                      </div>
                      
                      <div className="border-t pt-3 space-y-1.5 border-gray-200">
                        {otherDetailItems.slice(0, 5).map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">{item.label}</span>
                            <span className="text-xs font-semibold text-gray-800">{formatNumber(item.value)}K</span>
                          </div>
                        ))}
                      </div>

                      {/* 당월 증감 분석 */}
                      <div className="mt-3 pt-3 border-t">
                        <button
                          onClick={() => setShowDirectCostItemAnalysis(prev => ({ ...prev, other: !prev.other }))}
                          className="w-full flex items-center justify-between text-xs text-purple-600 hover:text-purple-800 font-semibold"
                        >
                          <span>당월 증감 분석</span>
                          {showDirectCostItemAnalysis.other ? (
                            <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {showDirectCostItemAnalysis.other && (
                    <div className="mt-3 pt-3 border-t rounded p-2">
                      <div className="space-y-1.5 text-xs">
                        {otherDetailItems.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="text-gray-600">{item.label}</span>
                            <span className="text-gray-800">{formatNumber(item.value)}K</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                      </div>
                    </>
                  );
                })()}
              </>
            ) : (
              <>
                {(() => {
                  const current = (directCostCumulative?.current || {}) as any;
                  const totalRent = Math.round(current.rent || 0);
                  const totalSalary = Math.round(current.labor_cost || 0);
                  const totalDirectCost = Math.round(directCostCumulative?.totalDirectCost || 0);
                  // 기타직접비 = 총 직접비 - 급여 - 임차료 (logistics는 기타직접비에 포함)
                  const otherDirectCost = totalDirectCost - totalRent - totalSalary;
                  
                  const prev = (directCostCumulative?.prev || {}) as any;
                  const totalRentPrev = Math.round(prev.rent || 0);
                  const totalSalaryPrev = Math.round(prev.labor_cost || 0);
                  const totalDirectCostPrev = Math.round(directCostCumulative?.totalDirectCostPrev || 0);
                  // 기타직접비 = 총 직접비 - 급여 - 임차료 (logistics는 기타직접비에 포함)
                  const otherDirectCostPrev = totalDirectCostPrev - totalRentPrev - totalSalaryPrev;
                  
                  const change = otherDirectCost - otherDirectCostPrev;
                  const yoy = otherDirectCostPrev !== 0 ? Math.round((otherDirectCost / otherDirectCostPrev) * 100) : 0;
                  
                  // 기타 직접비 상세 항목
                  const otherDetailItems = [
                    { label: '매장관리비', value: Math.round(current.other_fee || 0) },
                    { label: '감가상각비', value: Math.round(current.depreciation || 0) },
                    { label: '지급수수료', value: Math.round(current.fee || 0) },
                    { label: '소모품비', value: Math.round(current.supplies || 0) },
                    { label: '수도광열비', value: Math.round(current.utilities || 0) },
                    { label: '광고선전비', value: Math.round(current.marketing || 0) },
                    { label: '보험료', value: Math.round(current.insurance || 0) },
                    { label: '유니폼', value: Math.round(current.uniform || 0) },
                    { label: '유지보수비', value: Math.round(current.maintenance || 0) },
                    { label: '통신비', value: Math.round(current.communication || 0) },
                    { label: '여비교통비', value: Math.round(current.travel || 0) }
                  ].filter(item => item.value > 0).sort((a, b) => b.value - a.value);
                  
                  return (
                    <>
                      <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(otherDirectCost)}K</div>
                      <div className={`text-xs mb-3 ${change >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                        YOY {yoy}% ({change >= 0 ? '▲' : '▼'} {Math.abs(change)}K)
                      </div>
                      
                      <div className="border-t pt-3 space-y-1.5 border-gray-200">
                        {otherDetailItems.slice(0, 5).map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="text-xs text-gray-600">{item.label}</span>
                            <span className="text-xs font-semibold text-gray-800">{formatNumber(item.value)}K</span>
                          </div>
                        ))}
                      </div>

                      {/* 누적 증감 분석 */}
                      <div className="mt-3 pt-3 border-t">
                        <button
                          onClick={() => setShowDirectCostItemAnalysis(prev => ({ ...prev, other: !prev.other }))}
                          className="w-full flex items-center justify-between text-xs text-purple-600 hover:text-purple-800 font-semibold"
                        >
                          <span>누적 증감 분석</span>
                          {showDirectCostItemAnalysis.other ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        {showDirectCostItemAnalysis.other && (
                          <div className="mt-3 pt-3 border-t rounded p-2">
                            <div className="space-y-1.5 text-xs">
                              {otherDetailItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center">
                                  <span className="text-gray-600">{item.label}</span>
                                  <span className="text-gray-800">{formatNumber(item.value)}K</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>
        </div>

        {/* 영업비 상세 (오프라인 매장별 현황 아래) */}
      <div className="mt-4 bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
            영업비 상세 (1K HKD)
          </h3>
        </div>
        
        <div className="grid grid-cols-5 gap-4">
          {/* 전체 */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg shadow-md p-4 border-l-4 border-emerald-600">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-emerald-800">전체 영업비</div>
              
              {/* 당월/누적 토글 버튼 */}
              <div className="flex gap-1">
                <button
                  onClick={() => setOpexType('당월')}
                  className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${
                    opexType === '당월'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  당월
                </button>
                <button
                  onClick={() => setOpexType('누적')}
                  className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${
                    opexType === '누적'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  누적
                </button>
              </div>
            </div>
            
            {opexType === '당월' ? (
              <>
                <div className="text-2xl font-bold mb-2 text-emerald-900">{formatNumber(pl?.sg_a || 0)}</div>
                <div className="text-xs mb-3 text-red-600">YOY {formatPercent(plYoy?.sg_a || 0)}% ({(pl?.sg_a || 0) >= (plData?.prev_month?.total?.sg_a || 0) ? '+' : '△'}{formatNumber(Math.abs(Math.round((pl?.sg_a || 0) - (plData?.prev_month?.total?.sg_a || 0))))}K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-emerald-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">매출 대비 비율</span>
                    <span className="text-xs font-semibold text-emerald-900">{((pl?.sg_a || 0) / (pl?.net_sales || 1) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">전년 비율</span>
                    <span className="text-xs font-semibold text-emerald-900">{((plData?.prev_month?.total?.sg_a || 0) / (plData?.prev_month?.total?.net_sales || 1) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">{((pl?.sg_a || 0) / (pl?.net_sales || 1) * 100) - ((plData?.prev_month?.total?.sg_a || 0) / (plData?.prev_month?.total?.net_sales || 1) * 100) > 0 ? '효율성 악화' : '효율성 개선'}</span>
                    <span className={`text-xs font-semibold ${((pl?.sg_a || 0) / (pl?.net_sales || 1) * 100) - ((plData?.prev_month?.total?.sg_a || 0) / (plData?.prev_month?.total?.net_sales || 1) * 100) > 0 ? 'text-red-600' : 'text-green-600'}`}>{((pl?.sg_a || 0) / (pl?.net_sales || 1) * 100) - ((plData?.prev_month?.total?.sg_a || 0) / (plData?.prev_month?.total?.net_sales || 1) * 100) > 0 ? '▲' : '▼'} {Math.abs(((pl?.sg_a || 0) / (pl?.net_sales || 1) * 100) - ((plData?.prev_month?.total?.sg_a || 0) / (plData?.prev_month?.total?.net_sales || 1) * 100)).toFixed(1)}%p</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-emerald-900">{formatNumber(plData?.cumulative?.total?.sg_a || 0)}</div>
                <div className="text-xs mb-3 text-red-600">YOY {formatPercent(plData?.cumulative?.yoy?.sg_a || 0)}% ({(plData?.cumulative?.total?.sg_a || 0) >= (plData?.cumulative?.prev_cumulative?.total?.sg_a || 0) ? '+' : '△'}{formatNumber(Math.abs(Math.round((plData?.cumulative?.total?.sg_a || 0) - (plData?.cumulative?.prev_cumulative?.total?.sg_a || 0))))}K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-emerald-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">매출 대비 비율</span>
                    <span className="text-xs font-semibold text-emerald-900">{((plData?.cumulative?.total?.sg_a || 0) / (plData?.cumulative?.total?.net_sales || 1) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">전년 비율</span>
                    <span className="text-xs font-semibold text-emerald-900">{((plData?.cumulative?.prev_cumulative?.total?.sg_a || 0) / (plData?.cumulative?.prev_cumulative?.total?.net_sales || 1) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">{((plData?.cumulative?.total?.sg_a || 0) / (plData?.cumulative?.total?.net_sales || 1) * 100) - ((plData?.cumulative?.prev_cumulative?.total?.sg_a || 0) / (plData?.cumulative?.prev_cumulative?.total?.net_sales || 1) * 100) > 0 ? '효율성 악화' : '효율성 개선'}</span>
                    <span className={`text-xs font-semibold ${((plData?.cumulative?.total?.sg_a || 0) / (plData?.cumulative?.total?.net_sales || 1) * 100) - ((plData?.cumulative?.prev_cumulative?.total?.sg_a || 0) / (plData?.cumulative?.prev_cumulative?.total?.net_sales || 1) * 100) > 0 ? 'text-red-600' : 'text-green-600'}`}>{((plData?.cumulative?.total?.sg_a || 0) / (plData?.cumulative?.total?.net_sales || 1) * 100) - ((plData?.cumulative?.prev_cumulative?.total?.sg_a || 0) / (plData?.cumulative?.prev_cumulative?.total?.net_sales || 1) * 100) > 0 ? '▲' : '▼'} {Math.abs(((plData?.cumulative?.total?.sg_a || 0) / (plData?.cumulative?.total?.net_sales || 1) * 100) - ((plData?.cumulative?.prev_cumulative?.total?.sg_a || 0) / (plData?.cumulative?.prev_cumulative?.total?.net_sales || 1) * 100)).toFixed(1)}%p</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 급여 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">급여</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-700">
                {opexType}
              </div>
            </div>
            
            {opexType === '당월' ? (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(Math.round((plData?.current_month?.total?.expense_detail as any)?.salary || 0))}K</div>
                <div className="text-xs mb-3 text-red-600">YOY {Math.round(((plData?.current_month?.total?.expense_detail as any)?.salary || 0) / ((plData?.prev_month?.total?.expense_detail as any)?.salary || 1) * 100)}% ({((plData?.current_month?.total?.expense_detail as any)?.salary || 0) >= ((plData?.prev_month?.total?.expense_detail as any)?.salary || 0) ? '+' : '△'}{formatNumber(Math.abs(Math.round(((plData?.current_month?.total?.expense_detail as any)?.salary || 0) - ((plData?.prev_month?.total?.expense_detail as any)?.salary || 0))))}K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">{(((plData?.current_month?.total?.expense_detail as any)?.salary || 0) / (pl?.sg_a || 1) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">{(((plData?.current_month?.total?.expense_detail as any)?.salary || 0) / (pl?.net_sales || 1) * 100).toFixed(1)}%</span>
                  </div>
                </div>

                {/* 당월 증감 분석 */}
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={() => setShowOperatingExpenseItemAnalysis(prev => ({ ...prev, salary: !prev.salary }))}
                    className="w-full flex items-center justify-between text-xs text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    <span>당월 증감 분석</span>
                    {showOperatingExpenseItemAnalysis.salary ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {showOperatingExpenseItemAnalysis.salary && (() => {
                    const currentMonthData = plData?.current_month?.total;
                    const prevMonthData = plData?.prev_month?.total;
                    const expenseDetail = currentMonthData?.expense_detail || {};
                    const expenseDetailPrev = prevMonthData?.expense_detail || {};
                    const current = (expenseDetail as any).salary || 0;
                    const prev = (expenseDetailPrev as any).salary || 0;
                    const change = current - prev;
                    const changeRate = prev !== 0 ? (change / prev) * 100 : 0;
                    const currentSales = currentMonthData?.net_sales || 0;
                    const prevSales = prevMonthData?.net_sales || 0;
                    const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                    const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                    const ratioChange = currentRatio - prevRatio;

                    return (
                      <div className="mt-3 pt-3 border-t bg-blue-50 rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start">
                            <span className="text-blue-600 mr-1">•</span>
                            <span className="text-gray-700">HK Office 급여 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-blue-600 mr-1">•</span>
                            <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange)}%p)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-blue-600 mr-1">•</span>
                            <span className="text-gray-700">인원수 변화 및 신규 채용 효과</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(Math.round((plData?.cumulative?.total?.expense_detail as any)?.salary || 0))}K</div>
                <div className="text-xs mb-3 text-red-600">YOY {Math.round(((plData?.cumulative?.total?.expense_detail as any)?.salary || 0) / ((plData?.cumulative?.prev_cumulative?.total?.expense_detail as any)?.salary || 1) * 100)}% ({((plData?.cumulative?.total?.expense_detail as any)?.salary || 0) >= ((plData?.cumulative?.prev_cumulative?.total?.expense_detail as any)?.salary || 0) ? '+' : '△'}{formatNumber(Math.abs(Math.round(((plData?.cumulative?.total?.expense_detail as any)?.salary || 0) - ((plData?.cumulative?.prev_cumulative?.total?.expense_detail as any)?.salary || 0))))}K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">{(((plData?.cumulative?.total?.expense_detail as any)?.salary || 0) / (plData?.cumulative?.total?.sg_a || 1) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">{(((plData?.cumulative?.total?.expense_detail as any)?.salary || 0) / (plData?.cumulative?.total?.net_sales || 1) * 100).toFixed(1)}%</span>
                  </div>
                </div>

                {/* 누적 증감 분석 */}
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={() => setShowOperatingExpenseItemAnalysis(prev => ({ ...prev, salary: !prev.salary }))}
                    className="w-full flex items-center justify-between text-xs text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    <span>누적 증감 분석</span>
                    {showOperatingExpenseItemAnalysis.salary ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {showOperatingExpenseItemAnalysis.salary && (() => {
                    const cumulativeData = plData?.cumulative?.total;
                    const prevCumulativeData = plData?.cumulative?.prev_cumulative?.total;
                    const expenseDetail = cumulativeData?.expense_detail || {};
                    const expenseDetailPrev = prevCumulativeData?.expense_detail || {};
                    const current = (expenseDetail as any).salary || 0;
                    const prev = (expenseDetailPrev as any).salary || 0;
                    const change = current - prev;
                    const changeRate = prev !== 0 ? (change / prev) * 100 : 0;
                    const currentSales = cumulativeData?.net_sales || 0;
                    const prevSales = prevCumulativeData?.net_sales || 0;
                    const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                    const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                    const ratioChange = currentRatio - prevRatio;

                    return (
                      <div className="mt-3 pt-3 border-t bg-blue-50 rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start">
                            <span className="text-blue-600 mr-1">•</span>
                            <span className="text-gray-700">HK Office 급여 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-blue-600 mr-1">•</span>
                            <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange)}%p)</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>

          {/* 마케팅비 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">마케팅비</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-purple-100 text-purple-700">
                {opexType}
              </div>
            </div>
            
            {opexType === '당월' ? (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(Math.round((plData?.current_month?.total?.expense_detail as any)?.marketing || 0))}K</div>
                <div className="text-xs mb-3 text-red-600">YOY {Math.round(((plData?.current_month?.total?.expense_detail as any)?.marketing || 0) / ((plData?.prev_month?.total?.expense_detail as any)?.marketing || 1) * 100)}% ({((plData?.current_month?.total?.expense_detail as any)?.marketing || 0) >= ((plData?.prev_month?.total?.expense_detail as any)?.marketing || 0) ? '+' : '△'}{formatNumber(Math.abs(Math.round(((plData?.current_month?.total?.expense_detail as any)?.marketing || 0) - ((plData?.prev_month?.total?.expense_detail as any)?.marketing || 0))))}K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">{(((plData?.current_month?.total?.expense_detail as any)?.marketing || 0) / (pl?.sg_a || 1) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">{(((plData?.current_month?.total?.expense_detail as any)?.marketing || 0) / (pl?.net_sales || 1) * 100).toFixed(1)}%</span>
                  </div>
                </div>

                {/* 당월 증감 분석 */}
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={() => setShowOperatingExpenseItemAnalysis(prev => ({ ...prev, marketing: !prev.marketing }))}
                    className="w-full flex items-center justify-between text-xs text-purple-600 hover:text-purple-800 font-semibold"
                  >
                    <span>당월 증감 분석</span>
                    {showOperatingExpenseItemAnalysis.marketing ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {showOperatingExpenseItemAnalysis.marketing && (() => {
                    const currentMonthData = plData?.current_month?.total;
                    const prevMonthData = plData?.prev_month?.total;
                    const expenseDetail = currentMonthData?.expense_detail || {};
                    const expenseDetailPrev = prevMonthData?.expense_detail || {};
                    const current = (expenseDetail as any).marketing || 0;
                    const prev = (expenseDetailPrev as any).marketing || 0;
                    const change = current - prev;
                    const changeRate = prev !== 0 ? (change / prev) * 100 : 0;
                    const currentSales = currentMonthData?.net_sales || 0;
                    const prevSales = prevMonthData?.net_sales || 0;
                    const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                    const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                    const ratioChange = currentRatio - prevRatio;

                    return (
                      <div className="mt-3 pt-3 border-t rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start">
                            <span className="text-purple-600 mr-1">•</span>
                            <span className="text-gray-700">마케팅비 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-purple-600 mr-1">•</span>
                            <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange)}%p)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-purple-600 mr-1">•</span>
                            <span className="text-gray-700">소셜 마케팅 및 구글 광고비 변화</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(Math.round((plData?.cumulative?.total?.expense_detail as any)?.marketing || 0))}K</div>
                <div className="text-xs mb-3 text-green-600">YOY {Math.round(((plData?.cumulative?.total?.expense_detail as any)?.marketing || 0) / ((plData?.cumulative?.prev_cumulative?.total?.expense_detail as any)?.marketing || 1) * 100)}% ({((plData?.cumulative?.total?.expense_detail as any)?.marketing || 0) >= ((plData?.cumulative?.prev_cumulative?.total?.expense_detail as any)?.marketing || 0) ? '+' : '▼'}{formatNumber(Math.abs(Math.round(((plData?.cumulative?.total?.expense_detail as any)?.marketing || 0) - ((plData?.cumulative?.prev_cumulative?.total?.expense_detail as any)?.marketing || 0))))}K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">{(((plData?.cumulative?.total?.expense_detail as any)?.marketing || 0) / (plData?.cumulative?.total?.sg_a || 1) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">{(((plData?.cumulative?.total?.expense_detail as any)?.marketing || 0) / (plData?.cumulative?.total?.net_sales || 1) * 100).toFixed(1)}%</span>
                  </div>
                </div>

                {/* 누적 증감 분석 */}
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={() => setShowOperatingExpenseItemAnalysis(prev => ({ ...prev, marketing: !prev.marketing }))}
                    className="w-full flex items-center justify-between text-xs text-purple-600 hover:text-purple-800 font-semibold"
                  >
                    <span>누적 증감 분석</span>
                    {showOperatingExpenseItemAnalysis.marketing ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {showOperatingExpenseItemAnalysis.marketing && (() => {
                    const cumulativeData = plData?.cumulative?.total;
                    const prevCumulativeData = plData?.cumulative?.prev_cumulative?.total;
                    const expenseDetail = cumulativeData?.expense_detail || {};
                    const expenseDetailPrev = prevCumulativeData?.expense_detail || {};
                    const current = (expenseDetail as any).marketing || 0;
                    const prev = (expenseDetailPrev as any).marketing || 0;
                    const change = current - prev;
                    const changeRate = prev !== 0 ? (change / prev) * 100 : 0;
                    const currentSales = cumulativeData?.net_sales || 0;
                    const prevSales = prevCumulativeData?.net_sales || 0;
                    const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                    const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                    const ratioChange = currentRatio - prevRatio;

                    return (
                      <div className="mt-3 pt-3 border-t rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start">
                            <span className="text-purple-600 mr-1">•</span>
                            <span className="text-gray-700">마케팅비 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-purple-600 mr-1">•</span>
                            <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange)}%p)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-purple-600 mr-1">•</span>
                            <span className="text-gray-700">소셜 마케팅 및 구글 광고비 변화</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>

          {/* 지급수수료 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">지급수수료</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-orange-100 text-orange-700">
                {opexType}
              </div>
            </div>
            
            {opexType === '당월' ? (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(Math.round((plData?.current_month?.total?.expense_detail as any)?.fee || 0))}K</div>
                <div className="text-xs mb-3 text-red-600">YOY {Math.round(((plData?.current_month?.total?.expense_detail as any)?.fee || 0) / ((plData?.prev_month?.total?.expense_detail as any)?.fee || 1) * 100)}% ({((plData?.current_month?.total?.expense_detail as any)?.fee || 0) >= ((plData?.prev_month?.total?.expense_detail as any)?.fee || 0) ? '+' : '△'}{formatNumber(Math.abs(Math.round(((plData?.current_month?.total?.expense_detail as any)?.fee || 0) - ((plData?.prev_month?.total?.expense_detail as any)?.fee || 0))))}K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">{(((plData?.current_month?.total?.expense_detail as any)?.fee || 0) / (pl?.sg_a || 1) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">{(((plData?.current_month?.total?.expense_detail as any)?.fee || 0) / (pl?.net_sales || 1) * 100).toFixed(1)}%</span>
                  </div>
                </div>

                {/* 당월 증감 분석 */}
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={() => setShowOperatingExpenseItemAnalysis(prev => ({ ...prev, fee: !prev.fee }))}
                    className="w-full flex items-center justify-between text-xs text-orange-600 hover:text-orange-800 font-semibold"
                  >
                    <span>당월 증감 분석</span>
                    {showOperatingExpenseItemAnalysis.fee ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {showOperatingExpenseItemAnalysis.fee && (() => {
                    const currentMonthData = plData?.current_month?.total;
                    const prevMonthData = plData?.prev_month?.total;
                    const expenseDetail = currentMonthData?.expense_detail || {};
                    const expenseDetailPrev = prevMonthData?.expense_detail || {};
                    const current = (expenseDetail as any).fee || 0;
                    const prev = (expenseDetailPrev as any).fee || 0;
                    const change = current - prev;
                    const changeRate = prev !== 0 ? (change / prev) * 100 : 0;
                    const currentSales = currentMonthData?.net_sales || 0;
                    const prevSales = prevMonthData?.net_sales || 0;
                    const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                    const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                    const ratioChange = currentRatio - prevRatio;
                    
                    // 전체 영업비 대비 비율
                    const currentOpex = currentMonthData?.sg_a || 0;
                    const prevOpex = prevMonthData?.sg_a || 0;
                    const currentOpexRatio = currentOpex !== 0 ? (current / currentOpex) * 100 : 0;
                    const prevOpexRatio = prevOpex !== 0 ? (prev / prevOpex) * 100 : 0;
                    const opexRatioChange = currentOpexRatio - prevOpexRatio;

                    return (
                      <div className="mt-3 pt-3 border-t rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start">
                            <span className="text-orange-600 mr-1">•</span>
                            <span className="text-gray-700">지급수수료 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-orange-600 mr-1">•</span>
                            <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange)}%p)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-orange-600 mr-1">•</span>
                            <span className="text-gray-700">전체 영업비 대비: {formatPercent(currentOpexRatio)}% (전년 대비 {opexRatioChange >= 0 ? '+' : ''}{formatPercent(opexRatioChange)}%p)</span>
                          </div>
                          {Math.abs(changeRate) > 50 && (
                            <div className="flex items-start">
                              <span className="text-orange-600 mr-1">•</span>
                              <span className="text-gray-700">지급수수료가 전년 대비 {Math.abs(changeRate) > 100 ? '크게' : '상당히'} {change >= 0 ? '증가' : '감소'}하여 주의 필요</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(Math.round((plData?.cumulative?.total?.expense_detail as any)?.fee || 0))}K</div>
                <div className="text-xs mb-3 text-red-600">YOY {Math.round(((plData?.cumulative?.total?.expense_detail as any)?.fee || 0) / ((plData?.cumulative?.prev_cumulative?.total?.expense_detail as any)?.fee || 1) * 100)}% ({((plData?.cumulative?.total?.expense_detail as any)?.fee || 0) >= ((plData?.cumulative?.prev_cumulative?.total?.expense_detail as any)?.fee || 0) ? '+' : '△'}{formatNumber(Math.abs(Math.round(((plData?.cumulative?.total?.expense_detail as any)?.fee || 0) - ((plData?.cumulative?.prev_cumulative?.total?.expense_detail as any)?.fee || 0))))}K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">{(((plData?.cumulative?.total?.expense_detail as any)?.fee || 0) / (plData?.cumulative?.total?.sg_a || 1) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">{(((plData?.cumulative?.total?.expense_detail as any)?.fee || 0) / (plData?.cumulative?.total?.net_sales || 1) * 100).toFixed(1)}%</span>
                  </div>
                </div>

                <div className="mt-3 text-xs text-gray-600">판매불가재고 소각 895</div>

                {/* 누적 증감 분석 */}
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={() => setShowOperatingExpenseItemAnalysis(prev => ({ ...prev, fee: !prev.fee }))}
                    className="w-full flex items-center justify-between text-xs text-orange-600 hover:text-orange-800 font-semibold"
                  >
                    <span>누적 증감 분석</span>
                    {showOperatingExpenseItemAnalysis.fee ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {showOperatingExpenseItemAnalysis.fee && (() => {
                    const cumulativeData = plData?.cumulative?.total;
                    const prevCumulativeData = plData?.cumulative?.prev_cumulative?.total;
                    const expenseDetail = cumulativeData?.expense_detail || {};
                    const expenseDetailPrev = prevCumulativeData?.expense_detail || {};
                    const current = (expenseDetail as any).fee || 0;
                    const prev = (expenseDetailPrev as any).fee || 0;
                    const change = current - prev;
                    const changeRate = prev !== 0 ? (change / prev) * 100 : 0;
                    const currentSales = cumulativeData?.net_sales || 0;
                    const prevSales = prevCumulativeData?.net_sales || 0;
                    const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                    const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                    const ratioChange = currentRatio - prevRatio;

                    return (
                      <div className="mt-3 pt-3 border-t rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start">
                            <span className="text-orange-600 mr-1">•</span>
                            <span className="text-gray-700">지급수수료 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-orange-600 mr-1">•</span>
                            <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange)}%p)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-orange-600 mr-1">•</span>
                            <span className="text-gray-700">판매불가재고 소각 895K 포함</span>
                          </div>
                        </div>
                        
                        {/* 누적 지급수수료 증가 사유 */}
                        <div className="mt-4 pt-3 border-t border-orange-200">
                          <div className="text-xs font-semibold text-orange-700 mb-2">누적 지급수수료 증가 {change >= 0 ? '+' : ''}{formatNumber(change)}K</div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div>3월 재고소각 895, 물류담당자 외주비 88 (1-4월)</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>

          {/* 기타 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-pink-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">기타</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-pink-100 text-pink-700">
                {opexType}
              </div>
            </div>
            
            {opexType === '당월' ? (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">298K</div>
                <div className="text-xs mb-3 text-red-600">YOY 140% (+87K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">물류비</span>
                    <span className="text-xs font-semibold text-gray-800">102K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">임차료</span>
                    <span className="text-xs font-semibold text-gray-800">85K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">감가상각비</span>
                    <span className="text-xs font-semibold text-gray-800">59K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">여비교통비</span>
                    <span className="text-xs font-semibold text-gray-800">47K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">보험료</span>
                    <span className="text-xs font-semibold text-gray-800">17K</span>
                  </div>
                </div>

                {/* 당월 증감 분석 */}
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={() => setShowOperatingExpenseItemAnalysis(prev => ({ ...prev, other: !prev.other }))}
                    className="w-full flex items-center justify-between text-xs text-pink-600 hover:text-pink-800 font-semibold"
                  >
                    <span>당월 증감 분석</span>
                    {showOperatingExpenseItemAnalysis.other ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {showOperatingExpenseItemAnalysis.other && (() => {
                    const currentMonthData = plData?.current_month?.total;
                    const prevMonthData = plData?.prev_month?.total;
                    const expenseDetail = currentMonthData?.expense_detail || {};
                    const expenseDetailPrev = prevMonthData?.expense_detail || {};
                    const current = (expenseDetail as any).other || 0;
                    const prev = (expenseDetailPrev as any).other || 0;
                    const change = current - prev;
                    const changeRate = prev !== 0 ? (change / prev) * 100 : 0;
                    const currentSales = currentMonthData?.net_sales || 0;
                    const prevSales = prevMonthData?.net_sales || 0;
                    const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                    const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                    const ratioChange = currentRatio - prevRatio;

                    // other_detail 분석
                    const otherDetail = expenseDetail.other_detail || {};
                    const otherDetailPrev = expenseDetailPrev.other_detail || {};
                    const otherDetailLabels: {[key: string]: string} = {
                      'depreciation': '감가상각비',
                      'duty_free': '면세점 직접비',
                      'govt_license': '정부세금 및 라이센스',
                      'logistics': '운반비',
                      'maintenance': '유지보수비',
                      'other_fee': '기타 수수료',
                      'rent_free': '임대료 면제/할인',
                      'retirement': '퇴직연금',
                      'supplies': '소모품비',
                      'transport': '운반비(기타)',
                      'uniform': '피복비(유니폼)',
                      'utilities': '수도광열비',
                      'var_rent': '매출연동 임대료',
                      'communication': '통신비',
                      'bonus': '최종지급금'
                    };

                    return (
                      <div className="mt-3 pt-3 border-t bg-pink-50 rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start">
                            <span className="text-pink-600 mr-1">•</span>
                            <span className="text-gray-700">기타 영업비 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-pink-600 mr-1">•</span>
                            <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange)}%p)</span>
                          </div>
                          {Object.keys(otherDetail).length > 0 && (
                            <>
                              <div className="font-semibold text-pink-800 mb-1 mt-2">상세 항목:</div>
                              {Object.entries(otherDetail).map(([key, value]: [string, any]) => {
                                const prevValue = (otherDetailPrev as any)[key] || 0;
                                if (value === 0 && prevValue === 0) return null;
                                const itemChange = value - prevValue;
                                const itemChangeRate = prevValue !== 0 ? (itemChange / prevValue) * 100 : 0;
                                return (
                                  <div key={key} className="flex items-start pl-2">
                                    <span className="text-pink-600 mr-1">-</span>
                                    <span className="text-gray-700">
                                      {otherDetailLabels[key] || key}: {formatNumber(value)}K 
                                      {prevValue !== 0 && (
                                        <span className={itemChange >= 0 ? 'text-red-600' : 'text-green-600'}>
                                          {' '}({itemChange >= 0 ? '+' : ''}{formatNumber(itemChange)}K, {formatPercent(itemChangeRate)}%)
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                );
                              })}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            ) : (
              <>
                {(() => {
                  const cumulativeData = plData?.cumulative?.total;
                  const prevCumulativeData = plData?.cumulative?.prev_cumulative?.total;
                  const expenseDetail = cumulativeData?.expense_detail || {};
                  const expenseDetailPrev = prevCumulativeData?.expense_detail || {};
                  
                  // 기타 영업비 = other + rent + travel + insurance
                  const other = (expenseDetail as any).other || 0;
                  const rent = (expenseDetail as any).rent || 0;
                  const travel = (expenseDetail as any).travel || 0;
                  const insurance = (expenseDetail as any).insurance || 0;
                  const otherTotal = other + rent + travel + insurance;
                  
                  const otherPrev = (expenseDetailPrev as any).other || 0;
                  const rentPrev = (expenseDetailPrev as any).rent || 0;
                  const travelPrev = (expenseDetailPrev as any).travel || 0;
                  const insurancePrev = (expenseDetailPrev as any).insurance || 0;
                  const otherTotalPrev = otherPrev + rentPrev + travelPrev + insurancePrev;
                  
                  const otherYoy = otherTotalPrev > 0 ? (otherTotal / otherTotalPrev * 100) : 0;
                  const otherChange = otherTotal - otherTotalPrev;
                  
                  const otherDetail = expenseDetail.other_detail || {};
                  const logistics = (otherDetail as any).logistics || 0;
                  const depreciation = (otherDetail as any).depreciation || 0;
                  
                  return (
                    <>
                      <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(Math.round(otherTotal))}K</div>
                      <div className="text-xs mb-3 text-red-600">YOY {formatPercent(otherYoy)}% ({otherChange >= 0 ? '+' : '△'}{formatNumber(Math.abs(Math.round(otherChange)))})K</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">물류비</span>
                          <span className="text-xs font-semibold text-gray-800">{formatNumber(Math.round(logistics))}K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">임차료</span>
                          <span className="text-xs font-semibold text-gray-800">{formatNumber(Math.round(rent))}K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">감가상각비</span>
                          <span className="text-xs font-semibold text-gray-800">{formatNumber(Math.round(depreciation))}K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">여비교통비</span>
                          <span className="text-xs font-semibold text-gray-800">{formatNumber(Math.round(travel))}K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">보험료</span>
                          <span className="text-xs font-semibold text-gray-800">{formatNumber(Math.round(insurance))}K</span>
                  </div>
                </div>
                    </>
                  );
                })()}

                {/* 누적 증감 분석 */}
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={() => setShowOperatingExpenseItemAnalysis(prev => ({ ...prev, other: !prev.other }))}
                    className="w-full flex items-center justify-between text-xs text-pink-600 hover:text-pink-800 font-semibold"
                  >
                    <span>누적 증감 분석</span>
                    {showOperatingExpenseItemAnalysis.other ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {showOperatingExpenseItemAnalysis.other && (() => {
                    const cumulativeData = plData?.cumulative?.total;
                    const prevCumulativeData = plData?.cumulative?.prev_cumulative?.total;
                    const expenseDetail = cumulativeData?.expense_detail || {};
                    const expenseDetailPrev = prevCumulativeData?.expense_detail || {};
                    const current = (expenseDetail as any).other || 0;
                    const prev = (expenseDetailPrev as any).other || 0;
                    const change = current - prev;
                    const changeRate = prev !== 0 ? (change / prev) * 100 : 0;
                    const currentSales = cumulativeData?.net_sales || 0;
                    const prevSales = prevCumulativeData?.net_sales || 0;
                    const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                    const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                    const ratioChange = currentRatio - prevRatio;

                    // other_detail 분석
                    const otherDetail = expenseDetail.other_detail || {};
                    const otherDetailPrev = expenseDetailPrev.other_detail || {};
                    const otherDetailLabels: {[key: string]: string} = {
                      'depreciation': '감가상각비',
                      'duty_free': '면세점 직접비',
                      'govt_license': '정부세금 및 라이센스',
                      'logistics': '운반비',
                      'maintenance': '유지보수비',
                      'other_fee': '기타 수수료',
                      'rent_free': '임대료 면제/할인',
                      'retirement': '퇴직연금',
                      'supplies': '소모품비',
                      'transport': '운반비(기타)',
                      'uniform': '피복비(유니폼)',
                      'utilities': '수도광열비',
                      'var_rent': '매출연동 임대료',
                      'communication': '통신비',
                      'bonus': '최종지급금'
                    };

                    return (
                      <div className="mt-3 pt-3 border-t bg-pink-50 rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start">
                            <span className="text-pink-600 mr-1">•</span>
                            <span className="text-gray-700">기타 영업비 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-pink-600 mr-1">•</span>
                            <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange)}%p)</span>
                          </div>
                          {Object.keys(otherDetail).length > 0 && (
                            <>
                              <div className="font-semibold text-pink-800 mb-1 mt-2">상세 항목:</div>
                              {Object.entries(otherDetail).map(([key, value]: [string, any]) => {
                                const prevValue = (otherDetailPrev as any)[key] || 0;
                                if (value === 0 && prevValue === 0) return null;
                                const itemChange = value - prevValue;
                                const itemChangeRate = prevValue !== 0 ? (itemChange / prevValue) * 100 : 0;
                                return (
                                  <div key={key} className="flex items-start pl-2">
                                    <span className="text-pink-600 mr-1">-</span>
                                    <span className="text-gray-700">
                                      {otherDetailLabels[key] || key}: {formatNumber(value)}K 
                                      {prevValue !== 0 && (
                                        <span className={itemChange >= 0 ? 'text-red-600' : 'text-green-600'}>
                                          {' '}({itemChange >= 0 ? '+' : ''}{formatNumber(itemChange)}K, {formatPercent(itemChangeRate)}%)
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                );
                              })}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* YOY 추세 모달 */}
      {showYoyTrend && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-gray-900">매장별 {currentYear}년 YOY 추세</h2>
              <button
                onClick={() => setShowYoyTrend(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                닫기
              </button>
            </div>
            <div className="p-4">
              {/* 전체 추세 분석 요약 */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">📊 YOY 추세 분석</h3>
                  <button
                    onClick={() => {
                      if (isEditingYoySummary) {
                        // 저장
                        localStorage.setItem(`hk_yoy_trend_summary_${period}`, yoyTrendSummary);
                      } else {
                        // 편집 시작 - 기본 분석 텍스트 생성
                        if (!yoyTrendSummary) {
                          const monthYoyData = allHKStores.map(store => {
                            const monthlyData = (dashboardData as any)?.store_monthly_trends?.[store.shop_cd] || [];
                            const monthData = monthlyData.find((d: any) => d.month === currentMonth);
                            return { store: store.shop_nm, yoy: monthData?.yoy || 0 };
                          }).filter(d => d.yoy > 0);

                          const avgYoy = monthYoyData.length > 0
                            ? Math.round(monthYoyData.reduce((sum, d) => sum + d.yoy, 0) / monthYoyData.length)
                            : 0;

                          const above100 = monthYoyData.filter(d => d.yoy >= 100).length;
                          const below90 = monthYoyData.filter(d => d.yoy < 90).length;
                          const highestStore = monthYoyData.reduce((max, d) => d.yoy > max.yoy ? d : max, { store: '', yoy: 0 });
                          const lowestStore = monthYoyData.reduce((min, d) => d.yoy < min.yoy && d.yoy > 0 ? d : min, { store: '', yoy: 999 });

                          // 매장 리뉴얼/오픈 정보
                          const storeEvents: Record<string, string> = {
                            'HK-MONGKOK': '04-Jan-28: 신발 주력 Liner 문파 유치를 위해 신발 VMD 변경 (Liner 추력)',
                            'HK-TIMESQUARE': '30-Nov-28: 과장 직원 교육을 위해 operation 매니저 매장 출근 및 CRM 지속 교육',
                            'HK-HARBOUR CITY': '31-Aug-27: Renewal 완료 11월 6일',
                            'HK-V CITY': '',
                            'HK-I Square': '21-Aug-28: 드래픽 증가 추이-> 재고 유지 목표',
                            'HK-APM': '26-Mar-27: VMD 변경이후 지속 매출 증가 추이',
                            'HK-New Town Plaza': '30-Mar-26: SIC 해고 -> 신규 인원으로 변경 (Sheung Shui 매니저로 변경)',
                            'HK-HYSAN PLACE': '14-Dec-28: 신규 주력 제품인 Meow 출시 이후 지속적인 Traffic 증가추세',
                            'Tuen Mun Town Plaza': '28-Feb-26: V-city 폐점이후 지속적인 방사이익, 우수 직원 2인 수상',
                            'HK-Langham Place': '28-Feb-29: 드래픽 증가 추이-> 재고 유지 목표',
                            'HK-Harbour city kids': '',
                            'HK-New Town Plaza Kids': '30-Jul-26: 할인 제품 포함 판매 전환 -> 매출 증가 추이',
                            'HK-YOHO MALL': '08-Oct-26: 직원 전원 변경 이후 매출 추이 증가계',
                            'MO-VENETIAN(2436)': '31-Aug-28: 추력 상품인 DJ 증가 및 부족 재고 24FW로 매출 하락 방어',
                            'MO-COTAI(2239)': '30-Jun-27: 추력 상품인 DJ 증가 및 부족 재고 24FW로 매출 하락 방어',
                            'MO-SENADO SQUARE': '20-Nov-26: 추력 상품인 DJ 증가 및 부족 재고 24FW로 매출 하락 방어',
                            'HK-Sheung Shui': '27-Jun-26',
                            'HK-MEGA MALL': '10-Apr-26: 할인 매너 업데이트 (작동 할인 중, 추 경상제품 흩 구성)',
                            'HK-CITYGATE OUTLET': '26-Apr-27: 할인 매너 업데이트',
                            'HK-YUEN LONG PLAZA': '26-Sep-27: 기조추 재구성 및 VMD 전체 변경 / 할인 매너 업데이트',
                            'HK-MOKO': '30-Jun-26: 할인 매너 업데이트',
                            'HK-Senado Outlet': '31-Jul-26: 할인 매너 업데이트'
                          };

                          const defaultText = `${currentMonth}월 전체 평균 YOY ${avgYoy}%로, 목표 달성 매장(100% 이상) ${above100}개, 개선 필요 매장(90% 미만) ${below90}개입니다. 최고 성과 매장은 ${highestStore.store} (${highestStore.yoy}%), 개선이 시급한 매장은 ${lowestStore.store} (${lowestStore.yoy}%)입니다. ${avgYoy >= 100 ? '전반적으로 양호한 실적을 보이고 있습니다.' : '평균 YOY가 100% 미만으로, 전반적인 매출 개선 전략이 필요합니다.'}\n\n주요 매장 활동:\n• HARBOUR CITY: Renewal 완료 (8월)\n• TIMESQUARE: Operation 매니저 교육 진행 중\n• HYSAN PLACE: 신규 제품 Meow 출시로 Traffic 증가\n• YOHO MALL: 직원 전원 교체 후 매출 증가세\n• 마카오 매장들: DJ 상품 집중 및 24FW 재고로 매출 방어 중\n• Outlet 매장들: 할인 매너 업데이트 완료`;
                          setYoyTrendSummary(defaultText);
                        }
                      }
                      setIsEditingYoySummary(!isEditingYoySummary);
                    }}
                    className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    {isEditingYoySummary ? '저장' : '수정'}
                  </button>
                </div>
                <div className="text-xs text-gray-800 leading-relaxed">
                  {isEditingYoySummary ? (
                    <textarea
                      value={yoyTrendSummary}
                      onChange={(e) => setYoyTrendSummary(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded text-xs"
                      rows={3}
                      placeholder="YOY 추세에 대한 분석을 입력하세요..."
                    />
                  ) : (
                    <div className="whitespace-pre-wrap">
                      {yoyTrendSummary || (() => {
                        // 기본 분석 표시
                        const monthYoyData = allHKStores.map(store => {
                          const monthlyData = (dashboardData as any)?.store_monthly_trends?.[store.shop_cd] || [];
                          const monthData = monthlyData.find((d: any) => d.month === currentMonth);
                          return { store: store.shop_nm, yoy: monthData?.yoy || 0 };
                        }).filter(d => d.yoy > 0);

                        const avgYoy = monthYoyData.length > 0 
                          ? Math.round(monthYoyData.reduce((sum, d) => sum + d.yoy, 0) / monthYoyData.length)
                          : 0;
                        
                        const above100 = monthYoyData.filter(d => d.yoy >= 100).length;
                        const below90 = monthYoyData.filter(d => d.yoy < 90).length;
                        const highestStore = monthYoyData.reduce((max, d) => d.yoy > max.yoy ? d : max, { store: '', yoy: 0 });
                        const lowestStore = monthYoyData.reduce((min, d) => d.yoy < min.yoy && d.yoy > 0 ? d : min, { store: '', yoy: 999 });

                        return `${currentMonth}월 전체 평균 YOY ${avgYoy}%로, 목표 달성 매장(100% 이상) ${above100}개, 개선 필요 매장(90% 미만) ${below90}개입니다. 최고 성과 매장은 ${highestStore.store} (${highestStore.yoy}%), 개선이 시급한 매장은 ${lowestStore.store} (${lowestStore.yoy}%)입니다. ${avgYoy >= 100 ? '전반적으로 양호한 실적을 보이고 있습니다.' : '평균 YOY가 100% 미만으로, 전반적인 매출 개선 전략이 필요합니다.'}`;
                      })()}
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-2 font-semibold">매장명</th>
                      {Array.from({length: currentMonth}, (_, i) => i + 1).map((m) => (
                        <th key={m} className={`text-center p-2 font-semibold ${m === currentMonth ? 'bg-blue-100 border-t border-l border-r border-red-500' : ''}`}>{m}월</th>
                      ))}
                      <th className="text-center p-2 font-semibold">추세</th>
                      <th className="text-center p-2 font-semibold">AI 분석</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allHKStores
                      .map(store => {
                        const monthlyData = (dashboardData as any)?.store_monthly_trends?.[store.shop_cd] || [];
                        const currentMonthData = monthlyData.find((d: any) => d.month === currentMonth);
                        return { ...store, currentYoy: currentMonthData?.yoy || 0, monthlyData };
                      })
                      .sort((a, b) => b.currentYoy - a.currentYoy)
                      .map((store, index) => {
                      const isLastRow = index === allHKStores.length - 1;
                      
                      return (
                        <tr key={store.shop_cd} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-2 font-medium">{store.shop_nm}</td>
                          {Array.from({length: currentMonth}, (_, i) => i + 1).map((month) => {
                            const monthData = store.monthlyData.find((d: any) => d.month === month);
                            const yoy = monthData?.yoy || 0;
                            let colorClass = 'text-gray-400';
                            if (yoy >= 100) colorClass = 'text-green-600 font-semibold';
                            else if (yoy >= 90) colorClass = 'text-gray-600';
                            else if (yoy > 0) colorClass = 'text-red-600';
                            
                            const borderClass = month === currentMonth 
                              ? `bg-blue-100 border-l border-r border-red-500 ${isLastRow ? 'border-b border-red-500' : ''}`
                              : '';
                            
                            return (
                              <td key={month} className={`text-center p-2 ${colorClass} ${borderClass}`}>
                                {yoy > 0 ? `${yoy}%` : '-'}
                              </td>
                            );
                          })}
                          <td className="text-center p-2">
                            {(() => {
                              if (currentMonth < 4) return '-';
                              const prevMonths = Array.from({length: 3}, (_, i) => currentMonth - 3 + i).filter(m => m > 0);
                              const prevData = store.monthlyData.filter((d: any) => prevMonths.includes(d.month));
                              const currentData = store.monthlyData.find((d: any) => d.month === currentMonth);
                              if (prevData.length === 0 || !currentData) return '-';
                              
                              const prevAvg = prevData.reduce((sum: number, d: any) => sum + d.yoy, 0) / prevData.length;
                              const trend = currentData.yoy > prevAvg;
                              
                              return trend ? (
                                <TrendingUp className="w-4 h-4 text-green-600 inline" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-600 inline" />
                              );
                            })()}
                          </td>
                          <td 
                            className="text-center p-2 text-[10px] text-gray-700 cursor-pointer hover:bg-gray-100 relative"
                            onClick={() => {
                              const defaultAnalysis = (() => {
                                const yoyArr = Array.from({length: currentMonth}, (_, i) => i + 1).map(m => {
                                  const d = store.monthlyData.find((d: any) => d.month === m);
                                  return d?.yoy ?? 0;
                                });
                                const validArr = yoyArr.filter(y => y > 0);
                                if(validArr.length === 0) return '-';
                                const min = Math.min(...validArr);
                                const max = Math.max(...validArr);
                                const first = validArr[0], last = validArr[validArr.length-1];
                                let msg = [];
                                if (last - first > 15) msg.push('연중 꾸준한 성장');
                                if (first - last > 15) msg.push('상반기 대비 하락');
                                if (max - min > 50) msg.push(`변동폭 큼(${min}~${max}%)`);
                                if (validArr.every(y=>y>=100)) msg.push('100%↑ 지속 유지');
                                if (!msg.length) {
                                  msg.push('안정적');
                                }
                                return msg.join(', ');
                              })();
                              setEditingStoreCode(store.shop_cd);
                              setEditingText(aiAnalysis[store.shop_cd] || defaultAnalysis);
                            }}
                            title="클릭하여 편집"
                          >
                            {editingStoreCode === store.shop_cd ? (
                              <input
                                type="text"
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                onBlur={() => {
                                  const newAnalysis = { ...aiAnalysis };
                                  if (editingText.trim()) {
                                    newAnalysis[store.shop_cd] = editingText.trim();
                                  } else {
                                    delete newAnalysis[store.shop_cd];
                                  }
                                  setAiAnalysis(newAnalysis);
                                  localStorage.setItem(`hk_store_ai_analysis_${period}`, JSON.stringify(newAnalysis));
                                  setEditingStoreCode(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                  } else if (e.key === 'Escape') {
                                    setEditingStoreCode(null);
                                  }
                                }}
                                className="w-full px-2 py-1 text-[10px] border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <span className="block">
                                {aiAnalysis[store.shop_cd] || (() => {
                                  const yoyArr = Array.from({length: currentMonth}, (_, i) => i + 1).map(m => {
                                    const d = store.monthlyData.find((d: any) => d.month === m);
                                    return d?.yoy ?? 0;
                                  });
                                  const validArr = yoyArr.filter(y => y > 0);
                                  if(validArr.length === 0) return '-';
                                  const min = Math.min(...validArr);
                                  const max = Math.max(...validArr);
                                  const first = validArr[0], last = validArr[validArr.length-1];
                                  let msg = [];
                                  if (last - first > 15) msg.push('연중 꾸준한 성장');
                                  if (first - last > 15) msg.push('상반기 대비 하락');
                                  if (max - min > 50) msg.push(`변동폭 큼(${min}~${max}%)`);
                                  if (validArr.every(y=>y>=100)) msg.push('100%↑ 지속 유지');
                                  if (!msg.length) {
                                    msg.push('안정적');
                                  }
                                  return msg.join(', ');
                                })()}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 재고주수 추세 모달 */}
      {showStockWeeksModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowStockWeeksModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                📊 2025년 월별 재고주수 추세 (모자·신발·가방외)
              </h2>
              <button
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                onClick={() => setShowStockWeeksModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-100 to-gray-200">
                      <th className="border border-gray-300 px-4 py-3 text-left font-bold text-gray-800">카테고리</th>
                      {(dashboardData?.monthly_inventory_data || []).map((item: any) => (
                        <th key={item.period} className="border border-gray-300 px-3 py-3 text-center font-bold text-gray-800">
                          {item.period.slice(2, 4)}월
                        </th>
                      ))}
                      <th className="border border-gray-300 px-4 py-3 text-center font-bold text-gray-800">평균</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* 신발 행 (1순위) */}
                    <tr className="bg-yellow-50 hover:bg-yellow-100 transition-colors">
                      <td className="border border-gray-300 px-4 py-3 font-bold text-yellow-900 text-base">
                        👟 신발
                      </td>
                      {(dashboardData?.monthly_inventory_data || []).map((item: any, idx: number) => {
                        const weeks = item.신발?.stock_weeks || 0;
                        // 전년 동월 Period 찾기
                        const periodYear = parseInt(item.period.slice(0, 2));
                        const periodMonth = parseInt(item.period.slice(2, 4));
                        const prevYear = (periodYear - 1) % 100;
                        const prevPeriod = `${prevYear.toString().padStart(2, '0')}${periodMonth.toString().padStart(2, '0')}`;
                        const prevData = ((dashboardData as any)?.prev_monthly_inventory_data || []).find((p: any) => p.period === prevPeriod);
                        const prevWeeks = prevData?.신발?.stock_weeks || 0;
                        const change = weeks - prevWeeks;
                        const changeText = prevWeeks > 0 && change !== 0 ? (change > 0 ? `+${change.toFixed(1)}` : `${change.toFixed(1)}`) : '';
                        
                        return (
                          <td key={`shoe-${item.period}`} className="border border-gray-300 px-3 py-3 text-center text-yellow-800 font-semibold text-base">
                            <div>{weeks > 0 ? `${formatStockWeeks(weeks)}주` : '-'}</div>
                            {changeText && (
                              <div className={`text-[10px] mt-0.5 ${change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {change > 0 ? '+' : '△'}{Math.abs(change).toFixed(1)}주
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="border border-gray-300 px-4 py-3 text-center font-bold text-yellow-900 text-base bg-yellow-100">
                        {(() => {
                          const data = dashboardData?.monthly_inventory_data || [];
                          const prevData = (dashboardData as any)?.prev_monthly_inventory_data || [];
                          
                          // 현재 연도 가중평균: 재고금액으로 가중
                          const weightedSum = data.reduce((sum: number, item: any) => {
                            const weeks = item.신발?.stock_weeks || 0;
                            const weight = item.신발?.stock_price || 0;
                            return sum + (weeks * weight);
                          }, 0);
                          const totalWeight = data.reduce((sum: number, item: any) => {
                            return sum + (item.신발?.stock_price || 0);
                          }, 0);
                          if (totalWeight === 0) return '-';
                          const weightedAvg = weightedSum / totalWeight;
                          
                          // 전년 연도 가중평균: 재고금액으로 가중
                          const prevWeightedSum = prevData.reduce((sum: number, item: any) => {
                            const weeks = item.신발?.stock_weeks || 0;
                            const weight = item.신발?.stock_price || 0;
                            return sum + (weeks * weight);
                          }, 0);
                          const prevTotalWeight = prevData.reduce((sum: number, item: any) => {
                            return sum + (item.신발?.stock_price || 0);
                          }, 0);
                          const prevWeightedAvg = prevTotalWeight > 0 ? prevWeightedSum / prevTotalWeight : 0;
                          const change = weightedAvg - prevWeightedAvg;
                          const changeText = prevWeightedAvg > 0 && change !== 0 ? (change > 0 ? `+${change.toFixed(1)}` : `${change.toFixed(1)}`) : '';
                          
                          return (
                            <div>
                              <div>{formatStockWeeks(weightedAvg)}주</div>
                              {prevWeightedAvg > 0 && (
                                <div className="text-xs text-gray-600 mt-0.5">
                                  전년 {formatStockWeeks(prevWeightedAvg)}주
                                </div>
                              )}
                              {changeText && (
                                <div className={`text-[10px] mt-0.5 ${change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {change > 0 ? '+' : '△'}{Math.abs(change).toFixed(1)}주
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                    {/* 모자 행 (2순위) */}
                    <tr className="bg-blue-50 hover:bg-blue-100 transition-colors">
                      <td className="border border-gray-300 px-4 py-3 font-bold text-blue-900 text-base">
                        🧢 모자
                      </td>
                      {(dashboardData?.monthly_inventory_data || []).map((item: any, idx: number) => {
                        const weeks = item.모자?.stock_weeks || 0;
                        // 전년 동월 Period 찾기
                        const periodYear = parseInt(item.period.slice(0, 2));
                        const periodMonth = parseInt(item.period.slice(2, 4));
                        const prevYear = (periodYear - 1) % 100;
                        const prevPeriod = `${prevYear.toString().padStart(2, '0')}${periodMonth.toString().padStart(2, '0')}`;
                        const prevData = ((dashboardData as any)?.prev_monthly_inventory_data || []).find((p: any) => p.period === prevPeriod);
                        const prevWeeks = prevData?.모자?.stock_weeks || 0;
                        const change = weeks - prevWeeks;
                        const changeText = prevWeeks > 0 && change !== 0 ? (change > 0 ? `+${change.toFixed(1)}` : `${change.toFixed(1)}`) : '';
                        const isIncrease = change > 0;
                        const isDecrease = change < 0;
                        
                        return (
                          <td key={`hat-${item.period}`} className="border border-gray-300 px-3 py-3 text-center text-blue-800 font-semibold text-base">
                            <div>{weeks > 0 ? `${formatStockWeeks(weeks)}주` : '-'}</div>
                            {changeText && (
                              <div className={`text-[10px] mt-0.5 ${isIncrease ? 'text-red-600' : isDecrease ? 'text-green-600' : 'text-gray-600'}`}>
                                {isIncrease ? '+' : isDecrease ? '△' : ''}{Math.abs(change).toFixed(1)}주
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="border border-gray-300 px-4 py-3 text-center font-bold text-blue-900 text-base bg-blue-100">
                        {(() => {
                          const data = dashboardData?.monthly_inventory_data || [];
                          const prevData = (dashboardData as any)?.prev_monthly_inventory_data || [];
                          
                          // 현재 연도 가중평균: 재고금액으로 가중
                          const weightedSum = data.reduce((sum: number, item: any) => {
                            const weeks = item.모자?.stock_weeks || 0;
                            const weight = item.모자?.stock_price || 0;
                            return sum + (weeks * weight);
                          }, 0);
                          const totalWeight = data.reduce((sum: number, item: any) => {
                            return sum + (item.모자?.stock_price || 0);
                          }, 0);
                          if (totalWeight === 0) return '-';
                          const weightedAvg = weightedSum / totalWeight;
                          
                          // 전년 연도 가중평균: 재고금액으로 가중
                          const prevWeightedSum = prevData.reduce((sum: number, item: any) => {
                            const weeks = item.모자?.stock_weeks || 0;
                            const weight = item.모자?.stock_price || 0;
                            return sum + (weeks * weight);
                          }, 0);
                          const prevTotalWeight = prevData.reduce((sum: number, item: any) => {
                            return sum + (item.모자?.stock_price || 0);
                          }, 0);
                          const prevWeightedAvg = prevTotalWeight > 0 ? prevWeightedSum / prevTotalWeight : 0;
                          const change = weightedAvg - prevWeightedAvg;
                          const changeText = prevWeightedAvg > 0 && change !== 0 ? (change > 0 ? `+${change.toFixed(1)}` : `${change.toFixed(1)}`) : '';
                          
                          return (
                            <div>
                              <div>{formatStockWeeks(weightedAvg)}주</div>
                              {prevWeightedAvg > 0 && (
                                <div className="text-xs text-gray-600 mt-0.5">
                                  전년 {formatStockWeeks(prevWeightedAvg)}주
                                </div>
                              )}
                              {changeText && (
                                <div className={`text-[10px] mt-0.5 ${change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {change > 0 ? '+' : '△'}{Math.abs(change).toFixed(1)}주
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                    <tr className="bg-purple-50 hover:bg-purple-100 transition-colors">
                      <td className="border border-gray-300 px-4 py-3 font-bold text-purple-900 text-base">
                        👜 가방
                      </td>
                      {(dashboardData?.monthly_inventory_data || []).map((item: any, idx: number) => {
                        const weeks = item.가방?.stock_weeks || 0;
                        // 전년 동월 Period 찾기
                        const periodYear = parseInt(item.period.slice(0, 2));
                        const periodMonth = parseInt(item.period.slice(2, 4));
                        const prevYear = (periodYear - 1) % 100;
                        const prevPeriod = `${prevYear.toString().padStart(2, '0')}${periodMonth.toString().padStart(2, '0')}`;
                        const prevData = ((dashboardData as any)?.prev_monthly_inventory_data || []).find((p: any) => p.period === prevPeriod);
                        const prevWeeks = prevData?.가방?.stock_weeks || 0;
                        const change = weeks - prevWeeks;
                        const changeText = prevWeeks > 0 && change !== 0 ? (change > 0 ? `+${change.toFixed(1)}` : `${change.toFixed(1)}`) : '';
                        
                        return (
                          <td key={`bag-${item.period}`} className="border border-gray-300 px-3 py-3 text-center text-purple-800 font-semibold text-base">
                            <div>{weeks > 0 ? `${formatStockWeeks(weeks)}주` : '-'}</div>
                            {changeText && (
                              <div className={`text-[10px] mt-0.5 ${change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {change > 0 ? '+' : '△'}{Math.abs(change).toFixed(1)}주
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="border border-gray-300 px-4 py-3 text-center font-bold text-purple-900 text-base bg-purple-100">
                        {(() => {
                          const data = dashboardData?.monthly_inventory_data || [];
                          const prevData = (dashboardData as any)?.prev_monthly_inventory_data || [];
                          
                          // 현재 연도 가중평균: 재고금액으로 가중
                          const weightedSum = data.reduce((sum: number, item: any) => {
                            const weeks = item.가방?.stock_weeks || 0;
                            const weight = item.가방?.stock_price || 0;
                            return sum + (weeks * weight);
                          }, 0);
                          const totalWeight = data.reduce((sum: number, item: any) => {
                            return sum + (item.가방?.stock_price || 0);
                          }, 0);
                          if (totalWeight === 0) return '-';
                          const weightedAvg = weightedSum / totalWeight;
                          
                          // 전년 연도 가중평균: 재고금액으로 가중
                          const prevWeightedSum = prevData.reduce((sum: number, item: any) => {
                            const weeks = item.가방?.stock_weeks || 0;
                            const weight = item.가방?.stock_price || 0;
                            return sum + (weeks * weight);
                          }, 0);
                          const prevTotalWeight = prevData.reduce((sum: number, item: any) => {
                            return sum + (item.가방?.stock_price || 0);
                          }, 0);
                          const prevWeightedAvg = prevTotalWeight > 0 ? prevWeightedSum / prevTotalWeight : 0;
                          const change = weightedAvg - prevWeightedAvg;
                          const changeText = prevWeightedAvg > 0 && change !== 0 ? (change > 0 ? `+${change.toFixed(1)}` : `${change.toFixed(1)}`) : '';
                          
                          return (
                            <div>
                              <div>{formatStockWeeks(weightedAvg)}주</div>
                              {prevWeightedAvg > 0 && (
                                <div className="text-xs text-gray-600 mt-0.5">
                                  전년 {formatStockWeeks(prevWeightedAvg)}주
                                </div>
                              )}
                              {changeText && (
                                <div className={`text-[10px] mt-0.5 ${change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {change > 0 ? '+' : '△'}{Math.abs(change).toFixed(1)}주
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                    <tr className="bg-pink-50 hover:bg-pink-100 transition-colors">
                      <td className="border border-gray-300 px-4 py-3 font-bold text-pink-900 text-base">
                        ✨ 기타ACC
                      </td>
                      {(dashboardData?.monthly_inventory_data || []).map((item: any, idx: number) => {
                        const weeks = item.기타ACC?.stock_weeks || 0;
                        // 전년 동월 Period 찾기
                        const periodYear = parseInt(item.period.slice(0, 2));
                        const periodMonth = parseInt(item.period.slice(2, 4));
                        const prevYear = (periodYear - 1) % 100;
                        const prevPeriod = `${prevYear.toString().padStart(2, '0')}${periodMonth.toString().padStart(2, '0')}`;
                        
                        // prev_monthly_inventory_data에서 전년 동월 찾기
                        const prevItem = (dashboardData?.prev_monthly_inventory_data || []).find((p: any) => p.period === prevPeriod);
                        const prevWeeks = prevItem?.기타ACC?.stock_weeks || 0;
                        
                        const change = weeks - prevWeeks;
                        const changeText = prevWeeks > 0 && change !== 0 ? (change > 0 ? `+${change.toFixed(1)}` : `${change.toFixed(1)}`) : '';
                        
                        return (
                          <td key={item.period} className="border border-gray-300 px-3 py-3 text-center">
                            <div>
                              <div className={`font-semibold ${weeks > 35 ? 'text-red-600' : weeks > 25 ? 'text-orange-500' : 'text-gray-900'}`}>
                                {formatStockWeeks(weeks)}주
                              </div>
                              {prevWeeks > 0 && (
                                <div className="text-xs text-gray-600 mt-0.5">
                                  전년 {formatStockWeeks(prevWeeks)}주
                                </div>
                              )}
                              {changeText && (
                                <div className={`text-[10px] mt-0.5 ${change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {change > 0 ? '+' : '△'}{Math.abs(change).toFixed(1)}주
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      <td className="border border-gray-300 px-4 py-3 text-center font-semibold bg-pink-100">
                        {(() => {
                          const data = dashboardData?.monthly_inventory_data || [];
                          const prevData = dashboardData?.prev_monthly_inventory_data || [];
                          
                          // 현재 연도 가중평균: 재고금액으로 가중
                          const weightedSum = data.reduce((sum: number, item: any) => {
                            const weeks = item.기타ACC?.stock_weeks || 0;
                            const weight = item.기타ACC?.stock_price || 0;
                            return sum + (weeks * weight);
                          }, 0);
                          const totalWeight = data.reduce((sum: number, item: any) => {
                            return sum + (item.기타ACC?.stock_price || 0);
                          }, 0);
                          if (totalWeight === 0) return '-';
                          const weightedAvg = weightedSum / totalWeight;
                          
                          // 전년 연도 가중평균: 재고금액으로 가중
                          const prevWeightedSum = prevData.reduce((sum: number, item: any) => {
                            const weeks = item.기타ACC?.stock_weeks || 0;
                            const weight = item.기타ACC?.stock_price || 0;
                            return sum + (weeks * weight);
                          }, 0);
                          const prevTotalWeight = prevData.reduce((sum: number, item: any) => {
                            return sum + (item.기타ACC?.stock_price || 0);
                          }, 0);
                          const prevWeightedAvg = prevTotalWeight > 0 ? prevWeightedSum / prevTotalWeight : 0;
                          const change = weightedAvg - prevWeightedAvg;
                          const changeText = prevWeightedAvg > 0 && change !== 0 ? (change > 0 ? `+${change.toFixed(1)}` : `${change.toFixed(1)}`) : '';
                          
                          return (
                            <div>
                              <div>{formatStockWeeks(weightedAvg)}주</div>
                              {prevWeightedAvg > 0 && (
                                <div className="text-xs text-gray-600 mt-0.5">
                                  전년 {formatStockWeeks(prevWeightedAvg)}주
                                </div>
                              )}
                              {changeText && (
                                <div className={`text-[10px] mt-0.5 ${change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {change > 0 ? '+' : '△'}{Math.abs(change).toFixed(1)}주
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                    {/* ACC 합계 행 */}
                    <tr className="bg-gradient-to-r from-pink-100 to-purple-100 hover:from-pink-150 hover:to-purple-150 transition-colors border-t-2 border-pink-300">
                      <td className="border border-gray-300 px-4 py-3 font-bold text-pink-900 text-base">
                        📦 ACC 합계
                      </td>
                      {(dashboardData?.monthly_inventory_data || []).map((item: any, idx: number) => {
                        // ACC 합계 = 모자 + 신발 + 가방 + 기타ACC
                        const 모자Weeks = item.모자?.stock_weeks || 0;
                        const 신발Weeks = item.신발?.stock_weeks || 0;
                        const 가방Weeks = item.가방?.stock_weeks || 0;
                        const 기타ACCWeeks = item.기타ACC?.stock_weeks || 0;
                        
                        const 모자Price = item.모자?.stock_price || 0;
                        const 신발Price = item.신발?.stock_price || 0;
                        const 가방Price = item.가방?.stock_price || 0;
                        const 기타ACCPrice = item.기타ACC?.stock_price || 0;
                        
                        const totalPrice = 모자Price + 신발Price + 가방Price + 기타ACCPrice;
                        const accWeeks = totalPrice > 0 
                          ? (모자Weeks * 모자Price + 신발Weeks * 신발Price + 가방Weeks * 가방Price + 기타ACCWeeks * 기타ACCPrice) / totalPrice
                          : 0;
                        
                        // 전년 동월 데이터
                        const periodYear = parseInt(item.period.slice(0, 2));
                        const periodMonth = parseInt(item.period.slice(2, 4));
                        const prevYear = (periodYear - 1) % 100;
                        const prevPeriod = `${prevYear.toString().padStart(2, '0')}${periodMonth.toString().padStart(2, '0')}`;
                        const prevItem = (dashboardData?.prev_monthly_inventory_data || []).find((p: any) => p.period === prevPeriod);
                        
                        const prev모자Weeks = prevItem?.모자?.stock_weeks || 0;
                        const prev신발Weeks = prevItem?.신발?.stock_weeks || 0;
                        const prev가방Weeks = prevItem?.가방?.stock_weeks || 0;
                        const prev기타ACCWeeks = prevItem?.기타ACC?.stock_weeks || 0;
                        
                        const prev모자Price = prevItem?.모자?.stock_price || 0;
                        const prev신발Price = prevItem?.신발?.stock_price || 0;
                        const prev가방Price = prevItem?.가방?.stock_price || 0;
                        const prev기타ACCPrice = prevItem?.기타ACC?.stock_price || 0;
                        
                        const prevTotalPrice = prev모자Price + prev신발Price + prev가방Price + prev기타ACCPrice;
                        const prevAccWeeks = prevTotalPrice > 0
                          ? (prev모자Weeks * prev모자Price + prev신발Weeks * prev신발Price + prev가방Weeks * prev가방Price + prev기타ACCWeeks * prev기타ACCPrice) / prevTotalPrice
                          : 0;
                        
                        const change = accWeeks - prevAccWeeks;
                        const changeText = prevAccWeeks > 0 && change !== 0 ? (change > 0 ? `+${change.toFixed(1)}` : `${change.toFixed(1)}`) : '';
                        
                        return (
                          <td key={`acc-total-${item.period}`} className="border border-gray-300 px-3 py-3 text-center text-pink-900 font-bold text-base">
                            <div>{accWeeks > 0 ? `${formatStockWeeks(accWeeks)}주` : '-'}</div>
                            {changeText && (
                              <div className={`text-[10px] mt-0.5 ${change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {change > 0 ? '+' : '△'}{Math.abs(change).toFixed(1)}주
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="border border-gray-300 px-4 py-3 text-center font-bold text-pink-900 text-base bg-gradient-to-r from-pink-200 to-purple-200">
                        {(() => {
                          const data = dashboardData?.monthly_inventory_data || [];
                          const prevData = dashboardData?.prev_monthly_inventory_data || [];
                          
                          // 현재 연도 가중평균
                          const weightedSum = data.reduce((sum: number, item: any) => {
                            const 모자Weeks = item.모자?.stock_weeks || 0;
                            const 신발Weeks = item.신발?.stock_weeks || 0;
                            const 가방Weeks = item.가방?.stock_weeks || 0;
                            const 기타ACCWeeks = item.기타ACC?.stock_weeks || 0;
                            
                            const 모자Price = item.모자?.stock_price || 0;
                            const 신발Price = item.신발?.stock_price || 0;
                            const 가방Price = item.가방?.stock_price || 0;
                            const 기타ACCPrice = item.기타ACC?.stock_price || 0;
                            
                            const totalPrice = 모자Price + 신발Price + 가방Price + 기타ACCPrice;
                            const accWeeks = totalPrice > 0 
                              ? (모자Weeks * 모자Price + 신발Weeks * 신발Price + 가방Weeks * 가방Price + 기타ACCWeeks * 기타ACCPrice) / totalPrice
                              : 0;
                            
                            return sum + (accWeeks * totalPrice);
                          }, 0);
                          
                          const totalWeight = data.reduce((sum: number, item: any) => {
                            const totalPrice = (item.모자?.stock_price || 0) + (item.신발?.stock_price || 0) + (item.가방?.stock_price || 0) + (item.기타ACC?.stock_price || 0);
                            return sum + totalPrice;
                          }, 0);
                          
                          if (totalWeight === 0) return '-';
                          const weightedAvg = weightedSum / totalWeight;
                          
                          // 전년 연도 가중평균
                          const prevWeightedSum = prevData.reduce((sum: number, item: any) => {
                            const 모자Weeks = item.모자?.stock_weeks || 0;
                            const 신발Weeks = item.신발?.stock_weeks || 0;
                            const 가방Weeks = item.가방?.stock_weeks || 0;
                            const 기타ACCWeeks = item.기타ACC?.stock_weeks || 0;
                            
                            const 모자Price = item.모자?.stock_price || 0;
                            const 신발Price = item.신발?.stock_price || 0;
                            const 가방Price = item.가방?.stock_price || 0;
                            const 기타ACCPrice = item.기타ACC?.stock_price || 0;
                            
                            const totalPrice = 모자Price + 신발Price + 가방Price + 기타ACCPrice;
                            const accWeeks = totalPrice > 0 
                              ? (모자Weeks * 모자Price + 신발Weeks * 신발Price + 가방Weeks * 가방Price + 기타ACCWeeks * 기타ACCPrice) / totalPrice
                              : 0;
                            
                            return sum + (accWeeks * totalPrice);
                          }, 0);
                          
                          const prevTotalWeight = prevData.reduce((sum: number, item: any) => {
                            const totalPrice = (item.모자?.stock_price || 0) + (item.신발?.stock_price || 0) + (item.가방?.stock_price || 0) + (item.기타ACC?.stock_price || 0);
                            return sum + totalPrice;
                          }, 0);
                          
                          const prevWeightedAvg = prevTotalWeight > 0 ? prevWeightedSum / prevTotalWeight : 0;
                          const change = weightedAvg - prevWeightedAvg;
                          const changeText = prevWeightedAvg > 0 && change !== 0 ? (change > 0 ? `+${change.toFixed(1)}` : `${change.toFixed(1)}`) : '';
                          
                          return (
                            <div>
                              <div>{formatStockWeeks(weightedAvg)}주</div>
                              {prevWeightedAvg > 0 && (
                                <div className="text-xs text-gray-600 mt-0.5">
                                  전년 {formatStockWeeks(prevWeightedAvg)}주
                                </div>
                              )}
                              {changeText && (
                                <div className={`text-[10px] mt-0.5 ${change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {change > 0 ? '+' : '△'}{Math.abs(change).toFixed(1)}주
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              {/* 재고주수 추세 분석 */}
              <div className="mt-6 space-y-4">
                {/* 월별 추세 분석 */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <h3 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
                    📊 2025년 재고주수 추세 분석
                  </h3>
                  <div className="space-y-3 text-sm">
                    {/* 모자 분석 */}
                    <div className="p-3 bg-white rounded-md border border-blue-100">
                      <div className="font-bold text-blue-900 mb-1">🧢 모자</div>
                      <div className="text-gray-700 text-xs leading-relaxed">
                        {(() => {
                          const data = dashboardData?.monthly_inventory_data || [];
                          if (data.length === 0) return '데이터 없음';
                          
                          // 가중평균 계산 (재고금액으로 가중)
                          const weightedSum = data.reduce((sum: number, item: any) => {
                            const weeks = item.모자?.stock_weeks || 0;
                            const weight = item.모자?.stock_price || 0;
                            return sum + (weeks * weight);
                          }, 0);
                          const totalWeight = data.reduce((sum: number, item: any) => {
                            return sum + (item.모자?.stock_price || 0);
                          }, 0);
                          const avg = totalWeight > 0 ? (weightedSum / totalWeight).toFixed(1) : '0.0';
                          
                          // 최저/최고
                          const weeksData = data.map((item: any) => item.모자?.stock_weeks || 0).filter((v: number) => v > 0);
                          const min = weeksData.length > 0 ? Math.min(...weeksData).toFixed(1) : '0.0';
                          const max = weeksData.length > 0 ? Math.max(...weeksData).toFixed(1) : '0.0';
                          
                          // 하반기(8~10월) 가중평균
                          const recent3 = data.slice(-3);
                          const recentWeightedSum = recent3.reduce((sum: number, item: any) => {
                            const weeks = item.모자?.stock_weeks || 0;
                            const weight = item.모자?.stock_price || 0;
                            return sum + (weeks * weight);
                          }, 0);
                          const recentTotalWeight = recent3.reduce((sum: number, item: any) => {
                            return sum + (item.모자?.stock_price || 0);
                          }, 0);
                          const recentAvg = recentTotalWeight > 0 ? (recentWeightedSum / recentTotalWeight).toFixed(1) : '0.0';
                          
                          // 상반기(1~3월) 가중평균
                          const first3 = data.slice(0, 3);
                          const firstWeightedSum = first3.reduce((sum: number, item: any) => {
                            const weeks = item.모자?.stock_weeks || 0;
                            const weight = item.모자?.stock_price || 0;
                            return sum + (weeks * weight);
                          }, 0);
                          const firstTotalWeight = first3.reduce((sum: number, item: any) => {
                            return sum + (item.모자?.stock_price || 0);
                          }, 0);
                          const firstAvg = firstTotalWeight > 0 ? (firstWeightedSum / firstTotalWeight).toFixed(1) : '0.0';
                          
                          const trend = parseFloat(recentAvg) > parseFloat(firstAvg) ? '증가' : '감소';
                          
                          return `연평균 ${avg}주 (최저 ${min}주, 최고 ${max}주). 하반기(8~10월) 평균 ${recentAvg}주로 상반기 ${firstAvg}주 대비 ${trend} 추세입니다.`;
                        })()}
                      </div>
                    </div>
                    
                    {/* 신발 분석 */}
                    <div className="p-3 bg-white rounded-md border border-yellow-100">
                      <div className="font-bold text-yellow-900 mb-1">👟 신발</div>
                      <div className="text-gray-700 text-xs leading-relaxed">
                        {(() => {
                          const data = dashboardData?.monthly_inventory_data || [];
                          if (data.length === 0) return '데이터 없음';
                          
                          // 가중평균 계산 (재고금액으로 가중)
                          const weightedSum = data.reduce((sum: number, item: any) => {
                            const weeks = item.신발?.stock_weeks || 0;
                            const weight = item.신발?.stock_price || 0;
                            return sum + (weeks * weight);
                          }, 0);
                          const totalWeight = data.reduce((sum: number, item: any) => {
                            return sum + (item.신발?.stock_price || 0);
                          }, 0);
                          const avg = totalWeight > 0 ? (weightedSum / totalWeight).toFixed(1) : '0.0';
                          
                          // 최저/최고
                          const weeksData = data.map((item: any) => item.신발?.stock_weeks || 0).filter((v: number) => v > 0);
                          const min = weeksData.length > 0 ? Math.min(...weeksData).toFixed(1) : '0.0';
                          const max = weeksData.length > 0 ? Math.max(...weeksData).toFixed(1) : '0.0';
                          
                          // 하반기(8~10월) 가중평균
                          const recent3 = data.slice(-3);
                          const recentWeightedSum = recent3.reduce((sum: number, item: any) => {
                            const weeks = item.신발?.stock_weeks || 0;
                            const weight = item.신발?.stock_price || 0;
                            return sum + (weeks * weight);
                          }, 0);
                          const recentTotalWeight = recent3.reduce((sum: number, item: any) => {
                            return sum + (item.신발?.stock_price || 0);
                          }, 0);
                          const recentAvg = recentTotalWeight > 0 ? (recentWeightedSum / recentTotalWeight).toFixed(1) : '0.0';
                          
                          // 상반기(1~3월) 가중평균
                          const first3 = data.slice(0, 3);
                          const firstWeightedSum = first3.reduce((sum: number, item: any) => {
                            const weeks = item.신발?.stock_weeks || 0;
                            const weight = item.신발?.stock_price || 0;
                            return sum + (weeks * weight);
                          }, 0);
                          const firstTotalWeight = first3.reduce((sum: number, item: any) => {
                            return sum + (item.신발?.stock_price || 0);
                          }, 0);
                          const firstAvg = firstTotalWeight > 0 ? (firstWeightedSum / firstTotalWeight).toFixed(1) : '0.0';
                          
                          const trend = parseFloat(recentAvg) > parseFloat(firstAvg) ? '증가' : '감소';
                          
                          return `연평균 ${avg}주 (최저 ${min}주, 최고 ${max}주). 하반기(8~10월) 평균 ${recentAvg}주로 상반기 ${firstAvg}주 대비 ${trend} 추세입니다.`;
                        })()}
                      </div>
                    </div>
                    
                    {/* 가방외 분석 */}
                    <div className="p-3 bg-white rounded-md border border-purple-100">
                      <div className="font-bold text-purple-900 mb-1">👜 가방외</div>
                      <div className="text-gray-700 text-xs leading-relaxed">
                        {(() => {
                          const data = dashboardData?.monthly_inventory_data || [];
                          if (data.length === 0) return '데이터 없음';
                          
                          // 가중평균 계산 (재고금액으로 가중)
                          const weightedSum = data.reduce((sum: number, item: any) => {
                            const weeks = item.가방외?.stock_weeks || 0;
                            const weight = item.가방외?.stock_price || 0;
                            return sum + (weeks * weight);
                          }, 0);
                          const totalWeight = data.reduce((sum: number, item: any) => {
                            return sum + (item.가방외?.stock_price || 0);
                          }, 0);
                          const avg = totalWeight > 0 ? (weightedSum / totalWeight).toFixed(1) : '0.0';
                          
                          // 최저/최고
                          const weeksData = data.map((item: any) => item.가방외?.stock_weeks || 0).filter((v: number) => v > 0);
                          const min = weeksData.length > 0 ? Math.min(...weeksData).toFixed(1) : '0.0';
                          const max = weeksData.length > 0 ? Math.max(...weeksData).toFixed(1) : '0.0';
                          
                          // 하반기(8~10월) 가중평균
                          const recent3 = data.slice(-3);
                          const recentWeightedSum = recent3.reduce((sum: number, item: any) => {
                            const weeks = item.가방외?.stock_weeks || 0;
                            const weight = item.가방외?.stock_price || 0;
                            return sum + (weeks * weight);
                          }, 0);
                          const recentTotalWeight = recent3.reduce((sum: number, item: any) => {
                            return sum + (item.가방외?.stock_price || 0);
                          }, 0);
                          const recentAvg = recentTotalWeight > 0 ? (recentWeightedSum / recentTotalWeight).toFixed(1) : '0.0';
                          
                          // 상반기(1~3월) 가중평균
                          const first3 = data.slice(0, 3);
                          const firstWeightedSum = first3.reduce((sum: number, item: any) => {
                            const weeks = item.가방외?.stock_weeks || 0;
                            const weight = item.가방외?.stock_price || 0;
                            return sum + (weeks * weight);
                          }, 0);
                          const firstTotalWeight = first3.reduce((sum: number, item: any) => {
                            return sum + (item.가방외?.stock_price || 0);
                          }, 0);
                          const firstAvg = firstTotalWeight > 0 ? (firstWeightedSum / firstTotalWeight).toFixed(1) : '0.0';
                          
                          const trend = parseFloat(recentAvg) > parseFloat(firstAvg) ? '증가' : '감소';
                          
                          return `연평균 ${avg}주 (최저 ${min}주, 최고 ${max}주). 하반기(8~10월) 평균 ${recentAvg}주로 상반기 ${firstAvg}주 대비 ${trend} 추세입니다.`;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 계산 방식 설명 */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="text-xs font-bold text-gray-800 mb-2">📌 참고: 재고주수 계산 방식</h3>
                  <div className="text-xs text-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-indigo-700">계산식:</span>
                      <span>재고주수 = (재고금액 / 해당 월 매출) × 4주</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 과시즌F 상세 모달 */}
      {showStagnantInventoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowStagnantInventoryModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">과시즌F 상세 분석</h3>
              <button
                onClick={() => setShowStagnantInventoryModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              {/* 뷰 전환 버튼 */}
              <div className="mb-4 flex gap-2 items-center">
                <button
                  onClick={() => setStagnantModalView('detail')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                    stagnantModalView === 'detail'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  📋 과시즌F 상세분석
                </button>
                <button
                  onClick={() => setStagnantModalView('stagnant')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                    stagnantModalView === 'stagnant'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  🚨 정체재고 분석
                </button>
              </div>

              {/* 정체재고 분석 뷰 */}
              {stagnantModalView === 'stagnant' && (
                <>
              {/* 기준 설명 */}
              <div className="mb-6 bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
                <p className="text-sm text-yellow-900">
                  <span className="font-semibold">📊 분석 기준 (매출/재고 비율):</span> <span className="font-bold text-red-600">기준월 2511 (25년 11월) 1개월간</span> 해당 Subcategory의 택가매출(Gross Sales)이 <span className="font-bold text-red-600">2511 기말 택재고(Stock Price)의 5% 미만</span>인 경우를 정체재고로 분류
                  <br />
                  <span className="text-xs mt-1 block">
                    <span className="font-bold">계산식:</span> 2511 월간 Gross Sales &lt; 2511 기말 Stock Price × 0.05
                  </span>
                  <span className="text-xs mt-1 block">
                    <span className="font-bold">예시:</span> 기말재고 100,000 HKD / 당월 매출 4,000 HKD → 비율 4% &lt; 5% → 정체재고
                  </span>
                  <br />
                  <span className="text-xs mt-1 block text-blue-700">※ 재고일수는 당월 택가 매출 기준으로 계산됩니다 (택가 재고 / 당월 택가 매출 × 30일). 판매가 0인 경우 "-"로 표시됩니다.</span>
                </p>
                {(() => {
                  const metadata = (dashboardData as any)?.metadata;
                  if (!metadata) return null;
                  const lastPeriod = metadata.last_period || '2510';
                  const lastYear = parseInt(lastPeriod.substring(0, 2)) + 2000;
                  const lastMonth = parseInt(lastPeriod.substring(2, 4));
                  
                  // 10개월 기간 계산 (2501 ~ 2510 = 2025년 1월~10월)
                  const startYear = lastYear;
                  const startMonth = 1;
                  const startPeriod = `${(startYear % 100).toString().padStart(2, '0')}${startMonth.toString().padStart(2, '0')}`;
                  const periodLabel = `${startYear}년 ${startMonth}월 ~ ${lastYear}년 ${lastMonth}월`;
                  
                  // 정체재고 합계 계산 (택가 기준, HKD 단위)
                  const totalStagnantStock = 
                    (filteredStagnantInventory['24F'].reduce((sum: number, item: any) => sum + (item.stock_price || 0), 0)) +
                    (filteredStagnantInventory['23F'].reduce((sum: number, item: any) => sum + (item.stock_price || 0), 0)) +
                    (filteredStagnantInventory['22F~'].reduce((sum: number, item: any) => sum + (item.stock_price || 0), 0));
                  
                  // 과시즌F 전체 재고 (택가 기준, HKD 단위)
                  // pastSeasonFW.total.current는 이미 1K HKD 단위이므로 1000을 곱해서 HKD로 변환
                  const totalPastSeasonFW = (pastSeasonFW?.total?.current || 0) * 1000;
                  
                  // 비중 계산
                  const stagnantRatio = totalPastSeasonFW > 0 ? (totalStagnantStock / totalPastSeasonFW) * 100 : 0;
                  
                  return (
                    <>
                      <p className="text-xs text-yellow-800 mt-2">
                        <span className="font-semibold">판단 기준:</span> {lastPeriod} ({lastYear}년 {lastMonth}월) 1개월 당월 택가매출 vs 기말재고
                      </p>
                      <p className="text-xs text-yellow-800 mt-2">
                        <span className="font-semibold">정체재고 합계:</span> {formatNumber(Math.round(totalStagnantStock / 1000))}K ({formatPercent(stagnantRatio, 1)}%, 과시즌F 전체 대비, 택가 기준)
                      </p>
                    </>
                  );
                })()}
              </div>

              {/* 24F (1년차) */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-md font-bold text-red-900 flex items-center">
                    <span className="bg-red-100 px-3 py-1 rounded">24F (1년차)</span>
                    <span className="ml-2 text-sm text-gray-600">
                      총 {filteredStagnantInventory['24F'].length}개 항목
                    </span>
                  </h4>
                  <span className="text-sm text-gray-600 font-semibold">Unit: 1K HKD</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-300">
                        <th className="text-left p-2 font-semibold">순위</th>
                        <th className="text-left p-2 font-semibold">Subcategory</th>
                        <th className="text-left p-2 font-semibold">시즌</th>
                        <th className="text-right p-2 font-semibold">택가 재고</th>
                        <th className="text-right p-2 font-semibold">
                          {(() => {
                            const metadata = (dashboardData as any)?.metadata;
                            if (!metadata) return '당월 택가매출';
                            const lastPeriod = metadata.last_period || '2510';
                            const lastYear = parseInt(lastPeriod.substring(0, 2)) + 2000;
                            const lastMonth = parseInt(lastPeriod.substring(2, 4));
                            
                            return `${lastYear}년 ${lastMonth}월 택가매출`;
                          })()}
                        </th>
                        <th className="text-right p-2 font-semibold">
                          {(() => {
                            const metadata = (dashboardData as any)?.metadata;
                            if (!metadata) return '당월 실판매출';
                            const lastPeriod = metadata.last_period || '2510';
                            const lastYear = parseInt(lastPeriod.substring(0, 2)) + 2000;
                            const lastMonth = parseInt(lastPeriod.substring(2, 4));
                            
                            return `${lastYear}년 ${lastMonth}월 실판매출`;
                          })()}
                        </th>
                        <th className="text-right p-2 font-semibold">할인율 (%)</th>
                        <th className="text-right p-2 font-semibold">재고일수 (일)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStagnantInventory['24F'].map((item: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="p-2">{idx + 1}</td>
                          <td className="p-2 font-semibold">{item.subcategory_code} - {item.subcategory_name}</td>
                          <td className="p-2">{item.season_code}</td>
                          <td className="p-2 text-right font-bold text-red-600">{formatNumber(Math.round((item.stock_price || 0) / 1000))}</td>
                          <td className="p-2 text-right">{formatNumber((item.current_gross_sales || 0) / 1000, 1)}</td>
                          <td className="p-2 text-right">{formatNumber((item.current_net_sales || 0) / 1000, 1)}</td>
                          <td className="p-2 text-right">
                            {item.discount_rate !== null && item.discount_rate !== undefined ? (
                              <span className="text-gray-600">
                                {formatPercent(item.discount_rate, 1)}%
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            {item.stock_days !== null && item.stock_days !== undefined ? (
                              <span className={(item.stock_days || 0) > 365 ? 'text-red-600 font-bold' : 'text-gray-600'}>
                                {Math.round(item.stock_days || 0)}일
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                      </tr>
                      ))}
                      {filteredStagnantInventory['24F'].length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-4 text-center text-gray-500">정체재고 없음</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 23F (2년차) */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-md font-bold text-orange-900 flex items-center">
                    <span className="bg-orange-100 px-3 py-1 rounded">23F (2년차)</span>
                    <span className="ml-2 text-sm text-gray-600">
                      총 {filteredStagnantInventory['23F'].length}개 항목
                    </span>
                  </h4>
                  <span className="text-sm text-gray-600 font-semibold">Unit: 1K HKD</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-300">
                        <th className="text-left p-2 font-semibold">순위</th>
                        <th className="text-left p-2 font-semibold">Subcategory</th>
                        <th className="text-left p-2 font-semibold">시즌</th>
                        <th className="text-right p-2 font-semibold">택가 재고</th>
                        <th className="text-right p-2 font-semibold">
                          {(() => {
                            const metadata = (dashboardData as any)?.metadata;
                            if (!metadata) return '당월 택가매출';
                            const lastPeriod = metadata.last_period || '2510';
                            const lastYear = parseInt(lastPeriod.substring(0, 2)) + 2000;
                            const lastMonth = parseInt(lastPeriod.substring(2, 4));
                            
                            return `${lastYear}년 ${lastMonth}월 택가매출`;
                          })()}
                        </th>
                        <th className="text-right p-2 font-semibold">
                          {(() => {
                            const metadata = (dashboardData as any)?.metadata;
                            if (!metadata) return '당월 실판매출';
                            const lastPeriod = metadata.last_period || '2510';
                            const lastYear = parseInt(lastPeriod.substring(0, 2)) + 2000;
                            const lastMonth = parseInt(lastPeriod.substring(2, 4));
                            
                            return `${lastYear}년 ${lastMonth}월 실판매출`;
                          })()}
                        </th>
                        <th className="text-right p-2 font-semibold">할인율 (%)</th>
                        <th className="text-right p-2 font-semibold">재고일수 (일)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStagnantInventory['23F'].map((item: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="p-2">{idx + 1}</td>
                          <td className="p-2 font-semibold">{item.subcategory_code} - {item.subcategory_name}</td>
                          <td className="p-2">{item.season_code}</td>
                          <td className="p-2 text-right font-bold text-red-600">{formatNumber(Math.round((item.stock_price || 0) / 1000))}</td>
                          <td className="p-2 text-right">{formatNumber((item.current_gross_sales || 0) / 1000, 1)}</td>
                          <td className="p-2 text-right">{formatNumber((item.current_net_sales || 0) / 1000, 1)}</td>
                          <td className="p-2 text-right">
                            {item.discount_rate !== null && item.discount_rate !== undefined ? (
                              <span className="text-gray-600">
                                {formatPercent(item.discount_rate, 1)}%
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            {item.stock_days !== null && item.stock_days !== undefined ? (
                              <span className={(item.stock_days || 0) > 365 ? 'text-red-600 font-bold' : 'text-gray-600'}>
                                {Math.round(item.stock_days || 0)}일
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                      </tr>
                      ))}
                      {filteredStagnantInventory['23F'].length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-4 text-center text-gray-500">정체재고 없음</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 22F~ (3년차 이상) */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-md font-bold text-gray-900 flex items-center">
                    <span className="bg-gray-100 px-3 py-1 rounded">22F~ (3년차 이상)</span>
                    <span className="ml-2 text-sm text-gray-600">
                      총 {filteredStagnantInventory['22F~'].length}개 항목
                    </span>
                  </h4>
                  <span className="text-sm text-gray-600 font-semibold">Unit: 1K HKD</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-300">
                        <th className="text-left p-2 font-semibold">순위</th>
                        <th className="text-left p-2 font-semibold">Subcategory</th>
                        <th className="text-left p-2 font-semibold">시즌</th>
                        <th className="text-right p-2 font-semibold">택가 재고</th>
                        <th className="text-right p-2 font-semibold">
                          {(() => {
                            const metadata = (dashboardData as any)?.metadata;
                            if (!metadata) return '당월 택가매출';
                            const lastPeriod = metadata.last_period || '2510';
                            const lastYear = parseInt(lastPeriod.substring(0, 2)) + 2000;
                            const lastMonth = parseInt(lastPeriod.substring(2, 4));
                            
                            return `${lastYear}년 ${lastMonth}월 택가매출`;
                          })()}
                        </th>
                        <th className="text-right p-2 font-semibold">
                          {(() => {
                            const metadata = (dashboardData as any)?.metadata;
                            if (!metadata) return '당월 실판매출';
                            const lastPeriod = metadata.last_period || '2510';
                            const lastYear = parseInt(lastPeriod.substring(0, 2)) + 2000;
                            const lastMonth = parseInt(lastPeriod.substring(2, 4));
                            
                            return `${lastYear}년 ${lastMonth}월 실판매출`;
                          })()}
                        </th>
                        <th className="text-right p-2 font-semibold">할인율 (%)</th>
                        <th className="text-right p-2 font-semibold">재고일수 (일)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStagnantInventory['22F~'].map((item: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="p-2">{idx + 1}</td>
                          <td className="p-2 font-semibold">{item.subcategory_code} - {item.subcategory_name}</td>
                          <td className="p-2">{item.season_code}</td>
                          <td className="p-2 text-right font-bold text-red-600">{formatNumber(Math.round((item.stock_price || 0) / 1000))}</td>
                          <td className="p-2 text-right">{formatNumber((item.current_gross_sales || 0) / 1000, 1)}</td>
                          <td className="p-2 text-right">{formatNumber((item.current_net_sales || 0) / 1000, 1)}</td>
                          <td className="p-2 text-right">
                            {item.discount_rate !== null && item.discount_rate !== undefined ? (
                              <span className="text-gray-600">
                                {formatPercent(item.discount_rate, 1)}%
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            {item.stock_days !== null && item.stock_days !== undefined ? (
                              <span className={(item.stock_days || 0) > 365 ? 'text-red-600 font-bold' : 'text-gray-600'}>
                                {Math.round(item.stock_days || 0)}일
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                      </tr>
                      ))}
                      {filteredStagnantInventory['22F~'].length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-4 text-center text-gray-500">정체재고 없음</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
                </>
              )}

              {/* 과시즌F 상세분석 뷰 */}
              {stagnantModalView === 'detail' && (
                <>
              {/* 1년차 (24F) TOP 10 */}
              {(() => {
                const allItems24F = (dashboardData as any)?.all_past_season_inventory?.['24F'] || [];
                const top10 = allItems24F.slice(0, 10);
                const others = allItems24F.slice(10);
                
                // 기타 합계 계산
                const othersStockPrice = others.reduce((sum: number, item: any) => sum + (item.stock_price || 0), 0);
                const othersGrossSales = others.reduce((sum: number, item: any) => sum + (item.current_gross_sales || 0), 0);
                const othersSales = others.reduce((sum: number, item: any) => sum + (item.current_net_sales || 0), 0);
                const othersDiscountRate = othersGrossSales > 0 ? ((othersGrossSales - othersSales) / othersGrossSales) * 100 : null;
                const othersStockDays = othersGrossSales > 0 && othersStockPrice > 0 ? (othersStockPrice / othersGrossSales) * 30 : null;
                
                // 전체 합계 계산
                const allStockPrice = allItems24F.reduce((sum: number, item: any) => sum + (item.stock_price || 0), 0);
                const allGrossSales = allItems24F.reduce((sum: number, item: any) => sum + (item.current_gross_sales || 0), 0);
                const allSales = allItems24F.reduce((sum: number, item: any) => sum + (item.current_net_sales || 0), 0);
                const allDiscountRate = allGrossSales > 0 ? ((allGrossSales - allSales) / allGrossSales) * 100 : null;
                const allStockDays = allGrossSales > 0 && allStockPrice > 0 ? (allStockPrice / allGrossSales) * 30 : null;
                
                return (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-md font-bold text-red-900 flex items-center">
                        <span className="bg-red-100 px-3 py-1 rounded">24F (1년차)</span>
                        <span className="ml-2 text-sm text-gray-600">
                          택가 재고 TOP 10
                        </span>
                      </h4>
                      <span className="text-sm text-gray-600 font-semibold">Unit: 1K HKD</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-100 border-b-2 border-gray-300">
                            <th className="text-left p-2 font-semibold">순위</th>
                            <th className="text-left p-2 font-semibold">Subcategory</th>
                            <th className="text-left p-2 font-semibold">시즌</th>
                            <th className="text-right p-2 font-semibold">택가 재고</th>
                            <th className="text-right p-2 font-semibold">
                              {(() => {
                                const metadata = (dashboardData as any)?.metadata;
                                if (!metadata) return '당월 택가매출';
                                const lastPeriod = metadata.last_period || '2510';
                                return `${lastPeriod} 당월 택가매출`;
                              })()}
                            </th>
                            <th className="text-right p-2 font-semibold">
                              {(() => {
                                const metadata = (dashboardData as any)?.metadata;
                                if (!metadata) return '당월 실판매출';
                                const lastPeriod = metadata.last_period || '2510';
                                return `${lastPeriod} 당월 실판매출`;
                              })()}
                            </th>
                            <th className="text-right p-2 font-semibold">할인율 (%)</th>
                            <th className="text-right p-2 font-semibold">재고일수 (일)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {top10.map((item: any, idx: number) => (
                            <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="p-2">{idx + 1}</td>
                              <td className="p-2 font-semibold">{item.subcategory_code} - {item.subcategory_name}</td>
                              <td className="p-2">{item.season_code}</td>
                              <td className="p-2 text-right font-bold text-red-600">{formatNumber(Math.round((item.stock_price || 0) / 1000))}</td>
                              <td className="p-2 text-right">{formatNumber((item.current_gross_sales || 0) / 1000, 1)}</td>
                              <td className="p-2 text-right">{formatNumber((item.current_net_sales || 0) / 1000, 1)}</td>
                              <td className="p-2 text-right">
                                {item.discount_rate !== null && item.discount_rate !== undefined ? (
                                  <span className="text-gray-600">
                                    {formatPercent(item.discount_rate, 1)}%
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="p-2 text-right">
                                {item.stock_days !== null && item.stock_days !== undefined ? (
                                  <span className={(item.stock_days || 0) > 365 ? 'text-red-600 font-bold' : 'text-gray-600'}>
                                    {Math.round(item.stock_days || 0)}일
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {others.length > 0 && (
                            <tr className="bg-gray-50 border-t-2 border-gray-400">
                              <td className="p-2"></td>
                              <td className="p-2 font-semibold text-gray-700">기타 ({others.length}개)</td>
                              <td className="p-2"></td>
                              <td className="p-2 text-right font-bold text-gray-700">{formatNumber(Math.round(othersStockPrice / 1000))}</td>
                              <td className="p-2 text-right text-gray-700">{formatNumber(othersGrossSales / 1000, 1)}</td>
                              <td className="p-2 text-right text-gray-700">{formatNumber(othersSales / 1000, 1)}</td>
                              <td className="p-2 text-right text-gray-700">
                                {othersDiscountRate !== null ? (
                                  <span>{formatPercent(othersDiscountRate, 1)}%</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="p-2 text-right text-gray-700">
                                {othersStockDays !== null ? (
                                  <span className={(othersStockDays || 0) > 365 ? 'text-red-600 font-bold' : ''}>
                                    {Math.round(othersStockDays || 0)}일
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          )}
                          <tr className="bg-blue-50 border-t-2 border-blue-400 font-bold">
                            <td className="p-2"></td>
                            <td className="p-2 text-blue-900">합계</td>
                            <td className="p-2"></td>
                            <td className="p-2 text-right text-blue-900">{formatNumber(Math.round(allStockPrice / 1000))}</td>
                            <td className="p-2 text-right text-blue-900">{formatNumber(allGrossSales / 1000, 1)}</td>
                            <td className="p-2 text-right text-blue-900">{formatNumber(allSales / 1000, 1)}</td>
                            <td className="p-2 text-right text-blue-900">
                              {allDiscountRate !== null ? (
                                <span>{formatPercent(allDiscountRate, 1)}%</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-2 text-right text-blue-900">
                              {allStockDays !== null ? (
                                <span className={(allStockDays || 0) > 365 ? 'text-red-600' : ''}>
                                  {Math.round(allStockDays || 0)}일
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                          {top10.length === 0 && (
                            <tr>
                              <td colSpan={8} className="p-4 text-center text-gray-500">데이터 없음</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* 2년차 (23F) TOP 10 */}
              {(() => {
                const allItems23F = (dashboardData as any)?.all_past_season_inventory?.['23F'] || [];
                const top10 = allItems23F.slice(0, 10);
                const others = allItems23F.slice(10);
                
                // 기타 합계 계산
                const othersStockPrice = others.reduce((sum: number, item: any) => sum + (item.stock_price || 0), 0);
                const othersGrossSales = others.reduce((sum: number, item: any) => sum + (item.current_gross_sales || 0), 0);
                const othersSales = others.reduce((sum: number, item: any) => sum + (item.current_net_sales || 0), 0);
                const othersDiscountRate = othersGrossSales > 0 ? ((othersGrossSales - othersSales) / othersGrossSales) * 100 : null;
                const othersStockDays = othersGrossSales > 0 && othersStockPrice > 0 ? (othersStockPrice / othersGrossSales) * 30 : null;
                
                // 전체 합계 계산
                const allStockPrice = allItems23F.reduce((sum: number, item: any) => sum + (item.stock_price || 0), 0);
                const allGrossSales = allItems23F.reduce((sum: number, item: any) => sum + (item.current_gross_sales || 0), 0);
                const allSales = allItems23F.reduce((sum: number, item: any) => sum + (item.current_net_sales || 0), 0);
                const allDiscountRate = allGrossSales > 0 ? ((allGrossSales - allSales) / allGrossSales) * 100 : null;
                const allStockDays = allGrossSales > 0 && allStockPrice > 0 ? (allStockPrice / allGrossSales) * 30 : null;
                
                return (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-md font-bold text-orange-900 flex items-center">
                        <span className="bg-orange-100 px-3 py-1 rounded">23F (2년차)</span>
                        <span className="ml-2 text-sm text-gray-600">
                          택가 재고 TOP 10
                        </span>
                      </h4>
                      <span className="text-sm text-gray-600 font-semibold">Unit: 1K HKD</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-100 border-b-2 border-gray-300">
                            <th className="text-left p-2 font-semibold">순위</th>
                            <th className="text-left p-2 font-semibold">Subcategory</th>
                            <th className="text-left p-2 font-semibold">시즌</th>
                            <th className="text-right p-2 font-semibold">택가 재고</th>
                            <th className="text-right p-2 font-semibold">
                              {(() => {
                                const metadata = (dashboardData as any)?.metadata;
                                if (!metadata) return '당월 택가매출';
                                const lastPeriod = metadata.last_period || '2510';
                                return `${lastPeriod} 당월 택가매출`;
                              })()}
                            </th>
                            <th className="text-right p-2 font-semibold">
                              {(() => {
                                const metadata = (dashboardData as any)?.metadata;
                                if (!metadata) return '당월 실판매출';
                                const lastPeriod = metadata.last_period || '2510';
                                return `${lastPeriod} 당월 실판매출`;
                              })()}
                            </th>
                            <th className="text-right p-2 font-semibold">할인율 (%)</th>
                            <th className="text-right p-2 font-semibold">재고일수 (일)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {top10.map((item: any, idx: number) => (
                            <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="p-2">{idx + 1}</td>
                              <td className="p-2 font-semibold">{item.subcategory_code} - {item.subcategory_name}</td>
                              <td className="p-2">{item.season_code}</td>
                              <td className="p-2 text-right font-bold text-red-600">{formatNumber(Math.round((item.stock_price || 0) / 1000))}</td>
                              <td className="p-2 text-right">{formatNumber((item.current_gross_sales || 0) / 1000, 1)}</td>
                              <td className="p-2 text-right">{formatNumber((item.current_net_sales || 0) / 1000, 1)}</td>
                              <td className="p-2 text-right">
                                {item.discount_rate !== null && item.discount_rate !== undefined ? (
                                  <span className="text-gray-600">
                                    {formatPercent(item.discount_rate, 1)}%
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="p-2 text-right">
                                {item.stock_days !== null && item.stock_days !== undefined ? (
                                  <span className={(item.stock_days || 0) > 365 ? 'text-red-600 font-bold' : 'text-gray-600'}>
                                    {Math.round(item.stock_days || 0)}일
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {others.length > 0 && (
                            <tr className="bg-gray-50 border-t-2 border-gray-400">
                              <td className="p-2"></td>
                              <td className="p-2 font-semibold text-gray-700">기타 ({others.length}개)</td>
                              <td className="p-2"></td>
                              <td className="p-2 text-right font-bold text-gray-700">{formatNumber(Math.round(othersStockPrice / 1000))}</td>
                              <td className="p-2 text-right text-gray-700">{formatNumber(othersGrossSales / 1000, 1)}</td>
                              <td className="p-2 text-right text-gray-700">{formatNumber(othersSales / 1000, 1)}</td>
                              <td className="p-2 text-right text-gray-700">
                                {othersDiscountRate !== null ? (
                                  <span>{formatPercent(othersDiscountRate, 1)}%</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="p-2 text-right text-gray-700">
                                {othersStockDays !== null ? (
                                  <span className={(othersStockDays || 0) > 365 ? 'text-red-600 font-bold' : ''}>
                                    {Math.round(othersStockDays || 0)}일
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          )}
                          <tr className="bg-blue-50 border-t-2 border-blue-400 font-bold">
                            <td className="p-2"></td>
                            <td className="p-2 text-blue-900">합계</td>
                            <td className="p-2"></td>
                            <td className="p-2 text-right text-blue-900">{formatNumber(Math.round(allStockPrice / 1000))}</td>
                            <td className="p-2 text-right text-blue-900">{formatNumber(allGrossSales / 1000, 1)}</td>
                            <td className="p-2 text-right text-blue-900">{formatNumber(allSales / 1000, 1)}</td>
                            <td className="p-2 text-right text-blue-900">
                              {allDiscountRate !== null ? (
                                <span>{formatPercent(allDiscountRate, 1)}%</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-2 text-right text-blue-900">
                              {allStockDays !== null ? (
                                <span className={(allStockDays || 0) > 365 ? 'text-red-600' : ''}>
                                  {Math.round(allStockDays || 0)}일
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                          {top10.length === 0 && (
                            <tr>
                              <td colSpan={8} className="p-4 text-center text-gray-500">데이터 없음</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* 3년차 이상 (22F~) TOP 10 */}
              {(() => {
                const allItems22F = (dashboardData as any)?.all_past_season_inventory?.['22F~'] || [];
                const top10 = allItems22F.slice(0, 10);
                const others = allItems22F.slice(10);
                
                // 기타 합계 계산
                const othersStockPrice = others.reduce((sum: number, item: any) => sum + (item.stock_price || 0), 0);
                const othersGrossSales = others.reduce((sum: number, item: any) => sum + (item.current_gross_sales || 0), 0);
                const othersSales = others.reduce((sum: number, item: any) => sum + (item.current_net_sales || 0), 0);
                const othersDiscountRate = othersGrossSales > 0 ? ((othersGrossSales - othersSales) / othersGrossSales) * 100 : null;
                const othersStockDays = othersGrossSales > 0 && othersStockPrice > 0 ? (othersStockPrice / othersGrossSales) * 30 : null;
                
                // 전체 합계 계산
                const allStockPrice = allItems22F.reduce((sum: number, item: any) => sum + (item.stock_price || 0), 0);
                const allGrossSales = allItems22F.reduce((sum: number, item: any) => sum + (item.current_gross_sales || 0), 0);
                const allSales = allItems22F.reduce((sum: number, item: any) => sum + (item.current_net_sales || 0), 0);
                const allDiscountRate = allGrossSales > 0 ? ((allGrossSales - allSales) / allGrossSales) * 100 : null;
                const allStockDays = allGrossSales > 0 && allStockPrice > 0 ? (allStockPrice / allGrossSales) * 30 : null;
                
                return (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-md font-bold text-gray-900 flex items-center">
                        <span className="bg-gray-100 px-3 py-1 rounded">22F~ (3년차 이상)</span>
                        <span className="ml-2 text-sm text-gray-600">
                          택가 재고 TOP 10
                        </span>
                      </h4>
                      <span className="text-sm text-gray-600 font-semibold">Unit: 1K HKD</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-100 border-b-2 border-gray-300">
                            <th className="text-left p-2 font-semibold">순위</th>
                            <th className="text-left p-2 font-semibold">Subcategory</th>
                            <th className="text-left p-2 font-semibold">시즌</th>
                            <th className="text-right p-2 font-semibold">택가 재고</th>
                            <th className="text-right p-2 font-semibold">
                              {(() => {
                                const metadata = (dashboardData as any)?.metadata;
                                if (!metadata) return '당월 택가매출';
                                const lastPeriod = metadata.last_period || '2510';
                                return `${lastPeriod} 당월 택가매출`;
                              })()}
                            </th>
                            <th className="text-right p-2 font-semibold">
                              {(() => {
                                const metadata = (dashboardData as any)?.metadata;
                                if (!metadata) return '당월 실판매출';
                                const lastPeriod = metadata.last_period || '2510';
                                return `${lastPeriod} 당월 실판매출`;
                              })()}
                            </th>
                            <th className="text-right p-2 font-semibold">할인율 (%)</th>
                            <th className="text-right p-2 font-semibold">재고일수 (일)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {top10.map((item: any, idx: number) => (
                            <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="p-2">{idx + 1}</td>
                              <td className="p-2 font-semibold">{item.subcategory_code} - {item.subcategory_name}</td>
                              <td className="p-2">{item.season_code}</td>
                              <td className="p-2 text-right font-bold text-red-600">{formatNumber(Math.round((item.stock_price || 0) / 1000))}</td>
                              <td className="p-2 text-right">{formatNumber((item.current_gross_sales || 0) / 1000, 1)}</td>
                              <td className="p-2 text-right">{formatNumber((item.current_net_sales || 0) / 1000, 1)}</td>
                              <td className="p-2 text-right">
                                {item.discount_rate !== null && item.discount_rate !== undefined ? (
                                  <span className="text-gray-600">
                                    {formatPercent(item.discount_rate, 1)}%
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="p-2 text-right">
                                {item.stock_days !== null && item.stock_days !== undefined ? (
                                  <span className={(item.stock_days || 0) > 365 ? 'text-red-600 font-bold' : 'text-gray-600'}>
                                    {Math.round(item.stock_days || 0)}일
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {others.length > 0 && (
                            <tr className="bg-gray-50 border-t-2 border-gray-400">
                              <td className="p-2"></td>
                              <td className="p-2 font-semibold text-gray-700">기타 ({others.length}개)</td>
                              <td className="p-2"></td>
                              <td className="p-2 text-right font-bold text-gray-700">{formatNumber(Math.round(othersStockPrice / 1000))}</td>
                              <td className="p-2 text-right text-gray-700">{formatNumber(othersGrossSales / 1000, 1)}</td>
                              <td className="p-2 text-right text-gray-700">{formatNumber(othersSales / 1000, 1)}</td>
                              <td className="p-2 text-right text-gray-700">
                                {othersDiscountRate !== null ? (
                                  <span>{formatPercent(othersDiscountRate, 1)}%</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="p-2 text-right text-gray-700">
                                {othersStockDays !== null ? (
                                  <span className={(othersStockDays || 0) > 365 ? 'text-red-600 font-bold' : ''}>
                                    {Math.round(othersStockDays || 0)}일
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          )}
                          <tr className="bg-blue-50 border-t-2 border-blue-400 font-bold">
                            <td className="p-2"></td>
                            <td className="p-2 text-blue-900">합계</td>
                            <td className="p-2"></td>
                            <td className="p-2 text-right text-blue-900">{formatNumber(Math.round(allStockPrice / 1000))}</td>
                            <td className="p-2 text-right text-blue-900">{formatNumber(allGrossSales / 1000, 1)}</td>
                            <td className="p-2 text-right text-blue-900">{formatNumber(allSales / 1000, 1)}</td>
                            <td className="p-2 text-right text-blue-900">
                              {allDiscountRate !== null ? (
                                <span>{formatPercent(allDiscountRate, 1)}%</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-2 text-right text-blue-900">
                              {allStockDays !== null ? (
                                <span className={(allStockDays || 0) > 365 ? 'text-red-600' : ''}>
                                  {Math.round(allStockDays || 0)}일
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                          {top10.length === 0 && (
                            <tr>
                              <td colSpan={8} className="p-4 text-center text-gray-500">데이터 없음</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 과시즌F 상세분석 모달 */}
      {showPastSeasonDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowPastSeasonDetailModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">과시즌F 상세분석 (택가 재고 기준)</h3>
              <button
                onClick={() => setShowPastSeasonDetailModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              {/* 1년차 (24F) TOP 10 */}
              {(() => {
                const allItems24F = (dashboardData as any)?.all_past_season_inventory?.['24F'] || [];
                const top10 = allItems24F.slice(0, 10);
                const others = allItems24F.slice(10);
                
                // 기타 합계 계산
                const othersStockPrice = others.reduce((sum: number, item: any) => sum + (item.stock_price || 0), 0);
                const othersGrossSales = others.reduce((sum: number, item: any) => sum + (item.current_gross_sales || 0), 0);
                const othersSales = others.reduce((sum: number, item: any) => sum + (item.current_net_sales || 0), 0);
                const othersDiscountRate = othersGrossSales > 0 ? ((othersGrossSales - othersSales) / othersGrossSales) * 100 : null;
                const othersStockDays = othersGrossSales > 0 && othersStockPrice > 0 ? (othersStockPrice / othersGrossSales) * 30 : null;
                
                // 전체 합계 계산
                const allStockPrice = allItems24F.reduce((sum: number, item: any) => sum + (item.stock_price || 0), 0);
                const allGrossSales = allItems24F.reduce((sum: number, item: any) => sum + (item.current_gross_sales || 0), 0);
                const allSales = allItems24F.reduce((sum: number, item: any) => sum + (item.current_net_sales || 0), 0);
                const allDiscountRate = allGrossSales > 0 ? ((allGrossSales - allSales) / allGrossSales) * 100 : null;
                const allStockDays = allGrossSales > 0 && allStockPrice > 0 ? (allStockPrice / allGrossSales) * 30 : null;
                
                return (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-md font-bold text-red-900 flex items-center">
                        <span className="bg-red-100 px-3 py-1 rounded">24F (1년차)</span>
                        <span className="ml-2 text-sm text-gray-600">
                          택가 재고 TOP 10
                        </span>
                      </h4>
                      <span className="text-sm text-gray-600 font-semibold">Unit: 1K HKD</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-100 border-b-2 border-gray-300">
                            <th className="text-left p-2 font-semibold">순위</th>
                            <th className="text-left p-2 font-semibold">Subcategory</th>
                            <th className="text-left p-2 font-semibold">시즌</th>
                            <th className="text-right p-2 font-semibold">택가 재고</th>
                            <th className="text-right p-2 font-semibold">
                              {(() => {
                                const metadata = (dashboardData as any)?.metadata;
                                if (!metadata) return '당월 택가매출';
                                const lastPeriod = metadata.last_period || '2510';
                                return `${lastPeriod} 당월 택가매출`;
                              })()}
                            </th>
                            <th className="text-right p-2 font-semibold">
                              {(() => {
                                const metadata = (dashboardData as any)?.metadata;
                                if (!metadata) return '당월 실판매출';
                                const lastPeriod = metadata.last_period || '2510';
                                return `${lastPeriod} 당월 실판매출`;
                              })()}
                            </th>
                            <th className="text-right p-2 font-semibold">할인율 (%)</th>
                            <th className="text-right p-2 font-semibold">재고일수 (일)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {top10.map((item: any, idx: number) => (
                            <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="p-2">{idx + 1}</td>
                              <td className="p-2 font-semibold">{item.subcategory_code} - {item.subcategory_name}</td>
                              <td className="p-2">{item.season_code}</td>
                              <td className="p-2 text-right font-bold text-red-600">{formatNumber(Math.round((item.stock_price || 0) / 1000))}</td>
                              <td className="p-2 text-right">{formatNumber((item.current_gross_sales || 0) / 1000, 1)}</td>
                              <td className="p-2 text-right">{formatNumber((item.current_net_sales || 0) / 1000, 1)}</td>
                              <td className="p-2 text-right">
                                {item.discount_rate !== null && item.discount_rate !== undefined ? (
                                  <span className="text-gray-600">
                                    {formatPercent(item.discount_rate, 1)}%
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="p-2 text-right">
                                {item.stock_days !== null && item.stock_days !== undefined ? (
                                  <span className={(item.stock_days || 0) > 365 ? 'text-red-600 font-bold' : 'text-gray-600'}>
                                    {Math.round(item.stock_days || 0)}일
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {others.length > 0 && (
                            <tr className="bg-gray-50 border-t-2 border-gray-400">
                              <td className="p-2"></td>
                              <td className="p-2 font-semibold text-gray-700">기타 ({others.length}개)</td>
                              <td className="p-2"></td>
                              <td className="p-2 text-right font-bold text-gray-700">{formatNumber(Math.round(othersStockPrice / 1000))}</td>
                              <td className="p-2 text-right text-gray-700">{formatNumber(othersGrossSales / 1000, 1)}</td>
                              <td className="p-2 text-right text-gray-700">{formatNumber(othersSales / 1000, 1)}</td>
                              <td className="p-2 text-right text-gray-700">
                                {othersDiscountRate !== null ? (
                                  <span>{formatPercent(othersDiscountRate, 1)}%</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="p-2 text-right text-gray-700">
                                {othersStockDays !== null ? (
                                  <span className={(othersStockDays || 0) > 365 ? 'text-red-600 font-bold' : ''}>
                                    {Math.round(othersStockDays || 0)}일
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          )}
                          <tr className="bg-blue-50 border-t-2 border-blue-400 font-bold">
                            <td className="p-2"></td>
                            <td className="p-2 text-blue-900">합계</td>
                            <td className="p-2"></td>
                            <td className="p-2 text-right text-blue-900">{formatNumber(Math.round(allStockPrice / 1000))}</td>
                            <td className="p-2 text-right text-blue-900">{formatNumber(allGrossSales / 1000, 1)}</td>
                            <td className="p-2 text-right text-blue-900">{formatNumber(allSales / 1000, 1)}</td>
                            <td className="p-2 text-right text-blue-900">
                              {allDiscountRate !== null ? (
                                <span>{formatPercent(allDiscountRate, 1)}%</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-2 text-right text-blue-900">
                              {allStockDays !== null ? (
                                <span className={(allStockDays || 0) > 365 ? 'text-red-600' : ''}>
                                  {Math.round(allStockDays || 0)}일
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                          {top10.length === 0 && (
                            <tr>
                              <td colSpan={8} className="p-4 text-center text-gray-500">데이터 없음</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* 2년차 (23F) TOP 10 */}
              {(() => {
                const allItems23F = (dashboardData as any)?.all_past_season_inventory?.['23F'] || [];
                const top10 = allItems23F.slice(0, 10);
                const others = allItems23F.slice(10);
                
                // 기타 합계 계산
                const othersStockPrice = others.reduce((sum: number, item: any) => sum + (item.stock_price || 0), 0);
                const othersGrossSales = others.reduce((sum: number, item: any) => sum + (item.current_gross_sales || 0), 0);
                const othersSales = others.reduce((sum: number, item: any) => sum + (item.current_net_sales || 0), 0);
                const othersDiscountRate = othersGrossSales > 0 ? ((othersGrossSales - othersSales) / othersGrossSales) * 100 : null;
                const othersStockDays = othersGrossSales > 0 && othersStockPrice > 0 ? (othersStockPrice / othersGrossSales) * 30 : null;
                
                // 전체 합계 계산
                const allStockPrice = allItems23F.reduce((sum: number, item: any) => sum + (item.stock_price || 0), 0);
                const allGrossSales = allItems23F.reduce((sum: number, item: any) => sum + (item.current_gross_sales || 0), 0);
                const allSales = allItems23F.reduce((sum: number, item: any) => sum + (item.current_net_sales || 0), 0);
                const allDiscountRate = allGrossSales > 0 ? ((allGrossSales - allSales) / allGrossSales) * 100 : null;
                const allStockDays = allGrossSales > 0 && allStockPrice > 0 ? (allStockPrice / allGrossSales) * 30 : null;
                
                return (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-md font-bold text-orange-900 flex items-center">
                        <span className="bg-orange-100 px-3 py-1 rounded">23F (2년차)</span>
                        <span className="ml-2 text-sm text-gray-600">
                          택가 재고 TOP 10
                        </span>
                      </h4>
                      <span className="text-sm text-gray-600 font-semibold">Unit: 1K HKD</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-100 border-b-2 border-gray-300">
                            <th className="text-left p-2 font-semibold">순위</th>
                            <th className="text-left p-2 font-semibold">Subcategory</th>
                            <th className="text-left p-2 font-semibold">시즌</th>
                            <th className="text-right p-2 font-semibold">택가 재고</th>
                            <th className="text-right p-2 font-semibold">
                              {(() => {
                                const metadata = (dashboardData as any)?.metadata;
                                if (!metadata) return '당월 택가매출';
                                const lastPeriod = metadata.last_period || '2510';
                                return `${lastPeriod} 당월 택가매출`;
                              })()}
                            </th>
                            <th className="text-right p-2 font-semibold">
                              {(() => {
                                const metadata = (dashboardData as any)?.metadata;
                                if (!metadata) return '당월 실판매출';
                                const lastPeriod = metadata.last_period || '2510';
                                return `${lastPeriod} 당월 실판매출`;
                              })()}
                            </th>
                            <th className="text-right p-2 font-semibold">할인율 (%)</th>
                            <th className="text-right p-2 font-semibold">재고일수 (일)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {top10.map((item: any, idx: number) => (
                            <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="p-2">{idx + 1}</td>
                              <td className="p-2 font-semibold">{item.subcategory_code} - {item.subcategory_name}</td>
                              <td className="p-2">{item.season_code}</td>
                              <td className="p-2 text-right font-bold text-red-600">{formatNumber(Math.round((item.stock_price || 0) / 1000))}</td>
                              <td className="p-2 text-right">{formatNumber((item.current_gross_sales || 0) / 1000, 1)}</td>
                              <td className="p-2 text-right">{formatNumber((item.current_net_sales || 0) / 1000, 1)}</td>
                              <td className="p-2 text-right">
                                {item.discount_rate !== null && item.discount_rate !== undefined ? (
                                  <span className="text-gray-600">
                                    {formatPercent(item.discount_rate, 1)}%
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="p-2 text-right">
                                {item.stock_days !== null && item.stock_days !== undefined ? (
                                  <span className={(item.stock_days || 0) > 365 ? 'text-red-600 font-bold' : 'text-gray-600'}>
                                    {Math.round(item.stock_days || 0)}일
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {others.length > 0 && (
                            <tr className="bg-gray-50 border-t-2 border-gray-400">
                              <td className="p-2"></td>
                              <td className="p-2 font-semibold text-gray-700">기타 ({others.length}개)</td>
                              <td className="p-2"></td>
                              <td className="p-2 text-right font-bold text-gray-700">{formatNumber(Math.round(othersStockPrice / 1000))}</td>
                              <td className="p-2 text-right text-gray-700">{formatNumber(othersGrossSales / 1000, 1)}</td>
                              <td className="p-2 text-right text-gray-700">{formatNumber(othersSales / 1000, 1)}</td>
                              <td className="p-2 text-right text-gray-700">
                                {othersDiscountRate !== null ? (
                                  <span>{formatPercent(othersDiscountRate, 1)}%</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="p-2 text-right text-gray-700">
                                {othersStockDays !== null ? (
                                  <span className={(othersStockDays || 0) > 365 ? 'text-red-600 font-bold' : ''}>
                                    {Math.round(othersStockDays || 0)}일
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          )}
                          <tr className="bg-blue-50 border-t-2 border-blue-400 font-bold">
                            <td className="p-2"></td>
                            <td className="p-2 text-blue-900">합계</td>
                            <td className="p-2"></td>
                            <td className="p-2 text-right text-blue-900">{formatNumber(Math.round(allStockPrice / 1000))}</td>
                            <td className="p-2 text-right text-blue-900">{formatNumber(allGrossSales / 1000, 1)}</td>
                            <td className="p-2 text-right text-blue-900">{formatNumber(allSales / 1000, 1)}</td>
                            <td className="p-2 text-right text-blue-900">
                              {allDiscountRate !== null ? (
                                <span>{formatPercent(allDiscountRate, 1)}%</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-2 text-right text-blue-900">
                              {allStockDays !== null ? (
                                <span className={(allStockDays || 0) > 365 ? 'text-red-600' : ''}>
                                  {Math.round(allStockDays || 0)}일
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                          {top10.length === 0 && (
                            <tr>
                              <td colSpan={8} className="p-4 text-center text-gray-500">데이터 없음</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* 3년차 이상 (22F~) TOP 10 */}
              {(() => {
                const allItems22F = (dashboardData as any)?.all_past_season_inventory?.['22F~'] || [];
                const top10 = allItems22F.slice(0, 10);
                const others = allItems22F.slice(10);
                
                // 기타 합계 계산
                const othersStockPrice = others.reduce((sum: number, item: any) => sum + (item.stock_price || 0), 0);
                const othersGrossSales = others.reduce((sum: number, item: any) => sum + (item.current_gross_sales || 0), 0);
                const othersSales = others.reduce((sum: number, item: any) => sum + (item.current_net_sales || 0), 0);
                const othersDiscountRate = othersGrossSales > 0 ? ((othersGrossSales - othersSales) / othersGrossSales) * 100 : null;
                const othersStockDays = othersGrossSales > 0 && othersStockPrice > 0 ? (othersStockPrice / othersGrossSales) * 30 : null;
                
                // 전체 합계 계산
                const allStockPrice = allItems22F.reduce((sum: number, item: any) => sum + (item.stock_price || 0), 0);
                const allGrossSales = allItems22F.reduce((sum: number, item: any) => sum + (item.current_gross_sales || 0), 0);
                const allSales = allItems22F.reduce((sum: number, item: any) => sum + (item.current_net_sales || 0), 0);
                const allDiscountRate = allGrossSales > 0 ? ((allGrossSales - allSales) / allGrossSales) * 100 : null;
                const allStockDays = allGrossSales > 0 && allStockPrice > 0 ? (allStockPrice / allGrossSales) * 30 : null;
                
                return (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-md font-bold text-gray-900 flex items-center">
                        <span className="bg-gray-100 px-3 py-1 rounded">22F~ (3년차 이상)</span>
                        <span className="ml-2 text-sm text-gray-600">
                          택가 재고 TOP 10
                        </span>
                      </h4>
                      <span className="text-sm text-gray-600 font-semibold">Unit: 1K HKD</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-100 border-b-2 border-gray-300">
                            <th className="text-left p-2 font-semibold">순위</th>
                            <th className="text-left p-2 font-semibold">Subcategory</th>
                            <th className="text-left p-2 font-semibold">시즌</th>
                            <th className="text-right p-2 font-semibold">택가 재고</th>
                            <th className="text-right p-2 font-semibold">
                              {(() => {
                                const metadata = (dashboardData as any)?.metadata;
                                if (!metadata) return '당월 택가매출';
                                const lastPeriod = metadata.last_period || '2510';
                                return `${lastPeriod} 당월 택가매출`;
                              })()}
                            </th>
                            <th className="text-right p-2 font-semibold">
                              {(() => {
                                const metadata = (dashboardData as any)?.metadata;
                                if (!metadata) return '당월 실판매출';
                                const lastPeriod = metadata.last_period || '2510';
                                return `${lastPeriod} 당월 실판매출`;
                              })()}
                            </th>
                            <th className="text-right p-2 font-semibold">할인율 (%)</th>
                            <th className="text-right p-2 font-semibold">재고일수 (일)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {top10.map((item: any, idx: number) => (
                            <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="p-2">{idx + 1}</td>
                              <td className="p-2 font-semibold">{item.subcategory_code} - {item.subcategory_name}</td>
                              <td className="p-2">{item.season_code}</td>
                              <td className="p-2 text-right font-bold text-red-600">{formatNumber(Math.round((item.stock_price || 0) / 1000))}</td>
                              <td className="p-2 text-right">{formatNumber((item.current_gross_sales || 0) / 1000, 1)}</td>
                              <td className="p-2 text-right">{formatNumber((item.current_net_sales || 0) / 1000, 1)}</td>
                              <td className="p-2 text-right">
                                {item.discount_rate !== null && item.discount_rate !== undefined ? (
                                  <span className="text-gray-600">
                                    {formatPercent(item.discount_rate, 1)}%
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="p-2 text-right">
                                {item.stock_days !== null && item.stock_days !== undefined ? (
                                  <span className={(item.stock_days || 0) > 365 ? 'text-red-600 font-bold' : 'text-gray-600'}>
                                    {Math.round(item.stock_days || 0)}일
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {others.length > 0 && (
                            <tr className="bg-gray-50 border-t-2 border-gray-400">
                              <td className="p-2"></td>
                              <td className="p-2 font-semibold text-gray-700">기타 ({others.length}개)</td>
                              <td className="p-2"></td>
                              <td className="p-2 text-right font-bold text-gray-700">{formatNumber(Math.round(othersStockPrice / 1000))}</td>
                              <td className="p-2 text-right text-gray-700">{formatNumber(othersGrossSales / 1000, 1)}</td>
                              <td className="p-2 text-right text-gray-700">{formatNumber(othersSales / 1000, 1)}</td>
                              <td className="p-2 text-right text-gray-700">
                                {othersDiscountRate !== null ? (
                                  <span>{formatPercent(othersDiscountRate, 1)}%</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="p-2 text-right text-gray-700">
                                {othersStockDays !== null ? (
                                  <span className={(othersStockDays || 0) > 365 ? 'text-red-600 font-bold' : ''}>
                                    {Math.round(othersStockDays || 0)}일
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          )}
                          <tr className="bg-blue-50 border-t-2 border-blue-400 font-bold">
                            <td className="p-2"></td>
                            <td className="p-2 text-blue-900">합계</td>
                            <td className="p-2"></td>
                            <td className="p-2 text-right text-blue-900">{formatNumber(Math.round(allStockPrice / 1000))}</td>
                            <td className="p-2 text-right text-blue-900">{formatNumber(allGrossSales / 1000, 1)}</td>
                            <td className="p-2 text-right text-blue-900">{formatNumber(allSales / 1000, 1)}</td>
                            <td className="p-2 text-right text-blue-900">
                              {allDiscountRate !== null ? (
                                <span>{formatPercent(allDiscountRate, 1)}%</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-2 text-right text-blue-900">
                              {allStockDays !== null ? (
                                <span className={(allStockDays || 0) > 365 ? 'text-red-600' : ''}>
                                  {Math.round(allStockDays || 0)}일
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                          {top10.length === 0 && (
                            <tr>
                              <td colSpan={8} className="p-4 text-center text-gray-500">데이터 없음</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default HongKongCumulativeDashboard;

