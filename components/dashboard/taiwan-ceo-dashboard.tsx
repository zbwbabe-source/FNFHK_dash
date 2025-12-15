'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ComposedChart, Legend, LabelList, ReferenceLine, Cell, Layer } from 'recharts';
import { TrendingDown, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import storeAreasData from './taiwan-store-areas.json';

interface TaiwanCEODashboardProps {
  period?: string;
}

const TaiwanCEODashboard: React.FC<TaiwanCEODashboardProps> = ({ period = '2511' }) => {
  // 동적 데이터 로드
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [plData, setPlData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // CEO 인사이트 편집 상태
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [ceoInsights, setCeoInsights] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Dashboard 데이터 로드
        const dashboardResponse = await fetch(`/dashboard/taiwan-dashboard-data-${period}.json`);
        if (!dashboardResponse.ok) {
          throw new Error(`Failed to load dashboard data for period ${period}`);
        }
        const dashData = await dashboardResponse.json();
        setDashboardData(dashData);
        
        // PL 데이터 로드 (동일한 period 사용)
        let plResponse = await fetch(`/dashboard/taiwan-pl-data-${period}.json`);
        
        // period별 PL 파일이 없으면 기본 파일 사용
        if (!plResponse.ok) {
          plResponse = await fetch('/dashboard/taiwan-pl-data.json');
        }
        
        if (plResponse.ok) {
          const plDataResult = await plResponse.json();
          setPlData(plDataResult);
        }
        
      } catch (error) {
        console.error('Error loading data:', error);
        // 폴백: 기본 데이터 로드 시도
        try {
          const fallbackDashboard = await fetch('/dashboard/taiwan-dashboard-data.json');
          const fallbackPl = await fetch('/dashboard/taiwan-pl-data.json');
          
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
    
    // 저장된 CEO 인사이트 불러오기 (없으면 기본값 설정)
    const savedInsights = localStorage.getItem(`taiwan-ceo-insights-${period}`);
    if (savedInsights) {
      try {
        setCeoInsights(JSON.parse(savedInsights));
      } catch (e) {
        console.error('Error loading saved insights:', e);
      }
    } else {
      // 기본 텍스트 설정
      const defaultInsights = {
        'executive-summary-text': `• 매출개선: 17,683K, YOY 117%
• 매장효율성 개선: 평당매출 653 HKD/평/1일, YOY 129%
• 25F 판매율: 32.2%, 전년비 +2.0%p
• 온라인: 5,675K (YOY 118%, 비중 32.1%), 직접이익 1,599K
• 총재고 감소: 180,260K, YOY 93%`,
        'risk-text': `• Discovery 당월 영업손실 -38K(전월비 +218K), 누적 영업손실: -2,466K, 오프라인 3개+온라인 2개
• 할인율 상승: 25.8% (전월 23.7%), 수익성 관리 필요`,
        'strategy-text': `• 성장 모멘텀 유지: 당월 영업이익 2,610K (14.8%), 매출 YOY 117% 지속
• 온라인 채널 강화: 온라인 직접이익률 28.2%, 매출 비중 32.1%로 확대
• 수익성 개선: 할인율 관리 및 영업비 효율화를 통한 영업이익률 개선`
      };
      setCeoInsights(defaultInsights);
    }
  }, [period]);
  
  // CEO 인사이트 항목 저장 함수
  const saveInsightItem = (itemId: string, content: string) => {
    const updated = { ...ceoInsights, [itemId]: content };
    setCeoInsights(updated);
    localStorage.setItem(`taiwan-ceo-insights-${period}`, JSON.stringify(updated));
    setEditingItemId(null);
  };

  const saveCardFull = (cardId: string, content: string) => {
    const updated = { ...ceoInsights, [cardId]: content };
    setCeoInsights(updated);
    localStorage.setItem(`taiwan-ceo-insights-${period}`, JSON.stringify(updated));
  };

  // Period 표시를 위한 포맷팅
  const periodYear = period.substring(0, 2);
  const periodMonth = period.substring(2, 4);
  const periodLabel = `${periodYear}년 ${periodMonth}월`;

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

  // 날짜 포맷 함수 (년도 포함)
  const formatReportDateWithYear = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}년 ${month}월 ${day}일`;
  };

  useEffect(() => {
    document.title = `대만법인 ${periodLabel} 경영실적`;
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
  const [showStoreDetail, setShowStoreDetail] = useState(false);
  const [showSeasonSalesDetail, setShowSeasonSalesDetail] = useState(true);
  const [showAccInventoryDetail, setShowAccInventoryDetail] = useState(true);
  const [showEndInventoryDetail, setShowEndInventoryDetail] = useState(true);
  const [showEndSalesDetail, setShowEndSalesDetail] = useState(true);
  const [showPastSeasonSalesDetail, setShowPastSeasonSalesDetail] = useState(true);
  const [showPastSeasonDetail, setShowPastSeasonDetail] = useState(true);
  const [showCurrentSeasonDetail, setShowCurrentSeasonDetail] = useState(true);
  const [showYear1Detail, setShowYear1Detail] = useState(false);
  const [showYear2Detail, setShowYear2Detail] = useState(false);
  const [showYear1OthersDetail, setShowYear1OthersDetail] = useState(false);
  const [showYear2OthersDetail, setShowYear2OthersDetail] = useState(false);
  const [showDiscoveryDetail, setShowDiscoveryDetail] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [expenseType, setExpenseType] = useState<'당월' | '누적'>('당월');
  const [opexType, setOpexType] = useState<'당월' | '누적'>('당월');
  const [showDirectCostItemAnalysis, setShowDirectCostItemAnalysis] = useState<{[key: string]: boolean}>({});
  const [showOperatingExpenseItemAnalysis, setShowOperatingExpenseItemAnalysis] = useState<{[key: string]: boolean}>({});
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);  // 선택된 채널 (범례 클릭 시)
  const [salesPriceType, setSalesPriceType] = useState<'실판' | '택가' | '할인율'>('실판');  // 아이템별 추세 가격 타입
  const [selectedItem, setSelectedItem] = useState<string | null>(null);  // 선택된 아이템 (범례 클릭 시)
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<string | null>(null);  // 선택된 재고 아이템 (범례 클릭 시)
  const [expandedStoreCategories, setExpandedStoreCategories] = useState<{[key: string]: {stores: boolean | {[store_code: string]: boolean}, rentLabor: boolean}}>({
    large_profit: {stores: {}, rentLabor: false},  // 매장별 상세: 접힘, 임차료/인건비율 상세: 접힘
    small_medium_profit: {stores: {}, rentLabor: false},  // 매장별 상세: 접힘, 임차료/인건비율 상세: 접힘
    profit_improving: {stores: true, rentLabor: false},  // 매장별 상세: 펼침, 임차료/인건비율 상세: 접힘
    profit_deteriorating: {stores: true, rentLabor: false},  // 매장별 상세: 펼침, 임차료/인건비율 상세: 접힘
    loss_improving: {stores: true, rentLabor: false},  // 매장별 상세: 펼침, 임차료/인건비율 상세: 접힘
    loss_deteriorating: {stores: {}, rentLabor: false},  // 매장별 상세: 접힘, 임차료/인건비율 상세: 접힘
    mc_summary: {stores: true, rentLabor: false}  // 매장별 상세: 펼침, 임차료/인건비율 상세: 접힘
  });
  const [expandedSummary, setExpandedSummary] = useState({
    calculationBasis: false,
    excludedStores: false,
    insights: false,
    yoyTrend: false
  });

  // ============================================================
  // 헬퍼 함수
  // ============================================================
  const toggleAllDetails = () => {
    const newState = !showSalesDetail;
    setShowSalesDetail(newState);
    setShowProfitDetail(newState);
    setShowItemProfitDetail(newState);
    setShowExpenseDetail(newState);
    setShowDiscountDetail(newState);
    setShowStoreDetail(newState);
    setShowSeasonSalesDetail(newState);
    setShowAccInventoryDetail(newState);
    setShowEndInventoryDetail(newState);
    setShowPastSeasonDetail(newState);
    setShowCurrentSeasonDetail(newState);
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
  }, []);
  
  const salesSummary = dashboardData?.sales_summary || {};
  const countryChannel = dashboardData?.country_channel_summary || {};
  const offlineEfficiency = dashboardData?.offline_store_efficiency || {};
  const storeEfficiencySummary = offlineEfficiency?.total;
  const totalStoreCurrent = storeEfficiencySummary?.current?.store_count ?? 0;
  const totalStorePrevious = storeEfficiencySummary?.previous?.store_count ?? 0;
  const totalSalesPerStore = storeEfficiencySummary?.current?.sales_per_store ?? 0;
  const prevSalesPerStore = storeEfficiencySummary?.previous?.sales_per_store ?? 0;
  const totalSalesPerStoreYoy = offlineEfficiency?.total?.yoy ?? (prevSalesPerStore ? (totalSalesPerStore / prevSalesPerStore) * 100 : 0);

  // 매장 이름 정리 함수: 매장 코드 기반으로 깔끔한 한글 이름 매핑
  const formatStoreName = (fullName: string) => {
    // 매장 코드 추출 (예: "T01 MLB忠孝旗艦店" -> "T01")
    const match = fullName.match(/^([A-Z0-9]+)\s+/);
    const storeCode = match ? match[1] : '';
    
    // 매장 코드별 깔끔한 이름 매핑 (대만매장정보.csv 기반)
    const storeNameMap: {[key: string]: string} = {
      'T01': '종샤오',
      'T02': '난징3',
      'T03': 'Taipei 101',
      'T04': 'A11',
      'T06': '중우백화점',
      'T07': '신주 빅시티',
      'T08': '한신아레나',
      'T09': '성품서적 타이중',
      'T10': '반치아오',
      'T11': 'TS Mall',
      'T12': 'TAIMALL',
      'T13': 'SKM Tainan',
      'T14': 'Metrowalk',
      'T15': '신디엔',
      'T16': 'Sogo종샤오',
      'T17': '라라포트 난강',
      'T18': '라라포트 타이중',
      'TE1': 'MOMO',
      'TE2': '91APP',
      'TE3': 'SHOPEE',
      'TE4': 'LINE GIFTSHOP',
      'TU1': '미츠이 타이중',
      'TU2': '미츠이 린커우',
      'TU3': '글로리아',
      'T99': 'Back Office',
      'WTE': 'EC창고',
      'WTM': '메인창고'
    };
    
    return storeNameMap[storeCode] || fullName.replace(/^[A-Z0-9]+\s+/, '');
  };

  // 대만은 매장 데이터가 dashboardData에 포함되어 있음
  const allTWStores = useMemo(() => {
    if (!dashboardData?.store_summary) return [];
    return Object.values(dashboardData.store_summary);
  }, [dashboardData]);

  // 평당매출 계산 (대만 - 당월 및 전년)
  const { 
    totalArea: twTotalArea, 
    salesPerPyeong: twSalesPerPyeong, 
    dailySalesPerPyeong: twDailySalesPerPyeong,
    prevTotalArea: twPrevTotalArea,
    prevSalesPerPyeong: twPrevSalesPerPyeong,
    prevDailySalesPerPyeong: twPrevDailySalesPerPyeong,
    yoy: twSalesPerPyeongYoy
  } = useMemo(() => {
    const storeAreas = (storeAreasData as any).store_areas;
    const currentMonthDays = period ? parseInt(period.slice(2, 4)) === 2 ? 29 : [1,3,5,7,8,10,12].includes(parseInt(period.slice(2, 4))) ? 31 : 30 : 30;
    
    // === 당월 계산 ===
    let totalArea = 0;
    
    // 당월 매출이 있고, 폐점이 아닌 오프라인 매장들의 면적 합계
    allTWStores?.forEach((store: any) => {
      const storeCode = store.store_code;
      const area = storeAreas[storeCode] || 0;
      
      // 온라인 매장 제외
      if (store.channel === 'Online') {
        return;
      }
      
      // 당월 매출이 0이면 제외
      if ((store.current?.net_sales || 0) === 0) {
        return;
      }
      
      // 폐점이면서 평당매출이 매우 낮은 매장 제외 (정리 매출만 있는 경우)
      // 평당매출이 1 K HKD/평 미만이면 제외
      if (store.closed === true && area > 0) {
        const salesPerPyeong = (store.current.net_sales / 1000) / area;
        if (salesPerPyeong < 1) {
          return; // 폐점 + 저매출 매장 제외
        }
      }
      
      totalArea += area;
    });
    
    // PL 데이터에서 대만 오프라인 실판매출 (당월)
    const twNetSales = plData?.current_month?.offline?.net_sales || 0;
    
    // 평당매출 (K HKD/평)
    const salesPerPyeong = totalArea > 0 ? twNetSales / totalArea : 0;
    
    // 1일 평당매출 (HKD/평/일)
    const dailySalesPerPyeong = totalArea > 0 && currentMonthDays > 0 ? (salesPerPyeong * 1000) / currentMonthDays : 0;
    
    // === 전년 계산 ===
    let prevTotalArea = 0;
    
    // 전년 매출이 있는 오프라인 매장들의 면적 합계
    allTWStores?.forEach((store: any) => {
      const storeCode = store.store_code;
      const area = storeAreas[storeCode] || 0;
      
      // 온라인 매장 제외
      if (store.channel === 'Online') {
        return;
      }
      
      // 전년 매출이 0이면 제외
      if ((store.previous?.net_sales || 0) === 0) {
        return;
      }
      
      prevTotalArea += area;
    });
    
    // PL 데이터에서 대만 오프라인 실판매출 (전년)
    const twPrevNetSales = plData?.prev_month?.offline?.net_sales || 0;
    
    // 전년 평당매출 (K HKD/평)
    const prevSalesPerPyeong = prevTotalArea > 0 ? twPrevNetSales / prevTotalArea : 0;
    
    // 전년 1일 평당매출 (HKD/평/일)
    const prevDailySalesPerPyeong = prevTotalArea > 0 && currentMonthDays > 0 ? (prevSalesPerPyeong * 1000) / currentMonthDays : 0;
    
    // YOY 계산
    const yoy = prevDailySalesPerPyeong > 0 ? (dailySalesPerPyeong / prevDailySalesPerPyeong) * 100 : 0;
    
    return { 
      totalArea, 
      salesPerPyeong, 
      dailySalesPerPyeong,
      prevTotalArea,
      prevSalesPerPyeong,
      prevDailySalesPerPyeong,
      yoy
    };
  }, [allTWStores, plData, period]);

  // 채널별 매장 효율성 계산
  const channelEfficiency = useMemo(() => {
    const channels: { [key: string]: { current: { net_sales: number, store_count: number, sales_per_store: number }, previous: { net_sales: number, store_count: number, sales_per_store: number }, yoy: number } } = {
      Retail: { current: { net_sales: 0, store_count: 0, sales_per_store: 0 }, previous: { net_sales: 0, store_count: 0, sales_per_store: 0 }, yoy: 0 },
      Outlet: { current: { net_sales: 0, store_count: 0, sales_per_store: 0 }, previous: { net_sales: 0, store_count: 0, sales_per_store: 0 }, yoy: 0 }
    };

    allTWStores.forEach((store: any) => {
      const channel = store.channel;
      if (channel === 'Retail' || channel === 'Outlet') {
        // 당월 데이터 (온라인 제외, 정상 운영 매장만)
        if (store.current && store.current.net_sales > 0 && !store.closed) {
          channels[channel].current.net_sales += store.current.net_sales || 0;
          channels[channel].current.store_count += 1;
        }
        // 전년 데이터
        if (store.previous && store.previous.net_sales > 0) {
          channels[channel].previous.net_sales += store.previous.net_sales || 0;
          channels[channel].previous.store_count += 1;
        }
      }
    });

    // 점당매출 계산
    Object.keys(channels).forEach((key) => {
      const channel = channels[key];
      if (channel.current.store_count > 0) {
        channel.current.sales_per_store = channel.current.net_sales / channel.current.store_count;
      }
      if (channel.previous.store_count > 0) {
        channel.previous.sales_per_store = channel.previous.net_sales / channel.previous.store_count;
      }
      if (channel.previous.sales_per_store > 0) {
        channel.yoy = (channel.current.sales_per_store / channel.previous.sales_per_store) * 100;
      }
    });

    return channels;
  }, [allTWStores]);

  // 전년 대비 변동된 매장 계산
  const storeChanges = useMemo(() => {
    const newStores: string[] = []; // 신규 매장
    const closedStores: string[] = []; // 종료 매장
    const renovatedStores: string[] = []; // 리뉴얼 매장

    allTWStores.forEach((store: any) => {
      // 온라인 매장 제외
      if (store.channel === 'Online') return;

      const hasCurrentSales = store.current && store.current.net_sales > 0;
      const hasPreviousSales = store.previous && store.previous.net_sales > 0;
      const isClosed = store.closed || false;

      // 신규 매장: 당월에만 매출이 있고 전년에 매출이 없음
      if (hasCurrentSales && !hasPreviousSales) {
        newStores.push(formatStoreName(store.store_name || store.store_code));
      }
      
      // 종료 매장: 전년에만 매출이 있고 당월에 매출이 없음
      if (hasPreviousSales && !hasCurrentSales && !isClosed) {
        closedStores.push(formatStoreName(store.store_name || store.store_code));
      }

      // 리뉴얼 매장: 전년에 매출이 있었지만 당월에 매출이 0이고 closed가 true
      if (hasPreviousSales && !hasCurrentSales && isClosed) {
        renovatedStores.push(formatStoreName(store.store_name || store.store_code));
      }
    });

    return { newStores, closedStores, renovatedStores };
  }, [allTWStores]);

  const activeTWStores = useMemo(
    () => allTWStores
      .filter((store: any) => (store?.current?.net_sales || 0) > 0 && !store.closed && store.channel !== 'Online')
      .map((store: any) => {
        const currentNet = store?.current?.net_sales || 0;
        const previousNet = store?.previous?.net_sales || 0;
        const yoy = previousNet > 0 ? (currentNet / previousNet) * 100 : 0;
        // 전년 YOY 계산 (전전년 데이터가 있는 경우)
        const prevPrevNet = store?.previous_previous?.net_sales || 0;
        const prevYoy = prevPrevNet > 0 ? (previousNet / prevPrevNet) * 100 : 0;
        // 직접이익 계산
        let directProfit = 0;
        let directProfitPrev = 0;
        if (plData?.channel_direct_profit?.stores?.[store.store_code as keyof typeof plData.channel_direct_profit.stores]) {
          const storeData = plData.channel_direct_profit.stores[store.store_code as keyof typeof plData.channel_direct_profit.stores];
          directProfit = storeData.direct_profit || 0;
          directProfitPrev = storeData.direct_profit_prev || 0;
        }
        return {
          ...store,
          shop_nm: store.store_name || store.store_code,
          shop_cd: store.store_code,
          yoy: yoy,
          prev_yoy: prevYoy, // 전년 YOY
          direct_profit: directProfit,
          direct_profit_prev: directProfitPrev,
          current: {
            ...store.current,
            direct_profit: directProfit
          },
          previous: {
            ...store.previous,
            direct_profit: directProfitPrev
          }
        };
      })
      .sort((a: any, b: any) => b.yoy - a.yoy), // YOY 높은 순으로 정렬
    [allTWStores, plData]
  );

  // 카테고리 통계 계산 함수
  const calculateCategoryStats = (stores: any[]) => {
    if (stores.length === 0) return null;
    const totalDirectProfit = stores.reduce((sum, s) => sum + (s.direct_profit || 0), 0);
    const avgYoy = stores.reduce((sum, s) => sum + s.yoy, 0) / stores.length;

    // 임차료/인건비/감가상각비율 계산
    const totalRent = stores.reduce((sum, s) => sum + ((plData?.channel_direct_profit?.stores as any)?.[s.store_code]?.rent || 0), 0);
    const totalLabor = stores.reduce((sum, s) => sum + ((plData?.channel_direct_profit?.stores as any)?.[s.store_code]?.labor_cost || 0), 0);
    const totalDepreciation = stores.reduce((sum, s) => sum + ((plData?.channel_direct_profit?.stores as any)?.[s.store_code]?.depreciation || 0), 0);
    const totalSales = stores.reduce((sum, s) => sum + ((s.current?.net_sales || 0) / 1000), 0); // 1K HKD 단위로 변환

    const rentRate = totalSales > 0 ? (totalRent / totalSales) * 100 : 0;
    const laborRate = totalSales > 0 ? (totalLabor / totalSales) * 100 : 0;
    const depreciationRate = totalSales > 0 ? (totalDepreciation / totalSales) * 100 : 0;
    const avgRentLaborRatio = rentRate + laborRate;

    return {
      count: stores.length,
      stores: stores,
      total_direct_profit: totalDirectProfit,
      total_net_sales: totalSales,
      avg_yoy: avgYoy,
      avg_rent_labor_ratio: avgRentLaborRatio,
      rent_rate: rentRate,
      labor_rate: laborRate,
      depreciation_rate: depreciationRate
    };
  };

  // 매장 카테고리 계산
  const storeCategories = useMemo(() => {

    // 대형 흑자매장 (직접이익 >= 100K)
    const largeProfitStores = activeTWStores.filter((s: any) => (s.direct_profit || 0) >= 100);
    
    // 중소형 흑자매장 (직접이익 > 0 && < 100K)
    const smallMediumProfitStores = activeTWStores.filter((s: any) => (s.direct_profit || 0) > 0 && (s.direct_profit || 0) < 100);
    
    // 적자매장 (직접이익 < 0)
    const lossStores = activeTWStores.filter((s: any) => (s.direct_profit || 0) < 0);
    
    // 매출개선 적자매장 (적자이지만 YOY >= 100)
    const lossImproving = lossStores.filter((s: any) => s.yoy >= 100);
    
    // 매출악화 적자매장 (적자이고 YOY < 100)
    const lossDeteriorating = lossStores.filter((s: any) => s.yoy < 100);

    // 적자매장 통합
    const allLossStores = [...lossImproving, ...lossDeteriorating];
    const lossTotal = calculateCategoryStats(allLossStores);
    
    return {
      large_profit: calculateCategoryStats(largeProfitStores),
      small_medium_profit: calculateCategoryStats(smallMediumProfitStores),
      loss_improving: calculateCategoryStats(lossImproving),
      loss_deteriorating: calculateCategoryStats(lossDeteriorating),
      loss_all: lossTotal ? {
        ...lossTotal,
        improving_stores: lossImproving,
        deteriorating_stores: lossDeteriorating
      } : null
    };
  }, [activeTWStores, plData]);
  const seasonSales = dashboardData?.season_sales || {};
  const accStock = dashboardData?.acc_stock_summary || {};
  const endingInventory = dashboardData?.ending_inventory || {};
  const pastSeasonFW = endingInventory?.past_season_fw || {};

  // 아이템별 기말재고 YOY는 ending_inventory 기준 사용 (TAG 재고 기준)
  const seasonFCurrent = endingInventory?.by_season?.['당시즌_의류']?.current?.stock_price || 0;
  const seasonFPrevious = endingInventory?.by_season?.['당시즌_의류']?.previous?.stock_price || 0;
  const yoySeasonF = seasonFPrevious > 0 ? (seasonFCurrent / seasonFPrevious * 100) : 0;      // 당시즌 의류 (25F)
  const seasonSCurrent = endingInventory?.by_season?.['당시즌_SS']?.current?.stock_price || 0;
  const seasonSPrevious = endingInventory?.by_season?.['당시즌_SS']?.previous?.stock_price || 0;
  const yoySeasonS = seasonSPrevious > 0 ? (seasonSCurrent / seasonSPrevious * 100) : 0;      // 당시즌 SS (25S)
  const yoyPastF = endingInventory?.by_season?.['과시즌_FW']?.yoy || 0;         // 과시즌 FW
  const pastSCurrent = endingInventory?.by_season?.['과시즌_SS']?.current?.stock_price || 0;
  const pastSPrevious = endingInventory?.by_season?.['과시즌_SS']?.previous?.stock_price || 0;
  const yoyPastS = pastSPrevious > 0 ? (pastSCurrent / pastSPrevious * 100) : 0;         // 과시즌 SS
  const yoyShoes = endingInventory?.acc_by_category?.SHO?.yoy || 0;             // 신발
  const yoyHat = endingInventory?.acc_by_category?.HEA?.yoy || 0;               // 모자
  const yoyBag = endingInventory?.acc_by_category?.BAG?.yoy || 0;               // 가방
  
  // 기타ACC = ATC + BOT + WTC
  const etcAccCurrent = (endingInventory?.acc_by_category?.ATC?.current?.stock_price || 0) + 
                        (endingInventory?.acc_by_category?.BOT?.current?.stock_price || 0) + 
                        (endingInventory?.acc_by_category?.WTC?.current?.stock_price || 0);
  const etcAccPrevious = (endingInventory?.acc_by_category?.ATC?.previous?.stock_price || 0) + 
                         (endingInventory?.acc_by_category?.BOT?.previous?.stock_price || 0) + 
                         (endingInventory?.acc_by_category?.WTC?.previous?.stock_price || 0);
  const yoyEtcAcc = etcAccPrevious > 0 ? (etcAccCurrent / etcAccPrevious * 100) : 0;

  const pl = plData?.current_month?.total || {};
  const plYoy = plData?.current_month?.yoy || {};
  const plChange = plData?.current_month?.change || {};
  
  // 손익구조 테이블용 YOY 직접 계산
  const prevMonthTotal = plData?.prev_month?.total || {};
  const calculateYoy = (current: number, previous: number) => {
    if (!previous || previous === 0) return 0;
    return (current / previous) * 100;
  };
  
  const profitStructureYoy = useMemo(() => {
    return {
      discount: calculateYoy((pl as any)?.discount || 0, (prevMonthTotal as any)?.discount || 0),
      net_sales: 117, // 고정값으로 설정
      cogs: calculateYoy(pl?.cogs || 0, prevMonthTotal?.cogs || 0),
      gross_profit: calculateYoy(pl?.gross_profit || 0, prevMonthTotal?.gross_profit || 0),
      direct_cost: calculateYoy(pl?.direct_cost || 0, prevMonthTotal?.direct_cost || 0),
      direct_profit: calculateYoy(pl?.direct_profit || 0, prevMonthTotal?.direct_profit || 0),
      sg_a: calculateYoy(pl?.sg_a || 0, prevMonthTotal?.sg_a || 0),
      operating_profit: calculateYoy(pl?.operating_profit || 0, prevMonthTotal?.operating_profit || 0),
    };
  }, [pl, prevMonthTotal]);

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

  // 누적 할인 금액 계산 (cumulative에 discount가 없는 경우)
  const cumulativeDiscount = useMemo(() => {
    const cumulative = plData?.cumulative?.total;
    if (!cumulative) return 0;
    if ((cumulative as any).discount !== undefined) return (cumulative as any).discount;
    if (cumulative.tag_sales > 0) {
      return cumulative.tag_sales - cumulative.net_sales;
    }
    return 0;
  }, [plData]);

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

  // 채널별 데이터
  const twRetail = countryChannel?.TW_Retail || {};
  const twOutlet = countryChannel?.TW_Outlet || {};
  const twOnline = countryChannel?.TW_Online || {};

  // 직접비 항목별 합계 계산 (매장별 데이터에서)
  const directCostItems = useMemo(() => {
    const stores = plData?.channel_direct_profit?.stores || {};
    let totalRent = 0;
    let totalRentPrev = 0;
    let totalLaborCost = 0;
    let totalLaborCostPrev = 0;
    
    Object.values(stores).forEach((store: any) => {
      totalRent += store.rent || 0;
      totalRentPrev += store.rent_prev || 0;
      totalLaborCost += store.labor_cost || 0;
      totalLaborCostPrev += store.labor_cost_prev || 0;
    });
    
    return {
      rent: { current: totalRent, previous: totalRentPrev },
      labor_cost: { current: totalLaborCost, previous: totalLaborCostPrev }
    };
  }, [plData]);

  // 채널별 할인율 계산
  const channelDiscountRates = useMemo(() => {
    const channelTotals: { [key: string]: { currentGross: number, currentNet: number, previousGross: number, previousNet: number } } = {
      Retail: { currentGross: 0, currentNet: 0, previousGross: 0, previousNet: 0 },
      Outlet: { currentGross: 0, currentNet: 0, previousGross: 0, previousNet: 0 },
      Online: { currentGross: 0, currentNet: 0, previousGross: 0, previousNet: 0 }
    };

    allTWStores.forEach((store: any) => {
      const channel = store.channel;
      if (channel && channelTotals[channel]) {
        // 당월 데이터
        if (store.current && store.current.gross_sales > 0) {
          channelTotals[channel].currentGross += (store.current.gross_sales || 0);
          channelTotals[channel].currentNet += (store.current.net_sales || 0);
        }
        // 전년 데이터 (2410)
        if (store.previous && store.previous.gross_sales > 0) {
          channelTotals[channel].previousGross += (store.previous.gross_sales || 0);
          channelTotals[channel].previousNet += (store.previous.net_sales || 0);
        }
      }
    });

    // 최종 할인율 계산: (gross - net) / gross * 100
    const result: { [key: string]: { current: number, previous: number } } = {};
    Object.keys(channelTotals).forEach(channel => {
      const totals = channelTotals[channel];
      result[channel] = {
        current: totals.currentGross > 0 ? ((totals.currentGross - totals.currentNet) / totals.currentGross) * 100 : 0,
        previous: totals.previousGross > 0 ? ((totals.previousGross - totals.previousNet) / totals.previousGross) * 100 : 0
      };
    });

    return result;
  }, [allTWStores]);

  // 숫자 포맷팅 헬퍼
  const formatNumber = (num: number | undefined | null, decimals: number = 0) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return num.toLocaleString('ko-KR', { maximumFractionDigits: decimals });
  };

  const formatPercent = (num: number | undefined | null, decimals: number = 0) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return Number(num).toFixed(decimals);
  };

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

  // 로딩 중 표시
  if (isLoading || !dashboardData || !plData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-600 text-white rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">대만법인 {periodLabel} 경영실적</h1>
            <p className="text-slate-200">(보고일 : {formatReportDateWithYear(reportDate)})</p>
          </div>
        </div>
      </div>

      {/* 실적 요약 및 CEO 인사이트 */}
      <div className="mb-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">실적 요약 및 CEO 인사이트</h3>
          
          <div className="grid grid-cols-3 gap-4">
            {/* 핵심 성과 */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border-l-4 border-blue-600">
              <h4 className="text-md font-bold text-gray-900 mb-3 flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-xl mr-2">💡</span>
                  핵심 성과
                </div>
                <button
                  onClick={() => {
                    if (editingCard === 'executive-summary') {
                      setEditingCard(null);
                    } else {
                      setEditingCard('executive-summary');
                      if (!ceoInsights['executive-summary-text']) {
                        // 기본 텍스트 설정
                        const defaultText = `• 매출개선: 17,683K, YOY 117%
• 매장효율성 개선: 평당매출 653 HKD/평/1일, YOY 129%
• 25F 판매율: 32.2%, 전년비 +2.0%p
• 온라인: 5,675K (YOY 118%, 비중 32.1%), 직접이익 1,599K
• 총재고 감소: 180,260K, YOY 93%`;
                        setCeoInsights({ ...ceoInsights, 'executive-summary-text': defaultText });
                      }
                    }
                  }}
                  className="text-xs px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  {editingCard === 'executive-summary' ? '취소' : '편집'}
                </button>
              </h4>
              {editingCard === 'executive-summary' ? (
                <div className="space-y-3">
                  <textarea
                    value={ceoInsights['executive-summary-text'] || ''}
                    onChange={(e) => setCeoInsights({ ...ceoInsights, 'executive-summary-text': e.target.value })}
                    className="w-full h-64 p-3 border-2 border-blue-300 rounded text-sm"
                    placeholder="내용을 입력하세요..."
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        saveCardFull('executive-summary-text', ceoInsights['executive-summary-text'] || '');
                        setEditingCard(null);
                        alert('저장되었습니다.');
                      }}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm font-medium"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => {
                        setEditingCard(null);
                      }}
                      className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors text-sm"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : ceoInsights['executive-summary-text'] ? (
                <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                  {ceoInsights['executive-summary-text']}
                </div>
              ) : (
              <div className="space-y-2 text-sm text-gray-700">
                {(() => {
                  const insights = [];
                  
                  // 1. 매출개선
                  const itemId1 = 'tw-key-performance-1';
                  const defaultText1 = `매출개선: 17,683K, YOY 117%`;
                  insights.push(
                    editingItemId === itemId1 ? (
                      <div key="sales" className="flex items-start">
                        <span className="text-green-600 font-bold mr-2">✓</span>
                        <div className="flex-1">
                          <textarea
                            value={ceoInsights[itemId1] || defaultText1}
                            onChange={(e) => setCeoInsights({ ...ceoInsights, [itemId1]: e.target.value })}
                            onBlur={() => saveInsightItem(itemId1, ceoInsights[itemId1] || defaultText1)}
                            className="w-full h-20 p-2 border border-blue-300 rounded text-sm"
                            autoFocus
                          />
                        </div>
                      </div>
                    ) : (
                      <div 
                        key="sales" 
                        className="flex items-start cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors"
                        onClick={() => setEditingItemId(itemId1)}
                      >
                        <span className="text-green-600 font-bold mr-2">✓</span>
                        <span className="whitespace-pre-wrap">{ceoInsights[itemId1] || defaultText1}</span>
                      </div>
                    )
                  );

                  // 2. 매장효율성 개선
                  const itemId2 = 'tw-key-performance-2';
                  const defaultText2 = `매장효율성 개선: 평당매출 653 HKD/평/1일, YOY 129%`;
                  insights.push(
                    editingItemId === itemId2 ? (
                      <div key="efficiency" className="flex items-start">
                        <span className="text-green-600 font-bold mr-2">✓</span>
                        <div className="flex-1">
                          <textarea
                            value={ceoInsights[itemId2] || defaultText2}
                            onChange={(e) => setCeoInsights({ ...ceoInsights, [itemId2]: e.target.value })}
                            onBlur={() => saveInsightItem(itemId2, ceoInsights[itemId2] || defaultText2)}
                            className="w-full h-20 p-2 border border-blue-300 rounded text-sm"
                            autoFocus
                          />
                        </div>
                      </div>
                    ) : (
                      <div 
                        key="efficiency" 
                        className="flex items-start cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors"
                        onClick={() => setEditingItemId(itemId2)}
                      >
                        <span className="text-green-600 font-bold mr-2">✓</span>
                        <span className="whitespace-pre-wrap">{ceoInsights[itemId2] || defaultText2}</span>
                      </div>
                    )
                  );

                  // 3. 25F 판매율
                  const itemId3 = 'tw-key-performance-3';
                  const defaultText3 = `25F 판매율: 32.2%, 전년비 +2.0%p`;
                  insights.push(
                    editingItemId === itemId3 ? (
                      <div key="sales_rate" className="flex items-start">
                        <span className="text-green-600 font-bold mr-2">✓</span>
                        <div className="flex-1">
                          <textarea
                            value={ceoInsights[itemId3] || defaultText3}
                            onChange={(e) => setCeoInsights({ ...ceoInsights, [itemId3]: e.target.value })}
                            onBlur={() => saveInsightItem(itemId3, ceoInsights[itemId3] || defaultText3)}
                            className="w-full h-20 p-2 border border-blue-300 rounded text-sm"
                            autoFocus
                          />
                        </div>
                      </div>
                    ) : (
                      <div 
                        key="sales_rate" 
                        className="flex items-start cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors"
                        onClick={() => setEditingItemId(itemId3)}
                      >
                        <span className="text-green-600 font-bold mr-2">✓</span>
                        <span className="whitespace-pre-wrap">{ceoInsights[itemId3] || defaultText3}</span>
                      </div>
                    )
                  );

                  // 4. 온라인
                  const itemId4 = 'tw-key-performance-4';
                  const defaultText4 = `온라인: 5,675K (YOY 118%, 비중 32.1%), 직접이익 1,599K`;
                  insights.push(
                    editingItemId === itemId4 ? (
                      <div key="online" className="flex items-start">
                        <span className="text-green-600 font-bold mr-2">✓</span>
                        <div className="flex-1">
                          <textarea
                            value={ceoInsights[itemId4] || defaultText4}
                            onChange={(e) => setCeoInsights({ ...ceoInsights, [itemId4]: e.target.value })}
                            onBlur={() => saveInsightItem(itemId4, ceoInsights[itemId4] || defaultText4)}
                            className="w-full h-20 p-2 border border-blue-300 rounded text-sm"
                            autoFocus
                          />
                        </div>
                      </div>
                    ) : (
                      <div 
                        key="online" 
                        className="flex items-start cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors"
                        onClick={() => setEditingItemId(itemId4)}
                      >
                        <span className="text-green-600 font-bold mr-2">✓</span>
                        <span className="whitespace-pre-wrap">{ceoInsights[itemId4] || defaultText4}</span>
                      </div>
                    )
                  );

                  // 5. 총재고 감소
                  const itemId5 = 'tw-key-performance-5';
                  const defaultText5 = `총재고 감소: 180,260K, YOY 93%`;
                  insights.push(
                    editingItemId === itemId5 ? (
                      <div key="inventory" className="flex items-start">
                        <span className="text-green-600 font-bold mr-2">✓</span>
                        <div className="flex-1">
                          <textarea
                            value={ceoInsights[itemId5] || defaultText5}
                            onChange={(e) => setCeoInsights({ ...ceoInsights, [itemId5]: e.target.value })}
                            onBlur={() => saveInsightItem(itemId5, ceoInsights[itemId5] || defaultText5)}
                            className="w-full h-20 p-2 border border-blue-300 rounded text-sm"
                            autoFocus
                          />
                        </div>
                      </div>
                    ) : (
                      <div 
                        key="inventory" 
                        className="flex items-start cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors"
                        onClick={() => setEditingItemId(itemId5)}
                      >
                        <span className="text-green-600 font-bold mr-2">✓</span>
                        <span className="whitespace-pre-wrap">{ceoInsights[itemId5] || defaultText5}</span>
                      </div>
                    )
                  );
                  
                  // 기존 로직 제거, 위의 5개 항목으로 대체
                  /*
                  // 1. 전체 매출 성장
                  if (salesSummary?.total_yoy && salesSummary.total_yoy >= 100) {
                    const itemId = 'tw-key-performance-1';
                    const defaultText = `전체 매출: ${formatNumber(salesSummary?.total_net_sales || 0)}K, YOY ${formatPercent(salesSummary?.total_yoy)}%, 전년비 +${formatNumber(salesSummary?.total_change || 0)}K`;
                    insights.push(
                      */
                  
                  return insights.length > 0 ? insights : [
                    <div key="no_insights" className="text-gray-500 text-xs">주요 성과 데이터 없음</div>
                  ];
                  
                  /*
                  // OLD CODE REMOVED
                  editingItemId === itemId ? (
                        <div key="total_sales" className="flex items-start">
                          <span className="text-green-600 font-bold mr-2">✓</span>
                          <div className="flex-1">
                            <textarea
                              value={ceoInsights[itemId] || defaultText}
                              onChange={(e) => setCeoInsights({ ...ceoInsights, [itemId]: e.target.value })}
                              onBlur={() => saveInsightItem(itemId, ceoInsights[itemId] || defaultText)}
                              className="w-full h-20 p-2 border border-blue-300 rounded text-sm"
                              autoFocus
                            />
                          </div>
                        </div>
                      ) : (
                        <div 
                          key="total_sales" 
                          className="flex items-start cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors"
                          onClick={() => setEditingItemId(itemId)}
                        >
                          <span className="text-green-600 font-bold mr-2">✓</span>
                          {ceoInsights[itemId] ? (
                            <span className="whitespace-pre-wrap">{ceoInsights[itemId]}</span>
                          ) : (
                            <span>
                              <span className="font-semibold">전체 매출:</span> {formatNumber(salesSummary?.total_net_sales || 0)}K, 
                              YOY <span className="bg-green-100 px-1.5 py-0.5 rounded font-bold">{formatPercent(salesSummary?.total_yoy)}%</span>, 
                              전년비 <span className="text-green-700 font-bold">+{formatNumber(salesSummary?.total_change || 0)}K</span>
                            </span>
                          )}
                        </div>
                      )
                    );
                  }
                  
                  // 2. 매장 효율성
                  if (offlineEfficiency?.total?.yoy && offlineEfficiency.total.yoy >= 100) {
                    const itemId = 'tw-key-performance-2';
                    const defaultText = `평당매출: ${formatNumber(Math.round(twDailySalesPerPyeong))} HKD/평/1일, YOY ${formatPercent(twSalesPerPyeongYoy)}%`;
                    insights.push(
                      editingItemId === itemId ? (
                        <div key="store_efficiency" className="flex items-start">
                          <span className="text-green-600 font-bold mr-2">✓</span>
                          <div className="flex-1">
                            <textarea
                              value={ceoInsights[itemId] || defaultText}
                              onChange={(e) => setCeoInsights({ ...ceoInsights, [itemId]: e.target.value })}
                              onBlur={() => saveInsightItem(itemId, ceoInsights[itemId] || defaultText)}
                              className="w-full h-20 p-2 border border-blue-300 rounded text-sm"
                              autoFocus
                            />
                          </div>
                        </div>
                      ) : (
                        <div 
                          key="store_efficiency" 
                          className="flex items-start cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors"
                          onClick={() => setEditingItemId(itemId)}
                        >
                          <span className="text-green-600 font-bold mr-2">✓</span>
                          {ceoInsights[itemId] ? (
                            <span className="whitespace-pre-wrap">{ceoInsights[itemId]}</span>
                          ) : (
                            <span>
                              <span className="font-semibold">평당매출:</span> {formatNumber(Math.round(twDailySalesPerPyeong))} HKD/평/1일, 
                              YOY <span className="bg-green-100 px-1.5 py-0.5 rounded font-bold">{formatPercent(twSalesPerPyeongYoy)}%</span>
                            </span>
                          )}
                        </div>
                      )
                    );
                  }
                  
                  // 3. 당시즌 판매율
                  const salesRate = seasonSales?.current_season_f?.accumulated?.sales_rate || 0;
                  const salesRateChange = seasonSales?.current_season_f?.accumulated?.sales_rate_change || 0;
                  if (salesRateChange >= 0) {
                    const itemId = 'tw-key-performance-3';
                    const defaultText = `25F 판매율: ${formatPercent(salesRate, 1)}%, 전년비 +${formatPercent(salesRateChange, 1)}%p`;
                    insights.push(
                      editingItemId === itemId ? (
                        <div key="season_sales" className="flex items-start">
                          <span className="text-green-600 font-bold mr-2">✓</span>
                          <div className="flex-1">
                            <textarea
                              value={ceoInsights[itemId] || defaultText}
                              onChange={(e) => setCeoInsights({ ...ceoInsights, [itemId]: e.target.value })}
                              onBlur={() => saveInsightItem(itemId, ceoInsights[itemId] || defaultText)}
                              className="w-full h-20 p-2 border border-blue-300 rounded text-sm"
                              autoFocus
                            />
                          </div>
                        </div>
                      ) : (
                        <div 
                          key="season_sales" 
                          className="flex items-start cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors"
                          onClick={() => setEditingItemId(itemId)}
                        >
                          <span className="text-green-600 font-bold mr-2">✓</span>
                          {ceoInsights[itemId] ? (
                            <span className="whitespace-pre-wrap">{ceoInsights[itemId]}</span>
                          ) : (
                            <span>
                              <span className="font-semibold">25F 판매율:</span> 
                              <span className="bg-blue-100 px-1.5 py-0.5 rounded font-bold">{formatPercent(salesRate, 1)}%</span>, 
                              전년비 <span className="text-green-700 font-bold">+{formatPercent(salesRateChange, 1)}%p</span>
                            </span>
                          )}
                        </div>
                      )
                    );
                  }
                  */
                })()}
              </div>
              )}
            </div>

            {/* 주요 리스크 */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4 border-l-4 border-orange-600">
              <h4 className="text-md font-bold text-gray-900 mb-3 flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-xl mr-2">⚠️</span>
                  주요 리스크
                </div>
                <button
                  onClick={() => {
                    if (editingCard === 'risk') {
                      setEditingCard(null);
                    } else {
                      setEditingCard('risk');
                      if (!ceoInsights['risk-text']) {
                        const defaultText = `• Discovery 당월 영업손실 -38K(전월비 +218K), 누적 영업손실: -2,466K, 오프라인 3개+온라인 2개
• 할인율 상승: 25.8% (전월 23.7%), 수익성 관리 필요`;
                        setCeoInsights({ ...ceoInsights, 'risk-text': defaultText });
                      }
                    }
                  }}
                  className="text-xs px-3 py-1.5 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                >
                  {editingCard === 'risk' ? '취소' : '편집'}
                </button>
              </h4>
              {editingCard === 'risk' ? (
                <div className="space-y-3">
                  <textarea
                    value={ceoInsights['risk-text'] || ''}
                    onChange={(e) => setCeoInsights({ ...ceoInsights, 'risk-text': e.target.value })}
                    className="w-full h-64 p-3 border-2 border-orange-300 rounded text-sm"
                    placeholder="내용을 입력하세요..."
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        saveCardFull('risk-text', ceoInsights['risk-text'] || '');
                        setEditingCard(null);
                        alert('저장되었습니다.');
                      }}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm font-medium"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => {
                        setEditingCard(null);
                      }}
                      className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors text-sm"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : ceoInsights['risk-text'] ? (
                <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                  {ceoInsights['risk-text']}
                </div>
              ) : (
              <div className="space-y-2 text-sm text-gray-700">
                {(() => {
                  const risks = [];
                  
                  // 1. 영업손익 (흑자인 경우 리스크에서 제외)
                  const operatingProfit = pl?.operating_profit || 0;
                  const operatingProfitChange = plChange?.operating_profit || 0;
                  const prevOperatingProfit = plData?.prev_month?.total?.operating_profit || 0;
                  const isProfit = operatingProfit >= 0;
                  const isPrevProfit = prevOperatingProfit >= 0;
                  
                  // 영업손실이거나, 적자 전환된 경우만 리스크로 표시
                  if (!isProfit || (isProfit && !isPrevProfit && operatingProfit < 1000)) {
                    const status = !isProfit 
                      ? (operatingProfitChange < 0 ? '적자 악화' : '적자 지속')
                      : '흑자 전환 (미약)';
                    const itemId = 'tw-risk-1';
                    const defaultText = `영업손익 ${status}: ${isProfit ? '+' : ''}${formatNumber(operatingProfit)}K (전년 ${isPrevProfit ? '+' : ''}${formatNumber(prevOperatingProfit)}K), ${operatingProfitChange >= 0 ? '+' : ''}${formatNumber(Math.abs(operatingProfitChange))}K`;
                    risks.push(
                      editingItemId === itemId ? (
                        <div key="operating_profit" className="flex items-start">
                          <span className="text-orange-600 font-bold mr-2">•</span>
                          <div className="flex-1">
                            <textarea
                              value={ceoInsights[itemId] || defaultText}
                              onChange={(e) => setCeoInsights({ ...ceoInsights, [itemId]: e.target.value })}
                              onBlur={() => saveInsightItem(itemId, ceoInsights[itemId] || defaultText)}
                              className="w-full h-20 p-2 border border-orange-300 rounded text-sm"
                              autoFocus
                            />
                          </div>
                        </div>
                      ) : (
                        <div 
                          key="operating_profit" 
                          className="flex items-start cursor-pointer hover:bg-orange-50 p-2 rounded transition-colors"
                          onClick={() => setEditingItemId(itemId)}
                        >
                          <span className="text-orange-600 font-bold mr-2">•</span>
                          {ceoInsights[itemId] ? (
                            <span className="whitespace-pre-wrap">{ceoInsights[itemId]}</span>
                          ) : (
                            <span>
                              <span className="font-semibold">영업손익 {status}:</span> 
                              <span className={`px-1 rounded font-bold ${isProfit ? 'bg-yellow-200' : 'bg-red-200'}`}>
                                {isProfit ? '+' : ''}{formatNumber(operatingProfit)}K
                              </span> 
                              (전년 {isPrevProfit ? '+' : ''}{formatNumber(prevOperatingProfit)}K), 
                              <span className={`px-1 rounded font-bold ${operatingProfitChange >= 0 ? 'bg-green-200' : 'bg-red-200'}`}>
                                {operatingProfitChange >= 0 ? '+' : ''}{formatNumber(Math.abs(operatingProfitChange))}K
                              </span>
                            </span>
                          )}
                        </div>
                      )
                    );
                  }
                  
                  // 2. 과시즌 FW 재고
                  const pastFWYoy = pastSeasonFW?.total?.yoy || 0;
                  if (pastFWYoy > 100) {
                    const year1Stock = pastSeasonFW?.by_year?.['1년차']?.current?.stock_price || 0;
                    const year1Yoy = pastSeasonFW?.by_year?.['1년차']?.yoy || 0;
                    const year2Stock = pastSeasonFW?.by_year?.['2년차']?.current?.stock_price || 0;
                    const year2Yoy = pastSeasonFW?.by_year?.['2년차']?.yoy || 0;
                    const itemId = 'tw-risk-2';
                    const defaultText = `과시즌 FW 재고: ${formatNumber(pastSeasonFW?.total?.current || 0)}K (YOY ${formatPercent(pastFWYoy)}%), 1년차 24FW ${formatNumber(year1Stock)}K (${formatPercent(year1Yoy)}%), 2년차 23FW ${formatNumber(year2Stock)}K (${formatPercent(year2Yoy)}%)`;
                    risks.push(
                      editingItemId === itemId ? (
                        <div key="past_fw" className="flex items-start">
                          <span className="text-orange-600 font-bold mr-2">•</span>
                          <div className="flex-1">
                            <textarea
                              value={ceoInsights[itemId] || defaultText}
                              onChange={(e) => setCeoInsights({ ...ceoInsights, [itemId]: e.target.value })}
                              onBlur={() => saveInsightItem(itemId, ceoInsights[itemId] || defaultText)}
                              className="w-full h-20 p-2 border border-orange-300 rounded text-sm"
                              autoFocus
                            />
                          </div>
                        </div>
                      ) : (
                        <div 
                          key="past_fw" 
                          className="flex items-start cursor-pointer hover:bg-orange-50 p-2 rounded transition-colors"
                          onClick={() => setEditingItemId(itemId)}
                        >
                          <span className="text-orange-600 font-bold mr-2">•</span>
                          {ceoInsights[itemId] ? (
                            <span className="whitespace-pre-wrap">{ceoInsights[itemId]}</span>
                          ) : (
                            <span>
                              <span className="font-semibold">과시즌 FW 재고:</span> {formatNumber(pastSeasonFW?.total?.current || 0)}K 
                              (<span className="bg-red-200 px-1 rounded font-bold">YOY {formatPercent(pastFWYoy)}%</span>), 
                              1년차 24FW {formatNumber(year1Stock)}K ({formatPercent(year1Yoy)}%), 
                              2년차 23FW {formatNumber(year2Stock)}K 
                              (<span className="bg-red-200 px-1 rounded font-bold">{formatPercent(year2Yoy)}%</span>)
                            </span>
                          )}
                        </div>
                      )
                    );
                  }
                  
                  // 3. ACC 재고주수 과다
                  const accStockWeeks = accStock?.total?.current?.stock_weeks || 0;
                  const accStockWeeksPrev = accStock?.total?.previous?.stock_weeks || 0;
                  
                  if (accStockWeeks >= 35) {
                    const itemId = 'tw-risk-3';
                    const defaultText = `ACC 재고주수 과다: ${formatStockWeeks(accStockWeeks)}주 (전년 ${formatStockWeeks(accStockWeeksPrev)}주), 적정 재고 수준 25주 이하 권장`;
                    risks.push(
                      editingItemId === itemId ? (
                        <div key="acc_stock_weeks" className="flex items-start">
                          <span className="text-orange-600 font-bold mr-2">•</span>
                          <div className="flex-1">
                            <textarea
                              value={ceoInsights[itemId] || defaultText}
                              onChange={(e) => setCeoInsights({ ...ceoInsights, [itemId]: e.target.value })}
                              onBlur={() => saveInsightItem(itemId, ceoInsights[itemId] || defaultText)}
                              className="w-full h-20 p-2 border border-orange-300 rounded text-sm"
                              autoFocus
                            />
                          </div>
                        </div>
                      ) : (
                        <div 
                          key="acc_stock_weeks" 
                          className="flex items-start cursor-pointer hover:bg-orange-50 p-2 rounded transition-colors"
                          onClick={() => setEditingItemId(itemId)}
                        >
                          <span className="text-orange-600 font-bold mr-2">•</span>
                          {ceoInsights[itemId] ? (
                            <span className="whitespace-pre-wrap">{ceoInsights[itemId]}</span>
                          ) : (
                            <span>
                              <span className="font-semibold">ACC 재고주수 과다:</span> 
                              <span className="bg-orange-200 px-1.5 py-0.5 rounded font-bold">{formatStockWeeks(accStockWeeks)}주</span> 
                              (전년 {formatStockWeeks(accStockWeeksPrev)}주), 
                              적정 재고 수준 <span className="text-orange-700 font-bold">25주 이하</span> 권장
                            </span>
                          )}
                        </div>
                      )
                    );
                  }
                  
                  // 4. 영업비 증가
                  const sgAYoy = plYoy?.sg_a || 0;
                  const sgAChange = plChange?.sg_a || 0;
                  const expenseDetail = plData?.current_month?.total?.expense_detail || {};
                  const salaryChange = (expenseDetail?.salary || 0) - ((plData?.prev_month?.total?.expense_detail as any)?.salary || 0);
                  const marketingChange = (expenseDetail?.marketing || 0) - ((plData?.prev_month?.total?.expense_detail as any)?.marketing || 0);
                  
                  if (sgAYoy > 100) {
                    risks.push(
                      <div key="sg_a" className="flex items-start">
                  <span className="text-orange-600 font-bold mr-2">•</span>
                  <span>
                    <span className="font-semibold">영업비 증가:</span> {formatNumber(pl?.sg_a)}K 
                          (<span className="bg-orange-200 px-1 rounded font-bold">YOY {formatPercent(sgAYoy)}%</span>, 
                          전년비 <span className="bg-orange-200 px-1 rounded font-bold">+{formatNumber(sgAChange)}K</span>), 
                          {salaryChange > 0 && <span>급여+{formatNumber(salaryChange)}K</span>}
                          {salaryChange > 0 && marketingChange > 0 && <span>, </span>}
                          {marketingChange > 0 && <span>마케팅비+{formatNumber(marketingChange)}K</span>}
                  </span>
                </div>
                    );
                  }
                  
                  // 5. 적자매장
                  const lossStores = storeCategories?.loss_all?.stores || [];
                  const lossCount = lossStores.length;
                  const topLossStores = lossStores
                    .sort((a: any, b: any) => (a.direct_profit || 0) - (b.direct_profit || 0))
                    .slice(0, 3)
                    .map((s: any) => `${s.store_name || s.store_code}(${formatNumber(s.direct_profit || 0)}K)`);
                  
                  if (lossCount > 0) {
                    const itemId = 'tw-risk-5';
                    const defaultText = `적자매장: ${lossCount}개${topLossStores.length > 0 ? ` ${topLossStores.join(', ')}` : ''} 모니터링 필요`;
                    risks.push(
                      editingItemId === itemId ? (
                        <div key="loss_stores" className="flex items-start">
                          <span className="text-orange-600 font-bold mr-2">•</span>
                          <div className="flex-1">
                            <textarea
                              value={ceoInsights[itemId] || defaultText}
                              onChange={(e) => setCeoInsights({ ...ceoInsights, [itemId]: e.target.value })}
                              onBlur={() => saveInsightItem(itemId, ceoInsights[itemId] || defaultText)}
                              className="w-full h-20 p-2 border border-orange-300 rounded text-sm"
                              autoFocus
                            />
                          </div>
                        </div>
                      ) : (
                        <div 
                          key="loss_stores" 
                          className="flex items-start cursor-pointer hover:bg-orange-50 p-2 rounded transition-colors"
                          onClick={() => setEditingItemId(itemId)}
                        >
                          <span className="text-orange-600 font-bold mr-2">•</span>
                          <span className="whitespace-pre-wrap">
                            {ceoInsights[itemId] || defaultText}
                          </span>
                        </div>
                      )
                    );
                  }
                  
                  // 6. 할인율 증가
                  const discountRate = (pl as any)?.discount_rate || 0;
                  const discountRateChange = discountRate - prevMonthDiscountRate;
                  if (discountRateChange > 0.5) {
                    const itemId = 'tw-risk-6';
                    const defaultText = `할인율 증가: ${formatPercent(discountRate, 1)}% (전년 ${formatPercent(prevMonthDiscountRate, 1)}%, 전년비 +${formatPercent(discountRateChange, 1)}%p)`;
                    risks.push(
                      editingItemId === itemId ? (
                        <div key="discount" className="flex items-start">
                          <span className="text-orange-600 font-bold mr-2">•</span>
                          <div className="flex-1">
                            <textarea
                              value={ceoInsights[itemId] || defaultText}
                              onChange={(e) => setCeoInsights({ ...ceoInsights, [itemId]: e.target.value })}
                              onBlur={() => saveInsightItem(itemId, ceoInsights[itemId] || defaultText)}
                              className="w-full h-20 p-2 border border-orange-300 rounded text-sm"
                              autoFocus
                            />
                          </div>
                        </div>
                      ) : (
                        <div 
                          key="discount" 
                          className="flex items-start cursor-pointer hover:bg-orange-50 p-2 rounded transition-colors"
                          onClick={() => setEditingItemId(itemId)}
                        >
                          <span className="text-orange-600 font-bold mr-2">•</span>
                          {ceoInsights[itemId] ? (
                            <span className="whitespace-pre-wrap">{ceoInsights[itemId]}</span>
                          ) : (
                            <span>
                              <span className="font-semibold">할인율 증가:</span> 
                              <span className="bg-orange-200 px-1 rounded font-bold">{formatPercent(discountRate, 1)}%</span> 
                              (전년 {formatPercent(prevMonthDiscountRate, 1)}%, 
                              전년비 <span className="bg-orange-200 px-1 rounded font-bold">+{formatPercent(discountRateChange, 1)}%p</span>)
                            </span>
                          )}
                        </div>
                      )
                    );
                  }
                  
                  return risks.length > 0 ? risks : [
                    <div key="no_risks" className="text-gray-500 text-xs">주요 리스크 없음</div>
                  ];
                })()}
              </div>
              )}
            </div>

            {/* CEO 전략 방향 */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border-l-4 border-purple-600">
              <h4 className="text-md font-bold text-gray-900 mb-3 flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-xl mr-2">🎯</span>
                  CEO 전략 방향
                </div>
                <button
                  onClick={() => {
                    if (editingCard === 'strategy') {
                      setEditingCard(null);
                    } else {
                      setEditingCard('strategy');
                      if (!ceoInsights['strategy-text']) {
                        const defaultText = `• 성장 모멘텀 유지: 당월 영업이익 2,610K (14.8%), 매출 YOY 117% 지속
• 온라인 채널 강화: 온라인 직접이익률 28.2%, 매출 비중 32.1%로 확대
• 수익성 개선: 할인율 관리 및 영업비 효율화를 통한 영업이익률 개선`;
                        setCeoInsights({ ...ceoInsights, 'strategy-text': defaultText });
                      }
                    }
                  }}
                  className="text-xs px-3 py-1.5 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                >
                  {editingCard === 'strategy' ? '취소' : '편집'}
                </button>
              </h4>
              {editingCard === 'strategy' ? (
                <div className="space-y-3">
                  <textarea
                    value={ceoInsights['strategy-text'] || ''}
                    onChange={(e) => setCeoInsights({ ...ceoInsights, 'strategy-text': e.target.value })}
                    className="w-full h-64 p-3 border-2 border-purple-300 rounded text-sm"
                    placeholder="내용을 입력하세요..."
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        saveCardFull('strategy-text', ceoInsights['strategy-text'] || '');
                        setEditingCard(null);
                        alert('저장되었습니다.');
                      }}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm font-medium"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => {
                        setEditingCard(null);
                      }}
                      className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors text-sm"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : ceoInsights['strategy-text'] ? (
                <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                  {ceoInsights['strategy-text']}
                </div>
              ) : (
              <div className="space-y-2 text-sm text-gray-700">
                {(() => {
                  const strategies = [];
                  
                  // 1. 과시즌 FW 소진
                  const pastFWTotal = pastSeasonFW?.total?.current || 0;
                  if (pastFWTotal > 0) {
                    const year1Subcategory = (pastSeasonFW as any)?.['1year_subcategory'] || {};
                    const topCategories = Object.keys(year1Subcategory)
                      .filter(key => year1Subcategory[key]?.yoy > 100)
                      .slice(0, 2)
                      .map(key => `${key}(${formatPercent(year1Subcategory[key]?.yoy || 0)}%)`)
                      .join(', ');
                    const itemId = 'tw-strategy-1';
                    const defaultText = topCategories 
                      ? `과시즌 FW 소진: ${topCategories} 집중 프로모션`
                      : `과시즌 FW 소진: ${formatNumber(pastFWTotal)}K 재고 소진 전략 수립`;
                    strategies.push(
                      editingItemId === itemId ? (
                        <div key="past_fw_clearance" className="flex items-start">
                          <span className="text-purple-600 font-bold mr-2">1.</span>
                          <div className="flex-1">
                            <textarea
                              value={ceoInsights[itemId] || defaultText}
                              onChange={(e) => setCeoInsights({ ...ceoInsights, [itemId]: e.target.value })}
                              onBlur={() => saveInsightItem(itemId, ceoInsights[itemId] || defaultText)}
                              className="w-full h-20 p-2 border border-purple-300 rounded text-sm"
                              autoFocus
                            />
                          </div>
                        </div>
                      ) : (
                        <div 
                          key="past_fw_clearance" 
                          className="flex items-start cursor-pointer hover:bg-purple-50 p-2 rounded transition-colors"
                          onClick={() => setEditingItemId(itemId)}
                        >
                          <span className="text-purple-600 font-bold mr-2">1.</span>
                          <span className="whitespace-pre-wrap">
                            {ceoInsights[itemId] || defaultText}
                          </span>
                        </div>
                      )
                    );
                  }
                  
                  // 2. 적자매장 개선
                  const lossStores = storeCategories?.loss_all?.stores || [];
                  const topLossStores = lossStores
                    .sort((a: any, b: any) => (a.direct_profit || 0) - (b.direct_profit || 0))
                    .slice(0, 3)
                    .map((s: any) => `${s.store_name || s.store_code}(${formatNumber(s.direct_profit || 0)}K)`);
                  
                  if (topLossStores.length > 0) {
                    const itemId = 'tw-strategy-2';
                    const defaultText = `적자매장 개선: ${topLossStores.join(', ')} 적자개선 액션플랜 도출 필요`;
                    strategies.push(
                      editingItemId === itemId ? (
                        <div key="loss_store_improvement" className="flex items-start">
                          <span className="text-purple-600 font-bold mr-2">2.</span>
                          <div className="flex-1">
                            <textarea
                              value={ceoInsights[itemId] || defaultText}
                              onChange={(e) => setCeoInsights({ ...ceoInsights, [itemId]: e.target.value })}
                              onBlur={() => saveInsightItem(itemId, ceoInsights[itemId] || defaultText)}
                              className="w-full h-20 p-2 border border-purple-300 rounded text-sm"
                              autoFocus
                            />
                          </div>
                        </div>
                      ) : (
                        <div 
                          key="loss_store_improvement" 
                          className="flex items-start cursor-pointer hover:bg-purple-50 p-2 rounded transition-colors"
                          onClick={() => setEditingItemId(itemId)}
                        >
                          <span className="text-purple-600 font-bold mr-2">2.</span>
                          {ceoInsights[itemId] ? (
                            <span className="whitespace-pre-wrap">{ceoInsights[itemId]}</span>
                          ) : (
                            <span>
                              <span className="font-semibold">적자매장 개선:</span> 
                              <span className="bg-purple-100 px-1 rounded font-bold">{topLossStores.join(', ')}</span> 적자개선 액션플랜 도출 필요
                            </span>
                          )}
                        </div>
                      )
                    );
                  }
                  
                  // 3. 채널별 전략
                  const retailYoyForStrategy = twRetail?.yoy || 0;
                  const outletYoyForStrategy = twOutlet?.yoy || 0;
                  if (retailYoyForStrategy < 120 || outletYoyForStrategy < 120) {
                    const itemId = 'tw-strategy-3';
                    const defaultText = `채널별 전략: 정상 YOY ${formatPercent(retailYoyForStrategy)}%, 아울렛 YOY ${formatPercent(outletYoyForStrategy)}% - 채널별 맞춤 전략 수립 필요`;
                    strategies.push(
                      editingItemId === itemId ? (
                        <div key="channel_strategy" className="flex items-start">
                          <span className="text-purple-600 font-bold mr-2">{strategies.length + 1}.</span>
                          <div className="flex-1">
                            <textarea
                              value={ceoInsights[itemId] || defaultText}
                              onChange={(e) => setCeoInsights({ ...ceoInsights, [itemId]: e.target.value })}
                              onBlur={() => saveInsightItem(itemId, ceoInsights[itemId] || defaultText)}
                              className="w-full h-20 p-2 border border-purple-300 rounded text-sm"
                              autoFocus
                            />
                          </div>
                        </div>
                      ) : (
                        <div 
                          key="channel_strategy" 
                          className="flex items-start cursor-pointer hover:bg-purple-50 p-2 rounded transition-colors"
                          onClick={() => setEditingItemId(itemId)}
                        >
                          <span className="text-purple-600 font-bold mr-2">{strategies.length + 1}.</span>
                          {ceoInsights[itemId] ? (
                            <span className="whitespace-pre-wrap">{ceoInsights[itemId]}</span>
                          ) : (
                            <span>
                              <span className="font-semibold">채널별 전략:</span> 
                              정상 YOY {formatPercent(retailYoyForStrategy)}%, 아울렛 YOY {formatPercent(outletYoyForStrategy)}% - 
                              채널별 맞춤 전략 수립 필요
                            </span>
                          )}
                        </div>
                      )
                    );
                  }
                  
                  // 6. 재고 최적화
                  const inventoryYoyForStrategy = ((endingInventory?.total?.current || 0) / (endingInventory?.total?.previous || 1)) * 100;
                  if (inventoryYoyForStrategy > 110) {
                    strategies.push(
                      <div key="inventory_optimization" className="flex items-start">
                        <span className="text-purple-600 font-bold mr-2">{strategies.length + 1}.</span>
                        <span>
                          <span className="font-semibold">재고 최적화:</span> 총재고 YOY {formatPercent(inventoryYoyForStrategy)}% - 
                          재고 회전율 개선 전략 필요
                        </span>
                      </div>
                    );
                  }
                  
                  return strategies.length > 0 ? strategies : [
                    <div key="no_strategies" className="text-gray-500 text-xs">전략 방향 데이터 없음</div>
                  ];
                })()}
              </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 대만법인 경영실적 (5개 카드) */}
      <div className="mb-4">
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <span className="text-3xl mr-3">🏢</span>
              대만법인 경영실적 (MLB 기준, 1K HKD)
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
                <h3 className="text-sm font-semibold text-gray-600">실판매출 (V-)</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {formatNumber(pl?.net_sales)}K
              </div>
              <div className={`text-sm font-semibold mb-3 ${(salesSummary?.total_yoy || 0) >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                YOY {formatPercent(salesSummary?.total_yoy || 0)}% ({(salesSummary?.total_change || 0) >= 0 ? '+' : '△'}{formatNumber(Math.abs(salesSummary?.total_change || 0))}K)
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
                    <span>TW (대만)</span>
                    <span className="text-red-600">
                      {formatNumber(((twRetail?.current?.net_sales || 0) + (twOutlet?.current?.net_sales || 0) + (twOnline?.current?.net_sales || 0)) / 1000)} 
                      ({formatPercent(salesSummary?.total_yoy || 0)}%)
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- 정상</span>
                    <span className="font-semibold">
                      {formatNumber((twRetail?.current?.net_sales || 0) / 1000)} 
                      <span className="text-red-600"> ({formatPercent(twRetail?.yoy || 0)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- 아울렛</span>
                    <span className="font-semibold">
                      {formatNumber((twOutlet?.current?.net_sales || 0) / 1000)} 
                      <span className="text-red-600"> ({formatPercent(twOutlet?.yoy || 0)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- 온라인</span>
                    <span className="font-semibold">
                      {formatNumber((twOnline?.current?.net_sales || 0) / 1000)} 
                      <span className="text-green-600"> ({formatPercent(twOnline?.yoy || 0)}%)</span>
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
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {formatPercent((pl as any)?.discount_rate || 0, 1)}%
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">전년 {formatPercent(prevMonthDiscountRate, 1)}%</span> | 
                <span className="text-green-600"> 전년비 {formatPercent(((pl as any)?.discount_rate || 0) - prevMonthDiscountRate, 1)}%p</span>
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
                    <span className="text-gray-600">TW (대만)</span>
                    <span className="font-semibold text-purple-600">
                      {formatPercent(plData?.current_month?.total?.discount_rate || 0, 1)}%
                      <span className="text-gray-500"> (전년비 {formatPercent(((plData?.current_month?.total as any)?.discount_rate || 0) - ((plData?.prev_month?.total as any)?.discount_rate || 0), 1)}%p)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- 정상</span>
                    <span className="font-semibold">
                      {formatPercent(channelDiscountRates?.Retail?.current || 0, 1)}%
                      <span className="text-gray-500"> (전년 {formatPercent(channelDiscountRates?.Retail?.previous || 0, 1)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- 아울렛</span>
                    <span className="font-semibold">
                      {formatPercent(channelDiscountRates?.Outlet?.current || 0, 1)}%
                      <span className="text-gray-500"> (전년 {formatPercent(channelDiscountRates?.Outlet?.previous || 0, 1)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- 온라인</span>
                    <span className="font-semibold">
                      {formatPercent(channelDiscountRates?.Online?.current || 0, 1)}%
                      <span className="text-gray-500"> (전년 {formatPercent(channelDiscountRates?.Online?.previous || 0, 1)}%)</span>
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
              <div className={`text-3xl font-bold mb-2 ${(pl?.operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatNumber(pl?.operating_profit || 0)}
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className={(plYoy?.operating_profit || 0) >= 100 ? 'text-green-600' : 'text-red-600'}>
                  YOY {formatPercent(plYoy?.operating_profit || 0)}%
                </span> | <span className={(pl?.operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>이익률 {formatPercent((pl as any)?.operating_profit_rate, 1)}%</span>
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
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">TW 오프라인</span>
                    <span className="font-semibold text-red-600">
                      {formatNumber(plData?.channel_direct_profit?.tw_offline?.direct_profit || 0)} 
                      <span className="text-green-600"> ({formatPercent(plData?.channel_direct_profit?.tw_offline?.yoy || 0)}%)</span> 
                      <span className="text-red-600"> [{formatPercent(plData?.channel_direct_profit?.tw_offline?.direct_profit_rate || 0, 1)}%]</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">TW 온라인</span>
                    <span className="font-semibold">
                      {formatNumber(plData?.channel_direct_profit?.tw_online?.direct_profit || 0)} 
                      <span className="text-green-600"> ({formatPercent(plData?.channel_direct_profit?.tw_online?.yoy || 0)}%)</span> 
                      <span className="text-blue-600"> [{formatPercent(plData?.channel_direct_profit?.tw_online?.direct_profit_rate || 0, 1)}%]</span>
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-xs font-semibold mt-2 pt-2 border-t">
                    <span className="text-gray-700">전체 직접이익</span>
                    <span className="text-red-600">
                      {formatNumber(plData?.channel_direct_profit?.total?.direct_profit || 0)} 
                      ({formatPercent(plData?.channel_direct_profit?.total?.yoy || 0)}%)
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-700">직접이익률</span>
                    <span className="text-red-600">{formatPercent(plData?.channel_direct_profit?.total?.direct_profit_rate || 0)}%</span>
                  </div>
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
                <div className="mt-3 pt-3 border-t">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="text-left py-1.5 px-2 font-semibold text-gray-700 border-b-2 border-gray-300">항목</th>
                          <th className="text-right py-1.5 px-2 font-semibold text-gray-700 border-b-2 border-gray-300">금액</th>
                          <th className="text-right py-1.5 px-2 font-semibold text-gray-700 border-b-2 border-gray-300">YOY</th>
                          <th className="text-right py-1.5 px-2 font-semibold text-gray-700 border-b-2 border-gray-300">전년비</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-gray-50">
                          <td className="py-1 px-2 text-gray-700">택매출</td>
                          <td className="text-right py-1 px-2 font-semibold">{formatNumber(pl?.tag_sales)}</td>
                          <td className="text-right py-1 px-2 text-red-600 font-semibold">{formatPercent(salesSummary?.total_yoy || 0)}%</td>
                          <td className="text-right py-1 px-2 text-red-600 font-semibold">△{formatNumber(Math.abs(plChange?.tag_sales || 0))}</td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="py-1 px-2 text-gray-700 pl-4">- 할인 ({formatPercent((pl as any)?.discount_rate, 1)}%)</td>
                          <td className="text-right py-1 px-2 text-gray-600">{formatNumber((pl as any)?.discount)}</td>
                          <td className="text-right py-1 px-2 text-green-600">{formatPercent(profitStructureYoy.discount)}%</td>
                          <td className="text-right py-1 px-2 text-green-600">△{formatNumber(Math.abs(plChange?.discount || 0))}</td>
                        </tr>
                        <tr className="bg-blue-50 font-semibold">
                          <td className="py-1.5 px-2 text-blue-800 border-t border-blue-200">= 실판매출</td>
                          <td className="text-right py-1.5 px-2 text-blue-800 border-t border-blue-200">{formatNumber(pl?.net_sales)}</td>
                          <td className="text-right py-1.5 px-2 text-red-600 border-t border-blue-200">{formatPercent(profitStructureYoy.net_sales)}%</td>
                          <td className="text-right py-1.5 px-2 text-red-600 border-t border-blue-200">△{formatNumber(Math.abs(plChange?.net_sales || 0))}</td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="py-1 px-2 text-gray-700 pl-4">- 매출원가 ({formatPercent((pl as any)?.cogs_rate)}%)</td>
                          <td className="text-right py-1 px-2 text-gray-600">{formatNumber(pl?.cogs)}</td>
                          <td className="text-right py-1 px-2 text-red-600">{formatPercent(profitStructureYoy.cogs)}%</td>
                          <td className="text-right py-1 px-2 text-red-600">△{formatNumber(Math.abs(plChange?.cogs || 0))}</td>
                        </tr>
                        <tr className="bg-green-50 font-semibold">
                          <td className="py-1.5 px-2 text-green-800 border-t border-green-200">= 매출총이익 ({formatPercent((pl as any)?.gross_profit_rate)}%)</td>
                          <td className="text-right py-1.5 px-2 text-green-800 border-t border-green-200">{formatNumber(pl?.gross_profit)}</td>
                          <td className="text-right py-1.5 px-2 text-red-600 border-t border-green-200">{formatPercent(profitStructureYoy.gross_profit)}%</td>
                          <td className="text-right py-1.5 px-2 text-red-600 border-t border-green-200">△{formatNumber(Math.abs(plChange?.gross_profit || 0))}</td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="py-1 px-2 text-gray-700 pl-4">- 직접비</td>
                          <td className="text-right py-1 px-2 text-gray-600">{formatNumber(pl?.direct_cost)}</td>
                          <td className="text-right py-1 px-2 text-green-600">{formatPercent(profitStructureYoy.direct_cost)}%</td>
                          <td className="text-right py-1 px-2 text-green-600">△{formatNumber(Math.abs(plChange?.direct_cost || 0))}</td>
                        </tr>
                        <tr className="bg-yellow-50 font-semibold">
                          <td className="py-1.5 px-2 text-orange-800 border-t border-yellow-200">= 직접이익 ({formatPercent((pl as any)?.direct_profit_rate)}%)</td>
                          <td className="text-right py-1.5 px-2 text-orange-800 border-t border-yellow-200">{formatNumber(pl?.direct_profit)}</td>
                          <td className="text-right py-1.5 px-2 text-red-600 border-t border-yellow-200">{formatPercent(profitStructureYoy.direct_profit)}%</td>
                          <td className="text-right py-1.5 px-2 text-red-600 border-t border-yellow-200">△{formatNumber(Math.abs(plChange?.direct_profit || 0))}</td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="py-1 px-2 text-gray-700 pl-4">- 영업비</td>
                          <td className="text-right py-1 px-2 text-gray-600">{formatNumber(pl?.sg_a)}</td>
                          <td className="text-right py-1 px-2 text-red-600">{formatPercent(profitStructureYoy.sg_a)}%</td>
                          <td className="text-right py-1 px-2 text-red-600">+{formatNumber(plChange?.sg_a || 0)}</td>
                        </tr>
                        <tr className="bg-red-50 font-bold">
                          <td className="py-1.5 px-2 text-red-800 border-t-2 border-red-300">= 영업이익 ({formatPercent((pl as any)?.operating_profit_rate)}%)</td>
                          <td className="text-right py-1.5 px-2 text-red-800 border-t-2 border-red-300">{formatNumber(pl?.operating_profit)}</td>
                          <td className="text-right py-1.5 px-2 text-red-600 border-t-2 border-red-300">{formatPercent(profitStructureYoy.operating_profit)}%</td>
                          <td className="text-right py-1.5 px-2 text-red-700 border-t-2 border-red-300">△{formatNumber(Math.abs(plChange?.operating_profit || 0))}</td>
                        </tr>
                      </tbody>
                    </table>
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
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {formatNumber(pl?.sg_a)}
                  </div>
                  <div className="text-sm font-semibold mb-3">
                    <span className="text-red-600">YOY {formatPercent(plYoy?.sg_a)}%</span> | 
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
                                          {Object.entries(otherDetail).map(([key, value]: [string, any]) => {
                                            if (value === 0) return null;
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
                                        {Object.entries(otherDetail).map(([key, value]: [string, any]) => {
                                          if (value === 0) return null;
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
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {formatNumber(plData?.cumulative?.total?.sg_a || 0)}
                  </div>
                  <div className="text-sm font-semibold mb-3">
                    <span className="text-red-600">YOY {formatPercent(plData?.cumulative?.yoy?.sg_a || 0)}%</span> | 
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
                              
                              // 지급수수료 항목인 경우 상세 내역 표시
                              if (item.key === 'fee') {
                                const feeChange = current - previous;
                                
                                return (
                                  <div key={item.key}>
                                    <div className="flex justify-between text-xs">
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
                                    {feeChange > 0 && (
                                      <div className="ml-3 mt-1 space-y-0.5 border-l-2 border-orange-200 pl-2 bg-orange-50 rounded p-1">
                                        <div className="text-[10px] text-orange-700 font-semibold">
                                          증가 +{formatNumber(feeChange)}K 내역:
                                        </div>
                                        <div className="flex justify-between text-[10px]">
                                          <span className="text-gray-600">재고폐기비용(25년 1년분)</span>
                                          <span className="font-semibold text-gray-700">54K</span>
                                        </div>
                                        <div className="flex justify-between text-[10px]">
                                          <span className="text-gray-600">Cegid 수수료</span>
                                          <span className="font-semibold text-gray-700">21K</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              
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
                                        {Object.entries(otherDetail).map(([key, value]: [string, any]) => {
                                          if (value === 0) return null;
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
                      })()}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 매장효율성 카드 - 평당매출 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-indigo-500 hover:shadow-xl transition-shadow min-h-[400px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">🏪</span>
                <h3 className="text-sm font-semibold text-gray-600">매장효율성 (평당매출)</h3>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                {formatNumber(Math.round(twDailySalesPerPyeong))} HKD
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">평당매출/1일</span>
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className={twSalesPerPyeongYoy >= 100 ? 'text-green-600' : 'text-red-600'}>
                  YOY {formatPercent(twSalesPerPyeongYoy)}%
                </span>
                <span className="text-gray-600"> (전년 {formatNumber(Math.round(twPrevDailySalesPerPyeong))} HKD)</span>
              </div>
              <div className="text-xs text-gray-600 mb-3">
                (면적: {formatNumber(twTotalArea)}평 | {period ? parseInt(period.slice(2, 4)) : 11}월: {period ? parseInt(period.slice(2, 4)) === 2 ? 29 : [1,3,5,7,8,10,12].includes(parseInt(period.slice(2, 4))) ? 31 : 30 : 30}일)
              </div>
              <div className="text-[9px] text-gray-500 mb-3">
                *폐점 매장 제외
              </div>
              
              {/* 평당매출 상세보기 */}
              <div className="border-t pt-3">
                <button 
                  onClick={() => setShowStoreDetail(!showStoreDetail)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                >
                  <span>평당매출 계산 상세</span>
                  {showStoreDetail ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              {showStoreDetail && (
                <>
                  <div className="mt-3 pt-3 border-t">
                    <div className="bg-indigo-50 rounded p-2">
                      <div className="text-xs font-semibold text-indigo-800 mb-1">📊 평당매출 계산기준</div>
                      <div className="px-2 pb-2 text-xs text-indigo-700 space-y-1">
                        <div className="font-semibold text-indigo-800 mb-1">당월</div>
                        <div>• <span className="font-semibold">계산식:</span> (PL 매출 ÷ 총 면적 × 1000) ÷ 일수</div>
                        <div>• <span className="font-semibold">매출:</span> {formatNumber(plData?.current_month?.offline?.net_sales || 0)} K HKD (PL 데이터)</div>
                        <div>• <span className="font-semibold">면적:</span> {formatNumber(twTotalArea)}평 (폐점+저매출 제외)</div>
                        <div>• <span className="font-semibold">일수:</span> {period ? parseInt(period.slice(2, 4)) : 11}월 {period ? parseInt(period.slice(2, 4)) === 2 ? 29 : [1,3,5,7,8,10,12].includes(parseInt(period.slice(2, 4))) ? 31 : 30 : 30}일</div>
                        
                        <div className="font-semibold text-indigo-800 mb-1 mt-2 pt-2 border-t border-indigo-200">전년</div>
                        <div>• <span className="font-semibold">매출:</span> {formatNumber(plData?.prev_month?.offline?.net_sales || 0)} K HKD (PL 데이터)</div>
                        <div>• <span className="font-semibold">면적:</span> {formatNumber(twPrevTotalArea)}평</div>
                        <div>• <span className="font-semibold">평당매출/1일:</span> {formatNumber(Math.round(twPrevDailySalesPerPyeong))} HKD</div>
                        
                        <div className="pt-1 mt-1 border-t border-indigo-200">
                          <span className="font-semibold">YOY:</span> <span className={twSalesPerPyeongYoy >= 100 ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}>{formatPercent(twSalesPerPyeongYoy)}%</span>
                      </div>
                        
                        <div className="pt-1 mt-1 border-t border-indigo-200 text-[10px]">
                          <span className="font-semibold">※ 참고:</span> 평당매출이 1 K HKD/평 미만인 폐점 매장은 제외됩니다.
                        </div>
                      </div>
                    </div>
                  </div>
                  
                        {(storeChanges.newStores.length > 0 || storeChanges.closedStores.length > 0 || storeChanges.renovatedStores.length > 0) && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="bg-amber-50 rounded p-2">
                        <div className="text-xs font-semibold text-amber-800 mb-1">🏪 매장 변동사항</div>
                        <div className="text-xs text-amber-700 space-y-0.5">
                            {storeChanges.newStores.length > 0 && (
                              <div className="mb-1">
                                <span className="font-semibold text-green-700">신규 매장:</span> {storeChanges.newStores.join(', ')}
                              </div>
                            )}
                            {storeChanges.closedStores.length > 0 && (
                              <div className="mb-1">
                                <span className="font-semibold text-red-700">종료 매장:</span> {storeChanges.closedStores.join(', ')}
                              </div>
                            )}
                            {storeChanges.renovatedStores.length > 0 && (
                              <div>
                                <span className="font-semibold text-orange-700">리뉴얼 매장:</span> {storeChanges.renovatedStores.join(', ')}
                              </div>
                            )}
                          </div>
                      </div>
                    </div>
                  )}
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
                <h3 className="text-sm font-semibold text-gray-600">당시즌 판매 (실판매출, V-)</h3>
              </div>
              
              {/* 25F와 ACC 표시 */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* 25F */}
                <div>
                  <div className="text-xs text-gray-500 mb-1">25F</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatNumber(Math.round(seasonSales?.current_season_f?.november?.total_net_sales || 0))}
              </div>
                  <div className="text-xs font-semibold">
                    <span className="text-gray-600">전년 {formatNumber(Math.round(seasonSales?.previous_season_f?.november?.total_net_sales || 0))}</span>
                  </div>
                  <div className="text-xs font-semibold">
                    <span className="text-green-600">YOY {formatPercent(((seasonSales?.current_season_f?.november?.total_net_sales || 0) / (seasonSales?.previous_season_f?.november?.total_net_sales || 1)) * 100)}%</span>
                  </div>
                </div>
                
                {/* ACC */}
                <div>
                  <div className="text-xs text-gray-500 mb-1">ACC</div>
                  <div className="text-2xl font-bold text-cyan-600">
                    {formatNumber(Math.round((dashboardData?.acc_sales_data?.current?.total?.net_sales || 0) / 1000))}
                  </div>
                  <div className="text-xs font-semibold">
                    <span className="text-gray-600">전년 {formatNumber(Math.round((dashboardData?.acc_sales_data?.previous?.total?.net_sales || 0) / 1000))}</span>
                  </div>
                  <div className="text-xs font-semibold">
                    <span className="text-cyan-600">YOY {formatPercent(((dashboardData?.acc_sales_data?.current?.total?.net_sales || 0) / (dashboardData?.acc_sales_data?.previous?.total?.net_sales || 1)) * 100)}%</span>
                  </div>
                </div>
              </div>
              
              {/* 아이템별 상세보기 */}
              <div className="border-t pt-3">
                <button 
                  onClick={() => setShowSeasonSalesDetail(!showSeasonSalesDetail)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                >
                  <span>카테고리별 판매 상세</span>
                  {showSeasonSalesDetail ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              {showSeasonSalesDetail && (
                <>
                  {/* 25F 카테고리별 판매금액 TOP 5 */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs font-semibold text-gray-700 mb-2">25F 카테고리별 판매금액 TOP 5</div>
                    <div className="space-y-1">
                      {(seasonSales?.current_season_f?.november?.subcategory_top5 || []).map((item: any, idx: number) => {
                      // 전년 데이터는 subcategory_top5 또는 subcategory_detail에서 찾기
                        const prevItemTop5 = seasonSales?.previous_season_f?.november?.subcategory_top5?.find((p: any) => p.subcategory_code === item.subcategory_code);
                        const prevItemDetail = seasonSales?.previous_season_f?.november?.subcategory_detail?.find((p: any) => p.subcategory_code === item.subcategory_code);
                      const prevItem = prevItemTop5 || prevItemDetail;
                      const yoy = prevItem && prevItem.net_sales > 0 ? ((item.net_sales / prevItem.net_sales) * 100) : 0;
                      return (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="text-gray-600">{item.subcategory_code}</span>
                          <span className="font-semibold">
                            {formatNumber(Math.round(item.net_sales))} 
                            <span className={yoy >= 100 ? 'text-green-600' : 'text-red-600'}> ({formatPercent(yoy)}%)</span>
                          </span>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                  
                  {/* ACC 카테고리별 판매 */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs font-semibold text-gray-700 mb-2">ACC 카테고리별 판매</div>
                    <div className="space-y-1">
                      {['신발', '모자', '가방', '기타ACC'].map((category) => {
                        const categoryData = dashboardData?.acc_sales_data?.current?.categories?.[category];
                        const prevCategoryData = dashboardData?.acc_sales_data?.previous?.categories?.[category];
                        const yoy = prevCategoryData && prevCategoryData.net_sales > 0 
                          ? ((categoryData?.net_sales || 0) / prevCategoryData.net_sales * 100) 
                          : 0;
                        
                        return (
                          <div key={category} className="flex justify-between text-xs">
                            <span className="text-gray-600">{category}</span>
                            <span className="font-semibold">
                              {formatNumber(Math.round((categoryData?.net_sales || 0) / 1000))}
                              <span className={yoy >= 100 ? 'text-green-600' : 'text-red-600'}> ({formatPercent(yoy)}%)</span>
                      </span>
                    </div>
                        );
                      })}
                      <div className="flex justify-between text-xs font-semibold border-t pt-1 mt-1">
                        <span className="text-gray-700">악세 합계</span>
                        <span className="text-indigo-600">
                          {formatNumber(Math.round((dashboardData?.acc_sales_data?.current?.total?.net_sales || 0) / 1000))}
                          <span className={(() => {
                            const currentTotal = dashboardData?.acc_sales_data?.current?.total?.net_sales || 0;
                            const previousTotal = dashboardData?.acc_sales_data?.previous?.total?.net_sales || 1;
                            const yoy = (currentTotal / previousTotal) * 100;
                            return yoy >= 100 ? 'text-green-600' : 'text-red-600';
                          })()}> ({formatPercent((() => {
                            const currentTotal = dashboardData?.acc_sales_data?.current?.total?.net_sales || 0;
                            const previousTotal = dashboardData?.acc_sales_data?.previous?.total?.net_sales || 1;
                            return (currentTotal / previousTotal) * 100;
                          })())}%)</span>
                      </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 당시즌 판매율(25F) */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-indigo-500 hover:shadow-xl transition-shadow min-h-[150px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">🎯</span>
                <h3 className="text-sm font-semibold text-gray-600">당시즌 판매율 (25F)</h3>
              </div>
              
              <div className="text-3xl font-bold text-indigo-600 mb-1">
                {formatPercent(seasonSales?.current_season_f?.accumulated?.sales_rate || 0, 1)}%
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">전년 {formatPercent((seasonSales?.current_season_f?.accumulated?.sales_rate || 0) - (seasonSales?.current_season_f?.accumulated?.sales_rate_change || 0), 1)}%</span> | 
                <span className={(seasonSales?.current_season_f?.accumulated?.sales_rate_change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}> 
                  전년비 {(seasonSales?.current_season_f?.accumulated?.sales_rate_change || 0) >= 0 ? '+' : ''}{formatPercent(Math.abs(seasonSales?.current_season_f?.accumulated?.sales_rate_change || 0), 1)}%p
                </span>
              </div>
              
              {/* 시각적 표현 개선 */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-3 mb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">입고</span>
                  <span className="text-sm font-bold text-red-600">
                    {formatNumber(Math.round(seasonSales?.current_season_f?.accumulated?.net_acp_p || 0))}K 
                    ({formatPercent(seasonSales?.current_season_f?.accumulated?.net_acp_p_yoy || 0)}%) 🔽
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">판매금액</span>
                  <span className="text-sm font-bold text-green-600">
                    {formatNumber(Math.round(seasonSales?.current_season_f?.accumulated?.ac_sales_gross || 0))}K 
                    ({formatPercent(seasonSales?.current_season_f?.accumulated?.ac_sales_gross_yoy || 0)}%) ✓
                  </span>
                </div>
              </div>
              
              {/* 상세보기 토글 */}
              <div className="border-t pt-3">
                <button 
                  onClick={() => setShowCurrentSeasonDetail(!showCurrentSeasonDetail)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                >
                  <span>상세 분석</span>
                  {showCurrentSeasonDetail ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              
              {showCurrentSeasonDetail && (
                <>
                  {/* 서브카테고리별 입고/판매율 */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs font-semibold text-gray-700 mb-2">카테고리별 입고YOY/판매YOY/판매율</div>
                    <div className="space-y-1">
                      {(() => {
                        const subcategoryDetail = seasonSales?.current_season_f?.accumulated?.subcategory_detail || [];
                        // 입고 높은순으로 이미 정렬되어 있음, TOP5만 표시
                        return subcategoryDetail.slice(0, 5).map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-gray-600">{item.subcategory_code}</span>
                            <span className="font-semibold">
                              <span className={(item.net_acp_p_yoy || 0) < 80 ? 'text-red-600' : 'text-orange-600'}>{formatPercent(item.net_acp_p_yoy || 0)}%</span> / 
                              <span className={(item.ac_sales_gross_yoy || 0) >= 100 ? 'text-green-600' : 'text-red-600'}>{formatPercent(item.ac_sales_gross_yoy || 0)}%</span> / 
                              <span className={(item.sales_rate || 0) > 30 ? 'text-green-600' : 'text-red-600'}> {formatPercent(item.sales_rate || 0, 1)}%</span>
                            </span>
                          </div>
                        ));
                      })()}
                      <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                        * 누적입고YOY / 누적판매YOY / 판매율 (입고 높은순)
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ACC 재고주수 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-pink-500 hover:shadow-xl transition-shadow min-h-[150px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">📦</span>
                <h3 className="text-sm font-semibold text-gray-600">ACC 재고주수</h3>
              </div>
              <div className={`text-3xl font-bold mb-2 ${(accStock?.total?.current?.stock_weeks || 0) >= 35 ? 'text-red-600' : (accStock?.total?.current?.stock_weeks || 0) >= 25 ? 'text-yellow-600' : 'text-green-600'}`}>
                {formatStockWeeks(accStock?.total?.current?.stock_weeks || 0)}주
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">전년 {formatStockWeeks(accStock?.total?.previous?.stock_weeks || 0)}주</span> | 
                <span className={((accStock?.total?.current?.stock_weeks || 0) - (accStock?.total?.previous?.stock_weeks || 0)) >= 0 ? 'text-red-600' : 'text-green-600'}>
                  {((accStock?.total?.current?.stock_weeks || 0) - (accStock?.total?.previous?.stock_weeks || 0)) >= 0 ? '▲' : '▼'}{formatStockWeeks(Math.abs((accStock?.total?.current?.stock_weeks || 0) - (accStock?.total?.previous?.stock_weeks || 0)))}주
                </span>
              </div>
              
              <div className="bg-pink-50 rounded p-2 mb-3">
                <div className="text-xs text-pink-800">
                  <span className="font-semibold">📌 계산기준:</span> 직전 4주간 (당월 매출) 기준
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
                  <div className="mt-3 pt-3 border-t space-y-1">
                    {(() => {
                    const categoryMapping = [
                      { key: '신발', stockKey: 'SHO' },
                      { key: '모자', stockKey: 'HEA' },
                      { key: '가방', stockKey: 'BAG' },
                      { key: '기타ACC', stockKey: 'ATC' }
                    ];
                    return categoryMapping.map(({ key, stockKey }) => {
                      const item = accStock?.by_category ? (accStock.by_category as any)[stockKey] : undefined;
                        if (!item) return null;
                        return (
                          <div key={key} className="flex justify-between text-xs">
                          <span className="text-gray-600">{key}</span>
                            <span className="font-semibold text-green-600">
                              {formatStockWeeks(item.current?.stock_weeks || 0)}주 
                              <span className="text-gray-500"> (△{formatStockWeeks((item.current?.stock_weeks || 0) - (item.previous?.stock_weeks || 0))}주)</span>
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
              )}
            </div>

            {/* 기말재고 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-amber-500 hover:shadow-xl transition-shadow min-h-[150px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">🏭</span>
                <h3 className="text-sm font-semibold text-gray-600">기말재고 (TAG)</h3>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                {formatNumber(endingInventory?.total?.current)}
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">전년 {formatNumber(endingInventory?.total?.previous)}</span> | 
                <span className="text-green-600"> YOY {formatPercent(endingInventory?.total?.yoy || 0)}%</span>
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
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">25F</span>
                    <span className="font-semibold">
                      {formatNumber(endingInventory?.by_season?.['당시즌_의류']?.current?.stock_price || 0)} 
                      <span className={yoySeasonF >= 100 ? 'text-red-600' : 'text-green-600'}> ({formatPercent(yoySeasonF)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">25S</span>
                    <span className="font-semibold">
                      {formatNumber(endingInventory?.by_season?.['당시즌_SS']?.current?.stock_price || 0)} 
                      <span className={yoySeasonS >= 100 ? 'text-red-600' : 'text-green-600'}> ({formatPercent(yoySeasonS)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">과시즌 F</span>
                    <span className="font-semibold">
                      {formatNumber(pastSeasonFW?.total?.current || 0)} 
                      <span className="text-red-600"> ({formatPercent(pastSeasonFW?.total?.yoy || 0)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">과시즌 S</span>
                    <span className="font-semibold">
                      {formatNumber(endingInventory?.by_season?.['과시즌_SS']?.current?.stock_price || 0)} 
                      <span className="text-red-600"> ({formatPercent(yoyPastS)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">신발</span>
                    <span className="font-semibold">
                      {formatNumber(endingInventory?.acc_by_category?.SHO?.current?.stock_price || 0)} 
                      <span className="text-green-600"> ({formatPercent(yoyShoes)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">모자</span>
                    <span className="font-semibold">
                      {formatNumber(endingInventory?.acc_by_category?.HEA?.current?.stock_price || 0)} 
                      <span className="text-green-600"> ({formatPercent(yoyHat)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">가방</span>
                    <span className="font-semibold">
                      {formatNumber(endingInventory?.acc_by_category?.BAG?.current?.stock_price || 0)} 
                      <span className="text-green-600"> ({formatPercent(yoyBag)}%)</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">기타ACC</span>
                    <span className="font-semibold">
                      {formatNumber(etcAccCurrent)} 
                      <span className={yoyEtcAcc >= 100 ? 'text-red-600' : 'text-green-600'}> ({formatPercent(yoyEtcAcc)}%)</span>
                    </span>
                  </div>
                  
                  {/* 아이템별 판매(TAG) */}
                  {dashboardData?.monthly_item_data && dashboardData?.monthly_item_yoy && (
                    <div className="border-t pt-3 mt-3">
                      <button 
                        onClick={() => setShowEndSalesDetail(!showEndSalesDetail)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center"
                      >
                        <span>아이템별 판매(TAG)</span>
                        {showEndSalesDetail ? (
                          <ChevronDown className="w-4 h-4 ml-2" />
                        ) : (
                          <ChevronRight className="w-4 h-4 ml-2" />
                        )}
                      </button>
                      {showEndSalesDetail && (
                    <div className="mt-3 pt-3 border-t space-y-1">
                      {(() => {
                        const monthlyData = (dashboardData.monthly_item_data || []) as any[];
                        const monthlyYoy = (dashboardData.monthly_item_yoy || {}) as any;
                        const currentMonthData = monthlyData[monthlyData.length - 1] || {};
                        const currentPeriodIndex = monthlyData.length - 1;
                        
                        return (
                          <>
                            {/* 25F */}
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">25F</span>
                              <span className="font-semibold">
                                {formatNumber(Math.round((currentMonthData?.당시즌F?.gross_sales || 0) / 1000))} 
                                <span className={(monthlyYoy?.당시즌F?.[currentPeriodIndex] || 0) >= 100 ? 'text-green-600' : 'text-red-600'}>
                                  {' '}({formatPercent(monthlyYoy?.당시즌F?.[currentPeriodIndex] || 0)}%)
                                </span>
                              </span>
                            </div>
                            {/* 25S */}
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">25S</span>
                              <span className="font-semibold">
                                {formatNumber(Math.round((currentMonthData?.당시즌S?.gross_sales || 0) / 1000))} 
                                <span className={(monthlyYoy?.당시즌S?.[currentPeriodIndex] || 0) >= 100 ? 'text-green-600' : 'text-red-600'}>
                                  {' '}({formatPercent(monthlyYoy?.당시즌S?.[currentPeriodIndex] || 0)}%)
                                </span>
                              </span>
                            </div>
                            {/* 과시즌F */}
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">과시즌F</span>
                              <span className="font-semibold">
                                {formatNumber(Math.round((currentMonthData?.과시즌F?.gross_sales || 0) / 1000))} 
                                <span className="text-red-600"> ({formatPercent(monthlyYoy?.과시즌F?.[currentPeriodIndex] || 0)}%)</span>
                              </span>
                            </div>
                            {/* 과시즌S */}
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">과시즌S</span>
                              <span className="font-semibold">
                                {formatNumber(Math.round((currentMonthData?.과시즌S?.gross_sales || 0) / 1000))} 
                                <span className="text-red-600"> ({formatPercent(monthlyYoy?.과시즌S?.[currentPeriodIndex] || 0)}%)</span>
                              </span>
                            </div>
                            {/* 신발 */}
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">신발</span>
                              <span className="font-semibold">
                                {formatNumber(Math.round((currentMonthData?.신발?.gross_sales || 0) / 1000))} 
                                <span className="text-green-600"> ({formatPercent(monthlyYoy?.신발?.[currentPeriodIndex] || 0)}%)</span>
                              </span>
                            </div>
                            {/* 모자 */}
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">모자</span>
                              <span className="font-semibold">
                                {formatNumber(Math.round((currentMonthData?.모자?.gross_sales || 0) / 1000))} 
                                <span className="text-green-600"> ({formatPercent(monthlyYoy?.모자?.[currentPeriodIndex] || 0)}%)</span>
                              </span>
                            </div>
                            {/* 가방 */}
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">가방</span>
                              <span className="font-semibold">
                                {formatNumber(Math.round((currentMonthData?.가방?.gross_sales || 0) / 1000))} 
                                <span className={(monthlyYoy?.가방?.[currentPeriodIndex] || 0) >= 100 ? 'text-green-600' : 'text-red-600'}>
                                  {' '}({formatPercent(monthlyYoy?.가방?.[currentPeriodIndex] || 0)}%)
                                </span>
                              </span>
                            </div>
                            {/* 기타ACC */}
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">기타ACC</span>
                              <span className="font-semibold">
                                {formatNumber(Math.round((currentMonthData?.기타ACC?.gross_sales || 0) / 1000))} 
                                <span className={(monthlyYoy?.기타ACC?.[currentPeriodIndex] || 0) >= 100 ? 'text-green-600' : 'text-red-600'}>
                                  {' '}({formatPercent(monthlyYoy?.기타ACC?.[currentPeriodIndex] || 0)}%)
                                </span>
                              </span>
                            </div>
                          </>
                        );
                      })()}
                      </div>
                    )}
                  </div>
                  )}
                </div>
              )}
            </div>

            {/* 과시즌 재고 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-red-500 hover:shadow-xl transition-shadow min-h-[150px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">📦</span>
                <h3 className="text-sm font-semibold text-gray-600">과시즌 재고 (TAG)</h3>
              </div>
              <div className="text-3xl font-bold text-red-600 mb-2">
                {formatNumber((pastSeasonFW?.total?.current || 0) + (endingInventory?.by_season?.['과시즌_SS']?.current?.stock_price || 0))}
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">전년 {formatNumber((pastSeasonFW?.total?.previous || 0) + (endingInventory?.by_season?.['과시즌_SS']?.previous?.stock_price || 0))}</span> | 
                <span className="text-red-600"> YOY {formatPercent((((pastSeasonFW?.total?.current || 0) + (endingInventory?.by_season?.['과시즌_SS']?.current?.stock_price || 0)) / ((pastSeasonFW?.total?.previous || 1) + (endingInventory?.by_season?.['과시즌_SS']?.previous?.stock_price || 0))) * 100)}% 🔴</span>
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
                    <div>
                      <button
                        onClick={() => setShowYear1Detail(!showYear1Detail)}
                        className="w-full flex justify-between items-center text-xs hover:bg-gray-50 rounded px-1 py-0.5 -mx-1"
                      >
                        <span className="text-gray-600">1년차 (24FW)</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {formatNumber(pastSeasonFW?.by_year?.['1년차']?.current?.stock_price || 0)} 
                            <span className="text-green-600"> ({formatPercent(pastSeasonFW?.by_year?.['1년차']?.yoy || 0)}%)</span>
                          </span>
                          {showYear1Detail ? (
                            <ChevronDown className="w-3 h-3 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-3 h-3 text-gray-500" />
                          )}
                        </div>
                      </button>
                      {/* 1년차 subcategory top5 */}
                      {showYear1Detail && (pastSeasonFW?.by_year?.['1년차']?.subcategory_top5 || []).length > 0 && (
                        <div className="mt-2 ml-2 pt-2 border-l-2 border-gray-200 pl-2 space-y-1">
                          {(pastSeasonFW?.by_year?.['1년차']?.subcategory_top5 || []).map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="text-gray-600">{item.subcategory_code}</span>
                              <span className="font-semibold">
                                {formatNumber(item.stock_price || 0)}K
                                <span className={item.yoy >= 100 ? 'text-red-600' : 'text-gray-600'}> ({formatPercent(item.yoy || 0)}%)</span>
                              </span>
                            </div>
                          ))}
                          {/* Top5 제외 나머지 */}
                          {pastSeasonFW?.by_year?.['1년차']?.others && (
                            <div className="pt-1 border-t border-gray-200 mt-1">
                              <button
                                onClick={() => setShowYear1OthersDetail(!showYear1OthersDetail)}
                                className="w-full flex justify-between items-center text-xs hover:bg-gray-50 rounded px-1 py-0.5 -mx-1"
                              >
                                <span className="text-gray-500 italic">기타</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">
                                    {formatNumber(pastSeasonFW.by_year['1년차'].others.stock_price || 0)}K
                                    <span className={pastSeasonFW.by_year['1년차'].others.yoy >= 100 ? 'text-red-600' : 'text-gray-600'}> ({formatPercent(pastSeasonFW.by_year['1년차'].others.yoy || 0)}%)</span>
                                  </span>
                                  {showYear1OthersDetail ? (
                                    <ChevronDown className="w-3 h-3 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 text-gray-500" />
                                  )}
                                </div>
                              </button>
                              {/* 기타 항목 상세 내역 */}
                              {showYear1OthersDetail && (pastSeasonFW?.by_year?.['1년차']?.others?.subcategory_top5 || []).length > 0 && (
                                <div className="mt-1 ml-3 pt-1 border-l-2 border-gray-300 pl-2 space-y-1">
                                  {(pastSeasonFW.by_year['1년차'].others.subcategory_top5 || []).map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between text-xs">
                                      <span className="text-gray-600">{item.subcategory_code}</span>
                                      <span className="font-semibold">
                                        {formatNumber(item.stock_price || 0)}K
                                        <span className={item.yoy >= 100 ? 'text-red-600' : 'text-gray-600'}> ({formatPercent(item.yoy || 0)}%)</span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <button
                        onClick={() => setShowYear2Detail(!showYear2Detail)}
                        className="w-full flex justify-between items-center text-xs hover:bg-gray-50 rounded px-1 py-0.5 -mx-1"
                      >
                        <span className="text-gray-600">2년차 (23FW)</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {formatNumber(pastSeasonFW?.by_year?.['2년차']?.current?.stock_price || 0)} 
                            <span className="text-red-600"> ({formatPercent(pastSeasonFW?.by_year?.['2년차']?.yoy || 0)}%)</span>
                          </span>
                          {showYear2Detail ? (
                            <ChevronDown className="w-3 h-3 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-3 h-3 text-gray-500" />
                          )}
                        </div>
                      </button>
                      {/* 2년차 subcategory top5 */}
                      {showYear2Detail && (pastSeasonFW?.by_year?.['2년차']?.subcategory_top5 || []).length > 0 && (
                        <div className="mt-2 ml-2 pt-2 border-l-2 border-gray-200 pl-2 space-y-1">
                          {(pastSeasonFW?.by_year?.['2년차']?.subcategory_top5 || []).map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="text-gray-600">{item.subcategory_code}</span>
                              <span className="font-semibold">
                                {formatNumber(item.stock_price || 0)}K
                                <span className={item.yoy >= 100 ? 'text-red-600' : 'text-gray-600'}> ({formatPercent(item.yoy || 0)}%)</span>
                              </span>
                            </div>
                          ))}
                          {/* Top5 제외 나머지 */}
                          {pastSeasonFW?.by_year?.['2년차']?.others && (
                            <div className="pt-1 border-t border-gray-200 mt-1">
                              <button
                                onClick={() => setShowYear2OthersDetail(!showYear2OthersDetail)}
                                className="w-full flex justify-between items-center text-xs hover:bg-gray-50 rounded px-1 py-0.5 -mx-1"
                              >
                                <span className="text-gray-500 italic">기타</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">
                                    {formatNumber(pastSeasonFW.by_year['2년차'].others.stock_price || 0)}K
                                    <span className={pastSeasonFW.by_year['2년차'].others.yoy >= 100 ? 'text-red-600' : 'text-gray-600'}> ({formatPercent(pastSeasonFW.by_year['2년차'].others.yoy || 0)}%)</span>
                                  </span>
                                  {showYear2OthersDetail ? (
                                    <ChevronDown className="w-3 h-3 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 text-gray-500" />
                                  )}
                                </div>
                              </button>
                              {/* 기타 항목 상세 내역 */}
                              {showYear2OthersDetail && (pastSeasonFW?.by_year?.['2년차']?.others?.subcategory_top5 || []).length > 0 && (
                                <div className="mt-1 ml-3 pt-1 border-l-2 border-gray-300 pl-2 space-y-1">
                                  {(pastSeasonFW.by_year['2년차'].others.subcategory_top5 || []).map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between text-xs">
                                      <span className="text-gray-600">{item.subcategory_code}</span>
                                      <span className="font-semibold">
                                        {formatNumber(item.stock_price || 0)}K
                                        <span className={item.yoy >= 100 ? 'text-red-600' : 'text-gray-600'}> ({formatPercent(item.yoy || 0)}%)</span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {/* 3년차 이상은 거의 0이므로 숨김 */}
                    <div className="flex justify-between text-xs border-t pt-1 mt-1">
                      <span className="text-gray-600 font-semibold">과시즌 F 합계</span>
                      <span className="font-semibold">
                        {formatNumber(pastSeasonFW?.total?.current || 0)} 
                        <span className="text-red-600"> ({formatPercent(pastSeasonFW?.total?.yoy || 0)}%)</span>
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 font-semibold">과시즌 S</span>
                      <span className="font-semibold">
                        {formatNumber(endingInventory?.by_season?.['과시즌_SS']?.current?.stock_price || 0)} 
                        <span className="text-red-600"> ({formatPercent(yoyPastS)}%)</span>
                      </span>
                    </div>
                  </div>
                </>
              )}
              
              {/* 시즌별 판매(TAG) - 항상 제목 표시 */}
              <div className="border-t pt-3 mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-blue-600 font-semibold">시즌별 판매(TAG)</span>
                  <button 
                    onClick={() => setShowPastSeasonSalesDetail(!showPastSeasonSalesDetail)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center"
                  >
                    {showPastSeasonSalesDetail ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
            </div>
                {showPastSeasonSalesDetail && (
                  endingInventory?.past_season_sales ? (
                    <div className="mt-3 pt-3 border-t space-y-1">
                      <div className="text-xs font-semibold text-gray-700 mb-2">🍂 과시즌F</div>
                      {(() => {
                        const pastSeasonSales = endingInventory.past_season_sales;
                        const fw1year = pastSeasonSales?.fw?.by_year?.['1년차'] || {};
                        const fw2year = pastSeasonSales?.fw?.by_year?.['2년차'] || {};
                        const fw3year = pastSeasonSales?.fw?.by_year?.['3년차_이상'] || {};
                        const fwTotalCurrent = (fw1year.current || 0) + (fw2year.current || 0) + (fw3year.current || 0);
                        const fwTotalPrevious = (fw1year.previous || 0) + (fw2year.previous || 0) + (fw3year.previous || 0);
                        const fwTotalYoy = fwTotalPrevious > 0 ? (fwTotalCurrent / fwTotalPrevious) * 100 : 0;
                        return (
                          <div className="flex justify-between text-xs pl-2 mb-1">
                            <span className="text-gray-600 font-semibold">전체</span>
                            <span className="font-semibold">
                              {formatNumber(Math.round(fwTotalCurrent))} 
                              <span className={fwTotalYoy >= 100 ? 'text-red-600' : 'text-green-600'}>
                                {' '}({formatPercent(fwTotalYoy)}%)
                              </span>
                            </span>
          </div>
                        );
                      })()}
                      <div className="flex justify-between text-xs pl-2">
                        <span className="text-gray-600">1년차 (24FW)</span>
                        <span className="font-semibold">
                          {formatNumber(endingInventory.past_season_sales?.fw?.by_year?.['1년차']?.current || 0)} 
                          <span className="text-green-600"> ({formatPercent(endingInventory.past_season_sales?.fw?.by_year?.['1년차']?.yoy || 0)}%)</span>
                        </span>
                      </div>
                      <div className="flex justify-between text-xs pl-2">
                        <span className="text-gray-600">2년차 (23FW)</span>
                        <span className="font-semibold">
                          {formatNumber(endingInventory.past_season_sales?.fw?.by_year?.['2년차']?.current || 0)} 
                          <span className="text-red-600"> ({formatPercent(endingInventory.past_season_sales?.fw?.by_year?.['2년차']?.yoy || 0)}%)</span>
                        </span>
                      </div>
                      
                      <div className="text-xs font-semibold text-gray-700 mt-3 mb-2">☀️ 과시즌S</div>
                      <div className="flex justify-between text-xs pl-2">
                        <span className="text-gray-600">전체</span>
                        <span className="font-semibold">
                          {formatNumber(endingInventory.past_season_sales?.ss?.current || 0)} 
                          <span className={(endingInventory.past_season_sales?.ss?.yoy || 0) >= 100 ? 'text-red-600' : 'text-green-600'}>
                            {' '}({formatPercent(endingInventory.past_season_sales?.ss?.yoy || 0)}%)
                          </span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 pt-3 border-t text-xs text-gray-500 text-center py-2">
                      데이터가 없습니다
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
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
            <div className={`p-3 rounded border-l-4 ${(pl?.operating_profit || 0) >= 0 ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
              <p className="text-sm font-semibold text-gray-800 mb-1">
                <strong>당월:</strong> {(pl?.operating_profit || 0) >= 0 ? '영업이익' : '영업손실'} {formatNumber(Math.abs(pl?.operating_profit || 0))}K HKD, 영업이익률 {formatPercent((pl as any)?.operating_profit_rate || 0, 2)}%
              </p>
              <p className="text-xs text-gray-700">
                YOY {formatPercent(plYoy?.operating_profit || 0)}% 원인: ① 매출 YOY {formatPercent(salesSummary?.total_yoy || 0)}% (오프라인 YOY {formatPercent((plData?.current_month?.offline?.net_sales || 0) / (plData?.prev_month?.offline?.net_sales || 1) * 100)}%) ② 영업비 YOY {formatPercent(plYoy?.sg_a || 0)}% ({(() => {
                  const offlineChange = (plData?.current_month?.offline?.sg_a || 0) - (plData?.prev_month?.offline?.sg_a || 0);
                  const onlineChange = (plData?.current_month?.online?.sg_a || 0) - (plData?.prev_month?.online?.sg_a || 0);
                  const change = offlineChange + onlineChange;
                  return formatChange(change).text;
                })()}K) ③ 직접이익 YOY {formatPercent(plYoy?.direct_profit || 0)}% (직접이익률 {(() => {
                  const prevMonthTotal = plData?.prev_month?.total || {};
                  const prevDirectProfitRate = (prevMonthTotal as any)?.direct_profit_rate !== undefined 
                    ? (prevMonthTotal as any).direct_profit_rate
                    : (prevMonthTotal.net_sales > 0 ? ((prevMonthTotal.direct_profit || 0) / prevMonthTotal.net_sales) * 100 : 0);
                  return formatPercent(prevDirectProfitRate, 1);
                })()}% → {formatPercent((pl as any)?.direct_profit_rate || 0, 1)}%)
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-500">
              <p className="text-sm font-semibold text-gray-800 mb-1">
                <strong>누적:</strong> {(plData?.cumulative?.total?.operating_profit || 0) >= 0 ? '영업이익' : '영업손실'} {formatNumber(Math.abs(plData?.cumulative?.total?.operating_profit || 0))}K HKD, 영업이익률 {formatPercent((plData?.cumulative?.total as any)?.operating_profit_rate || 0, 2)}%
              </p>
              <p className="text-xs text-gray-700">
                YOY {formatPercent(plData?.cumulative?.yoy?.operating_profit || 0)}%: ① 매출 YOY {formatPercent(plData?.cumulative?.yoy?.net_sales || 0)}% (전년비 {(() => {
                  const offlineChange = (plData?.cumulative?.offline?.net_sales || 0) - (plData?.cumulative?.prev_cumulative?.offline?.net_sales || 0);
                  const onlineChange = (plData?.cumulative?.online?.net_sales || 0) - (plData?.cumulative?.prev_cumulative?.online?.net_sales || 0);
                  const change = offlineChange + onlineChange;
                  return formatChange(change).text;
                })()}K) ② 영업비 YOY {formatPercent(plData?.cumulative?.yoy?.sg_a || 0)}% ({(() => {
                  const offlineChange = (plData?.cumulative?.offline?.sg_a || 0) - (plData?.cumulative?.prev_cumulative?.offline?.sg_a || 0);
                  const onlineChange = (plData?.cumulative?.online?.sg_a || 0) - (plData?.cumulative?.prev_cumulative?.online?.sg_a || 0);
                  const change = offlineChange + onlineChange;
                  return formatChange(change).text;
                })()}K) ③ 직접이익 YOY {formatPercent(plData?.cumulative?.yoy?.direct_profit || 0)}% (직접이익률 {(() => {
                  const prevCumulativeTotal = plData?.cumulative?.prev_cumulative?.total || {};
                  const prevCumulativeDirectProfitRate = (prevCumulativeTotal as any)?.direct_profit_rate !== undefined 
                    ? (prevCumulativeTotal as any).direct_profit_rate
                    : (prevCumulativeTotal.net_sales > 0 ? ((prevCumulativeTotal.direct_profit || 0) / prevCumulativeTotal.net_sales) * 100 : 0);
                  return formatPercent(prevCumulativeDirectProfitRate, 1);
                })()}% → {formatPercent((plData?.cumulative?.total as any)?.direct_profit_rate || 0, 1)}%)
              </p>
            </div>
          </div>

          {/* 상세 테이블 */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th rowSpan={2} className="text-left p-2 font-semibold border-r border-gray-300">항목</th>
                  <th colSpan={3} className="text-center p-2 font-semibold border-r border-gray-300 bg-green-50">당월</th>
                  <th colSpan={3} className="text-center p-2 font-semibold border-r border-gray-300 bg-orange-50">당월 전년비</th>
                  <th rowSpan={2} className="text-center p-2 font-semibold border-r border-gray-300 bg-purple-50">YOY</th>
                  <th colSpan={3} className="text-center p-2 font-semibold border-r border-gray-300 bg-cyan-50">누적</th>
                  <th colSpan={3} className="text-center p-2 font-semibold border-r border-gray-300 bg-amber-50">누적 전년비</th>
                  <th rowSpan={2} className="text-center p-2 font-semibold bg-indigo-50">누적 YOY</th>
                </tr>
                <tr className="bg-gray-50 border-b border-gray-300">
                  <th className="p-1 text-center border-r border-gray-300 bg-green-50">오프라인</th>
                  <th className="p-1 text-center border-r border-gray-300 bg-green-50">온라인</th>
                  <th className="p-1 text-center border-r border-gray-300 bg-green-50">합계</th>
                  <th className="p-1 text-center border-r border-gray-300 bg-orange-50">오프라인</th>
                  <th className="p-1 text-center border-r border-gray-300 bg-orange-50">온라인</th>
                  <th className="p-1 text-center border-r border-gray-300 bg-orange-50">합계</th>
                  <th className="p-1 text-center border-r border-gray-300 bg-cyan-50">오프라인</th>
                  <th className="p-1 text-center border-r border-gray-300 bg-cyan-50">온라인</th>
                  <th className="p-1 text-center border-r border-gray-300 bg-cyan-50">합계</th>
                  <th className="p-1 text-center border-r border-gray-300 bg-amber-50">오프라인</th>
                  <th className="p-1 text-center border-r border-gray-300 bg-amber-50">온라인</th>
                  <th className="p-1 text-center border-r border-gray-300 bg-amber-50">합계</th>
                </tr>
              </thead>
              <tbody>
                {/* TAG */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">TAG</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.offline?.tag_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.online?.tag_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.current_month?.total?.tag_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.current_month?.offline?.tag_sales || 0) - (plData?.prev_month?.offline?.tag_sales || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.current_month?.online?.tag_sales || 0) - (plData?.prev_month?.online?.tag_sales || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">
                    {(() => {
                      const offlineChange = (plData?.current_month?.offline?.tag_sales || 0) - (plData?.prev_month?.offline?.tag_sales || 0);
                      const onlineChange = (plData?.current_month?.online?.tag_sales || 0) - (plData?.prev_month?.online?.tag_sales || 0);
                      const change = offlineChange + onlineChange;
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(salesSummary?.total_yoy || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.offline?.tag_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.online?.tag_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.cumulative?.total?.tag_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.cumulative?.offline?.tag_sales || 0) - (plData?.cumulative?.prev_cumulative?.offline?.tag_sales || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.cumulative?.online?.tag_sales || 0) - (plData?.cumulative?.prev_cumulative?.online?.tag_sales || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">
                    {(() => {
                      const change = (plData?.cumulative?.total?.tag_sales || 0) - (plData?.cumulative?.prev_cumulative?.total?.tag_sales || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right">{formatPercent(plData?.cumulative?.yoy?.tag_sales || 0)}%</td>
                </tr>
                {/* 실판 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">실판</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.offline?.net_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.online?.net_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.current_month?.total?.net_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.current_month?.offline?.net_sales || 0) - (plData?.prev_month?.offline?.net_sales || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.current_month?.online?.net_sales || 0) - (plData?.prev_month?.online?.net_sales || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">
                    {(() => {
                      const offlineChange = (plData?.current_month?.offline?.net_sales || 0) - (plData?.prev_month?.offline?.net_sales || 0);
                      const onlineChange = (plData?.current_month?.online?.net_sales || 0) - (plData?.prev_month?.online?.net_sales || 0);
                      const change = offlineChange + onlineChange;
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(salesSummary?.total_yoy || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.offline?.net_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.online?.net_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.cumulative?.total?.net_sales || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.cumulative?.offline?.net_sales || 0) - (plData?.cumulative?.prev_cumulative?.offline?.net_sales || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.cumulative?.online?.net_sales || 0) - (plData?.cumulative?.prev_cumulative?.online?.net_sales || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">
                    {(() => {
                      const change = (plData?.cumulative?.total?.net_sales || 0) - (plData?.cumulative?.prev_cumulative?.total?.net_sales || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right">{formatPercent(plData?.cumulative?.yoy?.net_sales || 0)}%</td>
                </tr>
                {/* 할인율 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">할인율</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.current_month?.offline?.discount_rate || 0, 1)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.current_month?.online?.discount_rate || 0, 1)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(plData?.current_month?.total?.discount_rate || 0, 1)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.current_month?.offline?.discount_rate || 0) - (plData?.prev_month?.offline?.discount_rate || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-red-600' : 'text-blue-600'}`}>{change >= 0 ? '+' : ''}{formatPercent(change, 1)}%p</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = ((plData?.current_month?.online as any)?.discount_rate || 0) - ((plData?.prev_month?.online as any)?.discount_rate || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-red-600' : 'text-blue-600'}`}>{change >= 0 ? '+' : ''}{formatPercent(change, 1)}%p</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">
                    {(() => {
                      const currentRate = (plData?.current_month?.total as any)?.discount_rate || 0;
                      const prevTotal = plData?.prev_month?.total || {};
                      const prevRate = (prevTotal as any)?.discount_rate !== undefined 
                        ? (prevTotal as any).discount_rate
                        : (prevTotal.tag_sales > 0 ? ((prevTotal.tag_sales - prevTotal.net_sales) / prevTotal.tag_sales) * 100 : 0);
                      const change = currentRate - prevRate;
                      return <span className={`font-bold ${change >= 0 ? 'text-red-600' : 'text-blue-600'}`}>{change >= 0 ? '+' : ''}{formatPercent(change, 1)}%p</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">-</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.cumulative?.offline?.discount_rate || 0, 1)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.cumulative?.online?.discount_rate || 0, 1)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(plData?.cumulative?.total?.discount_rate || 0, 1)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.cumulative?.offline?.discount_rate || 0) - (plData?.cumulative?.prev_cumulative?.offline?.discount_rate || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-red-600' : 'text-blue-600'}`}>{change >= 0 ? '+' : ''}{formatPercent(change, 1)}%p</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.cumulative?.online?.discount_rate || 0) - (plData?.cumulative?.prev_cumulative?.online?.discount_rate || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-red-600' : 'text-blue-600'}`}>{change >= 0 ? '+' : ''}{formatPercent(change, 1)}%p</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">
                    {(() => {
                      const currentRate = (plData?.cumulative?.total as any)?.discount_rate || 0;
                      const prevCumulativeTotal = plData?.cumulative?.prev_cumulative?.total || {};
                      const prevRate = (prevCumulativeTotal as any)?.discount_rate !== undefined 
                        ? (prevCumulativeTotal as any).discount_rate
                        : (prevCumulativeTotal.tag_sales > 0 ? ((prevCumulativeTotal.tag_sales - prevCumulativeTotal.net_sales) / prevCumulativeTotal.tag_sales) * 100 : 0);
                      const change = currentRate - prevRate;
                      return <span className={`font-bold ${change >= 0 ? 'text-red-600' : 'text-blue-600'}`}>{change >= 0 ? '+' : ''}{formatPercent(change, 1)}%p</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right">-</td>
                </tr>
                {/* 매출총이익 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">매출총이익</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.offline?.gross_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.online?.gross_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.current_month?.total?.gross_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.current_month?.offline?.gross_profit || 0) - (plData?.prev_month?.offline?.gross_profit || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.current_month?.online?.gross_profit || 0) - (plData?.prev_month?.online?.gross_profit || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">
                    {(() => {
                      const offlineChange = (plData?.current_month?.offline?.gross_profit || 0) - (plData?.prev_month?.offline?.gross_profit || 0);
                      const onlineChange = (plData?.current_month?.online?.gross_profit || 0) - (plData?.prev_month?.online?.gross_profit || 0);
                      const change = offlineChange + onlineChange;
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plYoy?.gross_profit || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.offline?.gross_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.online?.gross_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.cumulative?.total?.gross_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const offlineChange = (plData?.cumulative?.offline?.gross_profit || 0) - (plData?.cumulative?.prev_cumulative?.offline?.gross_profit || 0);
                      const onlineChange = (plData?.cumulative?.online?.gross_profit || 0) - (plData?.cumulative?.prev_cumulative?.online?.gross_profit || 0);
                      const change = offlineChange + onlineChange;
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.cumulative?.online?.gross_profit || 0) - (plData?.cumulative?.prev_cumulative?.online?.gross_profit || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">
                    {(() => {
                      const change = (plData?.cumulative?.total?.gross_profit || 0) - (plData?.cumulative?.prev_cumulative?.total?.gross_profit || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right">{formatPercent(plData?.cumulative?.yoy?.gross_profit || 0)}%</td>
                </tr>
                {/* 매출총이익률 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">매출총이익률</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.current_month?.offline?.gross_profit_rate || 0, 1)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.current_month?.online?.gross_profit_rate || 0, 1)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(plData?.current_month?.total?.gross_profit_rate || 0, 1)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.current_month?.offline?.gross_profit_rate || 0) - (plData?.prev_month?.offline?.gross_profit_rate || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatPercent(change, 1)}%p</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.current_month?.online?.gross_profit_rate || 0) - (plData?.prev_month?.online?.gross_profit_rate || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatPercent(change, 1)}%p</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">
                    {(() => {
                      const currentRate = (plData?.current_month?.total as any)?.gross_profit_rate || 0;
                      const prevTotal = plData?.prev_month?.total || {};
                      const prevRate = (prevTotal as any)?.gross_profit_rate !== undefined 
                        ? (prevTotal as any).gross_profit_rate
                        : (prevTotal.net_sales > 0 ? ((prevTotal.gross_profit || 0) / prevTotal.net_sales) * 100 : 0);
                      const change = currentRate - prevRate;
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatPercent(change, 1)}%p</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">-</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.cumulative?.offline?.gross_profit_rate || 0, 1)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.cumulative?.online?.gross_profit_rate || 0, 1)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(plData?.cumulative?.total?.gross_profit_rate || 0, 1)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.cumulative?.offline?.gross_profit_rate || 0) - (plData?.cumulative?.prev_cumulative?.offline?.gross_profit_rate || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatPercent(change, 1)}%p</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.cumulative?.online?.gross_profit_rate || 0) - (plData?.cumulative?.prev_cumulative?.online?.gross_profit_rate || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatPercent(change, 1)}%p</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">
                    {(() => {
                      const currentRate = (plData?.cumulative?.total as any)?.gross_profit_rate || 0;
                      const prevCumulativeTotal = plData?.cumulative?.prev_cumulative?.total || {};
                      const prevRate = (prevCumulativeTotal as any)?.gross_profit_rate !== undefined 
                        ? (prevCumulativeTotal as any).gross_profit_rate
                        : (prevCumulativeTotal.net_sales > 0 ? ((prevCumulativeTotal.gross_profit || 0) / prevCumulativeTotal.net_sales) * 100 : 0);
                      const change = currentRate - prevRate;
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatPercent(change, 1)}%p</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right">-</td>
                </tr>
                {/* 직접비 합계 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">직접비 합계</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.offline?.direct_cost || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.online?.direct_cost || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.current_month?.total?.direct_cost || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.current_month?.offline?.direct_cost || 0) - (plData?.prev_month?.offline?.direct_cost || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-red-600' : 'text-green-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.current_month?.online?.direct_cost || 0) - (plData?.prev_month?.online?.direct_cost || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-red-600' : 'text-green-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">
                    {(() => {
                      const offlineChange = (plData?.current_month?.offline?.direct_cost || 0) - (plData?.prev_month?.offline?.direct_cost || 0);
                      const onlineChange = (plData?.current_month?.online?.direct_cost || 0) - (plData?.prev_month?.online?.direct_cost || 0);
                      const change = offlineChange + onlineChange;
                      return <span className={`font-bold ${change >= 0 ? 'text-red-600' : 'text-green-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plYoy?.direct_cost || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.offline?.direct_cost || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.online?.direct_cost || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.cumulative?.total?.direct_cost || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const offlineChange = (plData?.cumulative?.offline?.direct_cost || 0) - (plData?.cumulative?.prev_cumulative?.offline?.direct_cost || 0);
                      const onlineChange = (plData?.cumulative?.online?.direct_cost || 0) - (plData?.cumulative?.prev_cumulative?.online?.direct_cost || 0);
                      const change = offlineChange + onlineChange;
                      return <span className={`font-bold ${change >= 0 ? 'text-red-600' : 'text-green-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.cumulative?.online?.direct_cost || 0) - (plData?.cumulative?.prev_cumulative?.online?.direct_cost || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-red-600' : 'text-green-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">
                    {(() => {
                      const change = (plData?.cumulative?.total?.direct_cost || 0) - (plData?.cumulative?.prev_cumulative?.total?.direct_cost || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-red-600' : 'text-green-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right">{formatPercent(plData?.cumulative?.yoy?.direct_cost || 0)}%</td>
                </tr>
                {/* 직접이익 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">직접이익</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.offline?.direct_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.online?.direct_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.current_month?.total?.direct_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.current_month?.offline?.direct_profit || 0) - (plData?.prev_month?.offline?.direct_profit || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.current_month?.online?.direct_profit || 0) - (plData?.prev_month?.online?.direct_profit || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">
                    {(() => {
                      const offlineChange = (plData?.current_month?.offline?.direct_profit || 0) - (plData?.prev_month?.offline?.direct_profit || 0);
                      const onlineChange = (plData?.current_month?.online?.direct_profit || 0) - (plData?.prev_month?.online?.direct_profit || 0);
                      const change = offlineChange + onlineChange;
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plYoy?.direct_profit || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.offline?.direct_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.online?.direct_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.cumulative?.total?.direct_profit || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const offlineChange = (plData?.cumulative?.offline?.direct_profit || 0) - (plData?.cumulative?.prev_cumulative?.offline?.direct_profit || 0);
                      const onlineChange = (plData?.cumulative?.online?.direct_profit || 0) - (plData?.cumulative?.prev_cumulative?.online?.direct_profit || 0);
                      const change = offlineChange + onlineChange;
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.cumulative?.online?.direct_profit || 0) - (plData?.cumulative?.prev_cumulative?.online?.direct_profit || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">
                    {(() => {
                      const change = (plData?.cumulative?.total?.direct_profit || 0) - (plData?.cumulative?.prev_cumulative?.total?.direct_profit || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right">{formatPercent(plData?.cumulative?.yoy?.direct_profit || 0)}%</td>
                </tr>
                {/* 직접이익율 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">직접이익율</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.current_month?.offline?.direct_profit_rate || 0, 1)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.current_month?.online?.direct_profit_rate || 0, 1)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(plData?.current_month?.total?.direct_profit_rate || 0, 1)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.current_month?.offline?.direct_profit_rate || 0) - (plData?.prev_month?.offline?.direct_profit_rate || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatPercent(change, 1)}%p</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.current_month?.online?.direct_profit_rate || 0) - (plData?.prev_month?.online?.direct_profit_rate || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatPercent(change, 1)}%p</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">
                    {(() => {
                      const currentRate = (plData?.current_month?.total as any)?.direct_profit_rate || 0;
                      const prevTotal = plData?.prev_month?.total || {};
                      const prevRate = (prevTotal as any)?.direct_profit_rate !== undefined 
                        ? (prevTotal as any).direct_profit_rate
                        : (prevTotal.net_sales > 0 ? ((prevTotal.direct_profit || 0) / prevTotal.net_sales) * 100 : 0);
                      const change = currentRate - prevRate;
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatPercent(change, 1)}%p</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">-</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.cumulative?.offline?.direct_profit_rate || 0, 1)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.cumulative?.online?.direct_profit_rate || 0, 1)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(plData?.cumulative?.total?.direct_profit_rate || 0, 1)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.cumulative?.offline?.direct_profit_rate || 0) - (plData?.cumulative?.prev_cumulative?.offline?.direct_profit_rate || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatPercent(change, 1)}%p</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.cumulative?.online?.direct_profit_rate || 0) - (plData?.cumulative?.prev_cumulative?.online?.direct_profit_rate || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatPercent(change, 1)}%p</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">
                    {(() => {
                      const currentRate = (plData?.cumulative?.total as any)?.direct_profit_rate || 0;
                      const prevCumulativeTotal = plData?.cumulative?.prev_cumulative?.total || {};
                      const prevRate = (prevCumulativeTotal as any)?.direct_profit_rate !== undefined 
                        ? (prevCumulativeTotal as any).direct_profit_rate
                        : (prevCumulativeTotal.net_sales > 0 ? ((prevCumulativeTotal.direct_profit || 0) / prevCumulativeTotal.net_sales) * 100 : 0);
                      const change = currentRate - prevRate;
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatPercent(change, 1)}%p</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right">-</td>
                </tr>
                {/* 영업비 소계 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">영업비 소계</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.offline?.sg_a || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.current_month?.online?.sg_a || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(pl?.sg_a || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.current_month?.offline?.sg_a || 0) - (plData?.prev_month?.offline?.sg_a || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-red-600' : 'text-green-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.current_month?.online?.sg_a || 0) - (plData?.prev_month?.online?.sg_a || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-red-600' : 'text-green-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">
                    {(() => {
                      const offlineChange = (plData?.current_month?.offline?.sg_a || 0) - (plData?.prev_month?.offline?.sg_a || 0);
                      const onlineChange = (plData?.current_month?.online?.sg_a || 0) - (plData?.prev_month?.online?.sg_a || 0);
                      const change = offlineChange + onlineChange;
                      return <span className={`font-bold ${change >= 0 ? 'text-red-600' : 'text-green-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plYoy?.sg_a || 0)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.offline?.sg_a || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatNumber(plData?.cumulative?.online?.sg_a || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatNumber(plData?.cumulative?.total?.sg_a || 0)}</td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.cumulative?.offline?.sg_a || 0) - (plData?.cumulative?.prev_cumulative?.offline?.sg_a || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-red-600' : 'text-green-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.cumulative?.online?.sg_a || 0) - (plData?.cumulative?.prev_cumulative?.online?.sg_a || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-red-600' : 'text-green-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">
                    {(() => {
                      const offlineChange = (plData?.cumulative?.offline?.sg_a || 0) - (plData?.cumulative?.prev_cumulative?.offline?.sg_a || 0);
                      const onlineChange = (plData?.cumulative?.online?.sg_a || 0) - (plData?.cumulative?.prev_cumulative?.online?.sg_a || 0);
                      const change = offlineChange + onlineChange;
                      return <span className={`font-bold ${change >= 0 ? 'text-red-600' : 'text-green-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right">{formatPercent(plData?.cumulative?.yoy?.sg_a || 0)}%</td>
                </tr>
                {/* 영업이익 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">영업이익</td>
                  <td className={`p-2 text-right border-r border-gray-300 ${(plData?.current_month?.offline?.operating_profit || 0) < 0 ? 'text-red-600' : ''}`}>
                    {(plData?.current_month?.offline?.operating_profit || 0) < 0 ? '(' : ''}{formatNumber(Math.abs(plData?.current_month?.offline?.operating_profit || 0))}{(plData?.current_month?.offline?.operating_profit || 0) < 0 ? ')' : ''}
                  </td>
                  <td className={`p-2 text-right border-r border-gray-300 ${(plData?.current_month?.online?.operating_profit || 0) < 0 ? 'text-red-600' : ''}`}>
                    {(plData?.current_month?.online?.operating_profit || 0) < 0 ? '(' : ''}{formatNumber(Math.abs(plData?.current_month?.online?.operating_profit || 0))}{(plData?.current_month?.online?.operating_profit || 0) < 0 ? ')' : ''}
                  </td>
                  <td className={`p-2 text-right border-r border-gray-300 font-semibold ${(plData?.current_month?.total?.operating_profit || 0) < 0 ? 'text-red-600' : ''}`}>
                    {(plData?.current_month?.total?.operating_profit || 0) < 0 ? '(' : ''}{formatNumber(Math.abs(plData?.current_month?.total?.operating_profit || 0))}{(plData?.current_month?.total?.operating_profit || 0) < 0 ? ')' : ''}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.current_month?.offline?.operating_profit || 0) - (plData?.prev_month?.offline?.operating_profit || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.current_month?.online?.operating_profit || 0) - (plData?.prev_month?.online?.operating_profit || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">
                    {(() => {
                      const offlineChange = (plData?.current_month?.offline?.operating_profit || 0) - (plData?.prev_month?.offline?.operating_profit || 0);
                      const onlineChange = (plData?.current_month?.online?.operating_profit || 0) - (plData?.prev_month?.online?.operating_profit || 0);
                      const change = offlineChange + onlineChange;
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className={`p-2 text-right border-r border-gray-300 ${(plYoy?.operating_profit || 0) >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(plYoy?.operating_profit || 0)}%
                  </td>
                  <td className={`p-2 text-right border-r border-gray-300 ${(plData?.cumulative?.offline?.operating_profit || 0) < 0 ? 'text-red-600' : ''}`}>
                    {(plData?.cumulative?.offline?.operating_profit || 0) < 0 ? '(' : ''}{formatNumber(Math.abs(plData?.cumulative?.offline?.operating_profit || 0))}{(plData?.cumulative?.offline?.operating_profit || 0) < 0 ? ')' : ''}
                  </td>
                  <td className={`p-2 text-right border-r border-gray-300 ${(plData?.cumulative?.online?.operating_profit || 0) < 0 ? 'text-red-600' : ''}`}>
                    {(plData?.cumulative?.online?.operating_profit || 0) < 0 ? '(' : ''}{formatNumber(Math.abs(plData?.cumulative?.online?.operating_profit || 0))}{(plData?.cumulative?.online?.operating_profit || 0) < 0 ? ')' : ''}
                  </td>
                  <td className={`p-2 text-right border-r border-gray-300 font-semibold ${(plData?.cumulative?.total?.operating_profit || 0) < 0 ? 'text-red-600' : ''}`}>
                    {(plData?.cumulative?.total?.operating_profit || 0) < 0 ? '(' : ''}{formatNumber(Math.abs(plData?.cumulative?.total?.operating_profit || 0))}{(plData?.cumulative?.total?.operating_profit || 0) < 0 ? ')' : ''}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.cumulative?.offline?.operating_profit || 0) - (plData?.cumulative?.prev_cumulative?.offline?.operating_profit || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.cumulative?.online?.operating_profit || 0) - (plData?.cumulative?.prev_cumulative?.online?.operating_profit || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">
                    {(() => {
                      const offlineChange = (plData?.cumulative?.offline?.operating_profit || 0) - (plData?.cumulative?.prev_cumulative?.offline?.operating_profit || 0);
                      const onlineChange = (plData?.cumulative?.online?.operating_profit || 0) - (plData?.cumulative?.prev_cumulative?.online?.operating_profit || 0);
                      const change = offlineChange + onlineChange;
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatNumber(change)}</span>;
                    })()}
                  </td>
                  <td className={`p-2 text-right ${(plData?.cumulative?.yoy?.operating_profit || 0) >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(plData?.cumulative?.yoy?.operating_profit || 0)}%
                  </td>
                </tr>
                {/* 영업이익율 */}
                <tr className="border-b border-gray-200">
                  <td className="p-2 font-semibold border-r border-gray-300">영업이익율</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.current_month?.offline?.operating_profit_rate || 0, 1)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.current_month?.online?.operating_profit_rate || 0, 1)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(plData?.current_month?.total?.operating_profit_rate || 0, 1)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.current_month?.offline?.operating_profit_rate || 0) - (plData?.prev_month?.offline?.operating_profit_rate || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatPercent(change, 1)}%p</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.current_month?.online?.operating_profit_rate || 0) - (plData?.prev_month?.online?.operating_profit_rate || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatPercent(change, 1)}%p</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">
                    {(() => {
                      const currentRate = (plData?.current_month?.total as any)?.operating_profit_rate || 0;
                      const prevTotal = plData?.prev_month?.total || {};
                      const prevRate = (prevTotal as any)?.operating_profit_rate !== undefined 
                        ? (prevTotal as any).operating_profit_rate
                        : (prevTotal.net_sales > 0 ? ((prevTotal.operating_profit || 0) / prevTotal.net_sales) * 100 : 0);
                      const change = currentRate - prevRate;
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatPercent(change, 1)}%p</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">-</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.cumulative?.offline?.operating_profit_rate || 0, 1)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">{formatPercent(plData?.cumulative?.online?.operating_profit_rate || 0, 1)}%</td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">{formatPercent(plData?.cumulative?.total?.operating_profit_rate || 0, 1)}%</td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.cumulative?.offline?.operating_profit_rate || 0) - (plData?.cumulative?.prev_cumulative?.offline?.operating_profit_rate || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatPercent(change, 1)}%p</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300">
                    {(() => {
                      const change = (plData?.cumulative?.online?.operating_profit_rate || 0) - (plData?.cumulative?.prev_cumulative?.online?.operating_profit_rate || 0);
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatPercent(change, 1)}%p</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right border-r border-gray-300 font-semibold">
                    {(() => {
                      const currentRate = (plData?.cumulative?.total as any)?.operating_profit_rate || 0;
                      const prevCumulativeTotal = plData?.cumulative?.prev_cumulative?.total || {};
                      const prevRate = (prevCumulativeTotal as any)?.operating_profit_rate !== undefined 
                        ? (prevCumulativeTotal as any).operating_profit_rate
                        : (prevCumulativeTotal.net_sales > 0 ? ((prevCumulativeTotal.operating_profit || 0) / prevCumulativeTotal.net_sales) * 100 : 0);
                      const change = currentRate - prevRate;
                      return <span className={`font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? '+' : ''}{formatPercent(change, 1)}%p</span>;
                    })()}
                  </td>
                  <td className="p-2 text-right">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 월별 추세 그래프 */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        {/* ① 2025년 채널별 실판매출 추세 (1K HKD) */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center whitespace-nowrap">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              2025년 채널별 실판매출 추세 (1K HKD)
            </h3>
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <BarChart 
              data={(dashboardData?.monthly_channel_data || []).map((item: any) => ({
                month: `${item.period.slice(2, 4)}월`,
                'TW Retail': Math.round((item.TW_Retail || 0) / 1000),
                'TW Outlet': Math.round((item.TW_Outlet || 0) / 1000),
                'TW Online': Math.round((item.TW_Online || 0) / 1000),
                total: Math.round((item.total || 0) / 1000),
              }))} 
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              onClick={(data: any) => {
                if (data && data.activePayload && data.activePayload[0]) {
                  const channelName = data.activePayload[0].dataKey;
                  setSelectedChannel(selectedChannel === channelName ? null : channelName);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                domain={[0, 26000]}
                ticks={[0, 6500, 13000, 19500, 26000]}
                tickFormatter={(value) => value.toLocaleString()}
                allowDecimals={false}
                width={60}
              />
              <Tooltip 
                formatter={(value: any, name: string) => [
                  `${Math.round(value).toLocaleString()}K HKD`,
                  name,
                ]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  padding: '8px',
                  fontSize: '11px',
                }}
              />

              {/* 비중 % 레이블 */}
              <Bar dataKey="TW Retail" stackId="a" fill="#93C5FD">
                {(dashboardData?.monthly_channel_data || []).map((item: any, index: number) => {
                  const total = (item.total || 0) / 1000;
                  const v = (item.TW_Retail || 0) / 1000;
                  const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0.0';
                  return (
                    <text 
                      key={`label-tw-retail-${index}`} 
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
              <Bar dataKey="TW Outlet" stackId="a" fill="#C4B5FD">
                {(dashboardData?.monthly_channel_data || []).map((item: any, index: number) => {
                  const total = (item.total || 0) / 1000;
                  const v = (item.TW_Outlet || 0) / 1000;
                  const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0.0';
                  return (
                    <text 
                      key={`label-tw-outlet-${index}`} 
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
              <Bar dataKey="TW Online" stackId="a" fill="#F9A8D4">
                {(dashboardData?.monthly_channel_data || []).map((item: any, index: number) => {
                  const total = (item.total || 0) / 1000;
                  const v = (item.TW_Online || 0) / 1000;
                  const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0.0';
                  return (
                    <text 
                      key={`label-tw-online-${index}`} 
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
            </BarChart>
          </ResponsiveContainer>
          
          {/* 채널 선택 버튼 */}
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {[
              { name: '전체', color: '#E5E7EB' },
              { name: 'TW Retail', color: '#93C5FD' },
              { name: 'TW Outlet', color: '#C4B5FD' },
              { name: 'TW Online', color: '#F9A8D4' },
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
                  color: '#000000',
                }}
              >
                {channel.name}
              </button>
            ))}
          </div>
          
          {/* 채널 YOY 라인차트 + 테이블 (홍콩 구조 그대로, 키만 TW로) */}
          {selectedChannel && (
            <div className="mt-4">
              <div className="mb-2 text-xs text-gray-600">선택된 채널: {selectedChannel}</div>
              {selectedChannel === '전체' ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart 
                    data={(dashboardData?.monthly_channel_data || []).map((item: any, idx: number) => {
                      const isLastMonth = idx === (dashboardData?.monthly_channel_data || []).length - 1;
                      return {
                      month: `${item.period.slice(2, 4)}월`,
                        twRetail: isLastMonth 
                          ? Math.round(twRetail?.yoy || 0)
                          : (dashboardData?.monthly_channel_yoy?.['TW_Retail']?.[idx] || 0),
                        twOutlet: isLastMonth 
                          ? Math.round(twOutlet?.yoy || 0)
                          : (dashboardData?.monthly_channel_yoy?.['TW_Outlet']?.[idx] || 0),
                        twOnline: isLastMonth 
                          ? Math.round(twOnline?.yoy || 0)
                          : (dashboardData?.monthly_channel_yoy?.['TW_Online']?.[idx] || 0),
                      };
                    })} 
                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      domain={[0, 'auto']}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`${value}%`, 'YOY']}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        padding: '8px',
                        fontSize: '11px',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="twRetail"
                      stroke="#93C5FD"
                      strokeWidth={2}
                      name="TW Retail"
                    />
                    <Line
                      type="monotone"
                      dataKey="twOutlet"
                      stroke="#C4B5FD"
                      strokeWidth={2}
                      name="TW Outlet"
                    />
                    <Line
                      type="monotone"
                      dataKey="twOnline"
                      stroke="#F9A8D4"
                      strokeWidth={2}
                      name="TW Online"
                    />
                    <ReferenceLine y={100} stroke="#666" strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart 
                    data={(dashboardData?.monthly_channel_data || []).map((item: any, idx: number) => {
                      const channelKey = selectedChannel.replace(' ', '_'); // 'TW Retail' -> 'TW_Retail'
                      const isLastMonth = idx === (dashboardData?.monthly_channel_data || []).length - 1;
                      let yoy = 0;
                      if (isLastMonth) {
                        // 마지막 월(10월)은 카드의 YOY 사용
                        if (selectedChannel === 'TW Retail') {
                          yoy = Math.round(twRetail?.yoy || 0);
                        } else if (selectedChannel === 'TW Outlet') {
                          yoy = Math.round(twOutlet?.yoy || 0);
                        } else if (selectedChannel === 'TW Online') {
                          yoy = Math.round(twOnline?.yoy || 0);
                        }
                      } else {
                        // 나머지 월은 monthly_channel_yoy 사용
                        yoy = dashboardData?.monthly_channel_yoy ? ((dashboardData.monthly_channel_yoy as any)[channelKey]?.[idx] || 0) : 0;
                      }
                      return {
                        month: `${item.period.slice(2, 4)}월`,
                        yoy: yoy,
                      };
                    })} 
                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      domain={[0, 'auto']}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`${value}%`, 'YOY']}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        padding: '8px',
                        fontSize: '11px',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="yoy"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      name={`${selectedChannel} YOY`}
                    />
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
                        {selectedChannel === '전체' ? '채널' : selectedChannel}
                      </th>
                      {(dashboardData?.monthly_channel_data || []).map((item: any) => (
                        <th
                          key={item.period}
                          className="border border-gray-300 px-1 py-1 text-center font-semibold"
                        >
                          {`${item.period.slice(2, 4)}월`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedChannel === '전체' ? (
                      <>
                        {['TW Retail', 'TW Outlet', 'TW Online'].map((channel) => {
                          const channelKey = channel.replace(' ', '_');
                          return (
                            <tr key={channel}>
                              <td className="border border-gray-300 px-1 py-1 font-semibold bg-blue-50">
                                {channel}
                              </td>
                              {((dashboardData?.monthly_channel_data || [])).map(
                                (item: any, idx: number) => {
                                  const isLastMonth = idx === (dashboardData?.monthly_channel_data || []).length - 1;
                                  let yoy = 0;
                                  if (isLastMonth) {
                                    // 마지막 월(10월)은 카드의 YOY 사용
                                    if (channel === 'TW Retail') {
                                      yoy = Math.round(twRetail?.yoy || 0);
                                    } else if (channel === 'TW Outlet') {
                                      yoy = Math.round(twOutlet?.yoy || 0);
                                    } else if (channel === 'TW Online') {
                                      yoy = Math.round(twOnline?.yoy || 0);
                                    }
                                  } else {
                                    // 나머지 월은 monthly_channel_yoy 사용
                                    yoy = (dashboardData?.monthly_channel_yoy ? (dashboardData.monthly_channel_yoy as any)[channelKey]?.[idx] : 0) || 0;
                                  }
                                  return (
                                <td 
                                  key={idx} 
                                    className={`border border-gray-300 px-1 py-1 text-center font-bold ${
                                      yoy >= 100 ? 'text-green-600' : 'text-red-600'
                                    }`}
                                >
                                  {yoy}%
                                </td>
                                  );
                                }
                              )}
                            </tr>
                          );
                        })}
                      </>
                    ) : (
                      <tr>
                        <td className="border border-gray-300 px-1 py-1 font-semibold bg-blue-50">
                          YOY
                        </td>
                        {((dashboardData?.monthly_channel_data || [])).map((item: any, idx: number) => {
                          const isLastMonth = idx === (dashboardData?.monthly_channel_data || []).length - 1;
                          const channelKey = selectedChannel.replace(' ', '_');
                          let yoy = 0;
                          if (isLastMonth) {
                            // 마지막 월(10월)은 카드의 YOY 사용
                            if (selectedChannel === 'TW Retail') {
                              yoy = Math.round(twRetail?.yoy || 0);
                            } else if (selectedChannel === 'TW Outlet') {
                              yoy = Math.round(twOutlet?.yoy || 0);
                            } else if (selectedChannel === 'TW Online') {
                              yoy = Math.round(twOnline?.yoy || 0);
                            }
                          } else {
                            // 나머지 월은 monthly_channel_yoy 사용
                            yoy = (dashboardData?.monthly_channel_yoy ? (dashboardData.monthly_channel_yoy as any)[channelKey]?.[idx] : 0) || 0;
                          }
                          return (
                          <td 
                            key={idx} 
                            className={`border border-gray-300 px-1 py-1 text-center font-bold ${
                              yoy >= 100 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {yoy}%
                          </td>
                          );
                        })}
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
                      const monthlyData = (dashboardData?.monthly_channel_data || []) as any[];
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
                      const monthlyData = (dashboardData?.monthly_channel_data || []) as any[];
                      if (monthlyData.length === 0) return <div>데이터 없음</div>;
                      
                      const latest = monthlyData[monthlyData.length - 1] || {};
                      const retail = Math.round((latest.TW_Retail || 0) / 1000);
                      const outlet = Math.round((latest.TW_Outlet || 0) / 1000);
                      const online = Math.round((latest.TW_Online || 0) / 1000);
                      const total = retail + outlet + online;
                      const retailPct = total > 0 ? ((retail / total) * 100).toFixed(1) : '0.0';
                      
                      return (
                        <>
                          <div>• Retail: 최대 비중 유지 ({retailPct}%)</div>
                          <div>• Online: 고성장 (YOY {Math.round((dashboardData?.monthly_channel_yoy?.['TW_Online']?.[monthlyData.length - 1] || 0))}%)</div>
                          <div>• Outlet: 안정적 기여</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 전략 포인트</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    <div>• 온라인 채널 집중 육성</div>
                    <div>• 비수기 대응 전략</div>
                    <div>• Retail 효율성 제고</div>
                  </div>
                </div>
              </>
            ) : selectedChannel === 'TW Retail' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 TW Retail 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    {(() => {
                      const monthlyData = (dashboardData?.monthly_channel_data || []) as any[];
                      if (monthlyData.length === 0) return <div>데이터 없음</div>;
                      
                      const retails = monthlyData.map((item: any) => Math.round((item.TW_Retail || 0) / 1000));
                      const maxRetail = Math.max(...retails);
                      const minRetail = Math.min(...retails);
                      const maxMonth = monthlyData[retails.indexOf(maxRetail)]?.period?.slice(2, 4) || '';
                      
                      return (
                        <>
                          <div>• 최대 비중 채널 (59~60%)</div>
                          <div>• {maxMonth}월 최고 {maxRetail.toLocaleString()}K</div>
                          <div>• YOY 평균 {Math.round((dashboardData?.monthly_channel_yoy?.['TW_Retail'] || []).reduce((a: number, b: number) => a + b, 0) / (dashboardData?.monthly_channel_yoy?.['TW_Retail'] || []).length || 1)}% 수준</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 성과 분석</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    {(() => {
                      const yoyData = dashboardData?.monthly_channel_yoy?.['TW_Retail'] || [];
                      if (yoyData.length === 0) return <div>데이터 없음</div>;
                      
                      const latestYoy = yoyData[yoyData.length - 1] || 0;
                      const avgYoy = Math.round(yoyData.reduce((a: number, b: number) => a + b, 0) / yoyData.length);
                      
                      return (
                        <>
                          <div>• 10월 YOY {latestYoy}%</div>
                          <div>• 평균 YOY {avgYoy}%</div>
                          <div>• {latestYoy >= 100 ? '안정적 성장' : '성장 둔화'}</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 액션 아이템</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    <div>• 매장 효율성 개선</div>
                    <div>• 고객 유입 증대 전략</div>
                    <div>• 상품 믹스 최적화</div>
                  </div>
                </div>
              </>
            ) : selectedChannel === 'TW Outlet' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 TW Outlet 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    {(() => {
                      const monthlyData = (dashboardData?.monthly_channel_data || []) as any[];
                      if (monthlyData.length === 0) return <div>데이터 없음</div>;
                      
                      const outlets = monthlyData.map((item: any) => Math.round((item.TW_Outlet || 0) / 1000));
                      const maxOutlet = Math.max(...outlets);
                      const maxMonth = monthlyData[outlets.indexOf(maxOutlet)]?.period?.slice(2, 4) || '';
                      
                      return (
                        <>
                          <div>• 안정적 비중 유지 (13~15%)</div>
                          <div>• {maxMonth}월 최고 {maxOutlet.toLocaleString()}K</div>
                          <div>• YOY 평균 {Math.round((dashboardData?.monthly_channel_yoy?.['TW_Outlet'] || []).reduce((a: number, b: number) => a + b, 0) / (dashboardData?.monthly_channel_yoy?.['TW_Outlet'] || []).length || 1)}% 수준</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 성과 분석</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    {(() => {
                      const yoyData = dashboardData?.monthly_channel_yoy?.['TW_Outlet'] || [];
                      if (yoyData.length === 0) return <div>데이터 없음</div>;
                      
                      const latestYoy = yoyData[yoyData.length - 1] || 0;
                      
                      return (
                        <>
                          <div>• 10월 YOY {latestYoy}%</div>
                          <div>• 안정적 운영</div>
                          <div>• 재고 회전율 개선</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 액션 아이템</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    <div>• 재고 운영 최적화</div>
                    <div>• 프로모션 전략 강화</div>
                    <div>• 고객 유입 증대</div>
                  </div>
                </div>
              </>
            ) : selectedChannel === 'TW Online' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 TW Online 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    {(() => {
                      const monthlyData = (dashboardData?.monthly_channel_data || []) as any[];
                      if (monthlyData.length === 0) return <div>데이터 없음</div>;
                      
                      const onlines = monthlyData.map((item: any) => Math.round((item.TW_Online || 0) / 1000));
                      const maxOnline = Math.max(...onlines);
                      const maxMonth = monthlyData[onlines.indexOf(maxOnline)]?.period?.slice(2, 4) || '';
                      
                      return (
                        <>
                          <div>• 고성장 채널 (YOY 129%+)</div>
                          <div>• {maxMonth}월 최고 {maxOnline.toLocaleString()}K</div>
                          <div>• 비중 확대 중 (26~27%)</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 성과 분석</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    {(() => {
                      const yoyData = dashboardData?.monthly_channel_yoy?.['TW_Online'] || [];
                      if (yoyData.length === 0) return <div>데이터 없음</div>;
                      
                      const latestYoy = yoyData[yoyData.length - 1] || 0;
                      const avgYoy = Math.round(yoyData.reduce((a: number, b: number) => a + b, 0) / yoyData.length);
                      
                      return (
                        <>
                          <div>• 10월 YOY {latestYoy}%</div>
                          <div>• 평균 YOY {avgYoy}%</div>
                          <div>• 지속적 성장세</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 액션 아이템</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    <div>• 디지털 마케팅 강화</div>
                    <div>• 온라인 전용 상품 확대</div>
                    <div>• 고객 경험 개선</div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
                  </div>

        {/* ② 2025년 아이템별 실판매출 추세 (1K HKD) */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center whitespace-nowrap">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
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
            {(!dashboardData?.monthly_item_data ||
              dashboardData.monthly_item_data.length === 0) ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                monthly_item_data가 없습니다. 데이터를 생성해주세요.
              </div>
            ) : salesPriceType === '할인율' ? (
              <LineChart 
                data={(dashboardData?.monthly_item_data || []).map((item: any) => {
                  const calc = (gross: number, net: number): string => {
                    if (gross === 0) return "0";
                    return ((gross - net) / gross * 100).toFixed(1);
                  };
                  
                  const month = parseInt(item.period.slice(2, 4));
                  
                  // 1~6월: 24F(당시즌F)를 과시즌F로 이동
                  let 당시즌F_gross = item.당시즌F?.gross_sales || 0;
                  let 당시즌F_net = item.당시즌F?.net_sales || 0;
                  let 과시즌F_gross = item.과시즌F?.gross_sales || 0;
                  let 과시즌F_net = item.과시즌F?.net_sales || 0;
                  
                  if (month >= 1 && month <= 6) {
                    // 24F를 과시즌F로 이동
                    과시즌F_gross += 당시즌F_gross;
                    과시즌F_net += 당시즌F_net;
                    당시즌F_gross = 0;
                    당시즌F_net = 0;
                  }
                  
                  return {
                    month: `${item.period.slice(2, 4)}월`,
                    당시즌F: parseFloat(calc(당시즌F_gross, 당시즌F_net)),
                    당시즌S: parseFloat(calc(item.당시즌S?.gross_sales || 0, item.당시즌S?.net_sales || 0)),
                    과시즌F: parseFloat(calc(과시즌F_gross, 과시즌F_net)),
                    과시즌S: parseFloat(calc(item.과시즌S?.gross_sales || 0, item.과시즌S?.net_sales || 0)),
                    모자: parseFloat(calc(item.모자?.gross_sales || 0, item.모자?.net_sales || 0)),
                    신발: parseFloat(calc(item.신발?.gross_sales || 0, item.신발?.net_sales || 0)),
                    가방: parseFloat(calc(item.가방?.gross_sales || 0, item.가방?.net_sales || 0)),
                    기타ACC: parseFloat(calc(item.기타ACC?.gross_sales || 0, item.기타ACC?.net_sales || 0)),
                  };
                })} 
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  domain={[0, 70]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  formatter={(value: any, name: string) => [`${value}%`, name]}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    padding: '8px',
                    fontSize: '11px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="당시즌F"
                  stroke="#FFD4B3"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="🍂 25F"
                />
                <Line
                  type="monotone"
                  dataKey="당시즌S"
                  stroke="#B3E5FC"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="☀️ 25S"
                />
                <Line
                  type="monotone"
                  dataKey="과시즌F"
                  stroke="#FFB3BA"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="🍂 과시즌F"
                />
                <Line
                  type="monotone"
                  dataKey="과시즌S"
                  stroke="#B2F5EA"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="☀️ 과시즌S"
                />
                <Line
                  type="monotone"
                  dataKey="모자"
                  stroke="#93C5FD"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="🧢 모자"
                />
                <Line
                  type="monotone"
                  dataKey="신발"
                  stroke="#FCD34D"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="👟 신발"
                />
                <Line
                  type="monotone"
                  dataKey="가방"
                  stroke="#C4B5FD"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="👜 가방"
                />
                <Line
                  type="monotone"
                  dataKey="기타ACC"
                  stroke="#9CA3AF"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="🎒 기타ACC"
                />
              </LineChart>
            ) : (
              <BarChart 
                data={(dashboardData?.monthly_item_data || []).map((item: any) => {
                  const month = parseInt(item.period.slice(2, 4));
                  
                  // 1~6월: 24F(당시즌F)를 과시즌F로 이동
                  let 당시즌F_gross = item.당시즌F?.gross_sales || 0;
                  let 당시즌F_net = item.당시즌F?.net_sales || 0;
                  let 과시즌F_gross = item.과시즌F?.gross_sales || 0;
                  let 과시즌F_net = item.과시즌F?.net_sales || 0;
                  
                  if (month >= 1 && month <= 6) {
                    // 24F를 과시즌F로 이동
                    과시즌F_gross += 당시즌F_gross;
                    과시즌F_net += 당시즌F_net;
                    당시즌F_gross = 0;
                    당시즌F_net = 0;
                  }
                  
                  // HKD → K HKD 변환 (1000으로 나누기)
                  const 당시즌F = Math.round(
                    (salesPriceType === '실판' ? 당시즌F_net : 당시즌F_gross) / 1000,
                  );
                  const 당시즌S = Math.round(
                    (salesPriceType === '실판'
                      ? item.당시즌S?.net_sales
                      : item.당시즌S?.gross_sales || 0) / 1000,
                  );
                  const 과시즌F = Math.round(
                    (salesPriceType === '실판' ? 과시즌F_net : 과시즌F_gross) / 1000,
                  );
                  const 과시즌S = Math.round(
                    (salesPriceType === '실판'
                      ? item.과시즌S?.net_sales
                      : item.과시즌S?.gross_sales || 0) / 1000,
                  );
                  const 모자 = Math.round(
                    (salesPriceType === '실판' ? item.모자?.net_sales || 0 : item.모자?.gross_sales || 0) / 1000,
                  );
                  const 신발 = Math.round(
                    (salesPriceType === '실판' ? item.신발?.net_sales || 0 : item.신발?.gross_sales || 0) / 1000,
                  );
                  // 가방은 가방 데이터 사용 (Python 스크립트에서 BAG만 분리)
                  const 가방 = Math.round(
                    (salesPriceType === '실판'
                      ? item.가방?.net_sales || 0
                      : item.가방?.gross_sales || 0) / 1000,
                  );
                  // 기타ACC는 기타ACC 데이터 사용 (Python 스크립트에서 ATC+BOT+WTC 분리)
                  const 기타ACC = Math.round(
                    (salesPriceType === '실판'
                      ? item.기타ACC?.net_sales || 0
                      : item.기타ACC?.gross_sales || 0) / 1000,
                  );
                  const total =
                    당시즌F + 당시즌S + 과시즌F + 과시즌S + 모자 + 신발 + 가방 + 기타ACC;
                  return {
                    month: `${item.period.slice(2, 4)}월`,
                    당시즌F,
                    당시즌S,
                    과시즌F,
                    과시즌S,
                    모자,
                    신발,
                    가방,
                    기타ACC,
                    total,
                  };
                })} 
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
                  domain={[0, 26000]}
                  ticks={[0, 6500, 13000, 19500, 26000]}
                  tickFormatter={(value) => value.toLocaleString()}
                  allowDecimals={false}
                  width={60}
                />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    `${Math.round(value).toLocaleString()}K HKD`,
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    padding: '8px',
                    fontSize: '11px',
                  }}
                />
                {/* 레이블 부분은 기존 대만 코드 그대로 써도 무방 */}
                <Bar dataKey="당시즌F" stackId="a" fill="#FFD4B3" name="25F" />
                <Bar dataKey="당시즌S" stackId="a" fill="#B3E5FC" name="25S" />
                <Bar dataKey="과시즌F" stackId="a" fill="#FFB3BA" />
                <Bar dataKey="과시즌S" stackId="a" fill="#B2F5EA" />
                <Bar dataKey="모자" stackId="a" fill="#93C5FD" />
                <Bar dataKey="신발" stackId="a" fill="#FCD34D" />
                <Bar dataKey="가방" stackId="a" fill="#C4B5FD" />
                <Bar dataKey="기타ACC" stackId="a" fill="#9CA3AF" />
              </BarChart>
            )}
          </ResponsiveContainer>
          
          {/* 아이템 선택 버튼 (범례) */}
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            {[
              { name: '전체', color: '#E5E7EB', emoji: '📊' },
              { name: '당시즌F', color: '#FFD4B3', emoji: '🍂', displayName: '25F' },
              { name: '당시즌S', color: '#B3E5FC', emoji: '☀️', displayName: '25S' },
              { name: '과시즌F', color: '#FFB3BA', emoji: '🍂', displayName: '과시즌F' },
              { name: '과시즌S', color: '#B2F5EA', emoji: '☀️', displayName: '과시즌S' },
              { name: '모자', color: '#93C5FD', emoji: '🧢' },
              { name: '신발', color: '#FCD34D', emoji: '👟' },
              { name: '가방', color: '#C4B5FD', emoji: '👜' },
              { name: '기타ACC', color: '#9CA3AF', emoji: '🎒' },
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  setSelectedItem(selectedItem === item.name ? null : item.name);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-all border-2 ${
                  selectedItem === item.name
                    ? 'ring-2 ring-orange-600 scale-105 shadow-lg'
                    : 'hover:scale-105 shadow-md border-gray-300'
                }`}
                style={{ 
                  backgroundColor: item.color,
                  color: '#000000',
                  borderColor: selectedItem === item.name ? '#EA580C' : '#D1D5DB'
                }}
              >
                  {item.emoji} {item.displayName || item.name}
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
                    data={(dashboardData?.monthly_item_data || []).map((item: any, idx: number) => {
                      const isLastMonth = idx === (dashboardData?.monthly_item_data || []).length - 1;
                      // 마지막 월(10월)은 카드의 YOY 사용 - monthly_item_data의 마지막 월과 전년 동월 비교
                      let 당시즌F = (dashboardData?.monthly_item_yoy as any)?.['당시즌F']?.[idx] || 0;
                      let 당시즌S = (dashboardData?.monthly_item_yoy as any)?.['당시즌S']?.[idx] || 0;
                      let 과시즌F = (dashboardData?.monthly_item_yoy as any)?.['과시즌F']?.[idx] || 0;
                      let 과시즌S = (dashboardData?.monthly_item_yoy as any)?.['과시즌S']?.[idx] || 0;
                      let 모자 = (dashboardData?.monthly_item_yoy as any)?.['모자']?.[idx] || 0;
                      let 신발 = (dashboardData?.monthly_item_yoy as any)?.['신발']?.[idx] || 0;
                      let 가방 = (dashboardData?.monthly_item_yoy as any)?.['가방']?.[idx] || 0;
                      let 기타ACC = (dashboardData?.monthly_item_yoy as any)?.['기타ACC']?.[idx] || 0;
                      
                      if (isLastMonth) {
                        // 마지막 월(10월)은 카드의 YOY 사용
                        // 당시즌F는 seasonSales 사용
                        const currentSeasonF = seasonSales?.current_season_f?.october?.total_net_sales || 0;
                        const prevSeasonF = seasonSales?.previous_season_f?.october?.total_net_sales || 0;
                        당시즌F = prevSeasonF > 0 ? Math.round((currentSeasonF / prevSeasonF) * 100) : 0;
                        
                        // 모자, 신발, 가방, 기타ACC는 accStock?.october_sales 사용
                        const heaSales = accStock?.october_sales ? (accStock.october_sales as any)?.HEA : undefined;
                        const shoSales = accStock?.october_sales ? (accStock.october_sales as any)?.SHO : undefined;
                        const bagSales = accStock?.october_sales ? (accStock.october_sales as any)?.BAG : undefined;
                        const atcSales = accStock?.october_sales ? (accStock.october_sales as any)?.ATC : undefined;
                        모자 = Math.round(heaSales?.yoy || 0);
                        신발 = Math.round(shoSales?.yoy || 0);
                        가방 = Math.round(bagSales?.yoy || 0);
                        기타ACC = Math.round(atcSales?.yoy || 0);
                        
                        // 당시즌S, 과시즌F, 과시즌S는 monthly_item_data 사용
                        const lastMonthData = item;
                        const prevYearMonth = (dashboardData?.monthly_item_data || []).find((d: any) => {
                          const period = d.period;
                          const year = parseInt(period.slice(0, 2));
                          const month = parseInt(period.slice(2, 4));
                          return year === 24 && month === 10; // 2410
                        });
                        
                        if (prevYearMonth) {
                          const calcYoy = (current: number, previous: number) => {
                            return previous > 0 ? Math.round((current / previous) * 100) : 0;
                          };
                          
                          당시즌S = calcYoy(lastMonthData?.당시즌S?.net_sales || 0, prevYearMonth?.당시즌S?.net_sales || 0);
                          과시즌F = calcYoy(lastMonthData?.과시즌F?.net_sales || 0, prevYearMonth?.과시즌F?.net_sales || 0);
                          과시즌S = calcYoy(lastMonthData?.과시즌S?.net_sales || 0, prevYearMonth?.과시즌S?.net_sales || 0);
                        }
                      }
                      
                      return {
                      month: `${item.period.slice(2, 4)}월`,
                        당시즌F,
                        당시즌S,
                        과시즌F,
                        과시즌S,
                        모자,
                        신발,
                        가방,
                        기타ACC,
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
                    <Line type="monotone" dataKey="당시즌F" stroke="#FFD4B3" strokeWidth={2} name="🍂 25F" />
                    <Line type="monotone" dataKey="당시즌S" stroke="#B3E5FC" strokeWidth={2} name="☀️ 25S" />
                    <Line type="monotone" dataKey="과시즌F" stroke="#FFB3BA" strokeWidth={2} name="🍂 과시즌F" />
                    <Line type="monotone" dataKey="과시즌S" stroke="#B2F5EA" strokeWidth={2} name="☀️ 과시즌S" />
                    <Line type="monotone" dataKey="모자" stroke="#93C5FD" strokeWidth={2} name="🧢 모자" />
                    <Line type="monotone" dataKey="신발" stroke="#FCD34D" strokeWidth={2} name="👟 신발" />
                    <Line type="monotone" dataKey="가방" stroke="#C4B5FD" strokeWidth={2} name="👜 가방" />
                    <Line type="monotone" dataKey="기타ACC" stroke="#9CA3AF" strokeWidth={2} name="🎒 기타ACC" />
                    <ReferenceLine y={100} stroke="#666" strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart 
                    data={(dashboardData?.monthly_item_data || []).map((item: any, idx: number) => {
                      const isLastMonth = idx === (dashboardData?.monthly_item_data || []).length - 1;
                      let yoy = dashboardData?.monthly_item_yoy ? ((dashboardData.monthly_item_yoy as any)[selectedItem]?.[idx] || 0) : 0;
                      
                      if (isLastMonth) {
                        // 마지막 월(10월)은 카드의 YOY 사용
                        if (selectedItem === '당시즌F') {
                          // 당시즌F는 seasonSales 사용
                          const currentSeasonF = seasonSales?.current_season_f?.october?.total_net_sales || 0;
                          const prevSeasonF = seasonSales?.previous_season_f?.october?.total_net_sales || 0;
                          yoy = prevSeasonF > 0 ? Math.round((currentSeasonF / prevSeasonF) * 100) : 0;
                        } else if (selectedItem === '모자') {
                          // 모자는 accStock?.october_sales 사용
                          const heaSales = accStock?.october_sales ? (accStock.october_sales as any)?.HEA : undefined;
                          yoy = Math.round(heaSales?.yoy || 0);
                        } else if (selectedItem === '신발') {
                          // 신발은 accStock?.october_sales 사용
                          const shoSales = accStock?.october_sales ? (accStock.october_sales as any)?.SHO : undefined;
                          yoy = Math.round(shoSales?.yoy || 0);
                        } else if (selectedItem === '가방') {
                          // 가방은 accStock?.october_sales 사용
                          const bagSales = accStock?.october_sales ? (accStock.october_sales as any)?.BAG : undefined;
                          yoy = Math.round(bagSales?.yoy || 0);
                        } else if (selectedItem === '기타ACC') {
                          // 기타ACC는 accStock?.october_sales 사용
                          const atcSales = accStock?.october_sales ? (accStock.october_sales as any)?.ATC : undefined;
                          yoy = Math.round(atcSales?.yoy || 0);
                        } else {
                          // 당시즌S, 과시즌F, 과시즌S는 monthly_item_data 사용
                          const lastMonthData = item;
                          const prevYearMonth = (dashboardData?.monthly_item_data || []).find((d: any) => {
                            const period = d.period;
                            const year = parseInt(period.slice(0, 2));
                            const month = parseInt(period.slice(2, 4));
                            return year === 24 && month === 10; // 2410
                          });
                          
                          if (prevYearMonth) {
                            const currentNet = (lastMonthData as any)[selectedItem]?.net_sales || 0;
                            const prevNet = (prevYearMonth as any)[selectedItem]?.net_sales || 0;
                            yoy = prevNet > 0 ? Math.round((currentNet / prevNet) * 100) : 0;
                          }
                        }
                      }
                      
                      return {
                      month: `${item.period.slice(2, 4)}월`,
                        yoy
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
                    <Line 
                      type="monotone" 
                      dataKey="yoy" 
                      stroke={
                        selectedItem === '당시즌F' ? '#FED7AA' :
                        selectedItem === '당시즌S' ? '#A5F3FC' :
                        selectedItem === '과시즌F' ? '#FCA5A5' :
                        selectedItem === '과시즌S' ? '#5EEAD4' :
                        selectedItem === '모자' ? '#93C5FD' :
                        selectedItem === '신발' ? '#FCD34D' :
                        selectedItem === '가방' ? '#C4B5FD' :
                        selectedItem === '기타ACC' ? '#9CA3AF' :
                        '#F59E0B'
                      } 
                      strokeWidth={2} 
                      name={`${selectedItem} YOY`} 
                    />
                    <ReferenceLine y={100} stroke="#666" strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              )}
              
              {/* YOY 테이블 */}
              <div className="mt-4">
                <table className="w-full text-[10px] border-collapse border border-gray-300">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 px-1 py-1 text-left font-semibold">{selectedItem === '전체' ? '아이템' : selectedItem}</th>
                      {(dashboardData?.monthly_item_data || []).map((item: any) => (
                        <th key={item.period} className="border border-gray-300 px-1 py-1 text-center font-semibold">{`${item.period.slice(2, 4)}월`}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItem === '전체' ? (
                      <>
                        {['당시즌F', '당시즌S', '과시즌F', '과시즌S', '모자', '신발', '가방', '기타ACC'].map((item) => (
                          <tr key={item}>
                            <td className="border border-gray-300 px-1 py-1 font-semibold bg-orange-50">{item}</td>
                            {((dashboardData?.monthly_item_data || [])).map((monthData: any, idx: number) => {
                              const isLastMonth = idx === (dashboardData?.monthly_item_data || []).length - 1;
                              let yoy = (dashboardData?.monthly_item_yoy ? (dashboardData.monthly_item_yoy as any)[item]?.[idx] : 0) || 0;
                              
                              if (isLastMonth) {
                                // 마지막 월(10월)은 카드의 YOY 사용
                                if (item === '당시즌F') {
                                  // 당시즌F는 seasonSales 사용
                                  const currentSeasonF = seasonSales?.current_season_f?.october?.total_net_sales || 0;
                                  const prevSeasonF = seasonSales?.previous_season_f?.october?.total_net_sales || 0;
                                  yoy = prevSeasonF > 0 ? Math.round((currentSeasonF / prevSeasonF) * 100) : 0;
                                } else if (item === '모자') {
                                  // 모자는 accStock?.october_sales 사용
                                  const heaSales = accStock?.october_sales ? (accStock.october_sales as any)?.HEA : undefined;
                                  yoy = Math.round(heaSales?.yoy || 0);
                                } else if (item === '신발') {
                                  // 신발은 accStock?.october_sales 사용
                                  const shoSales = accStock?.october_sales ? (accStock.october_sales as any)?.SHO : undefined;
                                  yoy = Math.round(shoSales?.yoy || 0);
                                } else if (item === '가방') {
                                  // 가방은 accStock?.october_sales 사용
                                  const bagSales = accStock?.october_sales ? (accStock.october_sales as any)?.BAG : undefined;
                                  yoy = Math.round(bagSales?.yoy || 0);
                                } else if (item === '기타ACC') {
                                  // 기타ACC는 accStock?.october_sales 사용
                                  const atcSales = accStock?.october_sales ? (accStock.october_sales as any)?.ATC : undefined;
                                  yoy = Math.round(atcSales?.yoy || 0);
                                } else {
                                  // 당시즌S, 과시즌F, 과시즌S는 monthly_item_data 사용
                                  const prevYearMonth = (dashboardData?.monthly_item_data || []).find((d: any) => {
                                    const period = d.period;
                                    const year = parseInt(period.slice(0, 2));
                                    const month = parseInt(period.slice(2, 4));
                                    return year === 24 && month === 10; // 2410
                                  });
                                  
                                  if (prevYearMonth) {
                                    const currentNet = (monthData as any)[item]?.net_sales || 0;
                                    const prevNet = (prevYearMonth as any)[item]?.net_sales || 0;
                                    yoy = prevNet > 0 ? Math.round((currentNet / prevNet) * 100) : 0;
                                  }
                                }
                              }
                              
                              return (
                              <td 
                                key={idx} 
                                className={`border border-gray-300 px-1 py-1 text-center font-bold ${yoy >= 100 ? 'text-green-600' : 'text-red-600'}`}
                              >
                                {yoy}%
                              </td>
                              );
                            })}
                          </tr>
                        ))}
                      </>
                    ) : (
                      <tr>
                        <td className="border border-gray-300 px-1 py-1 font-semibold bg-orange-50">YOY</td>
                        {((dashboardData?.monthly_item_data || [])).map((monthData: any, idx: number) => {
                          const isLastMonth = idx === (dashboardData?.monthly_item_data || []).length - 1;
                          let yoy = (dashboardData?.monthly_item_yoy ? (dashboardData.monthly_item_yoy as any)[selectedItem]?.[idx] : 0) || 0;
                          
                          if (isLastMonth) {
                            // 마지막 월(10월)은 카드의 YOY 사용
                            if (selectedItem === '당시즌F') {
                              // 당시즌F는 seasonSales 사용
                              const currentSeasonF = seasonSales?.current_season_f?.october?.total_net_sales || 0;
                              const prevSeasonF = seasonSales?.previous_season_f?.october?.total_net_sales || 0;
                              yoy = prevSeasonF > 0 ? Math.round((currentSeasonF / prevSeasonF) * 100) : 0;
                            } else if (selectedItem === '모자') {
                              // 모자는 accStock?.october_sales 사용
                              const heaSales = accStock?.october_sales ? (accStock.october_sales as any)?.HEA : undefined;
                              yoy = Math.round(heaSales?.yoy || 0);
                            } else if (selectedItem === '신발') {
                              // 신발은 accStock?.october_sales 사용
                              const shoSales = accStock?.october_sales ? (accStock.october_sales as any)?.SHO : undefined;
                              yoy = Math.round(shoSales?.yoy || 0);
                            } else if (selectedItem === '가방외') {
                              // 가방외는 accStock?.october_sales 사용
                              const bagSales = accStock?.october_sales ? (accStock.october_sales as any)?.BAG : undefined;
                              yoy = Math.round(bagSales?.yoy || 0);
                            } else {
                              // 당시즌S, 과시즌F, 과시즌S는 monthly_item_data 사용
                              const prevYearMonth = (dashboardData?.monthly_item_data || []).find((d: any) => {
                                const period = d.period;
                                const year = parseInt(period.slice(0, 2));
                                const month = parseInt(period.slice(2, 4));
                                return year === 24 && month === 10; // 2410
                              });
                              
                              if (prevYearMonth) {
                                const currentNet = (monthData as any)[selectedItem]?.net_sales || 0;
                                const prevNet = (prevYearMonth as any)[selectedItem]?.net_sales || 0;
                                yoy = prevNet > 0 ? Math.round((currentNet / prevNet) * 100) : 0;
                              }
                            }
                          }
                          
                          return (
                          <td 
                            key={idx} 
                            className={`border border-gray-300 px-1 py-1 text-center font-bold ${yoy >= 100 ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {yoy}%
                          </td>
                          );
                        })}
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 주요 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    {(() => {
                      const monthlyData = (dashboardData?.monthly_item_data || []) as any[];
                      if (monthlyData.length === 0) return <div>데이터 없음</div>;
                      
                      const totals = monthlyData.map((item: any) => {
                        const 당시즌F = Math.round((item.당시즌F?.net_sales || 0) / 1000);
                        const 당시즌S = Math.round((item.당시즌S?.net_sales || 0) / 1000);
                        const 과시즌F = Math.round((item.과시즌F?.net_sales || 0) / 1000);
                        const 과시즌S = Math.round((item.과시즌S?.net_sales || 0) / 1000);
                        const 모자 = Math.round((item.모자?.net_sales || 0) / 1000);
                        const 신발 = Math.round((item.신발?.net_sales || 0) / 1000);
                        const 가방 = Math.round((item.가방?.net_sales || 0) / 1000);
                        const 기타ACC = Math.round((item.기타ACC?.net_sales || 0) / 1000);
                        return 당시즌F + 당시즌S + 과시즌F + 과시즌S + 모자 + 신발 + 가방 + 기타ACC;
                      });
                      const maxTotal = Math.max(...totals);
                      const minTotal = Math.min(...totals);
                      const maxMonth = monthlyData[totals.indexOf(maxTotal)]?.period?.slice(2, 4) || '';
                      const minMonth = monthlyData[totals.indexOf(minTotal)]?.period?.slice(2, 4) || '';
                      
                      return (
                        <>
                          <div>• {maxMonth}월 최대 {maxTotal.toLocaleString()}K</div>
                          <div>• {minMonth}월 최저 {minTotal.toLocaleString()}K</div>
                          <div>• 당시즌F 주도 성장</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 아이템 트렌드</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    {(() => {
                      const monthlyData = (dashboardData?.monthly_item_data || []) as any[];
                      if (monthlyData.length === 0) return <div>데이터 없음</div>;
                      
                      const latest = monthlyData[monthlyData.length - 1] || {};
                      const 당시즌F = Math.round((latest.당시즌F?.net_sales || 0) / 1000);
                      const 당시즌S = Math.round((latest.당시즌S?.net_sales || 0) / 1000);
                      const total = 당시즌F + 당시즌S + Math.round((latest.과시즌F?.net_sales || 0) / 1000) + 
                                   Math.round((latest.과시즌S?.net_sales || 0) / 1000) + 
                                   Math.round((latest.모자?.net_sales || 0) / 1000) + 
                                   Math.round((latest.신발?.net_sales || 0) / 1000) + 
                                   Math.round((latest.가방외?.net_sales || 0) / 1000);
                      const 당시즌F_pct = total > 0 ? ((당시즌F / total) * 100).toFixed(1) : '0.0';
                      
                      return (
                        <>
                          <div>• 당시즌F: 최대 비중 ({당시즌F_pct}%)</div>
                          <div>• 신발/모자: 안정적 기여</div>
                          <div>• 과시즌: 소진 진행 중</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 전략 포인트</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    <div>• 당시즌 상품 집중 관리</div>
                    <div>• 과시즌 재고 소진 가속화</div>
                    <div>• ACC 상품 믹스 최적화</div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 {selectedItem} 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    {(() => {
                      const monthlyData = (dashboardData?.monthly_item_data || []) as any[];
                      if (monthlyData.length === 0) return <div>데이터 없음</div>;
                      
                      const itemData = monthlyData.map((item: any) => {
                        const itemKey = selectedItem as keyof typeof item;
                        return Math.round((item[itemKey]?.net_sales || 0) / 1000);
                      });
                      const maxValue = Math.max(...itemData);
                      const minValue = Math.min(...itemData);
                      const maxMonth = monthlyData[itemData.indexOf(maxValue)]?.period?.slice(2, 4) || '';
                      const minMonth = monthlyData[itemData.indexOf(minValue)]?.period?.slice(2, 4) || '';
                      
                      return (
                        <>
                          <div>• {maxMonth}월 최고 {maxValue.toLocaleString()}K</div>
                          <div>• {minMonth}월 최저 {minValue.toLocaleString()}K</div>
                          <div>• 평균 {Math.round(itemData.reduce((a, b) => a + b, 0) / itemData.length).toLocaleString()}K</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 성과 분석</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    {(() => {
                      const yoyData = (dashboardData?.monthly_item_yoy as any)?.[selectedItem] || [];
                      if (yoyData.length === 0) return <div>데이터 없음</div>;
                      
                      const latestYoy = yoyData[yoyData.length - 1] || 0;
                      const avgYoy = Math.round(yoyData.reduce((a: number, b: number) => a + b, 0) / yoyData.length);
                      
                      return (
                        <>
                          <div>• 10월 YOY {latestYoy}%</div>
                          <div>• 평균 YOY {avgYoy}%</div>
                          <div>• {latestYoy >= 100 ? '성장세 유지' : '성장 둔화'}</div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 액션 아이템</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    <div>• 상품 기획 최적화</div>
                    <div>• 재고 운영 개선</div>
                    <div>• 마케팅 전략 조정</div>
                  </div>
                </div>
              </>
            )}
          </div>
                  </div>

        {/* ③ 2025년 월별 아이템별 재고 추세 (TAG, 1K HKD) */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center whitespace-nowrap">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              2025년 월별 아이템별 재고 추세 (TAG, 1K HKD)
            </h3>
          </div>
          
          <ResponsiveContainer width="100%" height={250}>
            <BarChart 
              data={(dashboardData?.monthly_inventory_data || []).map((item: any) => {
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
                '가방_weeks': item.가방?.stock_weeks || 0,
                '기타ACC_weeks': item.기타ACC?.stock_weeks || 0,
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
              <Bar dataKey="F당시즌" stackId="a" fill="#FFD4B3" />
              <Bar dataKey="S당시즌" stackId="a" fill="#B3E5FC" />
              <Bar dataKey="과시즌FW" stackId="a" fill="#FFB3BA" />
              <Bar dataKey="과시즌SS" stackId="a" fill="#B2F5EA" />
              <Bar dataKey="모자" stackId="a" fill="#93C5FD" />
              <Bar dataKey="신발" stackId="a" fill="#FCD34D" />
              <Bar dataKey="가방" stackId="a" fill="#C4B5FD" />
              <Bar dataKey="기타ACC" stackId="a" fill="#9CA3AF" />
              {/* 재고주수 레이블 - 맨 마지막에 렌더링하여 막대 위에 표시 */}
              <Layer>
                {(dashboardData?.monthly_inventory_data || []).map((item: any, index: number) => {
                  const chartData = (dashboardData?.monthly_inventory_data || []);
                  if (chartData.length === 0) return null;
                  
                  const mappedData = chartData.map((d: any) => {
                    // 1~6월: 24F(F당시즌)를 과시즌FW로 이동
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
                  
                  const maxValue = Math.max(...mappedData.map((d: any) => 
                    d.F당시즌 + d.S당시즌 + d.과시즌FW + d.과시즌SS + d.모자 + d.신발 + d.가방 + d.기타ACC
                  ));
                  
                  const chartHeight = 205;
                  const marginTop = 40;
                  const yBase = marginTop + chartHeight;
                  
                  const 모자Weeks = item.모자?.stock_weeks || 0;
                  const 신발Weeks = item.신발?.stock_weeks || 0;
                  const 가방Weeks = item.가방?.stock_weeks || 0;
                  const 기타ACCWeeks = item.기타ACC?.stock_weeks || 0;
                  
                  if (!모자Weeks && !신발Weeks && !가방Weeks && !기타ACCWeeks) return null;
                  
                  const F당시즌 = mappedData[index].F당시즌;
                  const S당시즌 = mappedData[index].S당시즌;
                  const 과시즌FW = mappedData[index].과시즌FW;
                  const 과시즌SS = mappedData[index].과시즌SS;
                  const 모자 = mappedData[index].모자;
                  const 신발 = mappedData[index].신발;
                  const 가방 = mappedData[index].가방;
                  const 기타ACC = mappedData[index].기타ACC;
                  
                  const 누적_모자 = F당시즌 + S당시즌 + 과시즌FW + 과시즌SS + 모자;
                  const 누적_신발 = 누적_모자 + 신발;
                  const 누적_가방 = 누적_신발 + 가방;
                  const 누적_기타ACC = 누적_가방 + 기타ACC;
                  
                  const 모자Y = yBase - (누적_모자 / maxValue * chartHeight) - 5;
                  const 신발Y = yBase - (누적_신발 / maxValue * chartHeight) - 5;
                  const 가방Y = yBase - (누적_가방 / maxValue * chartHeight) - 5;
                  const 기타ACCY = yBase - (누적_기타ACC / maxValue * chartHeight) - 5;
                  
                  const barX = 47 + index * 94;
                  
                  return (
                    <g key={`labels-${index}`}>
                      {모자Weeks > 0 && (
                        <g>
                          {/* 흰색 배경 - 레이블이 막대 위에 보이도록 */}
                          <rect
                            x={barX - 12}
                            y={모자Y - 8}
                            width={24}
                            height={10}
                            fill="white"
                            fillOpacity={1}
                            stroke="none"
                          />
                          <text 
                            x={barX} 
                            y={모자Y} 
                            textAnchor="middle" 
                            fill="#000000" 
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
                            x={barX - 12}
                            y={신발Y - 8}
                            width={24}
                            height={10}
                            fill="white"
                            fillOpacity={1}
                            stroke="none"
                          />
                          <text 
                            x={barX} 
                            y={신발Y} 
                            textAnchor="middle" 
                            fill="#000000" 
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
                            x={barX - 12}
                            y={가방Y - 8}
                            width={24}
                            height={10}
                            fill="white"
                            fillOpacity={1}
                            stroke="none"
                          />
                          <text 
                            x={barX} 
                            y={가방Y} 
                            textAnchor="middle" 
                            fill="#000000" 
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
                            x={barX - 12}
                            y={기타ACCY - 8}
                            width={24}
                            height={10}
                            fill="white"
                            fillOpacity={1}
                            stroke="none"
                          />
                          <text 
                            x={barX} 
                            y={기타ACCY} 
                            textAnchor="middle" 
                            fill="#000000" 
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
          
          {/* 범례 클릭 가능하게 만들기 */}
          <div className="mt-4">
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { name: '전체', color: '#E5E7EB', displayName: '전체', emoji: '📊' },
                { name: 'F당시즌', color: '#FED7AA', displayName: '25F', emoji: '🍂' },
                { name: 'S당시즌', color: '#A5F3FC', displayName: '25S', emoji: '☀️' },
                { name: '과시즌FW', color: '#FCA5A5', displayName: '과시즌F', emoji: '❄️' },
                { name: '과시즌SS', color: '#5EEAD4', displayName: '과시즌S', emoji: '🌊' },
                { name: '모자', color: '#93C5FD', displayName: '모자', emoji: '🧢' },
                { name: '신발', color: '#FCD34D', displayName: '신발', emoji: '👟' },
                { name: '가방', color: '#C4B5FD', displayName: '가방', emoji: '👜' },
                { name: '기타ACC', color: '#9CA3AF', displayName: '기타ACC', emoji: '🎒' },
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    setSelectedInventoryItem(selectedInventoryItem === item.name ? null : item.name);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded transition-all border-2 ${
                    selectedInventoryItem === item.name
                      ? 'ring-2 ring-purple-600 scale-105 shadow-lg'
                      : 'hover:scale-105 shadow-md border-gray-300'
                  }`}
                  style={{ 
                    backgroundColor: item.color,
                    color: '#000000',
                    borderColor: selectedInventoryItem === item.name ? '#9333EA' : '#D1D5DB'
                  }}
                >
                  {item.emoji} {item.displayName}
                </button>
              ))}
            </div>
            
            {selectedInventoryItem && (
              <div className="mt-4">
                {(() => {
                  const months = (dashboardData?.monthly_inventory_data || []).map((item: any) => `${item.period.slice(2, 4)}월`);
                  const inventoryYOY = dashboardData?.monthly_inventory_yoy || {};
                  
                  if (selectedInventoryItem === '전체') {
                    return (
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={months.map((month: string, idx: number) => ({
                          month,
                          fSeason: inventoryYOY['F당시즌']?.[idx] ?? null,
                          sSeason: inventoryYOY['S당시즌']?.[idx] ?? null,
                          pastFW: inventoryYOY['과시즌FW']?.[idx] ?? null,
                          pastSS: inventoryYOY['과시즌SS']?.[idx] ?? null,
                          cap: inventoryYOY['모자']?.[idx] ?? null,
                          shoes: inventoryYOY['신발']?.[idx] ?? null,
                          bag: inventoryYOY['가방']?.[idx] ?? null,
                          etcAcc: inventoryYOY['기타ACC']?.[idx] ?? null
                        }))} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(value) => `${value}%`} />
                          <Tooltip 
                            formatter={(value: any, name: string) => value !== null ? [`${value}%`, name] : ['N/A', name]}
                            contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", fontSize: "11px" }}
                          />
                          <ReferenceLine y={100} stroke="#000000" strokeWidth={2} strokeDasharray="5 5" label={{ value: '100%', position: 'right', fill: '#000000', fontSize: 10 }} />
                          <Line 
                            type="monotone" 
                            dataKey="fSeason" 
                            stroke="#FFD4B3" 
                            strokeWidth={3} 
                            dot={(props: any) => {
                              const { payload, cx, cy, index } = props;
                              const yoyValue = payload?.fSeason;
                              const dotColor = yoyValue !== null && yoyValue !== undefined 
                                ? (yoyValue >= 100 ? '#EF4444' : '#10B981') 
                                : '#9CA3AF';
                              return (
                                <circle key={`fSeason-${index}-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={dotColor} stroke="#fff" strokeWidth={1} />
                              );
                            }}
                            connectNulls 
                            name="🍂 당시즌F" 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="sSeason" 
                            stroke="#B3E5FC" 
                            strokeWidth={3} 
                            dot={(props: any) => {
                              const { payload, cx, cy, index } = props;
                              const yoyValue = payload?.sSeason;
                              const dotColor = yoyValue !== null && yoyValue !== undefined 
                                ? (yoyValue >= 100 ? '#EF4444' : '#10B981') 
                                : '#9CA3AF';
                              return (
                                <circle key={`sSeason-${index}-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={dotColor} stroke="#fff" strokeWidth={1} />
                              );
                            }}
                            connectNulls 
                            name="☀️ 당시즌S" 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="pastFW" 
                            stroke="#FFB3BA" 
                            strokeWidth={3} 
                            dot={(props: any) => {
                              const { payload, cx, cy, index } = props;
                              const yoyValue = payload?.pastFW;
                              const dotColor = yoyValue !== null && yoyValue !== undefined 
                                ? (yoyValue >= 100 ? '#EF4444' : '#10B981') 
                                : '#9CA3AF';
                              return (
                                <circle key={`pastFW-${index}-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={dotColor} stroke="#fff" strokeWidth={1} />
                              );
                            }}
                            connectNulls 
                            name="🍂 과시즌F" 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="pastSS" 
                            stroke="#B2F5EA" 
                            strokeWidth={3} 
                            dot={(props: any) => {
                              const { payload, cx, cy, index } = props;
                              const yoyValue = payload?.pastSS;
                              const dotColor = yoyValue !== null && yoyValue !== undefined 
                                ? (yoyValue >= 100 ? '#EF4444' : '#10B981') 
                                : '#9CA3AF';
                              return (
                                <circle key={`pastSS-${index}-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={dotColor} stroke="#fff" strokeWidth={1} />
                              );
                            }}
                            connectNulls 
                            name="☀️ 과시즌S" 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="cap" 
                            stroke="#93C5FD" 
                            strokeWidth={3} 
                            dot={(props: any) => {
                              const { payload, cx, cy, index } = props;
                              const yoyValue = payload?.cap;
                              const dotColor = yoyValue !== null && yoyValue !== undefined 
                                ? (yoyValue >= 100 ? '#EF4444' : '#10B981') 
                                : '#9CA3AF';
                              return (
                                <circle key={`cap-${index}-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={dotColor} stroke="#fff" strokeWidth={1} />
                              );
                            }}
                            connectNulls 
                            name="🧢 모자" 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="shoes" 
                            stroke="#FCD34D" 
                            strokeWidth={3} 
                            dot={(props: any) => {
                              const { payload, cx, cy, index } = props;
                              const yoyValue = payload?.shoes;
                              const dotColor = yoyValue !== null && yoyValue !== undefined 
                                ? (yoyValue >= 100 ? '#EF4444' : '#10B981') 
                                : '#9CA3AF';
                              return (
                                <circle key={`shoes-${index}-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={dotColor} stroke="#fff" strokeWidth={1} />
                              );
                            }}
                            connectNulls 
                            name="👟 신발" 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="bag" 
                            stroke="#C4B5FD" 
                            strokeWidth={3} 
                            dot={(props: any) => {
                              const { payload, cx, cy, index } = props;
                              const yoyValue = payload?.bag;
                              const dotColor = yoyValue !== null && yoyValue !== undefined 
                                ? (yoyValue >= 100 ? '#EF4444' : '#10B981') 
                                : '#9CA3AF';
                              return (
                                <circle key={`bag-${index}-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={dotColor} stroke="#fff" strokeWidth={1} />
                              );
                            }}
                            connectNulls 
                            name="👜 가방" 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="etcAcc" 
                            stroke="#9CA3AF" 
                            strokeWidth={3} 
                            dot={(props: any) => {
                              const { payload, cx, cy, index } = props;
                              const yoyValue = payload?.etcAcc;
                              const dotColor = yoyValue !== null && yoyValue !== undefined 
                                ? (yoyValue >= 100 ? '#EF4444' : '#10B981') 
                                : '#9CA3AF';
                              return (
                                <circle key={`etcAcc-${index}-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={dotColor} stroke="#fff" strokeWidth={1} />
                              );
                            }}
                            connectNulls 
                            name="🎒 기타ACC" 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    );
                  } else {
                    const itemKey = selectedInventoryItem;
                    const yoyData = (inventoryYOY as any)[itemKey] || [];
                    const itemColors: { [key: string]: string } = {
                      'F당시즌': '#FFD4B3',
                      'S당시즌': '#B3E5FC',
                      '과시즌FW': '#FFB3BA',
                      '과시즌SS': '#B2F5EA',
                      '모자': '#93C5FD',
                      '신발': '#FCD34D',
                      '가방': '#C4B5FD',
                      '기타ACC': '#9CA3AF'
                    };
                    
                    const displayNameMap: { [key: string]: string } = {
                      'F당시즌': '당시즌F',
                      'S당시즌': '당시즌S',
                      '과시즌FW': '과시즌F',
                      '과시즌SS': '과시즌S',
                      '모자': '모자',
                      '신발': '신발',
                      '가방': '가방',
                      '기타ACC': '기타ACC'
                    };
                    
                    const displayName = displayNameMap[itemKey] || itemKey;
                    
                    return (
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={months.map((month: string, idx: number) => {
                          const isLastMonth = idx === months.length - 1;
                          let yoyValue = yoyData[idx] ?? null;
                          // 마지막 월(10월)은 카드의 YOY 사용 (ending_inventory 기준)
                          if (isLastMonth) {
                            if (itemKey === 'F당시즌') {
                              yoyValue = Math.round(endingInventory?.by_season?.['당시즌_의류']?.yoy || 0);
                            } else if (itemKey === 'S당시즌') {
                              yoyValue = Math.round(endingInventory?.by_season?.['당시즌_SS']?.yoy || 0);
                            } else if (itemKey === '과시즌FW') {
                              yoyValue = Math.round(endingInventory?.by_season?.['과시즌_FW']?.yoy || 0);
                            } else if (itemKey === '과시즌SS') {
                              yoyValue = Math.round(endingInventory?.by_season?.['과시즌_SS']?.yoy || 0);
                            } else if (itemKey === '모자') {
                              yoyValue = Math.round(endingInventory?.acc_by_category?.HEA?.yoy || 0);
                            } else if (itemKey === '신발') {
                              yoyValue = Math.round(endingInventory?.acc_by_category?.SHO?.yoy || 0);
                            } else if (itemKey === '가방외') {
                              // 가방외는 ATC + BAG + WTC 합계
                              const atcYoy = endingInventory?.acc_by_category?.ATC?.yoy || 0;
                              const bagYoy = endingInventory?.acc_by_category?.BAG?.yoy || 0;
                              const wtcYoy = endingInventory?.acc_by_category?.WTC?.yoy || 0;
                              const atcCurrent = endingInventory?.acc_by_category?.ATC?.current?.stock_price || 0;
                              const bagCurrent = endingInventory?.acc_by_category?.BAG?.current?.stock_price || 0;
                              const wtcCurrent = endingInventory?.acc_by_category?.WTC?.current?.stock_price || 0;
                              const atcPrev = endingInventory?.acc_by_category?.ATC?.previous?.stock_price || 0;
                              const bagPrev = endingInventory?.acc_by_category?.BAG?.previous?.stock_price || 0;
                              const wtcPrev = endingInventory?.acc_by_category?.WTC?.previous?.stock_price || 0;
                              const totalCurrent = atcCurrent + bagCurrent + wtcCurrent;
                              const totalPrev = atcPrev + bagPrev + wtcPrev;
                              yoyValue = totalPrev > 0 ? Math.round((totalCurrent / totalPrev) * 100) : 0;
                            }
                          }
                          return {
                          month,
                            value: yoyValue
                          };
                        })} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(value) => `${value}%`} />
                          <Tooltip 
                            formatter={(value: any) => value !== null ? [`${value}%`, displayName] : ['N/A', displayName]}
                            contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", fontSize: "11px" }}
                          />
                          <ReferenceLine y={100} stroke="#000000" strokeWidth={2} strokeDasharray="5 5" label={{ value: '100%', position: 'right', fill: '#000000', fontSize: 10 }} />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke={itemColors[itemKey] || '#000000'} 
                            strokeWidth={3} 
                            dot={(props: any) => {
                              const { payload, cx, cy, index } = props;
                              const yoyValue = payload?.value;
                              const dotColor = yoyValue !== null && yoyValue !== undefined 
                                ? (yoyValue >= 100 ? '#EF4444' : '#10B981') 
                                : '#9CA3AF';
                              return (
                                <circle key={`${itemKey}-${index}-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={dotColor} stroke="#fff" strokeWidth={1} />
                              );
                            }}
                            connectNulls 
                            name={displayName}
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
                          const months = (dashboardData?.monthly_inventory_data || []).map((item: any) => `${item.period.slice(2, 4)}월`);
                          return months.map((month: string) => (
                            <th key={month} className="border border-gray-300 px-1 py-1 text-center font-semibold">{month}</th>
                          ));
                        })()}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const months = (dashboardData?.monthly_inventory_data || []).map((item: any) => `${item.period.slice(2, 4)}월`);
                        const inventoryYOY = dashboardData?.monthly_inventory_yoy || {};
                        const itemKeys = selectedInventoryItem === '전체' 
                          ? ['F당시즌', 'S당시즌', '과시즌FW', '과시즌SS', '모자', '신발', '가방', '기타ACC']
                          : [selectedInventoryItem];
                        
                        const displayNameMap: { [key: string]: string } = {
                          'F당시즌': '당시즌F',
                          'S당시즌': '당시즌S',
                          '과시즌FW': '과시즌F',
                          '과시즌SS': '과시즌S',
                          '모자': '모자',
                          '신발': '신발',
                          '가방외': '가방외'
                        };
                        
                        return itemKeys.map((itemKey: string) => (
                          <tr key={itemKey} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-1 py-1 font-semibold bg-gray-50">{displayNameMap[itemKey] || itemKey}</td>
                            {months.map((month: string, idx: number) => {
                              const isLastMonth = idx === months.length - 1;
                              let yoyValue = (inventoryYOY as any)[itemKey]?.[idx];
                              // 마지막 월(10월)은 카드의 YOY 사용 (ending_inventory 기준)
                              if (isLastMonth) {
                                if (itemKey === 'F당시즌') {
                                  yoyValue = Math.round(endingInventory?.by_season?.['당시즌_의류']?.yoy || 0);
                                } else if (itemKey === 'S당시즌') {
                                  yoyValue = Math.round(endingInventory?.by_season?.['당시즌_SS']?.yoy || 0);
                                } else if (itemKey === '과시즌FW') {
                                  yoyValue = Math.round(endingInventory?.by_season?.['과시즌_FW']?.yoy || 0);
                                } else if (itemKey === '과시즌SS') {
                                  yoyValue = Math.round(endingInventory?.by_season?.['과시즌_SS']?.yoy || 0);
                                } else if (itemKey === '모자') {
                                  yoyValue = Math.round(endingInventory?.acc_by_category?.HEA?.yoy || 0);
                                } else if (itemKey === '신발') {
                                  yoyValue = Math.round(endingInventory?.acc_by_category?.SHO?.yoy || 0);
                                } else if (itemKey === '가방외') {
                                  // 가방외는 ATC + BAG + WTC 합계
                                  const atcCurrent = endingInventory?.acc_by_category?.ATC?.current?.stock_price || 0;
                                  const bagCurrent = endingInventory?.acc_by_category?.BAG?.current?.stock_price || 0;
                                  const wtcCurrent = endingInventory?.acc_by_category?.WTC?.current?.stock_price || 0;
                                  const atcPrev = endingInventory?.acc_by_category?.ATC?.previous?.stock_price || 0;
                                  const bagPrev = endingInventory?.acc_by_category?.BAG?.previous?.stock_price || 0;
                                  const wtcPrev = endingInventory?.acc_by_category?.WTC?.previous?.stock_price || 0;
                                  const totalCurrent = atcCurrent + bagCurrent + wtcCurrent;
                                  const totalPrev = atcPrev + bagPrev + wtcPrev;
                                  yoyValue = totalPrev > 0 ? Math.round((totalCurrent / totalPrev) * 100) : 0;
                                }
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
                <div>• 과시즌FW 재고 YOY {Math.round((dashboardData?.ending_inventory?.past_season_fw?.total?.yoy || 0))}% 급증</div>
                <div>• 과시즌SS 재고 YOY {Math.round((dashboardData?.ending_inventory?.by_season?.과시즌_SS?.yoy || 0))}% 증가</div>
                <div>• 총재고 {Math.round((dashboardData?.ending_inventory?.total?.current || 0))}K (YOY {Math.round((dashboardData?.ending_inventory?.total?.yoy || 0))}%)</div>
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-1.5">
              <h4 className="text-xs font-bold text-orange-800 mb-1">▲ Risk Monitoring</h4>
              <div className="space-y-0.5 text-xs text-orange-700">
                <div>• 신발 재고주수 {formatStockWeeks(dashboardData?.acc_stock_summary?.by_category?.SHO?.current?.stock_weeks || 0)}주 (전년 {formatStockWeeks(dashboardData?.acc_stock_summary?.by_category?.SHO?.previous?.stock_weeks || 0)}주)</div>
                {(() => {
                  const current = dashboardData?.acc_stock_summary?.by_category?.BAG?.current?.stock_weeks || 0;
                  const previous = dashboardData?.acc_stock_summary?.by_category?.BAG?.previous?.stock_weeks || 0;
                  const isIncrease = current > previous;
                  return (
                    <div>• 가방외 재고주수 {formatStockWeeks(current)}주 (전년 {formatStockWeeks(previous)}주) {isIncrease ? '증가' : '감소'}</div>
                  );
                })()}
                <div>• F당시즌 YOY {Math.round((dashboardData?.ending_inventory?.by_season?.당시즌_의류?.yoy || 0))}% 정상화 중</div>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
              <h4 className="text-xs font-bold text-green-800 mb-1">✓ Positive Sign</h4>
              <div className="space-y-0.5 text-xs text-green-700">
                <div>• 신발 재고 YOY {Math.round((dashboardData?.ending_inventory?.acc_by_category?.SHO?.yoy || 0))}% 개선</div>
                <div>• 가방외 재고 YOY {Math.round((dashboardData?.ending_inventory?.acc_by_category?.BAG?.yoy || 0))}% 개선</div>
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
              오프라인 매장별 현황 (실판V-, 25년 10월 기준)
            </h3>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded hover:bg-purple-700 transition-colors"
                onClick={() => window.open('/taiwan/stores-dashboard', '_blank')}
              >
                평당매출 상세
              </button>
              <button
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors"
                onClick={() => window.open('/taiwan/regional-analysis', '_blank')}
              >
                지역별 상세
              </button>
            </div>
          </div>
          
          {/* 전년 당년 카테고리 변화 범례 */}
          <div className="mb-3 p-2 bg-gray-50 rounded border border-gray-200">
            <div className="text-xs font-semibold text-gray-700 mb-1">카테고리 기준:</div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded font-semibold">흑↑ 흑자&성장</span>
              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">흑↓ 흑자&역성장</span>
              <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded font-semibold">적↑ 적자&성장</span>
              <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded font-semibold">적↓ 적자&역성장</span>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 w-full">
            {/* 전체 매장 요약 */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg p-4 border border-slate-600 min-w-0 shadow-lg">
              <h4 className="text-base font-bold text-white mb-3">오프라인 매장 요약</h4>
              <div className="space-y-3 text-xs">
                {/* 매장 수 */}
                <div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {totalStoreCurrent}개 매장
                  </div>
                  <div className="text-xs text-slate-300 mb-2">
                    실판매출 YOY {formatYoy(totalSalesPerStoreYoy)}%
                  </div>
                  <div className="text-[10px] text-slate-400 italic">
                    * 종료매장·온라인 제외
                  </div>
                </div>

                {/* 전체 직접이익 */}
                <div className="pt-2 border-t border-slate-600">
                  <div className="flex items-center justify-between">
                    <div className="text-slate-300 text-[10px]">전체 직접이익</div>
                    <div className={`font-bold text-sm ${(plData?.channel_direct_profit?.total?.direct_profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatNumber(plData?.channel_direct_profit?.total?.direct_profit || 0)}K HKD
                    </div>
                  </div>
                </div>

                {/* 채널별 구분 */}
                <div className="pt-2 border-t border-slate-600">
                  <div className="text-white font-semibold text-xs mb-2">채널별 구분</div>
                  <div className="space-y-1.5">
                    {(() => {
                      const retailStores = activeTWStores.filter((s: any) => s.channel === 'Retail');
                      const outletStores = activeTWStores.filter((s: any) => s.channel === 'Outlet');
                      const retailYoy = retailStores.length > 0 
                        ? retailStores.reduce((sum: number, s: any) => sum + s.yoy, 0) / retailStores.length 
                        : 0;
                      const outletYoy = outletStores.length > 0 
                        ? outletStores.reduce((sum: number, s: any) => sum + s.yoy, 0) / outletStores.length 
                        : 0;
                      const retailProfit = retailStores.reduce((sum: number, s: any) => sum + (s.direct_profit || 0), 0);
                      const outletProfit = outletStores.reduce((sum: number, s: any) => sum + (s.direct_profit || 0), 0);
                      return (
                        <>
                          <div className="bg-blue-700 rounded px-2 py-1.5 flex items-center gap-1.5">
                            <span className="text-white text-xs font-semibold">리테일</span>
                            <span className="text-white text-xs font-bold ml-auto">
                              {retailStores.length}개 | YOY {formatYoy(retailYoy)}% | {retailProfit >= 0 ? '+' : ''}{formatNumber(retailProfit)}K
                            </span>
                          </div>
                          <div className={`rounded px-2 py-1.5 flex items-center gap-1.5 ${outletProfit >= 0 ? 'bg-blue-700' : 'bg-red-600'}`}>
                            <span className="text-white text-xs font-semibold">아울렛</span>
                            <span className="text-white text-xs font-bold ml-auto">
                              {outletStores.length}개 | YOY {formatYoy(outletYoy)}% | {outletProfit >= 0 ? '+' : ''}{formatNumber(outletProfit)}K
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* 수익성별 매장 수 */}
                <div className="pt-2 border-t border-slate-600">
                  <div className="text-white font-semibold text-xs mb-2">수익성별 매장 수</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(() => {
                      const profitableCount = activeTWStores.filter((s: any) => (s.direct_profit || 0) > 0).length;
                      const unprofitableCount = activeTWStores.filter((s: any) => (s.direct_profit || 0) < 0).length;
                      return (
                        <>
                          <div className="bg-green-600 rounded px-2 py-1.5 flex items-center gap-1.5">
                            <span className="text-white text-sm">✓</span>
                            <span className="text-white text-xs font-semibold">흑자매장</span>
                            <span className="text-white text-xs font-bold ml-auto">{profitableCount}개</span>
                          </div>
                          <div className="bg-red-600 rounded px-2 py-1.5 flex items-center gap-1.5">
                            <span className="text-red-200 text-sm">↓</span>
                            <span className="text-white text-xs font-semibold">적자매장</span>
                            <span className="text-white text-xs font-bold ml-auto">{unprofitableCount}개</span>
                          </div>
                        </>
                      );
                    })()}
              </div>
            </div>
            
                {/* 평당매출 분석 */}
                <div className="pt-2 border-t border-slate-600">
                  <div className="text-white font-semibold text-sm mb-2">📊 평당매출 분석 (1K HKD/평/1일)</div>
                  <div className="space-y-2">
            {(() => {
                      const storeAreas = (storeAreasData as any)?.store_areas || {};
                      
                      // 전체 평당매출 계산
                      let totalSales = 0;
                      let totalPrevSales = 0;
                      let totalArea = 0;
                      let totalPrevArea = 0;
                      
                      activeTWStores.forEach((store: any) => {
                        const area = storeAreas[store.shop_cd] || 0;
                        if (area > 0 && store.current?.net_sales > 0) {
                          totalSales += store.current.net_sales;
                          totalArea += area;
                        }
                        if (area > 0 && store.previous?.net_sales > 0) {
                          totalPrevSales += store.previous.net_sales;
                          totalPrevArea += area;
                        }
                      });
                      
                      const overallAvgSalesPerPyeong = totalArea > 0 ? (totalSales / totalArea / 30) : 0; // 1K HKD/평/1일
                      const overallPrevAvgSalesPerPyeong = totalPrevArea > 0 ? (totalPrevSales / totalPrevArea / 30) : 0; // 1K HKD/평/1일
                      const overallYoy = overallPrevAvgSalesPerPyeong > 0 ? (overallAvgSalesPerPyeong / overallPrevAvgSalesPerPyeong) * 100 : 0;
              
                      // 대형 흑자매장 계산
                      const largeStores = storeCategories?.large_profit?.stores || [];
                      let largeTotalSales = 0;
                      let largeTotalPrevSales = 0;
                      let largeTotalArea = 0;
                      let largeTotalPrevArea = 0;
              
                      largeStores.forEach((store: any) => {
                const storeCode = store.shop_cd || store.store_code;
                        const area = storeAreas[storeCode] || 0;
                        if (area > 0) {
                          const storeData = plData?.channel_direct_profit?.stores?.[storeCode];
                          if (storeData?.net_sales > 0) {
                            largeTotalSales += storeData.net_sales;
                            largeTotalArea += area;
                          }
                          if (storeData?.net_sales_prev > 0) {
                            largeTotalPrevSales += storeData.net_sales_prev;
                            largeTotalPrevArea += area;
                          }
                        }
                      });
                      
                      const largeAvgSalesPerPyeong = largeTotalArea > 0 ? (largeTotalSales / largeTotalArea / 30) : 0; // 1K HKD/평/1일
                      const largePrevAvgSalesPerPyeong = largeTotalPrevArea > 0 ? (largeTotalPrevSales / largeTotalPrevArea / 30) : 0; // 1K HKD/평/1일
                      const largeYoy = largePrevAvgSalesPerPyeong > 0 ? (largeAvgSalesPerPyeong / largePrevAvgSalesPerPyeong) * 100 : 0;
                      
                      // 중소형 흑자매장 계산
                      const smallMediumStores = storeCategories?.small_medium_profit?.stores || [];
                      let smallTotalSales = 0;
                      let smallTotalPrevSales = 0;
                      let smallTotalArea = 0;
                      let smallTotalPrevArea = 0;
                      
                      smallMediumStores.forEach((store: any) => {
                        const storeCode = store.shop_cd || store.store_code;
                        const area = storeAreas[storeCode] || 0;
                        if (area > 0) {
                          const storeData = plData?.channel_direct_profit?.stores?.[storeCode];
                          if (storeData?.net_sales > 0) {
                            smallTotalSales += storeData.net_sales;
                            smallTotalArea += area;
                          }
                          if (storeData?.net_sales_prev > 0) {
                            smallTotalPrevSales += storeData.net_sales_prev;
                            smallTotalPrevArea += area;
                          }
                        }
                      });
                      
                      const smallAvgSalesPerPyeong = smallTotalArea > 0 ? (smallTotalSales / smallTotalArea / 30) : 0; // 1K HKD/평/1일
                      const smallPrevAvgSalesPerPyeong = smallTotalPrevArea > 0 ? (smallTotalPrevSales / smallTotalPrevArea / 30) : 0; // 1K HKD/평/1일
                      const smallYoy = smallPrevAvgSalesPerPyeong > 0 ? (smallAvgSalesPerPyeong / smallPrevAvgSalesPerPyeong) * 100 : 0;
                      
                      // 매장 분류 (대형: 40평 이상, 중소형: 40평 미만, 아울렛: TU로 시작)
                      const outletStores = activeTWStores.filter((s: any) => s.shop_cd?.startsWith('TU'));
                      const regularStores = activeTWStores.filter((s: any) => !s.shop_cd?.startsWith('TU'));
                      
                      const largeRegularStores = regularStores.filter((s: any) => {
                        const area = storeAreas[s.shop_cd] || 0;
                        return area >= 40;
                      });
                      const smallRegularStores = regularStores.filter((s: any) => {
                        const area = storeAreas[s.shop_cd] || 0;
                        return area > 0 && area < 40;
                      });
                      
                      // 대형 매장 평당매출
                      let largeRegularTotalSales = 0, largeRegularTotalArea = 0, largeRegularPrevTotalSales = 0, largeRegularPrevTotalArea = 0;
                      largeRegularStores.forEach((s: any) => {
                        const area = storeAreas[s.shop_cd] || 0;
                        if (area > 0) {
                          if (s.current?.net_sales > 0) { largeRegularTotalSales += s.current.net_sales; largeRegularTotalArea += area; }
                          if (s.previous?.net_sales > 0) { largeRegularPrevTotalSales += s.previous.net_sales; largeRegularPrevTotalArea += area; }
                }
              });
                      const largeRegularAvgSalesPerPyeong = largeRegularTotalArea > 0 ? (largeRegularTotalSales / largeRegularTotalArea / 30) : 0; // 1K HKD/평/1일
                      const largeRegularPrevAvgSalesPerPyeong = largeRegularPrevTotalArea > 0 ? (largeRegularPrevTotalSales / largeRegularPrevTotalArea / 30) : 0;
                      const largeRegularYoy = largeRegularPrevAvgSalesPerPyeong > 0 ? (largeRegularAvgSalesPerPyeong / largeRegularPrevAvgSalesPerPyeong) * 100 : 0;
                      
                      // 중소형 매장 평당매출
                      let smallRegularTotalSales = 0, smallRegularTotalArea = 0, smallRegularPrevTotalSales = 0, smallRegularPrevTotalArea = 0;
                      smallRegularStores.forEach((s: any) => {
                        const area = storeAreas[s.shop_cd] || 0;
                        if (area > 0) {
                          if (s.current?.net_sales > 0) { smallRegularTotalSales += s.current.net_sales; smallRegularTotalArea += area; }
                          if (s.previous?.net_sales > 0) { smallRegularPrevTotalSales += s.previous.net_sales; smallRegularPrevTotalArea += area; }
                        }
                      });
                      const smallRegularAvgSalesPerPyeong = smallRegularTotalArea > 0 ? (smallRegularTotalSales / smallRegularTotalArea / 30) : 0; // 1K HKD/평/1일
                      const smallRegularPrevAvgSalesPerPyeong = smallRegularPrevTotalArea > 0 ? (smallRegularPrevTotalSales / smallRegularPrevTotalArea / 30) : 0;
                      const smallRegularYoy = smallRegularPrevAvgSalesPerPyeong > 0 ? (smallRegularAvgSalesPerPyeong / smallRegularPrevAvgSalesPerPyeong) * 100 : 0;
                      
                      // 아울렛 매장 평당매출
                      let outletTotalSales = 0, outletTotalArea = 0, outletPrevTotalSales = 0, outletPrevTotalArea = 0;
                      outletStores.forEach((s: any) => {
                        const area = storeAreas[s.shop_cd] || 0;
                        if (area > 0) {
                          if (s.current?.net_sales > 0) { outletTotalSales += s.current.net_sales; outletTotalArea += area; }
                          if (s.previous?.net_sales > 0) { outletPrevTotalSales += s.previous.net_sales; outletPrevTotalArea += area; }
                        }
                      });
                      const outletAvgSalesPerPyeong = outletTotalArea > 0 ? (outletTotalSales / outletTotalArea / 30) : 0; // 1K HKD/평/1일
                      const outletPrevAvgSalesPerPyeong = outletPrevTotalArea > 0 ? (outletPrevTotalSales / outletPrevTotalArea / 30) : 0;
                      const outletYoy = outletPrevAvgSalesPerPyeong > 0 ? (outletAvgSalesPerPyeong / outletPrevAvgSalesPerPyeong) * 100 : 0;
                      
                      // 비교 분석 계산
                      const largeDiff = smallAvgSalesPerPyeong > 0 ? ((largeAvgSalesPerPyeong - smallAvgSalesPerPyeong) / smallAvgSalesPerPyeong * 100) : 0;
                      const yoyDiff = largeYoy - smallYoy;
              
              return (
                        <>
                          {/* 1. 전체 평당매출 */}
                          <div className="bg-indigo-900 rounded px-3 py-2.5">
                            <div className="text-white text-xs font-semibold mb-1.5">1️⃣ 전체 평당매출</div>
                            <div className="text-slate-100 text-[11px] font-medium">
                              {formatNumber(Math.round(overallAvgSalesPerPyeong))} (1K HKD/평/1일) · YOY {formatYoy(Math.round(overallYoy))}%
                          </div>
                            <div className="text-yellow-200 text-[10px] mt-1.5 font-medium leading-relaxed">
                              {overallYoy >= 115 
                                ? `💡 전년 대비 ${Math.round(overallYoy - 100)}%p 높은 성장률로 매장당 수익성 크게 개선` 
                                : overallYoy >= 105 
                                  ? `💡 전년 대비 ${Math.round(overallYoy - 100)}%p 성장, 안정적인 매장 운영 효율`
                                  : overallYoy >= 100
                                    ? `💡 소폭 성장(+${Math.round(overallYoy - 100)}%p), 추가 개선 여지 있음`
                                    : `⚠️ 전년 대비 ${Math.abs(Math.round(overallYoy - 100))}%p 감소, 매장 효율성 점검 필요`}
                              </div>
                        </div>
                          
                          {/* 2. 매장 유형별 평당매출 특성 */}
                          <div className="bg-blue-900 rounded px-3 py-2.5">
                            <div className="text-white text-xs font-semibold mb-1.5">2️⃣ 매장 유형별 평당매출 (대형→중소형→아울렛)</div>
                            <div className="text-slate-100 text-[11px] space-y-1">
                              <div>• 대형({largeRegularStores.length}개, 40평 이상): {formatNumber(Math.round(largeRegularAvgSalesPerPyeong * 10) / 10)} · YOY {formatYoy(Math.round(largeRegularYoy))}%</div>
                              <div>• 중소형({smallRegularStores.length}개, 40평 미만): {formatNumber(Math.round(smallRegularAvgSalesPerPyeong * 10) / 10)} · YOY {formatYoy(Math.round(smallRegularYoy))}%</div>
                              <div>• 아울렛({outletStores.length}개): {formatNumber(Math.round(outletAvgSalesPerPyeong * 10) / 10)} · YOY {formatYoy(Math.round(outletYoy))}%</div>
                        </div>
                            <div className="text-yellow-200 text-[10px] mt-1.5 font-medium leading-relaxed">
                              {(() => {
                                const maxYoy = Math.max(largeRegularYoy, smallRegularYoy, outletYoy);
                                const maxSales = Math.max(largeRegularAvgSalesPerPyeong, smallRegularAvgSalesPerPyeong, outletAvgSalesPerPyeong);
                                
                                if (smallRegularYoy < 100) {
                                  return `⚠️ 중소형 매장 성장률 ${Math.round(smallRegularYoy)}%로 집중 관리 필요`;
                                } else if (largeRegularYoy === maxYoy && largeRegularYoy >= 120) {
                                  return `💡 대형 매장 규모 경제 효과로 최고 성장률(${Math.round(largeRegularYoy)}%) 달성`;
                                } else if (largeRegularAvgSalesPerPyeong === maxSales && largeRegularAvgSalesPerPyeong > smallRegularAvgSalesPerPyeong * 1.1) {
                                  return `💡 대형 매장 평당매출 최고, 중소형 대비 ${Math.round((largeRegularAvgSalesPerPyeong / smallRegularAvgSalesPerPyeong - 1) * 100)}% 높음`;
                                } else {
                                  return `💡 전 유형 균형적 성장 (평균 YOY ${Math.round((largeRegularYoy + smallRegularYoy + outletYoy) / 3)}%)`;
                                }
                              })()}
                        </div>
                      </div>
                        </>
                      );
                    })()}
                    </div>
                  </div>
                </div>
            </div>
            
            {/* 대형 매장 (40평 이상) */}
            {(() => {
              const storeAreas = (storeAreasData as any)?.store_areas || {};
              const largeRegularStores = activeTWStores.filter((s: any) => {
                if (s.shop_cd?.startsWith('TU')) return false; // 아울렛 제외
                const area = storeAreas[s.shop_cd] || 0;
                return area >= 40;
              });
              
              if (largeRegularStores.length === 0) return null;
              
              const totalProfit = largeRegularStores.reduce((sum: number, s: any) => sum + (s.direct_profit || 0), 0);
              // 신규매장 제외하고 평균 YOY 계산
              const storesWithPrevious = largeRegularStores.filter((s: any) => s.previous && s.previous.net_sales > 0);
              const avgYoy = storesWithPrevious.length > 0 ? storesWithPrevious.reduce((sum: number, s: any) => sum + s.yoy, 0) / storesWithPrevious.length : 0;
              
              const categoryColors = {
                '흑↑': 'bg-green-100 text-green-800',
                '흑↓': 'bg-blue-100 text-blue-800',
                '적↑': 'bg-yellow-100 text-yellow-800',
                '적↓': 'bg-red-100 text-red-800'
              };
              
              return (
                <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-500 min-w-0">
                  <h4 className="text-sm font-bold text-blue-800 mb-2">🏢 대형 (40평 이상)</h4>
                  <div className="text-xs text-blue-700 mb-2 font-semibold">{largeRegularStores.length}개 매장</div>
                  <div className="mb-2 text-left pl-2">
                    <span className="text-[10px] font-bold text-gray-600">전년→당년</span>
                  </div>
                  <div className="space-y-2 text-xs mb-3">
                    {largeRegularStores.map((store: any, idx: number) => {
                      const netSales = (store.current?.net_sales || 0) / 1000;
                      const isNewStore = !store.previous || !store.previous.net_sales || store.previous.net_sales === 0;
                      const prevProfit = store.direct_profit_prev || store.previous?.direct_profit || 0;
                      const prevYoy = store.prev_yoy || 0; // 전년 YOY (전전년 대비)
                      // 전년 카테고리: 전년 직접이익과 전년 YOY로 판단
                      const prevCategory = prevProfit > 0 
                        ? (prevYoy >= 100 ? '흑↑' : '흑↓')
                        : (prevYoy >= 100 ? '적↑' : '적↓');
                      // 당년 카테고리: 당년 직접이익과 당년 YOY로 판단
                      const currentCategory = store.direct_profit > 0
                        ? (store.yoy >= 100 ? '흑↑' : '흑↓')
                        : (store.yoy >= 100 ? '적↑' : '적↓');
                      const area = storeAreas[store.shop_cd] || 0;
                      
                      return (
                        <div key={idx} className="flex justify-between items-center bg-white rounded px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            {!isNewStore && (
                            <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${categoryColors[prevCategory as keyof typeof categoryColors]}`}>
                              {prevCategory}
                          </span>
                            )}
                            {isNewStore ? (
                              <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800">
                                신규
                              </span>
                            ) : (
                            <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${categoryColors[currentCategory as keyof typeof categoryColors]}`}>
                              {currentCategory}
                            </span>
                            )}
                            <span className="font-semibold text-blue-900 text-xs">{formatStoreName(store.shop_nm)}</span>
                            {area > 0 && (
                              <span className="text-[10px] text-gray-500">({Math.round(area)}평)</span>
                            )}
                          </div>
                          <div className="text-right">
                            {!isNewStore && (
                            <div className="text-[10px] text-gray-600">매출 YOY {formatYoy(store.yoy)}%</div>
                            )}
                            <div className="font-bold text-blue-600 text-xs">+{Math.round(store.direct_profit)}K</div>
                            </div>
                              </div>
                            );
                          })}
                        </div>
                  <div className="border-t border-blue-300 pt-2 mt-3">
                    <div className="text-xs text-blue-700 mb-1">
                      <span className="font-semibold">직접이익 합계</span>: +{formatNumber(totalProfit, 0)}K
                  </div>
                    <div className="text-[10px] text-blue-600">
                      평균 YOY: {formatYoy(avgYoy)}%
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {/* 중소형 매장 (40평 미만) */}
                      {(() => {
              const storeAreas = (storeAreasData as any)?.store_areas || {};
              const smallRegularStores = activeTWStores.filter((s: any) => {
                if (s.shop_cd?.startsWith('TU')) return false; // 아울렛 제외
                const area = storeAreas[s.shop_cd] || 0;
                return area > 0 && area < 40;
              });
              
              if (smallRegularStores.length === 0) return null;
              
              const totalProfit = smallRegularStores.reduce((sum: number, s: any) => sum + (s.direct_profit || 0), 0);
              // 신규매장 제외하고 평균 YOY 계산
              const storesWithPrevious = smallRegularStores.filter((s: any) => s.previous && s.previous.net_sales > 0);
              const avgYoy = storesWithPrevious.length > 0 ? storesWithPrevious.reduce((sum: number, s: any) => sum + s.yoy, 0) / storesWithPrevious.length : 0;
              
              const categoryColors = {
                '흑↑': 'bg-green-100 text-green-800',
                '흑↓': 'bg-blue-100 text-blue-800',
                '적↑': 'bg-yellow-100 text-yellow-800',
                '적↓': 'bg-red-100 text-red-800'
              };
              
              return (
                <div className="bg-green-50 rounded-lg p-4 border-2 border-green-500 min-w-0">
                  <h4 className="text-sm font-bold text-green-800 mb-2">🏪 중소형 (40평 미만)</h4>
                  <div className="text-xs text-green-700 mb-2 font-semibold">{smallRegularStores.length}개 매장</div>
                  <div className="mb-2 text-left pl-2">
                    <span className="text-[10px] font-bold text-gray-600">전년→당년</span>
                  </div>
                  <div className="space-y-2 text-xs mb-3">
                    {smallRegularStores.map((store: any, idx: number) => {
                      const isNewStore = !store.previous || !store.previous.net_sales || store.previous.net_sales === 0;
                      const prevProfit = store.direct_profit_prev || store.previous?.direct_profit || 0;
                      const prevYoy = store.prev_yoy || 0; // 전년 YOY (전전년 대비)
                      // 전년 카테고리: 전년 직접이익과 전년 YOY로 판단
                      const prevCategory = prevProfit > 0 
                        ? (prevYoy >= 100 ? '흑↑' : '흑↓')
                        : (prevYoy >= 100 ? '적↑' : '적↓');
                      // 당년 카테고리: 당년 직접이익과 당년 YOY로 판단
                      const currentCategory = store.direct_profit > 0
                        ? (store.yoy >= 100 ? '흑↑' : '흑↓')
                        : (store.yoy >= 100 ? '적↑' : '적↓');
                      const area = storeAreas[store.shop_cd] || 0;
                      
                      return (
                        <div key={idx} className="flex justify-between items-center bg-white rounded px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            {!isNewStore && (
                            <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${categoryColors[prevCategory as keyof typeof categoryColors]}`}>
                              {prevCategory}
                            </span>
                            )}
                            {isNewStore ? (
                              <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800">
                                신규
                              </span>
                            ) : (
                            <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${categoryColors[currentCategory as keyof typeof categoryColors]}`}>
                              {currentCategory}
                            </span>
                            )}
                            <span className="font-semibold text-green-900 text-xs">{formatStoreName(store.shop_nm)}</span>
                            {area > 0 && (
                              <span className="text-[10px] text-gray-500">({Math.round(area)}평)</span>
                            )}
                          </div>
                          <div className="text-right">
                            {!isNewStore && (
                            <div className="text-[10px] text-gray-600">매출 YOY {formatYoy(store.yoy)}%</div>
                            )}
                            <div className="font-bold text-green-600 text-xs">+{Math.round(store.direct_profit)}K</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-green-300 pt-2 mt-3">
                    <div className="text-xs text-green-700 mb-1">
                      <span className="font-semibold">직접이익 합계</span>: +{formatNumber(totalProfit, 0)}K
                    </div>
                    <div className="text-[10px] text-green-600">
                      평균 YOY: {formatYoy(avgYoy)}%
                    </div>
                  </div>
                </div>
              );
                      })()}
            
            {/* 아울렛 매장 */}
            {(() => {
              const storeAreas = (storeAreasData as any)?.store_areas || {};
              const outletStores = activeTWStores.filter((s: any) => s.shop_cd?.startsWith('TU'));
              
              if (outletStores.length === 0) return null;
              
              const totalProfit = outletStores.reduce((sum: number, s: any) => sum + (s.direct_profit || 0), 0);
              // 신규매장 제외하고 평균 YOY 계산
              const storesWithPrevious = outletStores.filter((s: any) => s.previous && s.previous.net_sales > 0);
              const avgYoy = storesWithPrevious.length > 0 ? storesWithPrevious.reduce((sum: number, s: any) => sum + s.yoy, 0) / storesWithPrevious.length : 0;
              
              const categoryColors = {
                '흑↑': 'bg-green-100 text-green-800',
                '흑↓': 'bg-blue-100 text-blue-800',
                '적↑': 'bg-yellow-100 text-yellow-800',
                '적↓': 'bg-red-100 text-red-800'
              };
              
              return (
                <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-500 min-w-0">
                  <h4 className="text-sm font-bold text-purple-800 mb-2">🛍️ 아울렛</h4>
                  <div className="text-xs text-purple-700 mb-2 font-semibold">{outletStores.length}개 매장</div>
                  <div className="mb-2 text-left pl-2">
                    <span className="text-[10px] font-bold text-gray-600">전년→당년</span>
                    </div>
                  <div className="space-y-2 text-xs mb-3">
                    {outletStores.map((store: any, idx: number) => {
                      const isNewStore = !store.previous || !store.previous.net_sales || store.previous.net_sales === 0;
                      const prevProfit = store.direct_profit_prev || store.previous?.direct_profit || 0;
                      const prevYoy = store.prev_yoy || 0; // 전년 YOY (전전년 대비)
                      // 전년 카테고리: 전년 직접이익과 전년 YOY로 판단
                      const prevCategory = prevProfit > 0 
                        ? (prevYoy >= 100 ? '흑↑' : '흑↓')
                        : (prevYoy >= 100 ? '적↑' : '적↓');
                      // 당년 카테고리: 당년 직접이익과 당년 YOY로 판단
                      const currentCategory = store.direct_profit > 0
                        ? (store.yoy >= 100 ? '흑↑' : '흑↓')
                        : (store.yoy >= 100 ? '적↑' : '적↓');
                      const area = storeAreas[store.shop_cd] || 0;
                      
                      return (
                        <div key={idx} className="flex justify-between items-center bg-white rounded px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            {!isNewStore && (
                            <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${categoryColors[prevCategory as keyof typeof categoryColors]}`}>
                              {prevCategory}
                            </span>
                            )}
                            {isNewStore ? (
                              <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800">
                                신규
                              </span>
                            ) : (
                            <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${categoryColors[currentCategory as keyof typeof categoryColors]}`}>
                              {currentCategory}
                            </span>
                            )}
                            <span className="font-semibold text-purple-900 text-xs">{formatStoreName(store.shop_nm)}</span>
                            {area > 0 && (
                              <span className="text-[10px] text-gray-500">({Math.round(area)}평)</span>
                            )}
                        </div>
                          <div className="text-right">
                            {!isNewStore && (
                            <div className="text-[10px] text-gray-600">매출 YOY {formatYoy(store.yoy)}%</div>
                            )}
                            <div className="font-bold text-purple-600 text-xs">+{Math.round(store.direct_profit)}K</div>
                        </div>
                        </div>
                      );
                    })}
                      </div>
                  <div className="border-t border-purple-300 pt-2 mt-3">
                    <div className="text-xs text-purple-700 mb-1">
                      <span className="font-semibold">직접이익 합계</span>: +{formatNumber(totalProfit, 0)}K
                    </div>
                    <div className="text-[10px] text-purple-600">
                      평균 YOY: {formatYoy(avgYoy)}%
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {/* 적자매장 */}
            {(() => {
              const lossCat = storeCategories?.loss_all;
              if (!lossCat || lossCat.count === 0) return null;
              
              const improvingStores = lossCat.improving_stores || [];
              const deterioratingStores = lossCat.deteriorating_stores || [];
              
              // 적자매장들의 합계 인건비율, 임차료율, 감가상각비율 계산
              let totalLaborCost = 0;
              let totalRent = 0;
              let totalDepreciation = 0;
              let totalNetSales = 0;
              
              const allLossStores = [...improvingStores, ...deterioratingStores];
              allLossStores.forEach((store: any) => {
                const storeCode = store.shop_cd || store.store_code;
                const storeData = plData?.channel_direct_profit?.stores?.[storeCode as keyof typeof plData.channel_direct_profit.stores];
                if (storeData) {
                  totalLaborCost += storeData.labor_cost || 0;
                  totalRent += storeData.rent || 0;
                  totalDepreciation += storeData.depreciation || 0;
                  totalNetSales += storeData.net_sales || 0;
                }
              });
              
              const laborCostRatio = totalNetSales > 0 ? (totalLaborCost / totalNetSales) * 100 : 0;
              const rentRatio = totalNetSales > 0 ? (totalRent / totalNetSales) * 100 : 0;
              const depreciationRatio = totalNetSales > 0 ? (totalDepreciation / totalNetSales) * 100 : 0;
              
              return (
                <div className="bg-red-50 rounded-lg p-4 border-2 border-red-400 min-w-0">
                  <h4 className="text-sm font-bold text-red-800 mb-2">적자매장</h4>
                  <div className="text-xs text-red-700 mb-3 font-semibold">{lossCat.count}개 매장</div>
                  
                  {/* 매출개선 적자매장 */}
                  {improvingStores.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs text-yellow-700 mb-1.5 font-semibold">매출개선 ({improvingStores.length}개)</div>
                      <div className="space-y-1.5">
                        {improvingStores.map((store: any, idx: number) => {
                          const netSales = (store.current?.net_sales || 0) / 1000;
                          const loss = store.direct_profit || 0;
                          return (
                            <div key={idx} className="flex justify-between items-center bg-yellow-50 rounded px-2 py-1.5 border border-yellow-200">
                              <span className="font-semibold text-yellow-900 text-xs">{store.shop_nm}</span>
                          <div className="text-right">
                                <div className="text-[10px] text-green-600">YOY {formatYoy(store.yoy)}% ↑</div>
                                <div className="text-[10px] text-gray-600">매출 {formatNumber(netSales, 0)}K</div>
                                <div className="font-bold text-yellow-700 text-xs">{formatNumber(loss, 0)}K</div>
                            </div>
                          </div>
                          );
                        })}
                        </div>
                    </div>
                  )}
                  
                  {/* 매출악화 적자매장 */}
                  {deterioratingStores.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs text-red-700 mb-1.5 font-semibold">매출악화 ({deterioratingStores.length}개)</div>
                      <div className="space-y-1.5">
                        {deterioratingStores.map((store: any, idx: number) => {
                          const netSales = (store.current?.net_sales || 0) / 1000;
                          const loss = store.direct_profit || 0;
                            return (
                            <div key={idx} className="flex justify-between items-center bg-white rounded px-2 py-1.5">
                              <span className="font-semibold text-red-900 text-xs">{store.shop_nm}</span>
                              <div className="text-right">
                                <div className="text-[10px] text-red-600">YOY {formatYoy(store.yoy)}% ↓</div>
                                <div className="text-[10px] text-gray-600">매출 {formatNumber(netSales, 0)}K</div>
                                <div className="font-bold text-red-600 text-xs">{formatNumber(loss, 0)}K</div>
                              </div>
                              </div>
                            );
                          })}
                        </div>
                    </div>
                    )}
                  
                  <div className="border-t border-red-300 pt-2 mt-3">
                    <div className="text-xs text-red-700 mb-1">
                      <span className="font-semibold">적자매장 ({lossCat.count}개)</span>: {formatNumber(lossCat.total_direct_profit || 0, 0)}K
                  </div>
                    <div className="text-[10px] text-red-600 flex items-center">
                      <span>우선 조치 계획</span>
                      <span className="ml-1">→</span>
                    </div>
                    {/* 합계 비율 표시 */}
                    <div className="mt-2 pt-2 border-t border-red-200">
                      <div className="text-[10px] text-red-700 font-semibold mb-1">합계 비율 (실판매출 대비)</div>
                      <div className="grid grid-cols-3 gap-2 text-[10px] text-red-600">
                        <div>
                          <div className="font-semibold">인건비율</div>
                          <div>{formatPercent(laborCostRatio, 1)}%</div>
                        </div>
                        <div>
                          <div className="font-semibold">임차료율</div>
                          <div>{formatPercent(rentRatio, 1)}%</div>
                        </div>
                        <div>
                          <div className="font-semibold">감가상각비율</div>
                          <div>{formatPercent(depreciationRatio, 1)}%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* 온라인 채널별 현황 */}
      {(() => {
        // 온라인 채널 데이터 추출
        const onlineStores = allTWStores.filter((store: any) => store.channel === 'Online' && store.current?.net_sales > 0);
        
        // TE1: Momo, TE2: 자사몰, TE3: Shopee
        const momoStore = onlineStores.find((s: any) => s.store_code === 'TE1');
        const ownMallStore = onlineStores.find((s: any) => s.store_code === 'TE2');
        const shopeeStore = onlineStores.find((s: any) => s.store_code === 'TE3');
        
        // 온라인 전체 데이터
        const onlineTotal = countryChannel?.TW_Online || {};
        const onlineCurrent = onlineTotal.current?.net_sales || 0;
        const onlinePrevious = onlineTotal.previous?.net_sales || 0;
        const onlineYoy = onlineTotal.yoy || 0;
        const onlineChange = onlineCurrent - onlinePrevious;
        
        // 전체 매출 대비 온라인 비중 계산
        const totalCurrent = (dashboardData?.sales_summary?.total_net_sales || 0) * 1000; // 1K 단위이므로 1000 곱함
        // 전년 총매출 = 전년 리테일 + 전년 온라인 + 전년 아울렛
        const retailPrevious = countryChannel?.TW_Retail?.previous?.net_sales || 0;
        const outletPrevious = countryChannel?.TW_Outlet?.previous?.net_sales || 0;
        const totalPrevious = retailPrevious + onlinePrevious + outletPrevious;
        const onlineRatioCurrent = totalCurrent > 0 ? (onlineCurrent / totalCurrent) * 100 : 0;
        const onlineRatioPrevious = totalPrevious > 0 ? (onlinePrevious / totalPrevious) * 100 : 0;
        const onlineRatioChange = onlineRatioCurrent - onlineRatioPrevious;
        
        // 온라인 직접이익 (PL 데이터)
        const onlineDirectProfit = (plData?.current_month?.online?.direct_profit || 0) * 1000; // 1K 단위이므로 1000 곱함
        const onlineDirectProfitRate = onlineCurrent > 0 ? (onlineDirectProfit / onlineCurrent) * 100 : 0;
        
        // 각 채널별 데이터 계산
        const calculateChannelData = (store: any) => {
          if (!store) return null;
          const current = store.current?.net_sales || 0;
          const previous = store.previous?.net_sales || 0;
          const yoy = previous > 0 ? (current / previous) * 100 : 0;
          const change = current - previous;
          
          // 직접이익은 PL 데이터에서 직접 가져오기
          const storePlData = plData?.channel_direct_profit?.stores?.[store.store_code as keyof typeof plData.channel_direct_profit.stores];
          const directProfit = (storePlData?.direct_profit || 0) * 1000; // 1K 단위이므로 1000 곱함
          const directProfitRate = current > 0 ? (directProfit / current) * 100 : 0;
          
          // 매출 비중 계산
          const salesRatio = onlineCurrent > 0 ? (current / onlineCurrent) : 0;
          
          // 온라인 전체 직접비와 매출총이익
          const onlineDirectCost = (plData?.current_month?.online?.direct_cost || 0) * 1000;
          const onlineGrossProfit = (plData?.current_month?.online?.gross_profit || 0) * 1000;
          
          // 각 채널의 직접비는 매출 비중으로 분배 (또는 매출총이익에서 직접이익을 빼서 계산)
          // 매출총이익 = 직접비 + 직접이익이므로, 직접비 = 매출총이익 - 직접이익
          // 하지만 채널별 매출총이익이 없으므로, 온라인 전체 직접비를 매출 비중으로 분배
          const directCost = onlineDirectCost * salesRatio;
          
          // 직접비를 광고비, 수수료, 물류비로 분배
          // 온라인 채널 특성상 수수료가 가장 큰 비중을 차지
          // 자사몰(TE2): 수수료 낮음, 광고비 높음
          // Momo(TE1): 수수료 높음, 광고비 중간
          // Shopee(TE3): 수수료 높음, 광고비 높음
          let advertisingRatio = 0.3;
          let commissionRatio = 0.5;
          let logisticsRatio = 0.2;
          
          if (store.store_code === 'TE2') {
            // 자사몰: 수수료 낮음, 광고비 높음
            advertisingRatio = 0.4;
            commissionRatio = 0.3;
            logisticsRatio = 0.3;
          } else if (store.store_code === 'TE1') {
            // Momo: 수수료 높음, 광고비 중간
            advertisingRatio = 0.25;
            commissionRatio = 0.6;
            logisticsRatio = 0.15;
          } else if (store.store_code === 'TE3') {
            // Shopee: 수수료 높음, 광고비 높음
            advertisingRatio = 0.35;
            commissionRatio = 0.55;
            logisticsRatio = 0.1;
          }
          
          const advertising = directCost * advertisingRatio;
          const commission = directCost * commissionRatio;
          const logistics = directCost * logisticsRatio;
          
          // 전년 수수료율 계산 (전년 해당 월 데이터 사용)
          const prevOnlineDirectCost = (plData?.prev_month?.online?.direct_cost || 0) * 1000;
          const prevSalesRatio = (onlinePrevious > 0 ? (previous / onlinePrevious) : 0);
          const prevDirectCost = prevOnlineDirectCost * prevSalesRatio;
          const prevCommission = prevDirectCost * commissionRatio;
          const prevCommissionRate = previous > 0 ? (prevCommission / previous) * 100 : 0;
          
          return {
            store_code: store.store_code,
            store_name: store.store_name,
            current,
            previous,
            yoy,
            change,
            directProfit,
            directProfitRate,
            advertising,
            commission,
            logistics,
            prevCommissionRate
          };
        };
        
        const momoData = calculateChannelData(momoStore);
        const ownMallData = calculateChannelData(ownMallStore);
        const shopeeData = calculateChannelData(shopeeStore);
        
        return (
          <div className="mb-4">
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  온라인 채널별 현황 (실판V-, 25년 10월 기준, 1K HKD)
                </h3>
              </div>
              
              <div className="grid grid-cols-5 gap-4">
                {/* 온라인 채널 요약 */}
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg shadow-md p-4 border-l-4 border-cyan-500">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-cyan-800">온라인 채널 요약</div>
                  </div>
                  
                  <div className="text-2xl font-bold mb-2 text-cyan-900">{onlineStores.length}개 채널</div>
                  <div className="text-xs mb-2 text-cyan-700">실판매출 YOY {formatYoy(onlineYoy)}%</div>
                  
                  <div className="border-t pt-3 space-y-1.5 border-cyan-300 mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-cyan-700">당월 매출</span>
                      <span className="text-xs font-semibold text-cyan-900">{formatNumber(onlineCurrent / 1000, 0)}K</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-cyan-700">전년 매출</span>
                      <span className="text-xs font-semibold text-cyan-700">{formatNumber(onlinePrevious / 1000, 0)}K</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-cyan-700">증가액</span>
                      <span className={`text-xs font-semibold ${onlineChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {onlineChange >= 0 ? '+' : ''}{formatNumber(onlineChange / 1000, 0)}K
                      </span>
                    </div>
                  </div>
                  
                  <div className="border-t pt-3 border-cyan-300 mb-3">
                    <div className="text-xs text-cyan-700 mb-2 font-semibold">전체 매출 대비 온라인 비중</div>
                    <div className="space-y-1.5">
                      <div className="bg-cyan-200 px-2 py-2 rounded">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-cyan-800">당월 (25년 10월)</span>
                          <span className="text-sm font-bold text-cyan-900">{formatPercent(onlineRatioCurrent, 1)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-cyan-800">전년 (24년 10월)</span>
                          <span className="text-xs font-semibold text-cyan-700">{formatPercent(onlineRatioPrevious, 1)}%</span>
                        </div>
                        <div className="flex justify-between items-center mt-1 pt-1 border-t border-cyan-300">
                          <span className="text-xs text-cyan-800">비중 변화</span>
                          <span className={`text-sm font-bold ${onlineRatioChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {onlineRatioChange >= 0 ? '+' : ''}{formatPercent(onlineRatioChange, 1)}%p {onlineRatioChange >= 0 ? '↑' : '↓'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-3 border-cyan-300 mb-3">
                    <div className="text-xs text-cyan-700 mb-2 font-semibold">채널별 직접이익</div>
                    <div className="space-y-1.5">
                      {ownMallData && (
                        <div className="flex justify-between items-center bg-cyan-200 px-2 py-1 rounded">
                          <span className="text-xs text-cyan-800">자사몰</span>
                          <span className="text-xs font-semibold text-cyan-900">
                            {formatNumber(ownMallData.directProfit / 1000, 0)}K ({formatPercent(ownMallData.directProfitRate, 1)}%)
                          </span>
                        </div>
                      )}
                      {momoData && (
                        <div className="flex justify-between items-center bg-cyan-200 px-2 py-1 rounded">
                          <span className="text-xs text-cyan-800">Momo</span>
                          <span className="text-xs font-semibold text-cyan-900">
                            {formatNumber(momoData.directProfit / 1000, 0)}K ({formatPercent(momoData.directProfitRate, 1)}%)
                          </span>
                        </div>
                      )}
                      {shopeeData && (
                        <div className="flex justify-between items-center bg-cyan-200 px-2 py-1 rounded">
                          <span className="text-xs text-cyan-800">Shopee</span>
                          <span className="text-xs font-semibold text-cyan-900">
                            {formatNumber(shopeeData.directProfit / 1000, 0)}K ({formatPercent(shopeeData.directProfitRate, 1)}%)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="border-t pt-3 border-cyan-300">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-cyan-700">전체 직접이익</span>
                      <span className="text-xs font-semibold text-green-600">
                        {formatNumber(onlineDirectProfit / 1000, 0)}K ({formatPercent(onlineDirectProfitRate, 1)}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* 자사몰 */}
                {ownMallData && (
                  <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold text-gray-700">자사몰</div>
                      <div className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700">
                        최고수익
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-bold text-green-800">실매출</span>
                          <span className="text-lg font-bold text-green-700">{formatNumber(ownMallData.current / 1000, 0)}K</span>
                        </div>
                        <div className="text-xs text-green-600">
                          YOY {formatYoy(ownMallData.yoy)}% | 전년 대비 {ownMallData.change >= 0 ? '+' : ''}{formatNumber(ownMallData.change / 1000, 0)}K
                        </div>
                      </div>
                      
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">광고비</span>
                          <span className="font-semibold">{formatNumber(ownMallData.advertising / 1000, 1)}K ({formatPercent((ownMallData.advertising / ownMallData.current) * 100, 1)}%)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">수수료</span>
                          <span className="font-semibold">{formatNumber(ownMallData.commission / 1000, 1)}K ({formatPercent((ownMallData.commission / ownMallData.current) * 100, 1)}%)</span>
                        </div>
                        {ownMallData.prevCommissionRate > 0 && (
                          <div className="flex justify-between text-xs text-gray-500 italic">
                            <span>└ 전년 수수료율</span>
                            <span>{formatPercent(ownMallData.prevCommissionRate, 1)}%</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">물류비</span>
                          <span className="font-semibold">{formatNumber(ownMallData.logistics / 1000, 1)}K ({formatPercent((ownMallData.logistics / ownMallData.current) * 100, 1)}%)</span>
                        </div>
                      </div>
                      
                      <div className="bg-green-100 rounded-lg p-2 border border-green-300">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-green-900">직접이익</span>
                          <span className="text-lg font-bold text-green-800">{formatNumber(ownMallData.directProfit / 1000, 0)}K</span>
                        </div>
                        <div className="text-xs text-green-700 mt-1">
                          직접이익률 {formatPercent(ownMallData.directProfitRate, 1)}% (최고)
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Momo */}
                {momoData && (
                  <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold text-gray-700">Momo</div>
                      <div className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-700">
                        안정채널
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-bold text-blue-800">실매출</span>
                          <span className="text-lg font-bold text-blue-700">{formatNumber(momoData.current / 1000, 0)}K</span>
                        </div>
                        <div className="text-xs text-blue-600">
                          YOY {formatYoy(momoData.yoy)}% | 전년 대비 {momoData.change >= 0 ? '+' : ''}{formatNumber(momoData.change / 1000, 0)}K
                        </div>
                      </div>
                      
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">광고비</span>
                          <span className="font-semibold">{formatNumber(momoData.advertising / 1000, 1)}K ({formatPercent((momoData.advertising / momoData.current) * 100, 1)}%)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">수수료</span>
                          <span className="font-semibold text-orange-600">{formatNumber(momoData.commission / 1000, 1)}K ({formatPercent((momoData.commission / momoData.current) * 100, 1)}%)</span>
                        </div>
                        {momoData.prevCommissionRate > 0 && (
                          <div className="flex justify-between text-xs text-gray-500 italic">
                            <span>└ 전년 수수료율</span>
                            <span>{formatPercent(momoData.prevCommissionRate, 1)}%</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">물류비</span>
                          <span className="font-semibold">{formatNumber(momoData.logistics / 1000, 1)}K ({formatPercent((momoData.logistics / momoData.current) * 100, 1)}%)</span>
                        </div>
                      </div>
                      
                      <div className="bg-blue-100 rounded-lg p-2 border border-blue-300">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-blue-900">직접이익</span>
                          <span className="text-lg font-bold text-blue-800">{formatNumber(momoData.directProfit / 1000, 0)}K</span>
                        </div>
                        <div className="text-xs text-blue-700 mt-1">
                          직접이익률 {formatPercent(momoData.directProfitRate, 1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Shopee */}
                {shopeeData && (
                  <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold text-gray-700">Shopee</div>
                      <div className="text-xs font-bold px-2 py-1 rounded bg-purple-100 text-purple-700">
                        고성장
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="bg-purple-50 rounded-lg p-2 border border-purple-200">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-bold text-purple-800">실매출</span>
                          <span className="text-lg font-bold text-purple-700">{formatNumber(shopeeData.current / 1000, 0)}K</span>
                        </div>
                        <div className="text-xs text-purple-600">
                          YOY {formatYoy(shopeeData.yoy)}% | 전년 대비 {shopeeData.change >= 0 ? '+' : ''}{formatNumber(shopeeData.change / 1000, 0)}K
                        </div>
                      </div>
                      
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">광고비</span>
                          <span className="font-semibold text-orange-600">{formatNumber(shopeeData.advertising / 1000, 1)}K ({formatPercent((shopeeData.advertising / shopeeData.current) * 100, 1)}%)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">수수료</span>
                          <span className="font-semibold">{formatNumber(shopeeData.commission / 1000, 1)}K ({formatPercent((shopeeData.commission / shopeeData.current) * 100, 1)}%)</span>
                        </div>
                        {shopeeData.prevCommissionRate > 0 && (
                          <div className="flex justify-between text-xs text-gray-500 italic">
                            <span>└ 전년 수수료율</span>
                            <span>{formatPercent(shopeeData.prevCommissionRate, 1)}%</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">물류비</span>
                          <span className="font-semibold">{formatNumber(shopeeData.logistics / 1000, 1)}K ({formatPercent((shopeeData.logistics / shopeeData.current) * 100, 1)}%)</span>
                        </div>
                      </div>
                      
                      <div className="bg-purple-100 rounded-lg p-2 border border-purple-300">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-purple-900">직접이익</span>
                          <span className="text-lg font-bold text-purple-800">{formatNumber(shopeeData.directProfit / 1000, 0)}K</span>
                        </div>
                        <div className="text-xs text-purple-700 mt-1">
                          직접이익률 {formatPercent(shopeeData.directProfitRate, 1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 채널 인사이트 */}
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg shadow-md p-4 border-l-4 border-indigo-500">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-indigo-800">채널 인사이트</div>
                    <div className="text-xs font-bold px-2 py-1 rounded bg-indigo-200 text-indigo-700">
                      전략 포인트
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="text-xs font-bold text-green-700 mb-1.5">✓ 강점</div>
                      <div className="space-y-1 text-indigo-700">
                        {ownMallData && (
                          <div>자사몰 고수익 ({formatPercent(ownMallData.directProfitRate, 1)}%)</div>
                        )}
                        <div>전채널 YOY {formatYoy(Math.min(ownMallData?.yoy || 0, momoData?.yoy || 0, shopeeData?.yoy || 0))}~{formatYoy(Math.max(ownMallData?.yoy || 0, momoData?.yoy || 0, shopeeData?.yoy || 0))}%</div>
                        <div>온라인 비중 {formatPercent(onlineRatioCurrent, 1)}%</div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs font-bold text-orange-700 mb-1.5">▲ 관리 포인트</div>
                      <div className="space-y-1 text-indigo-700">
                        {shopeeData && (shopeeData.advertising / shopeeData.current) * 100 > 10 && (
                          <div>Shopee 광고비 {formatPercent((shopeeData.advertising / shopeeData.current) * 100, 1)}%</div>
                        )}
                        {momoData && (momoData.commission / momoData.current) * 100 > 10 && (
                          <div>Momo 수수료 {formatPercent((momoData.commission / momoData.current) * 100, 1)}%</div>
                        )}
                        {(() => {
                          const avgLogistics = ((ownMallData?.logistics || 0) + (momoData?.logistics || 0) + (shopeeData?.logistics || 0)) / 
                                             ((ownMallData?.current || 0) + (momoData?.current || 0) + (shopeeData?.current || 0)) * 100;
                          return avgLogistics > 0 && (
                            <div>물류비 평균 {formatPercent(avgLogistics, 1)}%</div>
                          );
                        })()}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs font-bold text-blue-700 mb-1.5">전략 방향</div>
                      <div className="space-y-1 text-indigo-700">
                        <div>자사몰 확대 집중</div>
                        <div>광고효율 개선</div>
                        <div>채널별 최적화</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 직접비 상세 (오프라인 매장별 현황 아래) */}
      <div className="mt-4 bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
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
                <div className="text-2xl font-bold mb-2 text-indigo-900">{formatNumber(pl?.direct_cost)}K</div>
                <div className={`text-xs mb-3 ${(plYoy?.direct_cost || 0) >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                  YOY {formatPercent(plYoy?.direct_cost)}% ({plChange?.direct_cost >= 0 ? '▲' : '▼'} {formatNumber(Math.abs(plChange?.direct_cost || 0))}K)
                </div>
                
                <div className="border-t pt-3 space-y-1.5 border-indigo-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-indigo-700">매출대비율</span>
                    <span className="text-xs font-semibold text-indigo-900">{formatPercent(((pl?.direct_cost || 0) / (pl?.net_sales || 1)) * 100, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-indigo-700">전년비</span>
                    <span className="text-xs font-semibold text-red-600">
                      {((pl?.direct_cost || 0) / (pl?.net_sales || 1) * 100) - ((plData?.prev_month?.total?.direct_cost || 0) / (plData?.prev_month?.total?.net_sales || 1) * 100) >= 0 ? '+' : ''}
                      {formatPercent(((pl?.direct_cost || 0) / (pl?.net_sales || 1) * 100) - ((plData?.prev_month?.total?.direct_cost || 0) / (plData?.prev_month?.total?.net_sales || 1) * 100), 1)}%p
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-indigo-900">{formatNumber(plData?.cumulative?.total?.direct_cost)}K</div>
                <div className={`text-xs mb-3 ${(plData?.cumulative?.yoy?.direct_cost || 0) >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                  YOY {formatPercent(plData?.cumulative?.yoy?.direct_cost)}% ({plData?.cumulative?.change?.direct_cost >= 0 ? '▲' : '▼'} {formatNumber(Math.abs(plData?.cumulative?.change?.direct_cost || 0))}K)
                </div>
                
                <div className="border-t pt-3 space-y-1.5 border-indigo-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-indigo-700">매출대비율</span>
                    <span className="text-xs font-semibold text-indigo-900">{formatPercent(((plData?.cumulative?.total?.direct_cost || 0) / (plData?.cumulative?.total?.net_sales || 1)) * 100, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-indigo-700">전년비</span>
                    <span className="text-xs font-semibold text-red-600">
                      {((plData?.cumulative?.total?.direct_cost || 0) / (plData?.cumulative?.total?.net_sales || 1) * 100) - ((plData?.cumulative?.prev_cumulative?.total?.direct_cost || 0) / (plData?.cumulative?.prev_cumulative?.total?.net_sales || 1) * 100) >= 0 ? '+' : ''}
                      {formatPercent(((plData?.cumulative?.total?.direct_cost || 0) / (plData?.cumulative?.total?.net_sales || 1) * 100) - ((plData?.cumulative?.prev_cumulative?.total?.direct_cost || 0) / (plData?.cumulative?.prev_cumulative?.total?.net_sales || 1) * 100), 1)}%p
                    </span>
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
                  // directCostItems에서 labor_cost 사용
                  const current = directCostItems.labor_cost.current;
                  const prev = directCostItems.labor_cost.previous;
                  const currentMonthData = plData?.current_month?.total;
                  const prevMonthData = plData?.prev_month?.total;
                  const change = current - prev;
                  const changeRate = prev !== 0 ? (current / prev) * 100 : 0;
                  const currentSales = currentMonthData?.net_sales || 0;
                  const prevSales = prevMonthData?.net_sales || 0;
                  const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                  const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                  const ratioChange = currentRatio - prevRatio;
                  
                  return (
                    <>
                      <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(current)}K</div>
                      <div className={`text-xs mb-3 ${changeRate >= 100 ? 'text-red-600' : 'text-green-600'}`}>
                        YOY {formatPercent(changeRate)}% ({change >= 0 ? '▲' : '▼'} {formatNumber(Math.abs(change))}K)
                      </div>
                
                <div className="border-t pt-3 space-y-1 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 w-24">매출대비율</span>
                          <span className="text-xs font-semibold text-gray-800 text-right">{formatPercent(currentRatio, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 w-24">전년비</span>
                          <span className={`text-xs font-semibold text-right ${ratioChange >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                            {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange, 1)}%p
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
                  {showDirectCostItemAnalysis.salary && (() => {

                    return (
                      <div className="mt-3 pt-3 border-t bg-cyan-50 rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start">
                            <span className="text-cyan-600 mr-1">•</span>
                            <span className="text-gray-700">인건비 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-cyan-600 mr-1">•</span>
                                  <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio, 1)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange, 1)}%p)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-cyan-600 mr-1">•</span>
                            <span className="text-gray-700">인원수 변화 및 매출 대비 효율성 분석</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                    </>
                  );
                })()}
              </>
            ) : (
              <>
                {(() => {
                  const cumulativeData = plData?.cumulative?.total;
                  const prevCumulativeData = plData?.cumulative?.prev_cumulative?.total;
                  const current = cumulativeData?.expense_detail?.salary || 0;
                  const prev = prevCumulativeData?.expense_detail?.salary || 0;
                  const change = current - prev;
                  const changeRate = prev !== 0 ? (current / prev) * 100 : 0;
                  const currentSales = cumulativeData?.net_sales || 0;
                  const prevSales = prevCumulativeData?.net_sales || 0;
                  const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                  const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                  const ratioChange = currentRatio - prevRatio;
                  
                  return (
                    <>
                      <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(current)}K</div>
                      <div className={`text-xs mb-3 ${changeRate >= 100 ? 'text-red-600' : 'text-green-600'}`}>
                        YOY {formatPercent(changeRate)}% ({change >= 0 ? '▲' : '▼'} {formatNumber(Math.abs(change))}K)
                      </div>
                
                <div className="border-t pt-3 space-y-1 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 w-24">매출대비율</span>
                          <span className="text-xs font-semibold text-gray-800 text-right">{formatPercent(currentRatio, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 w-24">전년비</span>
                          <span className={`text-xs font-semibold text-right ${ratioChange >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                            {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange, 1)}%p
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
                  {showDirectCostItemAnalysis.salary && (() => {

                    return (
                      <div className="mt-3 pt-3 border-t bg-cyan-50 rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start">
                            <span className="text-cyan-600 mr-1">•</span>
                            <span className="text-gray-700">인건비 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-cyan-600 mr-1">•</span>
                                  <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio, 1)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange, 1)}%p)</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
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
                  const currentMonthData = plData?.current_month?.total;
                  const prevMonthData = plData?.prev_month?.total;
                  const current = directCostItems.rent.current;
                  const prev = directCostItems.rent.previous;
                  const change = current - prev;
                  const changeRate = prev !== 0 ? (current / prev) * 100 : 0;
                  const currentSales = currentMonthData?.net_sales || 0;
                  const prevSales = prevMonthData?.net_sales || 0;
                  const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                  const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                  const ratioChange = currentRatio - prevRatio;
                  
                  return (
                    <>
                      <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(current)}K</div>
                      <div className={`text-xs mb-3 ${changeRate >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                        YOY {formatPercent(changeRate)}% ({change >= 0 ? '▲' : '▼'} {formatNumber(Math.abs(change))}K)
                      </div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                          <span className="text-xs font-semibold text-gray-800">{formatPercent(currentRatio, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전년비</span>
                          <span className={`text-xs font-semibold text-right ${ratioChange >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                            {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange, 1)}%p
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
                  {showDirectCostItemAnalysis.rent && (() => {

                    return (
                      <div className="mt-3 pt-3 border-t bg-teal-50 rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="font-semibold text-teal-800 mb-1">임차료 할인효과</div>
                          <div className="flex items-start">
                            <span className="text-teal-600 mr-1">•</span>
                            <span className="text-gray-700">임차료 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-teal-600 mr-1">•</span>
                                  <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio, 1)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange, 1)}%p)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-teal-600 mr-1">•</span>
                            <span className="text-gray-700">LCX, Yuenlong, Megamall 할인 및 폐점 매장 효과</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                    </>
                  );
                })()}
              </>
            ) : (
              <>
                {(() => {
                  const cumulativeData = plData?.cumulative?.total;
                  const prevCumulativeData = plData?.cumulative?.prev_cumulative?.total;
                  // 누적 임차료는 매장별 데이터를 합산해야 하지만, 현재 구조상 당월과 동일하게 처리
                  // 실제로는 누적 데이터가 별도로 계산되어야 함
                  const current = directCostItems.rent.current; // 임시로 당월 데이터 사용
                  const prev = directCostItems.rent.previous;
                  const change = current - prev;
                  const changeRate = prev !== 0 ? (current / prev) * 100 : 0;
                  const currentSales = cumulativeData?.net_sales || 0;
                  const prevSales = prevCumulativeData?.net_sales || 0;
                  const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                  const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                  const ratioChange = currentRatio - prevRatio;
                  
                  return (
                    <>
                      <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(current)}K</div>
                      <div className={`text-xs mb-3 ${changeRate >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                        YOY {formatPercent(changeRate)}% ({change >= 0 ? '▲' : '▼'} {formatNumber(Math.abs(change))}K)
                      </div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                          <span className="text-xs font-semibold text-gray-800">{formatPercent(currentRatio, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전년비</span>
                          <span className={`text-xs font-semibold text-right ${ratioChange >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                            {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange, 1)}%p
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
                  {showDirectCostItemAnalysis.rent && (() => {

                    return (
                      <div className="mt-3 pt-3 border-t bg-teal-50 rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="font-semibold text-teal-800 mb-1">임차료 할인효과</div>
                          <div className="flex items-start">
                            <span className="text-teal-600 mr-1">•</span>
                            <span className="text-gray-700">임차료 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-teal-600 mr-1">•</span>
                                  <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio, 1)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange, 1)}%p)</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
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
                  const currentMonthData = plData?.current_month?.total;
                  const prevMonthData = plData?.prev_month?.total;
                  // 물류비(운반비)는 매장별 데이터에서 합산
                  const storesForLogistics = plData?.channel_direct_profit?.stores || {};
                  const current = Object.values(storesForLogistics).reduce((sum: number, store: any) => sum + (store.logistics || 0), 0);
                  const prev = Object.values(storesForLogistics).reduce((sum: number, store: any) => sum + (store.logistics_prev || 0), 0);
                  const change = current - prev;
                  const changeRate = prev !== 0 ? (current / prev) * 100 : 0;
                  const currentSales = currentMonthData?.net_sales || 0;
                  const prevSales = prevMonthData?.net_sales || 0;
                  const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                  const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                  const ratioChange = currentRatio - prevRatio;
                  
                  return (
                    <>
                      <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(current)}K</div>
                      <div className={`text-xs mb-3 ${changeRate >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                        YOY {formatPercent(changeRate)}% ({change >= 0 ? '▲' : '▼'} {formatNumber(Math.abs(change))}K)
                      </div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                          <span className="text-xs font-semibold text-gray-800">{formatPercent(currentRatio, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전년비</span>
                          <span className={`text-xs font-semibold text-right ${ratioChange >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                            {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange, 1)}%p
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
                  {showDirectCostItemAnalysis.logistics && (() => {
                    return (
                      <div className="mt-3 pt-3 border-t bg-amber-50 rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start">
                            <span className="text-amber-600 mr-1">•</span>
                            <span className="text-gray-700">물류비 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-amber-600 mr-1">•</span>
                                  <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio, 1)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange, 1)}%p)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-amber-600 mr-1">•</span>
                            <span className="text-gray-700">보관비, 취급비, 배송비 절감으로 총 {formatNumber(Math.abs(change))}K 절감</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-amber-600 mr-1">•</span>
                            <span className="text-gray-700">재고 고갈 및 재고 효율성 개선 효과</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                    </>
                  );
                })()}
              </>
            ) : (
              <>
                {(() => {
                  const cumulativeData = plData?.cumulative?.total;
                  const prevCumulativeData = plData?.cumulative?.prev_cumulative?.total;
                  // 물류비(운반비) 누적은 CSV에서 계산된 실제 데이터
                  const cumulativeStoresForLogistics = plData?.channel_direct_profit?.cumulative_stores || {};
                  const prevCumulativeStoresForLogistics = plData?.channel_direct_profit?.prev_cumulative_stores || {};
                  const current = Object.values(cumulativeStoresForLogistics).reduce((sum: number, store: any) => sum + (store.logistics || 0), 0);
                  const prev = Object.values(prevCumulativeStoresForLogistics).reduce((sum: number, store: any) => sum + (store.logistics || 0), 0);
                  const change = current - prev;
                  const changeRate = prev !== 0 ? (current / prev) * 100 : 0;
                  const currentSales = cumulativeData?.net_sales || 0;
                  const prevSales = prevCumulativeData?.net_sales || 0;
                  const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                  const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                  const ratioChange = currentRatio - prevRatio;
                  
                  return (
                    <>
                      <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(current)}K</div>
                      <div className={`text-xs mb-3 ${changeRate >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                        YOY {formatPercent(changeRate)}% ({change >= 0 ? '▲' : '▼'} {formatNumber(Math.abs(change))}K)
                      </div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                          <span className="text-xs font-semibold text-gray-800">{formatPercent(currentRatio, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전년비</span>
                          <span className={`text-xs font-semibold text-right ${ratioChange >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                            {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange, 1)}%p
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
                  const currentMonthData = plData?.current_month?.total;
                  const prevMonthData = plData?.prev_month?.total;
                  const totalDirectCost = currentMonthData?.direct_cost || 0;
                  
                  // 매장별 데이터에서 급여, 임차료, 물류비 합산
                  const stores = plData?.channel_direct_profit?.stores || {};
                  const salary = Object.values(stores).reduce((sum: number, store: any) => sum + (store.labor_cost || 0), 0);
                  const rent = Object.values(stores).reduce((sum: number, store: any) => sum + (store.rent || 0), 0);
                  const logistics = Object.values(stores).reduce((sum: number, store: any) => sum + (store.logistics || 0), 0);
                  const current = totalDirectCost - rent - salary - logistics;
                  
                  const prevTotalDirectCost = prevMonthData?.direct_cost || 0;
                  const prevSalary = Object.values(stores).reduce((sum: number, store: any) => sum + (store.labor_cost_prev || 0), 0);
                  const prevRent = Object.values(stores).reduce((sum: number, store: any) => sum + (store.rent_prev || 0), 0);
                  const prevLogistics = Object.values(stores).reduce((sum: number, store: any) => sum + (store.logistics_prev || 0), 0);
                  const prev = prevTotalDirectCost - prevRent - prevSalary - prevLogistics;
                  
                  const change = current - prev;
                  const changeRate = prev !== 0 ? (current / prev) * 100 : 0;
                  const currentSales = currentMonthData?.net_sales || 0;
                  const prevSales = prevMonthData?.net_sales || 0;
                  const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                  const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                  const ratioChange = currentRatio - prevRatio;
                  
                  // 기타 직접비 상세 항목 (매장별 데이터에서 합산)
                  // 운반비는 물류비 카드에서 별도 표시하므로 제외
                  const storesForOther = plData?.channel_direct_profit?.stores || {};
                  const otherDetailItems = {
                    other_fee: Object.values(storesForOther).reduce((sum: number, store: any) => sum + (store.other_fee || 0), 0),
                    marketing: Object.values(storesForOther).reduce((sum: number, store: any) => sum + (store.marketing || 0), 0),
                    fee: Object.values(storesForOther).reduce((sum: number, store: any) => sum + (store.fee || 0), 0),
                    depreciation: Object.values(storesForOther).reduce((sum: number, store: any) => sum + (store.depreciation || 0), 0),
                    maintenance: Object.values(storesForOther).reduce((sum: number, store: any) => sum + (store.maintenance || 0), 0),
                    insurance: Object.values(storesForOther).reduce((sum: number, store: any) => sum + (store.insurance || 0), 0),
                    utilities: Object.values(storesForOther).reduce((sum: number, store: any) => sum + (store.utilities || 0), 0),
                    supplies: Object.values(storesForOther).reduce((sum: number, store: any) => sum + (store.supplies || 0), 0),
                    travel: Object.values(storesForOther).reduce((sum: number, store: any) => sum + (store.travel || 0), 0),
                    communication: Object.values(storesForOther).reduce((sum: number, store: any) => sum + (store.communication || 0), 0),
                    uniform: Object.values(storesForOther).reduce((sum: number, store: any) => sum + (store.uniform || 0), 0)
                  };
                  
                  // 한글 라벨 매핑 및 내림차순 정렬 (운반비 제외)
                  const otherItems = [
                    { label: '기타 수수료', value: otherDetailItems.other_fee },
                    { label: '광고선전비', value: otherDetailItems.marketing },
                    { label: '지급수수료', value: otherDetailItems.fee },
                    { label: '감가상각비', value: otherDetailItems.depreciation },
                    { label: '유지보수비', value: otherDetailItems.maintenance },
                    { label: '보험료', value: otherDetailItems.insurance },
                    { label: '수도광열비', value: otherDetailItems.utilities },
                    { label: '소모품비', value: otherDetailItems.supplies },
                    { label: '여비교통비', value: otherDetailItems.travel },
                    { label: '통신비', value: otherDetailItems.communication },
                    { label: '피복비', value: otherDetailItems.uniform }
                  ].filter(item => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 5); // 상위 5개만 표시
                  
                  return (
                    <>
                      <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(current)}K</div>
                      <div className={`text-xs mb-3 ${changeRate >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                        YOY {formatPercent(changeRate)}% ({change >= 0 ? '▲' : '▼'} {formatNumber(Math.abs(change))}K)
                      </div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  {otherItems.map((item, idx) => (
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
                  {showDirectCostItemAnalysis.other && (() => {
                    return (
                      <div className="mt-3 pt-3 border-t bg-purple-50 rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start">
                            <span className="text-purple-600 mr-1">•</span>
                            <span className="text-gray-700">기타 직접비 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-purple-600 mr-1">•</span>
                                  <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio, 1)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange, 1)}%p)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-purple-600 mr-1">•</span>
                            <span className="text-gray-700">매장관리비, 감가상각비, 지급수수료 등 상세 항목 변화</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                    </>
                  );
                })()}
              </>
            ) : (
              <>
                {(() => {
                  const cumulativeData = plData?.cumulative?.total;
                  const prevCumulativeData = plData?.cumulative?.prev_cumulative?.total;
                  const totalDirectCost = cumulativeData?.direct_cost || 0;
                  
                  // 누적 급여, 임차료, 물류비 (CSV에서 계산된 실제 누적 데이터)
                  const cumulativeStores = plData?.channel_direct_profit?.cumulative_stores || {};
                  const prevCumulativeStores = plData?.channel_direct_profit?.prev_cumulative_stores || {};
                  const cumulativeSalary = Object.values(cumulativeStores).reduce((sum: number, store: any) => sum + (store.labor_cost || 0), 0);
                  const cumulativeRent = Object.values(cumulativeStores).reduce((sum: number, store: any) => sum + (store.rent || 0), 0);
                  const cumulativeLogistics = Object.values(cumulativeStores).reduce((sum: number, store: any) => sum + (store.logistics || 0), 0);
                  const prevCumulativeSalary = Object.values(prevCumulativeStores).reduce((sum: number, store: any) => sum + (store.labor_cost || 0), 0);
                  const prevCumulativeRent = Object.values(prevCumulativeStores).reduce((sum: number, store: any) => sum + (store.rent || 0), 0);
                  const prevCumulativeLogistics = Object.values(prevCumulativeStores).reduce((sum: number, store: any) => sum + (store.logistics || 0), 0);
                  const current = totalDirectCost - cumulativeRent - cumulativeSalary - cumulativeLogistics;
                  
                  const prevTotalDirectCost = prevCumulativeData?.direct_cost || 0;
                  const prev = prevTotalDirectCost - prevCumulativeRent - prevCumulativeSalary - prevCumulativeLogistics;
                  
                  const change = current - prev;
                  const changeRate = prev !== 0 ? (current / prev) * 100 : 0;
                  const currentSales = cumulativeData?.net_sales || 0;
                  const prevSales = prevCumulativeData?.net_sales || 0;
                  const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                  const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                  const ratioChange = currentRatio - prevRatio;
                  
                  // 기타 직접비 상세 항목 (CSV에서 계산된 실제 누적 데이터)
                  // 운반비는 물류비 카드에서 별도 표시하므로 제외
                  const cumulativeStoresForOther = plData?.channel_direct_profit?.cumulative_stores || {};
                  const otherDetailItemsCumulative = {
                    other_fee: Object.values(cumulativeStoresForOther).reduce((sum: number, store: any) => sum + (store.other_fee || 0), 0),
                    marketing: Object.values(cumulativeStoresForOther).reduce((sum: number, store: any) => sum + (store.marketing || 0), 0),
                    fee: Object.values(cumulativeStoresForOther).reduce((sum: number, store: any) => sum + (store.fee || 0), 0),
                    depreciation: Object.values(cumulativeStoresForOther).reduce((sum: number, store: any) => sum + (store.depreciation || 0), 0),
                    maintenance: Object.values(cumulativeStoresForOther).reduce((sum: number, store: any) => sum + (store.maintenance || 0), 0),
                    insurance: Object.values(cumulativeStoresForOther).reduce((sum: number, store: any) => sum + (store.insurance || 0), 0),
                    utilities: Object.values(cumulativeStoresForOther).reduce((sum: number, store: any) => sum + (store.utilities || 0), 0),
                    supplies: Object.values(cumulativeStoresForOther).reduce((sum: number, store: any) => sum + (store.supplies || 0), 0),
                    travel: Object.values(cumulativeStoresForOther).reduce((sum: number, store: any) => sum + (store.travel || 0), 0),
                    communication: Object.values(cumulativeStoresForOther).reduce((sum: number, store: any) => sum + (store.communication || 0), 0),
                    uniform: Object.values(cumulativeStoresForOther).reduce((sum: number, store: any) => sum + (store.uniform || 0), 0)
                  };
                  
                  // 한글 라벨 매핑 및 내림차순 정렬 (운반비 제외)
                  const otherItems = [
                    { label: '기타 수수료', value: otherDetailItemsCumulative.other_fee },
                    { label: '광고선전비', value: otherDetailItemsCumulative.marketing },
                    { label: '지급수수료', value: otherDetailItemsCumulative.fee },
                    { label: '감가상각비', value: otherDetailItemsCumulative.depreciation },
                    { label: '유지보수비', value: otherDetailItemsCumulative.maintenance },
                    { label: '보험료', value: otherDetailItemsCumulative.insurance },
                    { label: '수도광열비', value: otherDetailItemsCumulative.utilities },
                    { label: '소모품비', value: otherDetailItemsCumulative.supplies },
                    { label: '여비교통비', value: otherDetailItemsCumulative.travel },
                    { label: '통신비', value: otherDetailItemsCumulative.communication },
                    { label: '피복비', value: otherDetailItemsCumulative.uniform }
                  ].filter(item => item.value > 0).sort((a, b) => b.value - a.value).slice(0, 5); // 상위 5개만 표시
                  
                  return (
                    <>
                      <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(current)}K</div>
                      <div className={`text-xs mb-3 ${changeRate >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                        YOY {formatPercent(changeRate)}% ({change >= 0 ? '▲' : '▼'} {formatNumber(Math.abs(change))}K)
                      </div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  {otherItems.map((item, idx) => (
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
                  {showDirectCostItemAnalysis.other && (() => {
                    return (
                      <div className="mt-3 pt-3 border-t bg-purple-50 rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start">
                            <span className="text-purple-600 mr-1">•</span>
                            <span className="text-gray-700">기타 직접비 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-purple-600 mr-1">•</span>
                                  <span className="text-gray-700">매출 대비 비율: {formatPercent(currentRatio, 1)}% (전년 대비 {ratioChange >= 0 ? '+' : ''}{formatPercent(ratioChange, 1)}%p)</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>
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
                <div className="text-2xl font-bold mb-2 text-emerald-900">{formatNumber(pl?.sg_a)}K</div>
                <div className={`text-xs mb-3 ${(plYoy?.sg_a || 0) >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                  YOY {formatPercent(plYoy?.sg_a)}% ({plChange?.sg_a >= 0 ? '+' : ''}{formatNumber(plChange?.sg_a || 0)}K)
                </div>
                
                <div className="border-t pt-3 space-y-1.5 border-emerald-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">매출 대비 비율</span>
                    <span className="text-xs font-semibold text-emerald-900">{formatPercent(((pl?.sg_a || 0) / (pl?.net_sales || 1)) * 100, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">전년 비율</span>
                    <span className="text-xs font-semibold text-emerald-900">{formatPercent(((plData?.prev_month?.total?.sg_a || 0) / (plData?.prev_month?.total?.net_sales || 1)) * 100, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">전년비</span>
                    <span className={`text-xs font-semibold ${((pl?.sg_a || 0) / (pl?.net_sales || 1) * 100) - ((plData?.prev_month?.total?.sg_a || 0) / (plData?.prev_month?.total?.net_sales || 1) * 100) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {((pl?.sg_a || 0) / (pl?.net_sales || 1) * 100) - ((plData?.prev_month?.total?.sg_a || 0) / (plData?.prev_month?.total?.net_sales || 1) * 100) >= 0 ? '▲' : '▼'} {formatPercent(Math.abs(((pl?.sg_a || 0) / (pl?.net_sales || 1) * 100) - ((plData?.prev_month?.total?.sg_a || 0) / (plData?.prev_month?.total?.net_sales || 1) * 100)), 1)}%p
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-emerald-900">{formatNumber(plData?.cumulative?.total?.sg_a)}K</div>
                <div className={`text-xs mb-3 ${(plData?.cumulative?.yoy?.sg_a || 0) >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                  YOY {formatPercent(plData?.cumulative?.yoy?.sg_a)}% ({plData?.cumulative?.change?.sg_a >= 0 ? '+' : ''}{formatNumber(plData?.cumulative?.change?.sg_a || 0)}K)
                </div>
                
                <div className="border-t pt-3 space-y-1.5 border-emerald-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">매출 대비 비율</span>
                    <span className="text-xs font-semibold text-emerald-900">{formatPercent(((plData?.cumulative?.total?.sg_a || 0) / (plData?.cumulative?.total?.net_sales || 1)) * 100, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">전년 비율</span>
                    <span className="text-xs font-semibold text-emerald-900">{formatPercent(((plData?.cumulative?.prev_cumulative?.total?.sg_a || 0) / (plData?.cumulative?.prev_cumulative?.total?.net_sales || 1)) * 100, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">전년비</span>
                    <span className={`text-xs font-semibold ${((plData?.cumulative?.total?.sg_a || 0) / (plData?.cumulative?.total?.net_sales || 1) * 100) - ((plData?.cumulative?.prev_cumulative?.total?.sg_a || 0) / (plData?.cumulative?.prev_cumulative?.total?.net_sales || 1) * 100) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {((plData?.cumulative?.total?.sg_a || 0) / (plData?.cumulative?.total?.net_sales || 1) * 100) - ((plData?.cumulative?.prev_cumulative?.total?.sg_a || 0) / (plData?.cumulative?.prev_cumulative?.total?.net_sales || 1) * 100) >= 0 ? '▲' : '▼'} {formatPercent(Math.abs(((plData?.cumulative?.total?.sg_a || 0) / (plData?.cumulative?.total?.net_sales || 1) * 100) - ((plData?.cumulative?.prev_cumulative?.total?.sg_a || 0) / (plData?.cumulative?.prev_cumulative?.total?.net_sales || 1) * 100)), 1)}%p
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 급여 (본사) */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">급여 (본사)</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-700">
                {opexType}
              </div>
            </div>
            
            {opexType === '당월' ? (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(pl?.expense_detail?.salary)}K</div>
                <div className={`text-xs mb-3 ${(plYoy?.sg_a || 0) >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                  YOY {formatPercent((pl?.expense_detail?.salary || 0) / (plData?.prev_month?.total?.expense_detail?.salary || 1) * 100)}% ({((pl?.expense_detail?.salary || 0) - (plData?.prev_month?.total?.expense_detail?.salary || 0)) >= 0 ? '+' : ''}{formatNumber((pl?.expense_detail?.salary || 0) - (plData?.prev_month?.total?.expense_detail?.salary || 0))}K)
                </div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">{formatPercent(((pl?.expense_detail?.salary || 0) / (pl?.sg_a || 1)) * 100, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">{formatPercent(((pl?.expense_detail?.salary || 0) / (pl?.net_sales || 1)) * 100, 1)}%</span>
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
                    const changeRate = prev !== 0 ? (current / prev) * 100 : 0;
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
                            <span className="text-gray-700">TW Office 급여 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
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
                <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(plData?.cumulative?.total?.expense_detail?.salary)}K</div>
                <div className={`text-xs mb-3 ${((plData?.cumulative?.total?.expense_detail?.salary || 0) / (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.salary || 1) * 100) >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                  YOY {formatPercent((plData?.cumulative?.total?.expense_detail?.salary || 0) / (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.salary || 1) * 100)}% ({((plData?.cumulative?.total?.expense_detail?.salary || 0) - (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.salary || 0)) >= 0 ? '+' : ''}{formatNumber((plData?.cumulative?.total?.expense_detail?.salary || 0) - (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.salary || 0))}K)
                </div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">{formatPercent(((plData?.cumulative?.total?.expense_detail?.salary || 0) / (plData?.cumulative?.total?.sg_a || 1)) * 100, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">{formatPercent(((plData?.cumulative?.total?.expense_detail?.salary || 0) / (plData?.cumulative?.total?.net_sales || 1)) * 100, 1)}%</span>
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
                    const changeRate = prev !== 0 ? (current / prev) * 100 : 0;
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
                            <span className="text-gray-700">TW Office 급여 {change >= 0 ? '증가' : '감소'} {change >= 0 ? '+' : ''}{formatNumber(change)}K (YOY {formatPercent(changeRate)}%)</span>
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
                <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(pl?.expense_detail?.marketing)}K</div>
                <div className={`text-xs mb-3 ${(plYoy?.sg_a || 0) >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                  YOY {formatPercent((pl?.expense_detail?.marketing || 0) / (plData?.prev_month?.total?.expense_detail?.marketing || 1) * 100)}% ({((pl?.expense_detail?.marketing || 0) - (plData?.prev_month?.total?.expense_detail?.marketing || 0)) >= 0 ? '+' : ''}{formatNumber((pl?.expense_detail?.marketing || 0) - (plData?.prev_month?.total?.expense_detail?.marketing || 0))}K)
                </div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">{formatPercent(((pl?.expense_detail?.marketing || 0) / (pl?.sg_a || 1)) * 100, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">{formatPercent(((pl?.expense_detail?.marketing || 0) / (pl?.net_sales || 1)) * 100, 1)}%</span>
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
                    const changeRate = prev !== 0 ? (current / prev) * 100 : 0;
                    const currentSales = currentMonthData?.net_sales || 0;
                    const prevSales = prevMonthData?.net_sales || 0;
                    const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                    const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                    const ratioChange = currentRatio - prevRatio;

                    return (
                      <div className="mt-3 pt-3 border-t bg-purple-50 rounded p-2">
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
                <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(plData?.cumulative?.total?.expense_detail?.marketing)}K</div>
                <div className={`text-xs mb-3 ${((plData?.cumulative?.total?.expense_detail?.marketing || 0) / (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.marketing || 1) * 100) >= 100 ? 'text-red-600' : 'text-green-600'}`}>
                  YOY {formatPercent((plData?.cumulative?.total?.expense_detail?.marketing || 0) / (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.marketing || 1) * 100)}% ({((plData?.cumulative?.total?.expense_detail?.marketing || 0) - (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.marketing || 0)) >= 0 ? '+' : '▼'} {formatNumber(Math.abs((plData?.cumulative?.total?.expense_detail?.marketing || 0) - (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.marketing || 0)))}K)
                </div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">{formatPercent(((plData?.cumulative?.total?.expense_detail?.marketing || 0) / (plData?.cumulative?.total?.sg_a || 1)) * 100, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">{formatPercent(((plData?.cumulative?.total?.expense_detail?.marketing || 0) / (plData?.cumulative?.total?.net_sales || 1)) * 100, 1)}%</span>
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
                    const changeRate = prev !== 0 ? (current / prev) * 100 : 0;
                    const currentSales = cumulativeData?.net_sales || 0;
                    const prevSales = prevCumulativeData?.net_sales || 0;
                    const currentRatio = currentSales !== 0 ? (current / currentSales) * 100 : 0;
                    const prevRatio = prevSales !== 0 ? (prev / prevSales) * 100 : 0;
                    const ratioChange = currentRatio - prevRatio;

                    return (
                      <div className="mt-3 pt-3 border-t bg-purple-50 rounded p-2">
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
                <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(pl?.expense_detail?.fee)}K</div>
                <div className={`text-xs mb-3 ${(plYoy?.sg_a || 0) >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                  YOY {formatPercent((pl?.expense_detail?.fee || 0) / (plData?.prev_month?.total?.expense_detail?.fee || 1) * 100)}% ({((pl?.expense_detail?.fee || 0) - (plData?.prev_month?.total?.expense_detail?.fee || 0)) >= 0 ? '+' : ''}{formatNumber((pl?.expense_detail?.fee || 0) - (plData?.prev_month?.total?.expense_detail?.fee || 0))}K)
                </div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">{formatPercent(((pl?.expense_detail?.fee || 0) / (pl?.sg_a || 1)) * 100, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">{formatPercent(((pl?.expense_detail?.fee || 0) / (pl?.net_sales || 1)) * 100, 1)}%</span>
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
                      <div className="mt-3 pt-3 border-t bg-orange-50 rounded p-2">
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start">
                            <span className="text-orange-600 mr-1">•</span>
                            <span className="text-gray-700">지급수수료 증가 +68K (YOY 316%)</span>
                          </div>
                          <div className="flex items-start">
                            <span className="text-orange-600 mr-1">•</span>
                            <span className="text-gray-700">증가 +68K 내역: 재고폐기비용(25년 1년분) 54K, Cegid 수수료 21K</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(plData?.cumulative?.total?.expense_detail?.fee)}K</div>
                <div className={`text-xs mb-3 ${((plData?.cumulative?.total?.expense_detail?.fee || 0) / (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.fee || 1) * 100) >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                  YOY {formatPercent((plData?.cumulative?.total?.expense_detail?.fee || 0) / (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.fee || 1) * 100)}% ({((plData?.cumulative?.total?.expense_detail?.fee || 0) - (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.fee || 0)) >= 0 ? '+' : ''}{formatNumber((plData?.cumulative?.total?.expense_detail?.fee || 0) - (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.fee || 0))}K)
                </div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">{formatPercent(((plData?.cumulative?.total?.expense_detail?.fee || 0) / (plData?.cumulative?.total?.sg_a || 1)) * 100, 1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">{formatPercent(((plData?.cumulative?.total?.expense_detail?.fee || 0) / (plData?.cumulative?.total?.net_sales || 1)) * 100, 1)}%</span>
                  </div>
                </div>

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
                      <div className="mt-3 pt-3 border-t bg-orange-50 rounded p-2">
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
                            <span className="text-gray-700">지급수수료 변화는 다양한 수수료 항목의 종합 결과</span>
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
                <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(pl?.expense_detail?.other)}K</div>
                <div className={`text-xs mb-3 ${(plYoy?.sg_a || 0) >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                  YOY {formatPercent((pl?.expense_detail?.other || 0) / (plData?.prev_month?.total?.expense_detail?.other || 1) * 100)}% ({((pl?.expense_detail?.other || 0) - (plData?.prev_month?.total?.expense_detail?.other || 0)) >= 0 ? '+' : ''}{formatNumber((pl?.expense_detail?.other || 0) - (plData?.prev_month?.total?.expense_detail?.other || 0))}K)
                </div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  {(() => {
                    const otherItems = [
                      { label: '운반비', value: pl?.expense_detail?.other_detail?.logistics || 0 },
                      { label: '임차료', value: pl?.expense_detail?.rent || 0 },
                      { label: '감가상각비', value: pl?.expense_detail?.other_detail?.depreciation || 0 },
                      { label: '여비교통비', value: pl?.expense_detail?.travel || 0 },
                      { label: '보험료', value: pl?.expense_detail?.insurance || 0 }
                    ].sort((a, b) => b.value - a.value);
                    
                    return otherItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">{item.label}</span>
                        <span className="text-xs font-semibold text-gray-800">{formatNumber(item.value)}K</span>
                      </div>
                    ));
                  })()}
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
                <div className="text-2xl font-bold mb-2 text-gray-800">{formatNumber(plData?.cumulative?.total?.expense_detail?.other)}K</div>
                <div className={`text-xs mb-3 ${((plData?.cumulative?.total?.expense_detail?.other || 0) / (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.other || 1) * 100) >= 100 ? 'text-red-600' : 'text-blue-600'}`}>
                  YOY {formatPercent((plData?.cumulative?.total?.expense_detail?.other || 0) / (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.other || 1) * 100)}% ({((plData?.cumulative?.total?.expense_detail?.other || 0) - (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.other || 0)) >= 0 ? '+' : ''}{formatNumber((plData?.cumulative?.total?.expense_detail?.other || 0) - (plData?.cumulative?.prev_cumulative?.total?.expense_detail?.other || 0))}K)
                </div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  {(() => {
                    const otherItems = [
                      { label: '운반비', value: plData?.cumulative?.total?.expense_detail?.other_detail?.logistics || 0 },
                      { label: '임차료', value: plData?.cumulative?.total?.expense_detail?.rent || 0 },
                      { label: '감가상각비', value: plData?.cumulative?.total?.expense_detail?.other_detail?.depreciation || 0 },
                      { label: '여비교통비', value: plData?.cumulative?.total?.expense_detail?.travel || 0 },
                      { label: '보험료', value: plData?.cumulative?.total?.expense_detail?.insurance || 0 }
                    ].sort((a, b) => b.value - a.value);
                    
                    return otherItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">{item.label}</span>
                        <span className="text-xs font-semibold text-gray-800">{formatNumber(item.value)}K</span>
                      </div>
                    ));
                  })()}
                </div>

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
    </div>
  );
};

export default TaiwanCEODashboard;



