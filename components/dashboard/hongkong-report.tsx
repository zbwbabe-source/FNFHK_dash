'use client';

import React, { useState } from 'react';
import { TrendingDown, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart, LabelList } from 'recharts';
import salesInventoryData from './hongkong-sales-inventory.json';
import financialData from './hongkong-financial.json';
import itemSalesData from './item_sales_data.json';

const HongKongReport = () => {
  // Title is handled by Next.js metadata in layout.tsx
  
  // ========================================
  // 데이터 연결 상태 표시 설정
  // 나중에 모든 항목이 연결되면 이 섹션 전체를 삭제하면 됩니다
  // ========================================
  const DATA_STATUS = {
    // CSV 연결 완료 항목
    CONNECTED: {
      실판매출: true,
      할인: true,
      재고: true,
      채널별매출그래프: true,
      아이템별매출그래프: true,
      아이템별재고그래프: true,
      당시즌판매: true,  // categories 데이터에서 계산
      당시즌판매율: true,  // categories 데이터에서 계산
      ACC재고주수: true,  // inventory 데이터에서 계산
      과시즌FW재고: true,  // inventory.by_season 데이터
      채널별YOY추세: true,  // monthly_yoy 데이터
      아이템별재고YOY: true,  // item_monthly_inventory_yoy 데이터
    },
    // 하드코딩/수동 입력 항목
    HARDCODED: {
      영업이익: true,
      영업비: true,
      매장효율성: true,  // 계산된 값 (점당매출)
    }
  };
  
  // 배지 컴포넌트 (나중에 제거하기 쉽도록)
  const DataStatusBadge = ({ status, label }: { status: 'connected' | 'hardcoded', label: string }) => {
    const statusObj = status === 'connected' ? DATA_STATUS.CONNECTED : DATA_STATUS.HARDCODED;
    if (!(statusObj as any)[label]) {
      return null;
    }
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
  // ========================================
  
  // 툴팁 상태 관리
  const [hoveredBar, setHoveredBar] = useState<{month: string, data: any, x: number, y: number} | null>(null);

  // Scroll to section function with highlight effect
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Add highlight animation
      element.classList.add('highlight-flash');
      setTimeout(() => {
        element.classList.remove('highlight-flash');
      }, 5000); // Remove after 5 seconds
    }
  };

  const [showSalesDetail, setShowSalesDetail] = useState(false);
  const [showItemDetail, setShowItemDetail] = useState(false);
  const [showProfitDetail, setShowProfitDetail] = useState(false);
  const [showItemProfitDetail, setShowItemProfitDetail] = useState(false);
  const [showExpenseDetail, setShowExpenseDetail] = useState(false);
  const [showAccExpenseDetail, setShowAccExpenseDetail] = useState(false);
  const [showDiscountDetail, setShowDiscountDetail] = useState(false);
  const [showItemDiscountDetail, setShowItemDiscountDetail] = useState(false);
  const [showStoreDetail, setShowStoreDetail] = useState(false);
  const [showStoreTable, setShowStoreTable] = useState(false);
  const [showStoreCalcModal, setShowStoreCalcModal] = useState(false);
  const [showStoreListInModal, setShowStoreListInModal] = useState(false);
  const [showStoreListInModal2024, setShowStoreListInModal2024] = useState(false);
  const [calcYearView, setCalcYearView] = useState('2025'); // '2025' 또는 '2024'
  const [showSeasonSalesDetail, setShowSeasonSalesDetail] = useState(false);
  const [showMuDetail, setShowMuDetail] = useState(false);
  const [showAccInventoryDetail, setShowAccInventoryDetail] = useState(false);
  const [showEndInventoryDetail, setShowEndInventoryDetail] = useState(false);
  const [showPastSeasonDetail, setShowPastSeasonDetail] = useState(false);
  const [showCurrentSeasonDetail, setShowCurrentSeasonDetail] = useState(false);
  const [showDiscoveryDetail, setShowDiscoveryDetail] = useState(false);
  const [showProfitStores, setShowProfitStores] = useState(false);
  const [showLossStores, setShowLossStores] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [muType, setMuType] = useState('발주'); // '발주' 또는 '매출'
  const [costType, setCostType] = useState('발주'); // '발주' 또는 '매출' (25FW 원가현황)
  const [expenseType, setExpenseType] = useState('당월'); // '당월' 또는 '누적' (비용요약)
  const [opexType, setOpexType] = useState('당월'); // '당월' 또는 '누적' (영업비 카드)
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null); // 채널별 매출 선택
  const [selectedSalesItem, setSelectedSalesItem] = useState<string | null>(null); // 아이템별 매출 선택
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<string | null>(null); // 아이템별 재고 선택
  const [salesPriceType, setSalesPriceType] = useState('실판'); // '실판', '택가', '할인율'
  const [selectedChannelTrend, setSelectedChannelTrend] = useState<string | null>(null); // 채널별 추세 선택 (단일 선택)
  
  // 클라이언트 사이드 렌더링 확인
  const [isClient, setIsClient] = useState(false);
  
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // JSON 데이터에서 필요한 데이터 추출
  // 매출/재고 데이터 (CSV에서 자동 생성)
  const { summary, channels, monthly_yoy, monthly_channel_sales, categories, item_monthly_yoy, monthly_item_sales, monthly_item_inventory, item_monthly_inventory_yoy, inventory, stores } = salesInventoryData;
  
  // 손익 데이터 (수동 관리)
  const { opex, profit, cost, direct_cost } = financialData;
  

  // 월 라벨
  const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월'];
  
  // 채널별 YOY 데이터 (CSV에서 추출)
  const channelYOY: any = {
    'HK Online': monthly_yoy?.HK_Online || [72, 91, 53, 74, 106, 87, 52, 294, 251, 323],
    'HK Outlet': monthly_yoy?.HK_Outlet || [114, 54, 73, 73, 70, 65, 105, 106, 71, 91],
    'HK Retail': monthly_yoy?.HK_Retail || [114, 50, 72, 80, 87, 84, 95, 103, 117, 97],
    'MC Outlet': monthly_yoy?.MO_Outlet || [183, 109, 94, 84, 102, 97, 108, 127, 97, 63],
    'MC Retail': monthly_yoy?.MO_Retail || [87, 51, 62, 69, 79, 89, 93, 103, 83, 80]
  };

  // CSV에서 추출한 아이템별 매출 데이터
  const itemSales = itemSalesData as any;
  
  // 실판가/택가 데이터를 월별 배열로 변환
  // 1~6월: 당시즌S를 24F로 표시 (실제로는 24FW가 당시즌이었음)
  // monthly_item_sales 데이터를 우선 사용, 없으면 itemSales 사용
  const netSalesData = months.map((month, idx) => {
    const monthlyData = monthly_item_sales?.find(m => m.month === month);
    return {
      month,
      '당시즌F': idx < 6 
        ? ((monthlyData as any)?.['당시즌S'] || itemSales.net_sales['당시즌S'][idx])
        : ((monthlyData as any)?.['당시즌F'] || (monthlyData as any)?.['F당시즌'] || itemSales.net_sales['당시즌F'][idx]), // 1~6월은 당시즌S를 24F로 표시
      '당시즌S': idx < 6 ? ((monthlyData as any)?.['당시즌S'] || itemSales.net_sales['당시즌S'][idx]) : ((monthlyData as any)?.['당시즌S'] || itemSales.net_sales['당시즌S'][idx]), // S당시즌(25S)은 항상 원래 값 유지
      '과시즌의류': (monthlyData as any)?.['과시즌의류'] || itemSales.net_sales['과시즌의류'][idx],
      '모자': (monthlyData as any)?.['모자'] || itemSales.net_sales['모자'][idx],
      '신발': (monthlyData as any)?.['신발'] || itemSales.net_sales['신발'][idx],
      '가방외': (monthlyData as any)?.['가방외'] || itemSales.net_sales['가방외'][idx]
    };
  });

  const grossSalesData = months.map((month, idx) => {
    const monthlyData = monthly_item_sales?.find(m => m.month === month);
    return {
      month,
      '당시즌F': idx < 6 
        ? ((monthlyData as any)?.['당시즌S_택가'] || (monthlyData as any)?.['당시즌S'] || itemSales.gross_sales['당시즌S'][idx])
        : ((monthlyData as any)?.['당시즌F_택가'] || (monthlyData as any)?.['F당시즌_택가'] || (monthlyData as any)?.['당시즌F'] || (monthlyData as any)?.['F당시즌'] || itemSales.gross_sales['당시즌F'][idx]), // 1~6월은 당시즌S를 24F로 표시
      '당시즌S': idx < 6 ? ((monthlyData as any)?.['당시즌S_택가'] || (monthlyData as any)?.['당시즌S'] || itemSales.gross_sales['당시즌S'][idx]) : ((monthlyData as any)?.['당시즌S_택가'] || (monthlyData as any)?.['당시즌S'] || itemSales.gross_sales['당시즌S'][idx]), // S당시즌(25S)은 항상 원래 값 유지
      '과시즌의류': (monthlyData as any)?.['과시즌의류_택가'] || (monthlyData as any)?.['과시즌의류'] || itemSales.gross_sales['과시즌의류'][idx],
      '모자': (monthlyData as any)?.['모자_택가'] || (monthlyData as any)?.['모자'] || itemSales.gross_sales['모자'][idx],
      '신발': (monthlyData as any)?.['신발_택가'] || (monthlyData as any)?.['신발'] || itemSales.gross_sales['신발'][idx],
      '가방외': (monthlyData as any)?.['가방외_택가'] || (monthlyData as any)?.['가방외'] || itemSales.gross_sales['가방외'][idx]
    };
  });

  // 할인율 데이터 계산 (숫자로 저장, Tooltip에서 포맷팅)
  const discountRateData = months.map((month, idx) => ({
    month,
    '당시즌F': grossSalesData[idx]['당시즌F'] > 0 
      ? Number(((grossSalesData[idx]['당시즌F'] - netSalesData[idx]['당시즌F']) / grossSalesData[idx]['당시즌F'] * 100).toFixed(1))
      : 0,
    '당시즌S': grossSalesData[idx]['당시즌S'] > 0
      ? Number(((grossSalesData[idx]['당시즌S'] - netSalesData[idx]['당시즌S']) / grossSalesData[idx]['당시즌S'] * 100).toFixed(1))
      : 0,
    '과시즌의류': grossSalesData[idx]['과시즌의류'] > 0
      ? Number(((grossSalesData[idx]['과시즌의류'] - netSalesData[idx]['과시즌의류']) / grossSalesData[idx]['과시즌의류'] * 100).toFixed(1))
      : 0,
    '모자': grossSalesData[idx]['모자'] > 0
      ? Number(((grossSalesData[idx]['모자'] - netSalesData[idx]['모자']) / grossSalesData[idx]['모자'] * 100).toFixed(1))
      : 0,
    '신발': grossSalesData[idx]['신발'] > 0
      ? Number(((grossSalesData[idx]['신발'] - netSalesData[idx]['신발']) / grossSalesData[idx]['신발'] * 100).toFixed(1))
      : 0,
    '가방외': grossSalesData[idx]['가방외'] > 0
      ? Number(((grossSalesData[idx]['가방외'] - netSalesData[idx]['가방외']) / grossSalesData[idx]['가방외'] * 100).toFixed(1))
      : 0
  }));

  // 아이템별 매출 YOY 데이터 (CSV에서 추출)
  const salesItemYOY = {
    '당시즌F': itemSales.yoy['당시즌F'],
    '당시즌S': itemSales.yoy['당시즌S'],
    '과시즌의류': itemSales.yoy['과시즌의류'],
    '모자': itemSales.yoy['모자'],
    '신발': itemSales.yoy['신발'],
    '가방외': itemSales.yoy['가방외'],
    '합계': itemSales.yoy['합계']
  };

  // 아이템별 재고 YOY 데이터 (CSV에서 추출)
  const inventoryItemYOY = item_monthly_inventory_yoy || {
    'F당시즌': [null, null, 100, 100, 162, 118, 90, 63, 56, 54],
    'S당시즌': [137, 94, 84, 88, 87, 87, 84, 84, 84, 84],
    '과시즌FW': [130, 138, 140, 141, 140, 140, 140, 140, 138, 139],
    '과시즌SS': [129, 127, 129, 133, 135, 138, 138, 132, 122, 122],
    '모자': [116, 81, 87, 86, 88, 85, 79, 78, 86, 91],
    '신발': [69, 60, 65, 70, 67, 69, 64, 84, 82, 86],
    '가방외': [68, 76, 78, 83, 84, 80, 81, 76, 75, 75]
  };

  // 전체 상세보기 토글
  const toggleAllDetails = () => {
    const newState = !showSalesDetail;
    setShowSalesDetail(newState);
    setShowItemDetail(newState);
    setShowProfitDetail(newState);
    setShowItemProfitDetail(newState);
    setShowExpenseDetail(newState);
    setShowDiscountDetail(newState);
    setShowItemDiscountDetail(newState);
    setShowStoreDetail(newState);
    setShowSeasonSalesDetail(newState);
    setShowMuDetail(newState);
    setShowAccInventoryDetail(newState);
    setShowEndInventoryDetail(newState);
  };

  const toggleActionItem = (index: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="bg-gradient-to-r from-slate-800 to-slate-600 text-white rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">홍콩법인 25년 10월 경영실적</h1>
            <p className="text-slate-200">(보고일 : 2025년 11월 17일)</p>
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
              <h4 className="text-md font-bold text-gray-900 mb-3 flex items-center">
                <span className="text-xl mr-2">💡</span>
                핵심 성과
              </h4>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-start">
                  <span className="text-green-600 font-bold mr-2">✓</span>
                  <span><span className="font-semibold">매장효율성 개선:</span> 점당매출 1,038K (<span className="bg-green-100 px-1 rounded font-bold">YOY 112%</span>) LCX(리뉴얼 10/13-11/7), WTC(10/11 영업종료) 계산제외</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-600 font-bold mr-2">✓</span>
                  <span><span className="font-semibold">당시즌 판매율 개선:</span> <span className="bg-green-100 px-1 rounded font-bold">21.9%</span>로 전년 대비 <span className="bg-green-100 px-1 rounded font-bold">+8.9%p</span> 상승 (25F 의류)</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-600 font-bold mr-2">✓</span>
                  <span><span className="font-semibold">입고 효율화:</span> 25FW 입고 YOY 60.5%, 판매금액 YOY 102% 달성 (재고 부족 방지를 위해 <span className="bg-yellow-100 px-1 rounded font-bold">26SS 조기운영 예정</span>)</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-600 font-bold mr-2">✓</span>
                  <span><span className="font-semibold">온라인 성장:</span> 매출 936K (<span className="bg-blue-100 px-1 rounded font-bold">YOY 323%</span>, 비중 4.6%), 직접이익 299K (114%) - 비중 <span className="bg-blue-100 px-1 rounded font-bold">5.0%초과 목표</span></span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-600 font-bold mr-2">✓</span>
                  <span><span className="font-semibold">재고 안정화:</span> 총재고 YOY 95% (전년 419,999K → 396,982K)</span>
                </div>
              </div>
            </div>

            {/* 주요 리스크 */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4 border-l-4 border-orange-600">
              <h4 className="text-md font-bold text-gray-900 mb-3 flex items-center">
                <span className="text-xl mr-2">⚠️</span>
                주요 리스크
              </h4>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-start">
                  <span className="text-orange-600 font-bold mr-2">•</span>
                  <span><span className="font-semibold">영업손실 확대:</span> <span className="bg-red-200 px-1 rounded font-bold">-925K</span> (전년 -196K), 적자 <span className="bg-red-200 px-1 rounded font-bold">729K 증가</span></span>
                </div>
                <div className="flex items-start">
                  <span className="text-orange-600 font-bold mr-2">•</span>
                  <span><span className="font-semibold">과시즌 FW 재고:</span> 116,639K (<span className="bg-red-200 px-1 rounded font-bold">YOY 139%</span>), 1년차 24FW 56,985K (98%), 2년차 23FW 40,765K (<span className="bg-red-200 px-1 rounded font-bold">167%</span>)</span>
                </div>
                <div className="flex items-start">
                  <span className="text-orange-600 font-bold mr-2">•</span>
                  <span><span className="font-semibold">마카오 부진:</span> 매출 5,374K (<span className="bg-orange-200 px-1 rounded font-bold">YOY 78%</span>), 직접이익 553K (<span className="bg-orange-200 px-1 rounded font-bold">39%</span>)</span>
                </div>
                <div className="flex items-start">
                  <span className="text-orange-600 font-bold mr-2">•</span>
                  <span><span className="font-semibold">영업비 증가:</span> 1,451K (<span className="bg-orange-200 px-1 rounded font-bold">YOY 130%</span>), 급여+164K, 마케팅비+111K</span>
                </div>
                <div className="flex items-start">
                  <span className="text-orange-600 font-bold mr-2">•</span>
                  <span><span className="font-semibold">적자매장 9개:</span> HK Retail 6개(최대 Yoho <span className="bg-red-200 px-1 rounded font-bold">-210K</span>), Outlet 3개, MC 1개 <span className="text-gray-600 text-xs">(LCX·WTC 비정상운영 제외)</span></span>
                </div>
              </div>
            </div>

            {/* CEO 전략 방향 */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border-l-4 border-purple-600">
              <h4 className="text-md font-bold text-gray-900 mb-3 flex items-center">
                <span className="text-xl mr-2">🎯</span>
                CEO 전략 방향
              </h4>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-start">
                  <span className="text-purple-600 font-bold mr-2">1.</span>
                  <span><span className="font-semibold">수익성 회복:</span> 영업비율 <span className="bg-purple-100 px-1 rounded font-bold">7.2% → 5.0%</span> 목표, 매출 개선을 통해 달성</span>
                </div>
                <div className="flex items-start">
                  <span className="text-purple-600 font-bold mr-2">2.</span>
                  <span><span className="font-semibold">과시즌 FW 소진:</span> <span className="bg-purple-100 px-1 rounded font-bold">MT(178%), JP(181%)</span> 집중 프로모션</span>
                </div>
                <div className="flex items-start">
                  <span className="text-purple-600 font-bold mr-2">3.</span>
                  <span><span className="font-semibold">마카오 회복 전략:</span> VMD 직원 현지 발탁 및 컬러 프린트 현지 구비로 프로모션 대응 속도 개선</span>
                </div>
                <div className="flex items-start">
                  <span className="text-purple-600 font-bold mr-2">4.</span>
                  <span><span className="font-semibold">적자매장 개선:</span> <span className="bg-purple-100 px-1 rounded font-bold">Yoho(-210K), Time Square(-174K), NTP3(-167K)</span> 적자개선 액션플랜 도출 필요</span>
                </div>
                <div className="flex items-start">
                  <span className="text-purple-600 font-bold mr-2">5.</span>
                  <span><span className="font-semibold">온라인 확대:</span> <span className="bg-purple-100 px-1 rounded font-bold">YOY 323%</span> 성장 모멘텀 유지, 디지털 마케팅 강화</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 홍콩법인 경영실적 (5개 카드 x 2줄) */}
      <div className="mb-4">
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <span className="text-3xl mr-3">🏢</span>
              홍콩법인 경영실적 (MLB 기준)
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
            {/* 실판매출 */}
            <div 
              onClick={() => scrollToSection('sales-channel-chart')}
              className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-blue-500 hover:shadow-xl transition-shadow min-h-[400px] cursor-pointer relative"
            >
              <DataStatusBadge status="connected" label="실판매출" />
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">📊</span>
                  <h3 className="text-sm font-semibold text-gray-600">실판매출 (1K HKD)</h3>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    scrollToSection('sales-channel-chart');
                  }}
                  className="px-2 py-1 text-xs font-bold bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                >
                  상세내역
                </button>
              </div>
              <div className="text-3xl font-bold text-red-600 mb-2">
                20,486
              </div>
              <div className="text-sm text-red-600 font-semibold mb-3">
                YOY 93% (△1,552)
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
                    <span className="text-red-600">15,110 (100%)</span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Retail</span>
                    <span className="font-semibold">11,063 <span className="text-red-600">(97%)</span></span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Outlet</span>
                    <span className="font-semibold">3,104 <span className="text-red-600">(90%)</span></span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Online</span>
                    <span className="font-semibold">942 <span className="text-green-600">(323%)</span></span>
                  </div>
                  
                  <div className="flex justify-between text-xs font-semibold text-gray-700 mt-3 pt-2 border-t">
                    <span>MC (마카오)</span>
                    <span className="text-red-600">5,373 (78%)</span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Retail</span>
                    <span className="font-semibold">4,839 <span className="text-red-600">(80%)</span></span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Outlet</span>
                    <span className="font-semibold">534 <span className="text-red-600">(63%)</span></span>
                  </div>
                </div>
              )}
              
              {/* 전년 동일매장 기준 YOY */}
              <div className="mt-3 pt-3 border-t">
                <div className="bg-blue-50 rounded-lg p-2">
                  <div className="text-xs font-semibold text-blue-800 mb-1">📌 전년 동일매장 기준</div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blue-700">실판매출 YOY (종료매장 제외)</span>
                    <span className="text-sm font-bold text-blue-900">97.8%</span>
                  </div>
                  <div className="text-[10px] text-blue-600 mt-1 italic">
                    * 종료매장 제외 (온라인 포함 22개 매장 기준)
                  </div>
                </div>
              </div>
            </div>

            {/* 영업이익 */}
            <div 
              onClick={() => scrollToSection('profit-detail-section')}
              className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-orange-500 hover:shadow-xl transition-shadow min-h-[400px] cursor-pointer relative"
            >
              <DataStatusBadge status="hardcoded" label="영업이익" />
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">💰</span>
                  <h3 className="text-sm font-semibold text-gray-600">영업이익 (1K HKD)</h3>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    scrollToSection('profit-detail-section');
                  }}
                  className="px-2 py-1 text-xs font-bold bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                >
                  상세내역
                </button>
              </div>
              <div className="text-3xl font-bold text-red-600 mb-2">
                -925
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-red-600">적자악화</span> | <span className="text-red-600">이익률 -4.6%</span>
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
                    <span className="text-gray-600">HK 오프라인</span>
                    <span className="font-semibold text-red-600">-325 <span className="text-green-600">(적자개선)</span> <span className="text-red-600">[-2.4%]</span></span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">MC 오프라인</span>
                    <span className="font-semibold">553 <span className="text-red-600">(39%)</span> <span className="text-blue-600">[10.3%]</span></span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">HK 온라인</span>
                    <span className="font-semibold">299 <span className="text-green-600">(114%)</span> <span className="text-blue-600">[31.9%]</span></span>
                  </div>
                  
                  <div className="flex justify-between text-xs font-semibold mt-2 pt-2 border-t">
                    <span className="text-gray-700">전체 직접이익</span>
                    <span className="text-red-600">526 (57%)</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-700">직접이익률</span>
                    <span className="text-red-600">2.62%</span>
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
                          <td className="text-right py-1 px-2 font-semibold">24,679</td>
                          <td className="text-right py-1 px-2 text-red-600 font-semibold">93%</td>
                          <td className="text-right py-1 px-2 text-red-600 font-semibold">△1,912</td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="py-1 px-2 text-gray-700 pl-4">- 할인 (18.6%)</td>
                          <td className="text-right py-1 px-2 text-gray-600">4,602</td>
                          <td className="text-right py-1 px-2 text-green-600">93%</td>
                          <td className="text-right py-1 px-2 text-green-600">△360</td>
                        </tr>
                        <tr className="bg-blue-50 font-semibold">
                          <td className="py-1.5 px-2 text-blue-800 border-t border-blue-200">= 실판매출</td>
                          <td className="text-right py-1.5 px-2 text-blue-800 border-t border-blue-200">20,077</td>
                          <td className="text-right py-1.5 px-2 text-red-600 border-t border-blue-200">93%</td>
                          <td className="text-right py-1.5 px-2 text-red-600 border-t border-blue-200">△1,552</td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="py-1 px-2 text-gray-700 pl-4">- 매출원가 (31.9%)</td>
                          <td className="text-right py-1 px-2 text-gray-600">7,865</td>
                          <td className="text-right py-1 px-2 text-red-600">106%</td>
                          <td className="text-right py-1 px-2 text-red-600">△439</td>
                        </tr>
                        <tr className="bg-green-50 font-semibold">
                          <td className="py-1.5 px-2 text-green-800 border-t border-green-200">= 매출총이익 (60.8%)</td>
                          <td className="text-right py-1.5 px-2 text-green-800 border-t border-green-200">12,212</td>
                          <td className="text-right py-1.5 px-2 text-red-600 border-t border-green-200">94%</td>
                          <td className="text-right py-1.5 px-2 text-red-600 border-t border-green-200">△787</td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="py-1 px-2 text-gray-700 pl-4">- 직접비</td>
                          <td className="text-right py-1 px-2 text-gray-600">11,686</td>
                          <td className="text-right py-1 px-2 text-green-600">97%</td>
                          <td className="text-right py-1 px-2 text-green-600">△391</td>
                        </tr>
                        <tr className="bg-yellow-50 font-semibold">
                          <td className="py-1.5 px-2 text-orange-800 border-t border-yellow-200">= 직접이익 (2.6%)</td>
                          <td className="text-right py-1.5 px-2 text-orange-800 border-t border-yellow-200">526</td>
                          <td className="text-right py-1.5 px-2 text-red-600 border-t border-yellow-200">57%</td>
                          <td className="text-right py-1.5 px-2 text-red-600 border-t border-yellow-200">△396</td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="py-1 px-2 text-gray-700 pl-4">- 영업비</td>
                          <td className="text-right py-1 px-2 text-gray-600">1,451</td>
                          <td className="text-right py-1 px-2 text-red-600">130%</td>
                          <td className="text-right py-1 px-2 text-red-600">+334</td>
                        </tr>
                        <tr className="bg-red-50 font-bold">
                          <td className="py-1.5 px-2 text-red-800 border-t-2 border-red-300">= 영업이익 (-4.6%)</td>
                          <td className="text-right py-1.5 px-2 text-red-800 border-t-2 border-red-300">-925</td>
                          <td className="text-right py-1.5 px-2 text-red-700 border-t-2 border-red-300">적자악화</td>
                          <td className="text-right py-1.5 px-2 text-red-700 border-t-2 border-red-300">△729</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* 디스커버리 참고 실적 */}
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
                      온라인1개, 오프라인1개 (10/1 영업개시)
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-purple-700">실판매출</span>
                        <span className="font-semibold text-purple-900">408 <span className="text-purple-600">(할인율 9.7%)</span></span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-700">직접비</span>
                        <span className="font-semibold text-purple-900">1,385</span>
                      </div>
                      <div className="flex justify-between font-semibold bg-purple-100 px-2 py-1 rounded">
                        <span className="text-purple-800">직접손실</span>
                        <span className="text-red-700">-1,122</span>
                      </div>
                      <div className="flex justify-between text-[10px] pl-2">
                        <span className="text-purple-600">• 마케팅비</span>
                        <span className="text-purple-700">240</span>
                      </div>
                      <div className="flex justify-between text-[10px] pl-2">
                        <span className="text-purple-600">• 여비교통비</span>
                        <span className="text-purple-700">26</span>
                      </div>
                      <div className="flex justify-between font-bold bg-red-100 px-2 py-1 rounded mt-1">
                        <span className="text-red-800">영업손실</span>
                        <span className="text-red-700">-1,388</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 영업비 */}
            <div 
              onClick={() => scrollToSection('expense-detail-section')}
              className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-green-500 hover:shadow-xl transition-shadow min-h-[400px] cursor-pointer relative"
            >
              <DataStatusBadge status="hardcoded" label="영업비" />
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">📈</span>
                  <h3 className="text-sm font-semibold text-gray-600">영업비 (1K HKD)</h3>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      scrollToSection('expense-detail-section');
                    }}
                    className="px-2 py-1 text-xs font-bold bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                  >
                    상세내역
                  </button>
                  
                  {/* 당월/누적 토글 */}
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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
              </div>
              
              {expenseType === '당월' ? (
                <>
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    1,451
                  </div>
                  <div className="text-sm font-semibold mb-3">
                    <span className="text-red-600">YOY 130%</span> | <span className="text-blue-600">영업비율 7.2%</span>
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
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">마케팅비</span>
                        <span className="font-semibold">657 <span className="text-red-600">(215%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">급여</span>
                        <span className="font-semibold">605 <span className="text-red-600">(137%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">지급수수료</span>
                        <span className="font-semibold">131 <span className="text-red-600">(243%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">기타</span>
                        <span className="font-semibold">116 <span className="text-green-600">(92%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">임차료</span>
                        <span className="font-semibold">85 <span className="text-green-600">(70%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">감가상각비</span>
                        <span className="font-semibold">59 <span className="text-red-600">(152%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">여비교통비</span>
                        <span className="font-semibold">47 <span className="text-red-600">(408%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">보험료</span>
                        <span className="font-semibold">17 <span className="text-green-600">(92%)</span></span>
                      </div>
                      
                      {/* 증감액 분석 */}
                      <div className="mt-3 pt-3 border-t bg-orange-50 rounded p-2">
                        <div className="text-xs font-semibold text-orange-800 mb-1">
                          당월 전년비 +333K 주요 증감 내역
                        </div>
                        <div className="space-y-0.5 text-xs text-orange-700">
                          <div className="flex justify-between">
                            <span>• 급여</span>
                            <span className="font-semibold text-red-700">+164K</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• 마케팅비</span>
                            <span className="font-semibold text-red-700">+111K</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• 지급수수료</span>
                            <span className="font-semibold text-red-700">+77K</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• 감가상각비</span>
                            <span className="font-semibold text-red-700">+20K</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• 여비교통비</span>
                            <span className="font-semibold text-red-700">+9K</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• 임차료·보험료·기타 감소</span>
                            <span className="font-semibold text-blue-700">-48K</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  

                </>
              ) : (
                <>
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    13,385
                  </div>
                  <div className="text-sm font-semibold mb-3">
                    <span className="text-red-600">YOY 103%</span> | <span className="text-blue-600">영업비율 6.6%</span>
                  </div>
                  
                  <div className="text-xs text-gray-600 mb-3 bg-blue-50 p-2 rounded">
                    매출YOY 86% vs 영업비YOY 103%
                  </div>
                  
                  {/* 영업비 누적 상세보기 */}
                  <div className="border-t pt-3">
                    <button 
                      onClick={() => setShowExpenseDetail(!showExpenseDetail)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                    >
                      <span>영업비 누적 상세보기</span>
                      {showExpenseDetail ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {showExpenseDetail && (
                    <div className="mt-3 pt-3 border-t space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">급여</span>
                        <span className="font-semibold">5,232 <span className="text-red-600">(114%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">마케팅비</span>
                        <span className="font-semibold">3,137 <span className="text-green-600">(76%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">지급수수료</span>
                        <span className="font-semibold">1,964 <span className="text-red-600">(194%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">기타</span>
                        <span className="font-semibold">1,210 <span className="text-green-600">(92%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">임차료</span>
                        <span className="font-semibold">1,015 <span className="text-green-600">(85%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">감가상각비</span>
                        <span className="font-semibold">426 <span className="text-red-600">(115%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">여비교통비</span>
                        <span className="font-semibold">223 <span className="text-red-600">(150%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">보험료</span>
                        <span className="font-semibold">179 <span className="text-green-600">(88%)</span></span>
                      </div>
                      
                      {/* 누적 증감액 분석 */}
                      <div className="mt-3 pt-3 border-t bg-orange-50 rounded p-2">
                        <div className="text-xs font-semibold text-orange-800 mb-1">
                          누적 전년비 +403K 주요 증감 내역
                        </div>
                        <div className="space-y-0.5 text-xs text-orange-700">
                          <div className="flex justify-between">
                            <span>• 지급수수료</span>
                            <span className="font-semibold text-red-700">+954K</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• 급여</span>
                            <span className="font-semibold text-red-700">+626K</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• 여비교통비</span>
                            <span className="font-semibold text-red-700">+75K</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• 감가상각비</span>
                            <span className="font-semibold text-red-700">+55K</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• 마케팅비 감소</span>
                            <span className="font-semibold text-blue-700">-989K</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• 임차료 감소</span>
                            <span className="font-semibold text-blue-700">-182K</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• 보험료·기타 감소</span>
                            <span className="font-semibold text-blue-700">-134K</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* 누적 요약 */}
                  <div className="border-t pt-3 mt-3">
                    <div className="text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-600">전년 누적</span>
                        <span className="font-semibold">12,982</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">전년비</span>
                        <span className="font-semibold text-red-600">+403</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 할인율 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-purple-500 hover:shadow-xl transition-shadow min-h-[400px] relative">
              <DataStatusBadge status="connected" label="할인" />
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">🏷️</span>
                <h3 className="text-sm font-semibold text-gray-600">할인율</h3>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                18.6%
              </div>
              <div className="text-sm text-green-600 font-semibold mb-3">
                YOY △0.1%p
              </div>
              
              {/* 지역별 할인율 상세보기 */}
              <div className="border-t pt-3">
                <button 
                  onClick={() => setShowDiscountDetail(!showDiscountDetail)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                >
                  <span>지역/채널별 할인율</span>
                  {showDiscountDetail ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              {showDiscountDetail && (
                <div className="mt-3 pt-3 border-t space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-gray-700 mb-2">
                    <span>HK (홍콩) 전체</span>
                    <span className="text-red-600">20.0% <span className="text-gray-500">(전년 19.4%)</span></span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Retail</span>
                    <span className="font-semibold">10.8% <span className="text-gray-500">(전년 10.7%)</span></span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Outlet</span>
                    <span className="font-semibold text-red-600">39.6% <span className="text-gray-500">(전년 38.5%)</span></span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Online</span>
                    <span className="font-semibold text-red-600">27.8% <span className="text-gray-500">(전년 22.6%)</span></span>
                  </div>
                  
                  <div className="flex justify-between text-xs font-semibold text-gray-700 mt-3 pt-2 border-t">
                    <span>MC (마카오) 전체</span>
                    <span className="text-green-600">14.6% <span className="text-gray-500">(전년 16.9%)</span></span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Retail</span>
                    <span className="font-semibold text-green-600">10.5% <span className="text-gray-500">(전년 11.8%)</span></span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Outlet</span>
                    <span className="font-semibold text-green-600">39.9% <span className="text-gray-500">(전년 41.3%)</span></span>
                  </div>
                </div>
              )}
            </div>

            {/* 매장 효율성 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-red-500 hover:shadow-xl transition-shadow min-h-[400px] relative">
              <DataStatusBadge status="hardcoded" label="매장효율성" />
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">🏪</span>
                  <h3 className="text-sm font-semibold text-gray-600">매장 효율성 (1K HKD)</h3>
                </div>
                <button
                  onClick={() => setShowStoreCalcModal(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold transition-colors"
                >
                  계산근거
                </button>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                1,038
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">전년 23개, 점당 928</span> | <span className="text-green-600">당월 18개, 점당 1,038 (YOY 112%)</span>
              </div>
              
              {/* 매장 효율성 상세보기 */}
              <div className="border-t pt-3">
                <button 
                  onClick={() => setShowStoreDetail(!showStoreDetail)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                >
                  <span>매장 효율성보기</span>
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
                    <div className="text-xs bg-red-50 p-2 rounded">
                      <div className="font-semibold text-gray-700 mb-1">채널별 매장수 & 점당매출 (1K HKD)</div>
                      <div className="space-y-0.5">
                        <div className="flex justify-between">
                          <span>HK Retail 11개(△5개)</span>
                          <span className="font-bold text-right">970 <span className="text-green-600">(113%)</span></span>
                        </div>
                        <div className="flex justify-between">
                          <span>HK Outlet 4개(±0개)</span>
                          <span className="font-bold text-right">776 <span className="text-red-600">(90%)</span></span>
                        </div>
                        <div className="flex justify-between">
                          <span>MC Retail 3개(±0개)</span>
                          <span className="font-bold text-right">1,613 <span className="text-red-600">(80%)</span></span>
                        </div>
                        <div className="flex justify-between">
                          <span>MC Outlet 1개(±0개)</span>
                          <span className="font-bold text-right">534 <span className="text-red-600">(63%)</span></span>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-gray-700">오프라인 TOTAL 18개</span>
                          <span className="text-green-600">점당 1,038 (117%)</span>
                        </div>
                        <div className="flex justify-between text-xs font-semibold mt-1">
                          <span className="text-gray-700">전년 오프라인 24개</span>
                          <span className="text-gray-500">점당 889</span>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t text-gray-600 text-xs">
                        * 괄호 안은 전년비 매장수 증감<br/>
                        * 온라인 채널 제외 (오프라인 매장 효율성)<br/>
                        * LCX, WTC 제외 (리뉴얼/종료로 비정상 운영)
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-red-600 font-semibold">전년 24개</span>
                      <span className="mx-1">→</span>
                      <span className="text-red-600 font-semibold">당월 18개</span>
                    </div>
                    <div className="mt-2 bg-blue-50 rounded p-2">
                      <div className="text-xs font-semibold text-blue-800 mb-1">📍 매장 변동 (점당매출 계산 기준)</div>
                      <div className="flex justify-between text-xs text-blue-700">
                        <span>신규 오픈: 0개</span>
                        <span className="text-red-600">영업 종료: 6개</span>
                      </div>
                      <div className="text-xs text-red-600 mt-1">
                        • V City, OT KIDS (종료)<br/>
                        • WTC (10/11 종료), LCX (10/13~11/7 리뉴얼)<br/>
                        • NTP Kids, NTP3 (특수매장)
                      </div>
                      <div className="text-xs text-orange-600 mt-2 bg-orange-50 rounded p-1.5 border border-orange-200">
                        <strong>🔍 점당매출 계산 제외 근거:</strong><br/>
                        • LCX: 435K (리뉴얼 기간 비정상 운영)<br/>
                        • WTC: 14K (종료, 불완전 월)<br/>
                        • NTP Kids: 136K (과재고 특별 매장)<br/>
                        • NTP3: 136K (과재고 특별 매장)<br/>
                        → 정상 운영 매장 18개만 점당매출 산정
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>

          {/* 두 번째 줄: 5개 카드 추가 */}
          <div className="grid grid-cols-5 gap-4 mt-4">
            {/* 당시즌 판매 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-cyan-500 hover:shadow-xl transition-shadow min-h-[150px] relative">
              <DataStatusBadge status="connected" label="당시즌판매" />
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">📈</span>
                <h3 className="text-sm font-semibold text-gray-600">당시즌 판매 (25F 의류)</h3>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                {(categories as any)?.current_season_f?.total_sales 
                  ? Math.round((categories as any).current_season_f.total_sales / 1000).toLocaleString()
                  : '17,195'}
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">전년 {(categories as any)?.current_season_f?.prev_total_sales 
                  ? Math.round((categories as any).current_season_f.prev_total_sales / 1000).toLocaleString()
                  : '16,849'}</span> | <span className="text-green-600">YOY {(categories as any)?.current_season_f?.yoy 
                  ? Math.round((categories as any).current_season_f.yoy)
                  : '102'}%</span>
              </div>
              
              {/* 아이템별 상세보기 */}
              <div className="border-t pt-3">
                <button 
                  onClick={() => setShowSeasonSalesDetail(!showSeasonSalesDetail)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                >
                  <span>카테고리별 판매금액 TOP 5</span>
                  {showSeasonSalesDetail ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
              {showSeasonSalesDetail && (
                <>
                  <div className="mt-3 pt-3 border-t space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">TS</span>
                      <span className="font-semibold">6,982 <span className="text-green-600">(102%)</span></span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">PT</span>
                      <span className="font-semibold">2,629 <span className="text-green-600">(172%)</span></span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">WJ</span>
                      <span className="font-semibold">2,168 <span className="text-red-600">(97%)</span></span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">MT</span>
                      <span className="font-semibold">1,628 <span className="text-red-600">(81%)</span></span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">JP</span>
                      <span className="font-semibold">1,416 <span className="text-green-600">(131%)</span></span>
                    </div>
                    <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                      * 판매금액 YOY
                    </div>
                  </div>
                  
                  {/* 25S 참고 */}
                  <div className="mt-3 pt-3 border-t bg-gray-50 rounded p-2">
                    <div className="text-xs font-semibold text-gray-700 mb-1">📊 참고: 25S 성과</div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">판매율</span>
                      <span className="font-semibold text-blue-600">56.9% <span className="text-gray-500">(전년 24S: 55.9%)</span></span>
                    </div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">판매금액</span>
                      <span className="font-semibold text-blue-600">50,356 <span className="text-gray-500">(YOY 87%)</span></span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">입고금액</span>
                      <span className="font-semibold text-blue-600">88,457 <span className="text-gray-500">(YOY 86%)</span></span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 당시즌 판매율(25F) */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-indigo-500 hover:shadow-xl transition-shadow min-h-[150px] relative">
              <DataStatusBadge status="connected" label="당시즌판매율" />
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">🎯</span>
                <h3 className="text-sm font-semibold text-gray-600">당시즌 판매율 (25F)</h3>
              </div>
              
              <div className="text-3xl font-bold text-indigo-600 mb-1">
                21.9%
              </div>
              <div className="text-sm font-semibold text-green-600 mb-3">
                (전년비 +8.9%p)
              </div>
              
              {/* 시각적 표현 개선 */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-3 mb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">입고</span>
                  <span className="text-sm font-bold text-red-600">78,629 (60.5%) 🔽</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">판매금액</span>
                  <span className="text-sm font-bold text-green-600">17,195 (102%) ✓</span>
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
                  {/* 재고 경보 및 대응 전략 */}
                  <div className="mt-3 pt-3 border-t bg-gradient-to-r from-orange-100 to-red-100 rounded-lg p-3 border-2 border-orange-500">
                    <div className="flex items-start">
                      <div className="flex-1">
                        <div className="text-xs text-red-700 leading-tight space-y-1">
                          <div>• <span className="font-semibold">T/SHIRTS</span>: 판매율 49.1% <span className="bg-red-300 px-1 rounded font-bold">재고일수 96일</span></div>
                          <div>• <span className="font-semibold">PANTS</span>: 판매율 33.7% <span className="bg-orange-300 px-1 rounded font-bold">재고일수 127일</span></div>
                          <div className="pt-1 border-t border-red-300">→ <span className="font-semibold">26SS 조기운영</span>으로 대응 (12월-1월 투입)</div>
                        </div>
                      </div>
                    </div>
                  </div>
              
                  {/* 카테고리별 입고/판매율 */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs font-semibold text-gray-700 mb-2">카테고리별 입고YOY/판매율</div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">JP</span>
                        <span className="font-semibold"><span className="text-red-600">64%</span> / <span className="text-red-600">8.0%</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">TS</span>
                        <span className="font-semibold"><span className="text-red-600">81%</span> / <span className="text-green-600">49.1%</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">MT</span>
                        <span className="font-semibold"><span className="text-red-600">47%</span> / <span className="text-red-600">13.6%</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">PT</span>
                        <span className="font-semibold"><span className="text-orange-600">70%</span> / <span className="text-orange-600">33.7%</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">WJ</span>
                        <span className="font-semibold"><span className="text-orange-600">69%</span> / <span className="text-orange-600">31.8%</span></span>
                      </div>
                      <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                        * 입고YOY / 판매율 (입고 높은순)
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ACC 재고주수 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-pink-500 hover:shadow-xl transition-shadow min-h-[150px] relative">
              <DataStatusBadge status="connected" label="ACC재고주수" />
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">📦</span>
                <h3 className="text-sm font-semibold text-gray-600">ACC 재고주수</h3>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                40.1주
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">전년 46.7주</span> | <span className="text-green-600">YOY △6.6주</span>
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
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">신발</span>
                      <span className="font-semibold text-green-600">46.0주 <span className="text-gray-500">(△7.4주)</span></span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">모자</span>
                      <span className="font-semibold text-green-600">41.8주 <span className="text-gray-500">(△4.0주)</span></span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">가방외</span>
                      <span className="font-semibold text-green-600">27.5주 <span className="text-gray-500">(△8.9주)</span></span>
                    </div>
                  </div>
                  
                  {/* 당월 판매 */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs font-semibold text-gray-700 mb-2">당월 판매 (1K HKD)</div>
                    <div className="space-y-1">
                      {(() => {
                        // 10월 데이터 가져오기
                        const octData = monthly_item_sales && monthly_item_sales.length > 0 
                          ? monthly_item_sales.find(m => m.month === '10월') 
                          : null;
                        const octYOY = salesItemYOY;
                        
                        const shoesValue = octData?.신발 || 0;
                        const shoesYOY = octYOY?.신발?.[9] || 0;
                        const capValue = octData?.모자 || 0;
                        const capYOY = octYOY?.모자?.[9] || 0;
                        const bagValue = octData?.가방외 || 0;
                        const bagYOY = octYOY?.가방외?.[9] || 0;
                        const accTotal = shoesValue + capValue + bagValue;
                        const accTotalYOY = octYOY?.합계?.[9] || 0;
                        
                        return (
                          <>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">신발</span>
                              <span className="font-semibold">{shoesValue.toLocaleString()} <span className={shoesYOY >= 100 ? 'text-green-600' : 'text-red-600'}>({shoesYOY}%)</span></span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">모자</span>
                              <span className="font-semibold">{capValue.toLocaleString()} <span className={capYOY >= 100 ? 'text-green-600' : 'text-red-600'}>({capYOY}%)</span></span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">가방외</span>
                              <span className="font-semibold">{bagValue.toLocaleString()} <span className={bagYOY >= 100 ? 'text-green-600' : 'text-red-600'}>({bagYOY}%)</span></span>
                            </div>
                            <div className="flex justify-between text-xs font-semibold border-t pt-1 mt-1">
                              <span className="text-gray-700">악세 합계</span>
                              <span className="text-indigo-600">{accTotal.toLocaleString()} <span className={accTotalYOY >= 100 ? 'text-green-600' : 'text-red-600'}>({accTotalYOY}%)</span></span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 기말재고 */}
            <div 
              onClick={() => scrollToSection('inventory-chart')}
              className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-amber-500 hover:shadow-xl transition-shadow min-h-[150px] cursor-pointer relative"
            >
              <DataStatusBadge status="connected" label="재고" />
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">🏭</span>
                  <h3 className="text-sm font-semibold text-gray-600">기말재고 (TAG, 1K HKD)</h3>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    scrollToSection('inventory-chart');
                  }}
                  className="px-2 py-1 text-xs font-bold bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                >
                  상세내역
                </button>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                396,982
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">전년 419,999</span> | <span className="text-green-600">YOY 95%</span>
              </div>
              
              {/* 아이템별 상세보기 */}
              <div className="border-t pt-3" onClick={(e) => e.stopPropagation()}>
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
                    <span className="text-gray-600">당시즌 의류 (25F)</span>
                    <span className="font-semibold">71,619 <span className="text-green-600">(63%)</span></span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">당시즌 SS (25S)</span>
                    <span className="font-semibold">39,117 <span className="text-red-600">(86%)</span></span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">과시즌 FW</span>
                    <span className="font-semibold">116,639 <span className="text-red-600">(139%)</span></span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">과시즌 SS</span>
                    <span className="font-semibold">54,150 <span className="text-red-600">(122%)</span></span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">악세 합계</span>
                    <span className="font-semibold">115,457 <span className="text-green-600">(87%)</span></span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">신발 (SHO)</span>
                    <span className="font-semibold">55,591 <span className="text-green-600">(87%)</span></span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">모자 (HEA)</span>
                    <span className="font-semibold">40,317 <span className="text-green-600">(92%)</span></span>
                  </div>
                </div>
              )}
            </div>

            {/* 과시즌 FW 재고 */}
            <div 
              onClick={() => scrollToSection('inventory-chart')}
              className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-red-500 hover:shadow-xl transition-shadow min-h-[150px] cursor-pointer relative"
            >
              <DataStatusBadge status="connected" label="과시즌FW재고" />
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">📦</span>
                  <h3 className="text-sm font-semibold text-gray-600">과시즌 FW 재고 (TAG, 1K HKD)</h3>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    scrollToSection('inventory-chart');
                  }}
                  className="px-2 py-1 text-xs font-bold bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                >
                  상세내역
                </button>
              </div>
              <div className="text-3xl font-bold text-red-600 mb-2">
                {monthly_item_inventory && monthly_item_inventory.length > 0 && monthly_item_inventory[monthly_item_inventory.length - 1]?.과시즌FW 
                  ? monthly_item_inventory[monthly_item_inventory.length - 1].과시즌FW.toLocaleString() 
                  : (inventory?.by_season?.과시즌FW ? Math.round(inventory.by_season.과시즌FW.stock_price / 1000).toLocaleString() : '116,639')}
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">전년 {inventory?.by_season?.과시즌FW ? Math.round(inventory.by_season.과시즌FW.prev_stock / 1000).toLocaleString() : '84,212'}</span> | <span className="text-red-600">YOY {inventory?.by_season?.과시즌FW ? Math.round(inventory.by_season.과시즌FW.yoy) : '139'}% 🔴</span>
              </div>
              
              {/* 재고 시즌별 상세보기 */}
              <div className="border-t pt-3" onClick={(e) => e.stopPropagation()}>
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
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">1년차 (24FW)</span>
                      <span className="font-semibold">56,985 <span className="text-green-600">(98%)</span></span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">2년차 (23FW)</span>
                      <span className="font-semibold">40,765 <span className="text-red-600">(167%)</span></span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">3년차 이상 (22FW~)</span>
                      <span className="font-semibold">19,418 <span className="text-red-600">(+18,049)</span></span>
                    </div>
                  </div>
              
                  {/* 핵심 인사이트 */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="bg-red-50 rounded p-2">
                      <div className="text-xs font-semibold text-red-800 mb-2">⚠️ 25년 1년차 과시즌재고</div>
                      <div className="text-xs text-red-700 space-y-1">
                        <div className="flex justify-between items-center">
                          <span>• SWEAT SHIRTS</span>
                          <span className="font-semibold text-red-600">YOY 178%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>• JUMPER</span>
                          <span className="font-semibold text-red-600">YOY 181%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>• Knit Cardigan</span>
                          <span className="font-semibold text-red-600">YOY 170%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 손익요약 */}
      <div className="mb-4" id="profit-detail-section">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            손익요약 (단위: 1K HKD)
          </h3>
          <div className="space-y-1 mb-2">
            <p className="text-sm text-gray-600 bg-red-50 p-2 rounded border-l-4 border-red-500">
              <strong>당월:</strong> 영업손실 925K HKD, 영업이익률 -4.61% | 적자 악화 원인: ① 매출 YOY 93% (MC 오프라인 YOY 78%) ② 영업비 YOY 130% (+333K) ③ 직접이익 YOY 57% (직접이익률 4.3%→2.6%)
            </p>
            <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded border-l-4 border-blue-500">
              <strong>누적:</strong> 영업손실 9,232K HKD, 영업이익률 -4.55% | 적자 지속: ① 매출 YOY 86% (전년비 △32,587K) ② 영업비 YOY 103% (+403K) ③ 직접이익 YOY 22% (직접이익률 8.05%→2.05%)
            </p>
          </div>
          <div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <th rowSpan={2} className="text-left py-2 px-2 text-gray-700 font-semibold border-r border-gray-300 min-w-[100px]">항목<br/>(1K HKD)</th>
                    <th colSpan={3} className="text-center py-1 px-1 text-gray-700 font-semibold bg-green-50 border-r border-gray-300">당월</th>
                    <th colSpan={3} className="text-center py-1 px-1 text-gray-700 font-semibold bg-orange-50 border-r border-gray-300">당월 전년비</th>
                    <th rowSpan={2} className="text-center py-2 px-2 text-gray-700 font-semibold bg-purple-50 border-r border-gray-300">YOY</th>
                    <th colSpan={3} className="text-center py-1 px-1 text-gray-700 font-semibold bg-cyan-50 border-r border-gray-300">누적</th>
                    <th colSpan={3} className="text-center py-1 px-1 text-gray-700 font-semibold bg-amber-50 border-r border-gray-300">누적 전년비</th>
                    <th rowSpan={2} className="text-center py-2 px-2 text-gray-700 font-semibold bg-indigo-50">누적<br/>YOY</th>
                  </tr>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <th className="text-center py-1 px-1 text-gray-700 font-semibold bg-green-50 border-r">홍콩</th>
                    <th className="text-center py-1 px-1 text-gray-700 font-semibold bg-green-50 border-r">마카오</th>
                    <th className="text-center py-1 px-1 text-gray-700 font-semibold bg-green-50 border-r border-gray-300">합계</th>
                    <th className="text-center py-1 px-1 text-gray-700 font-semibold bg-orange-50 border-r">홍콩</th>
                    <th className="text-center py-1 px-1 text-gray-700 font-semibold bg-orange-50 border-r">마카오</th>
                    <th className="text-center py-1 px-1 text-gray-700 font-semibold bg-orange-50 border-r border-gray-300">합계</th>
                    <th className="text-center py-1 px-1 text-gray-700 font-semibold bg-cyan-50 border-r">홍콩</th>
                    <th className="text-center py-1 px-1 text-gray-700 font-semibold bg-cyan-50 border-r">마카오</th>
                    <th className="text-center py-1 px-1 text-gray-700 font-semibold bg-cyan-50 border-r border-gray-300">합계</th>
                    <th className="text-center py-1 px-1 text-gray-700 font-semibold bg-amber-50 border-r">홍콩</th>
                    <th className="text-center py-1 px-1 text-gray-700 font-semibold bg-amber-50 border-r">마카오</th>
                    <th className="text-center py-1 px-1 text-gray-700 font-semibold bg-amber-50 border-r border-gray-300">합계</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-1.5 px-2 text-gray-800 font-semibold border-r border-gray-200">TAG</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-700 bg-white">18,385</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-700 bg-white">6,294</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-700 bg-white border-r border-gray-300">24,679</td>
                    <td className="text-center py-1 px-1 font-semibold text-blue-600 bg-orange-50">59</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-orange-50">△1,972</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-orange-50 border-r border-gray-300">△1,912</td>
                    <td className="text-center py-1 px-1 font-bold text-red-600 bg-purple-50 border-r border-gray-300">93%</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-700 bg-white">191,556</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-700 bg-white">66,050</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-700 bg-white border-r border-gray-300">257,606</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-amber-50">△14,388</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-amber-50">△13,729</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-amber-50 border-r border-gray-300">△28,118</td>
                    <td className="text-center py-1 px-1 font-bold text-red-600 bg-indigo-50">90%</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-1.5 px-2 text-gray-800 font-semibold border-r border-gray-200">실판</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-700 bg-white">14,703</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-700 bg-white">5,374</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-700 bg-white border-r border-gray-300">20,077</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-orange-50">△60</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-orange-50">△1,492</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-orange-50 border-r border-gray-300">△1,552</td>
                    <td className="text-center py-1 px-1 font-bold text-red-600 bg-purple-50 border-r border-gray-300">93%</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-700 bg-white">147,933</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-700 bg-white">54,837</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-700 bg-white border-r border-gray-300">202,770</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-amber-50">△19,852</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-amber-50">△12,736</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-amber-50 border-r border-gray-300">△32,587</td>
                    <td className="text-center py-1 px-1 font-bold text-red-600 bg-indigo-50">86%</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-1.5 px-2 text-gray-800 font-semibold border-r border-gray-200">할인율</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">20.0%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">14.6%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white border-r border-gray-300">18.6%</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-orange-50">+0.6%p</td>
                    <td className="text-center py-1 px-1 font-semibold text-blue-600 bg-orange-50">△2.3%p</td>
                    <td className="text-center py-1 px-1 font-semibold text-blue-600 bg-orange-50 border-r border-gray-300">△0.0%p</td>
                    <td className="text-center py-1 px-1 font-semibold text-gray-600 bg-purple-50 border-r border-gray-300">-</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">22.8%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">17.0%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white border-r border-gray-300">21.3%</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-amber-50">+4.2%p</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-amber-50">+1.7%p</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-amber-50 border-r border-gray-300">+3.7%p</td>
                    <td className="text-center py-1 px-1 font-semibold text-gray-600 bg-indigo-50">-</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-1.5 px-2 text-gray-800 font-semibold border-r border-gray-200">(Tag 원가율)</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">31.7%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">32.4%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white border-r border-gray-300">31.9%</td>
                    <td className="text-center py-1 px-1 font-semibold text-blue-600 bg-orange-50">△0.4%p</td>
                    <td className="text-center py-1 px-1 font-semibold text-blue-600 bg-orange-50">△0.8%p</td>
                    <td className="text-center py-1 px-1 font-semibold text-blue-600 bg-orange-50 border-r border-gray-300">△0.6%p</td>
                    <td className="text-center py-1 px-1 font-semibold text-gray-600 bg-purple-50 border-r border-gray-300">-</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">32.0%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">32.8%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white border-r border-gray-300">32.2%</td>
                    <td className="text-center py-1 px-1 font-semibold text-blue-600 bg-amber-50">△0.7%p</td>
                    <td className="text-center py-1 px-1 font-semibold text-blue-600 bg-amber-50">△1.1%p</td>
                    <td className="text-center py-1 px-1 font-semibold text-blue-600 bg-amber-50 border-r border-gray-300">△0.8%p</td>
                    <td className="text-center py-1 px-1 font-semibold text-gray-600 bg-indigo-50">-</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-1.5 px-2 text-gray-800 font-semibold border-r border-gray-200">매출총이익</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white">8,877</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white">3,334</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white border-r border-gray-300">12,212</td>
                    <td className="text-center py-1 px-1 font-semibold text-blue-600 bg-orange-50">3</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-orange-50">△790</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-orange-50 border-r border-gray-300">△787</td>
                    <td className="text-center py-1 px-1 font-bold text-red-600 bg-purple-50 border-r border-gray-300">94%</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white">86,628</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white">33,205</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white border-r border-gray-300">119,832</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-amber-50">△13,898</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-amber-50">△7,326</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-amber-50 border-r border-gray-300">△21,223</td>
                    <td className="text-center py-1 px-1 font-bold text-red-600 bg-indigo-50">85%</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-1.5 px-2 text-gray-800 font-semibold border-r border-gray-200">매출총이익률</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">60.4%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">62.0%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white border-r border-gray-300">60.8%</td>
                    <td className="text-center py-1 px-1 font-semibold text-blue-600 bg-orange-50">+0.3%p</td>
                    <td className="text-center py-1 px-1 font-semibold text-blue-600 bg-orange-50">+1.9%p</td>
                    <td className="text-center py-1 px-1 font-semibold text-blue-600 bg-orange-50 border-r border-gray-300">+0.7%p</td>
                    <td className="text-center py-1 px-1 font-semibold text-gray-600 bg-purple-50 border-r border-gray-300">-</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">58.6%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">60.6%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white border-r border-gray-300">59.1%</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-amber-50">△1.4%p</td>
                    <td className="text-center py-1 px-1 font-semibold text-blue-600 bg-amber-50">+0.6%p</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-amber-50 border-r border-gray-300">△0.8%p</td>
                    <td className="text-center py-1 px-1 font-semibold text-gray-600 bg-indigo-50">-</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-1.5 px-2 text-gray-800 font-semibold border-r border-gray-200">직접비 합계</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">8,904</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">2,782</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white border-r border-gray-300">11,686</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-orange-50">△469</td>
                    <td className="text-center py-1 px-1 font-semibold text-blue-600 bg-orange-50">78</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-orange-50 border-r border-gray-300">△391</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-purple-50 border-r border-gray-300">97%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">90,108</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">25,572</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white border-r border-gray-300">115,680</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-amber-50">△6,131</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-amber-50">△296</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-amber-50 border-r border-gray-300">△6,427</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-indigo-50">96%</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-1.5 px-2 text-gray-800 font-semibold border-r border-gray-200">직접이익</td>
                    <td className="text-center py-1 px-1 font-bold text-red-700 bg-white">-27</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white">553</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white border-r border-gray-300">526</td>
                    <td className="text-center py-1 px-1 font-semibold text-blue-600 bg-orange-50">472</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-orange-50">△868</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-orange-50 border-r border-gray-300">△396</td>
                    <td className="text-center py-1 px-1 font-bold text-red-600 bg-purple-50 border-r border-gray-300">57%</td>
                    <td className="text-center py-1 px-1 font-bold text-red-700 bg-white">-3,480</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white">7,633</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-800 bg-white border-r border-gray-300">4,153</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-amber-50">△7,767</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-amber-50">△7,030</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-amber-50 border-r border-gray-300">△14,797</td>
                    <td className="text-center py-1 px-1 font-bold text-red-600 bg-indigo-50">22%</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-1.5 px-2 text-gray-800 font-semibold border-r border-gray-200">직접이익율</td>
                    <td className="text-center py-1 px-1 text-red-700 bg-white">-0.2%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">10.3%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white border-r border-gray-300">2.6%</td>
                    <td className="text-center py-1 px-1 font-semibold text-blue-600 bg-orange-50">+3.2%p</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-orange-50">△10.4%p</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-orange-50 border-r border-gray-300">△1.6%p</td>
                    <td className="text-center py-1 px-1 font-semibold text-gray-600 bg-purple-50 border-r border-gray-300">-</td>
                    <td className="text-center py-1 px-1 text-red-700 bg-white">-2.35%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">13.92%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white border-r border-gray-300">2.05%</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-amber-50">△4.9%p</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-amber-50">△7.8%p</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-amber-50 border-r border-gray-300">△6.0%p</td>
                    <td className="text-center py-1 px-1 font-semibold text-gray-600 bg-indigo-50">-</td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-1.5 px-2 text-gray-800 font-semibold border-r border-gray-200">영업비 소계</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">1,063</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">388</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white border-r border-gray-300">1,451</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-orange-50">300</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-orange-50">34</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-orange-50 border-r border-gray-300">333</td>
                    <td className="text-center py-1 px-1 font-bold text-red-600 bg-purple-50 border-r border-gray-300">130%</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">9,754</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white">3,631</td>
                    <td className="text-center py-1 px-1 text-gray-700 bg-white border-r border-gray-300">13,385</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-amber-50">499</td>
                    <td className="text-center py-1 px-1 font-semibold text-blue-600 bg-amber-50">△96</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-amber-50 border-r border-gray-300">403</td>
                    <td className="text-center py-1 px-1 font-semibold text-red-600 bg-indigo-50">103%</td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="py-1.5 px-2 text-gray-800 font-bold border-r border-gray-200 bg-gray-100">영업이익</td>
                    <td className="text-center py-1 px-1 font-bold text-red-700 bg-white">(1,090)</td>
                    <td className="text-center py-1 px-1 font-bold text-green-700 bg-white">164</td>
                    <td className="text-center py-1 px-1 font-bold text-red-700 bg-white border-r border-gray-300">(925)</td>
                    <td className="text-center py-1 px-1 font-bold text-blue-600 bg-orange-50">172</td>
                    <td className="text-center py-1 px-1 font-bold text-red-600 bg-orange-50">△901</td>
                    <td className="text-center py-1 px-1 font-bold text-red-600 bg-orange-50 border-r border-gray-300">△729</td>
                    <td className="text-center py-1 px-1 font-bold text-red-600 bg-purple-50 border-r border-gray-300">적자악화</td>
                    <td className="text-center py-1 px-1 font-bold text-red-700 bg-white">(13,234)</td>
                    <td className="text-center py-1 px-1 font-bold text-cyan-700 bg-white">4,002</td>
                    <td className="text-center py-1 px-1 font-bold text-red-700 bg-white border-r border-gray-300">(9,232)</td>
                    <td className="text-center py-1 px-1 font-bold text-red-600 bg-amber-50">△8,266</td>
                    <td className="text-center py-1 px-1 font-bold text-red-600 bg-amber-50">△6,934</td>
                    <td className="text-center py-1 px-1 font-bold text-red-600 bg-amber-50 border-r border-gray-300">△15,199</td>
                    <td className="text-center py-1 px-1 font-bold text-red-600 bg-indigo-50">적자전환</td>
                  </tr>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="py-1.5 px-2 text-gray-800 font-bold border-r border-gray-200 bg-gray-100">영업이익율</td>
                    <td className="text-center py-1 px-1 font-bold text-red-700 bg-white">-7.41%</td>
                    <td className="text-center py-1 px-1 font-bold text-green-700 bg-white">3.06%</td>
                    <td className="text-center py-1 px-1 font-bold text-red-700 bg-white border-r border-gray-300">-4.61%</td>
                    <td className="text-center py-1 px-1 font-bold text-blue-600 bg-orange-50">+1.1%p</td>
                    <td className="text-center py-1 px-1 font-bold text-red-600 bg-orange-50">△12.5%p</td>
                    <td className="text-center py-1 px-1 font-bold text-red-600 bg-orange-50 border-r border-gray-300">△3.7%p</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-600 bg-purple-50 border-r border-gray-300">-</td>
                    <td className="text-center py-1 px-1 font-bold text-red-700 bg-white">-8.95%</td>
                    <td className="text-center py-1 px-1 font-bold text-cyan-700 bg-white">7.30%</td>
                    <td className="text-center py-1 px-1 font-bold text-red-700 bg-white border-r border-gray-300">-4.55%</td>
                    <td className="text-center py-1 px-1 font-bold text-red-600 bg-amber-50">△6.0%p</td>
                    <td className="text-center py-1 px-1 font-bold text-red-600 bg-amber-50">△8.9%p</td>
                    <td className="text-center py-1 px-1 font-bold text-red-600 bg-amber-50 border-r border-gray-300">△7.1%p</td>
                    <td className="text-center py-1 px-1 font-bold text-gray-600 bg-indigo-50">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 월별 추세 그래프 3개 */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        {/* 월별 채널별 매출 추세 */}
        <div className="bg-white rounded-lg shadow-md p-4 relative" id="sales-channel-chart">
          <DataStatusBadge status="connected" label="채널별매출그래프" />
          <div className="flex items-center justify-between mb-4" style={{ height: '40px' }}>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              2025년 월별 채널별 매출 추세 (실판 V-, 1K HKD)
            </h3>
            <div style={{ width: '200px' }}></div>
          </div>
          {/* 전문적인 세로 막대 차트 (그림과 동일한 디자인) */}
          <div className="relative px-4 py-2">
            {monthly_channel_sales && monthly_channel_sales.length > 0 ? (
            <>
            {(() => {
              // Y축 최대값 계산
              const maxDataValue = Math.max(...monthly_channel_sales.map(m => m.total));
              const yMax = 50000; // 50K HKD
              const yStep = yMax / 3;
              
              return (
            <div className="flex gap-2">
              {/* Y축 레이블과 눈금 */}
              <div className="flex flex-col justify-between h-64 text-[10px] text-gray-500 font-medium pr-2">
                <div className="text-right">{yMax.toLocaleString()}</div>
                <div className="text-right">{Math.round(yStep * 2).toLocaleString()}</div>
                <div className="text-right">{Math.round(yStep).toLocaleString()}</div>
                <div className="text-right">0</div>
              </div>
              
              {/* 차트 영역 */}
              <div className="flex-1 relative">
                {/* 격자선 (Horizontal Grid Lines) */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  <div className="border-t border-dashed border-gray-300"></div>
                  <div className="border-t border-dashed border-gray-300"></div>
                  <div className="border-t border-dashed border-gray-300"></div>
                  <div className="border-t border-gray-400"></div>
                </div>
                
                {/* 막대 차트 */}
                <div className="relative h-64 flex items-end justify-between gap-0.5 z-10">
                  {monthly_channel_sales.map((m, idx) => {
                    // 픽셀 단위로 계산 (h-64 = 256px)
                    const CHART_HEIGHT = 256;
                    const totalHeightPx = Math.max((m.total / yMax) * CHART_HEIGHT, 8);
                    
                    const channels = [
                      { name: 'HK Retail', value: m['HK Retail'] || 0, color: '#93C5FD' },
                      { name: 'HK Outlet', value: m['HK Outlet'] || 0, color: '#C4B5FD' },
                      { name: 'HK Online', value: m['HK Online'] || 0, color: '#F9A8D4' },
                      { name: 'MO Retail', value: m['MO Retail'] || 0, color: '#86EFAC' },
                      { name: 'MO Outlet', value: m['MO Outlet'] || 0, color: '#FDE047' }
                    ];
                    
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center">
                        {/* 세로 막대 */}
                        <div 
                          className="w-full relative flex flex-col-reverse rounded-t-sm hover:opacity-90 transition-opacity cursor-pointer shadow-sm hover:shadow-lg"
                          style={{ 
                            height: `${totalHeightPx}px`,
                            minHeight: '8px'
                          }}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredBar({
                              month: m.month,
                              data: { ...m, channels },
                              x: rect.left + rect.width / 2,
                              y: rect.top
                            });
                          }}
                          onMouseLeave={() => setHoveredBar(null)}
                        >
                          {channels.map((ch, chIdx) => {
                            const segmentHeight = m.total > 0 ? (ch.value / m.total * 100) : 0;
                            return segmentHeight > 0 ? (
                              <div 
                                key={chIdx}
                                className="flex items-center justify-center"
                                style={{ 
                                  height: `${segmentHeight}%`,
                                  backgroundColor: ch.color,
                                  minHeight: segmentHeight > 1 ? '3px' : '0px'
                                }}
                                title={`${ch.name}: ${ch.value.toLocaleString()}K`}
                              />
                            ) : null;
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
              );
            })()}
            
            {/* X축 라벨 (월) */}
            <div className="flex gap-2 mt-2 ml-12">
              <div className="flex-1 flex justify-between text-[10px] text-gray-600 font-medium">
                {monthly_channel_sales.map((m, idx) => (
                  <div key={idx} className="flex-1 text-center">{m.month}</div>
                ))}
              </div>
            </div>
            </>
            ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded border-2 border-dashed border-gray-300">
              <div className="text-center">
                <div className="text-gray-600 font-semibold mb-2">📊 차트 데이터 로딩 중...</div>
                <div className="text-xs text-gray-500">monthly_channel_sales 데이터 확인 필요</div>
              </div>
            </div>
            )}
          </div>
          
          {/* 툴팁 */}
          {hoveredBar && (
            <div
              className="fixed z-50 pointer-events-none"
              style={{
                left: `${hoveredBar.x}px`,
                top: `${hoveredBar.y - 10}px`,
                transform: 'translate(-50%, -100%)'
              }}
            >
              <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-3 min-w-[200px]">
                <div className="font-bold text-sm text-gray-900 mb-2 pb-2 border-b border-gray-200">
                  📅 {hoveredBar.data.month} 매출
                </div>
                <div className="space-y-1.5 text-xs">
                  {hoveredBar.data.channels.map((ch: any, idx: number) => (
                    ch.value > 0 && (
                      <div key={idx} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5">
                          <div 
                            className="w-3 h-3 rounded-sm" 
                            style={{ backgroundColor: ch.color }}
                          ></div>
                          <span className="text-gray-700 font-medium">{ch.name}</span>
                        </div>
                        <span className="font-bold text-gray-900">{ch.value.toLocaleString()}K</span>
                      </div>
                    )
                  ))}
                  <div className="pt-2 mt-2 border-t border-gray-200 flex justify-between items-center">
                    <span className="font-bold text-gray-900">총매출</span>
                    <span className="font-bold text-blue-600 text-sm">{hoveredBar.data.total.toLocaleString()}K</span>
                  </div>
                </div>
              </div>
              {/* 화살표 */}
              <div 
                className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-3 h-3 bg-white border-r border-b border-gray-200"
              ></div>
            </div>
          )}
          
          {/* 채널 선택 버튼 */}
          <div className="mt-4">
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { name: '전체', color: '#A78BFA' },
                { name: 'HK Retail', color: '#93C5FD' },
                { name: 'HK Outlet', color: '#C4B5FD' },
                { name: 'HK Online', color: '#F9A8D4' },
                { name: 'MC Retail', color: '#86EFAC' },
                { name: 'MC Outlet', color: '#FDE047' }
              ].map(channel => (
                <button
                  key={channel.name}
                  onClick={() => setSelectedChannelTrend(selectedChannelTrend === channel.name ? null : channel.name)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${
                    selectedChannelTrend === channel.name
                      ? 'ring-2 ring-blue-600 scale-105'
                      : 'hover:scale-105'
                  }`}
                  style={{ 
                    backgroundColor: channel.color,
                    color: '#1F2937'
                  }}
                >
                  {channel.name}
                </button>
              ))}
            </div>

            {/* 선택된 채널의 상세 정보 */}
            {selectedChannelTrend && isClient && (
              <div className="mt-4 relative">
                <DataStatusBadge status="connected" label="채널별YOY추세" />
                <div className="mb-2 text-xs text-gray-600">
                  선택된 채널: {selectedChannelTrend}
                </div>
                
                {/* YOY 차트 */}
                {selectedChannelTrend === '전체' ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={months.map((month, idx) => ({
                      month,
                      hkRetail: channelYOY['HK Retail'][idx],
                      hkOutlet: channelYOY['HK Outlet'][idx],
                      hkOnline: channelYOY['HK Online'][idx],
                      mcRetail: channelYOY['MC Retail'][idx],
                      mcOutlet: channelYOY['MC Outlet'][idx]
                    }))} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 350]} tickFormatter={(value) => `${value}%`} />
                      <Tooltip 
                        formatter={(value, name) => value ? [`${value}%`, name] : ['N/A', name]}
                        contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", fontSize: "11px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <ReferenceLine y={100} stroke="#000000" strokeWidth={2} strokeDasharray="5 5" label={{ value: '100%', position: 'right', fill: '#000000', fontSize: 10 }} />
                      <Line type="monotone" dataKey="hkRetail" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} connectNulls name="HK Retail" />
                      <Line type="monotone" dataKey="hkOutlet" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4 }} connectNulls name="HK Outlet" />
                      <Line type="monotone" dataKey="hkOnline" stroke="#EC4899" strokeWidth={3} dot={{ r: 4 }} connectNulls name="HK Online" />
                      <Line type="monotone" dataKey="mcRetail" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} connectNulls name="MC Retail" />
                      <Line type="monotone" dataKey="mcOutlet" stroke="#FBBF24" strokeWidth={3} dot={{ r: 4 }} connectNulls name="MC Outlet" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={months.map((month, idx) => ({
                      month,
                      yoy: channelYOY[selectedChannelTrend]?.[idx]
                    }))} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(value) => `${value}%`} />
                      <Tooltip 
                        formatter={(value, name) => [`${value}%`, name]}
                        contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", fontSize: "11px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Line type="monotone" dataKey="yoy" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} name="YOY" />
                    </LineChart>
                  </ResponsiveContainer>
                )}

                {/* YOY 데이터 테이블 */}
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-2 py-1 text-left font-semibold">
                          {selectedChannelTrend === '전체' ? '채널' : selectedChannelTrend}
                        </th>
                        {months.map(month => (
                          <th key={month} className="border border-gray-300 px-2 py-1 text-center font-semibold">{month}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedChannelTrend === '전체' ? (
                        <>
                          {['HK Retail', 'HK Outlet', 'HK Online', 'MC Retail', 'MC Outlet'].map(channel => (
                            <tr key={channel}>
                              <td className="border border-gray-300 px-2 py-1 font-semibold bg-blue-50">{channel}</td>
                              {channelYOY[channel].map((yoy: number, idx: number) => (
                                <td key={idx} className={`border border-gray-300 px-2 py-1 text-center font-bold ${yoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                                  {yoy}%
                                </td>
                              ))}
                            </tr>
                          ))}
                        </>
                      ) : (
                        <tr>
                          <td className="border border-gray-300 px-2 py-1 font-semibold bg-blue-50">YOY</td>
                          {channelYOY[selectedChannelTrend].map((yoy: number, idx: number) => (
                            <td key={idx} className={`border border-gray-300 px-2 py-1 text-center font-bold ${yoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
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

            {/* 안내 메시지 */}
            {!selectedChannelTrend && (
              <div className="mt-4 text-center text-xs text-gray-500 bg-gradient-to-r from-blue-50 to-purple-50 py-2 px-3 rounded border border-blue-200">
                💡 버튼을 클릭하면 해당 채널의 YOY 추세와 상세 데이터를 확인할 수 있습니다
              </div>
            )}
          </div>
          
          {/* 구 Recharts 차트는 숨김 */}
          <div style={{display: 'none'}}>
          {isClient ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthly_channel_sales.map(m => ({
              month: m.month,
              'HK Retail': m['HK Retail'] || 0,
              'HK Outlet': m['HK Outlet'] || 0,
              'HK Online': m['HK Online'] || 0,
              'MC Retail': m['MO Retail'] || 0,
              'MC Outlet': m['MO Outlet'] || 0,
              total: m.total || 0
            }))} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 50000]} tickFormatter={(value) => value.toLocaleString()} />
              <Tooltip 
                formatter={(value, name) => [`${value.toLocaleString()}K HKD`, name]}
                contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", padding: "8px", fontSize: "11px" }}
              />
              <Bar dataKey="HK Retail" stackId="a" fill="#93C5FD">
                {[
                  { pct: 59.4, y: 140 }, { pct: 51.8, y: 155 }, { pct: 53.1, y: 153 }, { pct: 55.1, y: 150 }, { pct: 55.5, y: 149 }, 
                  { pct: 56.7, y: 147 }, { pct: 54.7, y: 151 }, { pct: 50.7, y: 157 }, { pct: 61.0, y: 139 }, { pct: 54.0, y: 152 }
                ].map((entry, index) => (
                  <text key={`label-hk-retail-${index}`} x={47 + index * 94} y={entry.y} textAnchor="middle" fill="#000000" fontSize="9" fontWeight="700">
                    {entry.pct}%
                  </text>
                ))}
              </Bar>
              <Bar dataKey="HK Outlet" stackId="a" fill="#C4B5FD">
                {[
                  { pct: 14.9, y: 215 }, { pct: 14.3, y: 217 }, { pct: 18.0, y: 212 }, { pct: 17.2, y: 213 }, { pct: 15.6, y: 215 }, 
                  { pct: 14.2, y: 217 }, { pct: 16.3, y: 214 }, { pct: 14.5, y: 216 }, { pct: 13.6, y: 218 }, { pct: 15.2, y: 216 }
                ].map((entry, index) => (
                  <text key={`label-hk-outlet-${index}`} x={47 + index * 94} y={entry.y} textAnchor="middle" fill="#000000" fontSize="9" fontWeight="700">
                    {entry.pct}%
                  </text>
                ))}
              </Bar>
              <Bar dataKey="HK Online" stackId="a" fill="#F9A8D4">
                {[
                  { pct: 1.2, y: 245 }, { pct: 1.8, y: 243 }, { pct: 1.3, y: 244 }, { pct: 1.3, y: 244 }, { pct: 1.9, y: 243 }, 
                  { pct: 3.3, y: 240 }, { pct: 1.6, y: 244 }, { pct: 3.2, y: 240 }, { pct: 3.6, y: 239 }, { pct: 4.6, y: 237 }
                ].map((entry, index) => (
                  <text key={`label-hk-online-${index}`} x={47 + index * 94} y={entry.y} textAnchor="middle" fill="#000000" fontSize="9" fontWeight="700">
                    {entry.pct}%
                  </text>
                ))}
              </Bar>
              <Bar dataKey="MC Retail" stackId="a" fill="#86EFAC">
                {[
                  { pct: 20.8, y: 70 }, { pct: 27.6, y: 55 }, { pct: 23.6, y: 62 }, { pct: 22.9, y: 64 }, { pct: 23.6, y: 62 }, 
                  { pct: 23.2, y: 63 }, { pct: 24.4, y: 60 }, { pct: 28.0, y: 54 }, { pct: 19.2, y: 71 }, { pct: 23.6, y: 62 }
                ].map((entry, index) => (
                  <text key={`label-mc-retail-${index}`} x={47 + index * 94} y={entry.y} textAnchor="middle" fill="#000000" fontSize="9" fontWeight="700">
                    {entry.pct}%
                  </text>
                ))}
              </Bar>
              <Bar dataKey="MC Outlet" stackId="a" fill="#FDE047">
                {[
                  { pct: 3.7, y: 110 }, { pct: 4.5, y: 108 }, { pct: 4.1, y: 109 }, { pct: 3.4, y: 111 }, { pct: 3.4, y: 111 }, 
                  { pct: 2.6, y: 112 }, { pct: 2.9, y: 112 }, { pct: 3.5, y: 111 }, { pct: 2.6, y: 112 }, { pct: 2.6, y: 112 }
                ].map((entry, index) => (
                  <text key={`label-mc-outlet-${index}`} x={47 + index * 94} y={entry.y} textAnchor="middle" fill="#000000" fontSize="9" fontWeight="700">
                    {entry.pct}%
                  </text>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          ) : null}
          </div>
          {/* Recharts 차트 끝 (숨김) */}
          
          {/* 범례 클릭 가능하게 만들기 - 이미 위에 표시됨 */}
          <div className="mt-4" style={{display: 'none'}}>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { name: '전체', color: '#A78BFA' },
                { name: 'HK Retail', color: '#93C5FD' },
                { name: 'HK Outlet', color: '#C4B5FD' },
                { name: 'HK Online', color: '#F9A8D4' },
                { name: 'MC Retail', color: '#86EFAC' },
                { name: 'MC Outlet', color: '#FDE047' }
              ].map(channel => (
                <button
                  key={channel.name}
                  onClick={() => {
                    console.log('Clicked channel:', channel.name);
                    setSelectedChannel(selectedChannel === channel.name ? null : channel.name);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${
                    selectedChannel === channel.name
                      ? 'ring-2 ring-blue-600 scale-105'
                      : 'hover:scale-105'
                  }`}
                  style={{ 
                    backgroundColor: channel.color,
                    color: '#1F2937'
                  }}
                >
                  {channel.name}
                </button>
              ))}
            </div>
            
            {selectedChannel && (
              <div className="mt-4">
                <div className="mb-2 text-xs text-gray-600">
                  선택된 채널: {selectedChannel}
                </div>
                {selectedChannel === '전체' ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={months.map((month, idx) => ({
                      month,
                      hkRetail: channelYOY['HK Retail'][idx],
                      hkOutlet: channelYOY['HK Outlet'][idx],
                      hkOnline: channelYOY['HK Online'][idx],
                      mcRetail: channelYOY['MC Retail'][idx],
                      mcOutlet: channelYOY['MC Outlet'][idx]
                    }))} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 350]} tickFormatter={(value) => `${value}%`} />
                      <Tooltip 
                        formatter={(value, name) => value ? [`${value}%`, name] : ['N/A', name]}
                        contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", fontSize: "11px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <ReferenceLine y={100} stroke="#000000" strokeWidth={2} strokeDasharray="5 5" label={{ value: '100%', position: 'right', fill: '#000000', fontSize: 10 }} />
                      <Line type="monotone" dataKey="hkRetail" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} connectNulls name="HK Retail" />
                      <Line type="monotone" dataKey="hkOutlet" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4 }} connectNulls name="HK Outlet" />
                      <Line type="monotone" dataKey="hkOnline" stroke="#EC4899" strokeWidth={3} dot={{ r: 4 }} connectNulls name="HK Online" />
                      <Line type="monotone" dataKey="mcRetail" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} connectNulls name="MC Retail" />
                      <Line type="monotone" dataKey="mcOutlet" stroke="#FBBF24" strokeWidth={3} dot={{ r: 4 }} connectNulls name="MC Outlet" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={months.map((month, idx) => ({
                      month,
                      yoy: channelYOY[selectedChannel]?.[idx]
                    }))} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(value) => `${value}%`} />
                      <Tooltip 
                        formatter={(value, name) => [`${value}%`, name]}
                        contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", fontSize: "11px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Line type="monotone" dataKey="yoy" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} name="YOY" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
                
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-2 py-1 text-left font-semibold">{selectedChannel === '전체' ? '채널' : selectedChannel}</th>
                        {months.map(month => (
                          <th key={month} className="border border-gray-300 px-2 py-1 text-center font-semibold">{month}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedChannel === '전체' ? (
                        <>
                          {['HK Retail', 'HK Outlet', 'HK Online', 'MC Retail', 'MC Outlet'].map(channel => (
                            <tr key={channel}>
                              <td className="border border-gray-300 px-2 py-1 font-semibold bg-blue-50">{channel}</td>
                              {channelYOY[channel].map((yoy: number, idx: number) => (
                                <td key={idx} className={`border border-gray-300 px-2 py-1 text-center font-bold ${yoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                                  {yoy}%
                                </td>
                              ))}
                            </tr>
                          ))}
                        </>
                      ) : (
                        <tr>
                          <td className="border border-gray-300 px-2 py-1 font-semibold bg-blue-50">YOY</td>
                          {channelYOY[selectedChannel].map((yoy: number, idx: number) => (
                            <td key={idx} className={`border border-gray-300 px-2 py-1 text-center font-bold ${yoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
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
          </div>
          
          <div className="mt-3 grid grid-cols-3 gap-1">
            {selectedChannel === null || selectedChannel === '전체' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 주요 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    <div>• 1월 최대 36,735</div>
                    <div>• 6월 최저 15,365</div>
                    <div>• 8월 회복 24,077</div>
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 채널 트렌드</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    <div>• HK Retail: 최대 비중 유지</div>
                    <div>• HK Online: 고성장 (YOY 318%)</div>
                    <div>• MC Retail: 안정적 기여</div>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 전략 포인트</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    <div>• 온라인 채널 집중 육성</div>
                    <div>• 6월 비수기 대응 전략</div>
                    <div>• MC 시장 확대 기회</div>
                  </div>
                </div>
              </>
            ) : selectedChannel === 'HK Retail' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 HK Retail 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    <div>• 최대 비중 채널 (50~60%)</div>
                    <div>• 8월 최고 12,216K</div>
                    <div>• YOY 평균 90% 수준</div>
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 성과 분석</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    <div>• 1월 114% 강한 출발</div>
                    <div>• 2~6월 부진 (50~87%)</div>
                    <div>• 9월 회복세 (117%)</div>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 액션 아이템</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    <div>• 상반기 매출 회복 전략</div>
                    <div>• 주력 채널 강화 필요</div>
                    <div>• 9월 모멘텀 지속화</div>
                  </div>
                </div>
              </>
            ) : selectedChannel === 'HK Outlet' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 HK Outlet 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    <div>• 전체의 14~18% 비중</div>
                    <div>• 1월 최고 5,479K</div>
                    <div>• YOY 평균 80% 수준</div>
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 성과 분석</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    <div>• 1월 114% 양호</div>
                    <div>• 2월 급감 54%</div>
                    <div>• 7~8월 회복 (105~106%)</div>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 액션 아이템</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    <div>• 재고 소진 효율화</div>
                    <div>• 할인 전략 최적화</div>
                    <div>• 2~6월 부진 원인 분석</div>
                  </div>
                </div>
              </>
            ) : selectedChannel === 'HK Online' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 HK Online 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    <div>• 비중 작지만 고성장 (1~5%)</div>
                    <div>• 10월 최고 943K</div>
                    <div>• YOY 평균 140% 폭발 성장</div>
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 성과 분석</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    <div>• 8월 294% 급성장</div>
                    <div>• 9월 251% 지속</div>
                    <div>• 10월 318% 역대 최고</div>
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
            ) : selectedChannel === 'MC Retail' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 MC Retail 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    <div>• 전체의 19~28% 비중</div>
                    <div>• 1월 최고 7,631K</div>
                    <div>• YOY 평균 75% 부진</div>
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 성과 분석</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    <div>• 연중 100% 미달</div>
                    <div>• 2월 최저 51%</div>
                    <div>• 8월 유일 103% 달성</div>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 액션 아이템</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    <div>• 마카오 시장 회복 전략</div>
                    <div>• 현지 마케팅 강화</div>
                    <div>• 관광객 유치 방안</div>
                  </div>
                </div>
              </>
            ) : selectedChannel === 'MC Outlet' ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-blue-800 mb-1">📈 MC Outlet 인사이트</h4>
                  <div className="space-y-0.5 text-xs text-blue-700">
                    <div>• 최소 비중 채널 (2.6~4.5%)</div>
                    <div>• 1월 최고 1,365K</div>
                    <div>• YOY 평균 100% 수준</div>
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-purple-800 mb-1">🎯 성과 분석</h4>
                  <div className="space-y-0.5 text-xs text-purple-700">
                    <div>• 1월 183% 강세</div>
                    <div>• 상반기 안정적 (94~109%)</div>
                    <div>• 10월 63% 급감</div>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
                  <h4 className="text-xs font-bold text-green-800 mb-1">💡 액션 아이템</h4>
                  <div className="space-y-0.5 text-xs text-green-700">
                    <div>• 10월 급감 원인 파악</div>
                    <div>• 재고 운영 최적화</div>
                    <div>• 소규모 채널 효율성 제고</div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* 월별 아이템별 매출 추세 */}
        <div className="bg-white rounded-lg shadow-md p-4 relative" id="item-sales-chart">
          <DataStatusBadge status="connected" label="아이템별매출그래프" />
          <div className="flex items-center justify-between mb-4" style={{ height: '40px' }}>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
              2025년 아이템별 추세 (1K HKD)
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
          
          {/* 전문적인 세로 막대 차트 (좌측 그래프와 동일한 패딩) */}
          <div className="relative px-4 py-2">
          <div className="flex gap-2">
            {/* Y축 레이블과 눈금 */}
            <div className="flex flex-col justify-between h-64 text-[10px] text-gray-500 font-medium pr-2">
              <div className="text-right">50,000</div>
              <div className="text-right">33,333</div>
              <div className="text-right">16,667</div>
              <div className="text-right">0</div>
            </div>
            
            {/* 차트 영역 */}
            <div className="flex-1 relative h-64">
              {/* 격자선 (Horizontal Grid Lines) - 왼쪽 그래프와 동일 */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-0">
                <div className="border-t border-dashed border-gray-300"></div>
                <div className="border-t border-dashed border-gray-300"></div>
                <div className="border-t border-dashed border-gray-300"></div>
                <div className="border-t border-gray-400"></div>
              </div>
              
              {/* Recharts 차트 */}
              <div className="absolute inset-0 z-10">
                <ResponsiveContainer width="100%" height="100%">
                  {salesPriceType === '할인율' ? (
                    <LineChart data={discountRateData} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" hide={true} />
                      <YAxis hide={true} domain={[0, 70]} />
                      <Tooltip 
                        formatter={(value, name) => [`${value}%`, name]}
                        contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", padding: "8px", fontSize: "11px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Line type="monotone" dataKey="당시즌F" stroke="#34D399" strokeWidth={3} dot={{ r: 4 }} connectNulls name="당시즌F" />
                      <Line type="monotone" dataKey="당시즌S" stroke="#60A5FA" strokeWidth={3} dot={{ r: 4 }} connectNulls name="당시즌S" />
                      <Line type="monotone" dataKey="과시즌의류" stroke="#FCA5A5" strokeWidth={3} dot={{ r: 4 }} name="과시즌의류" />
                      <Line type="monotone" dataKey="모자" stroke="#93C5FD" strokeWidth={3} dot={{ r: 4 }} name="모자" />
                      <Line type="monotone" dataKey="신발" stroke="#FCD34D" strokeWidth={3} dot={{ r: 4 }} name="신발" />
                      <Line type="monotone" dataKey="가방외" stroke="#C4B5FD" strokeWidth={3} dot={{ r: 4 }} name="가방외" />
                    </LineChart>
                  ) : (
                    <BarChart data={salesPriceType === '실판' ? netSalesData : salesPriceType === '택가' ? grossSalesData : []} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap="1%">
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" hide={true} />
                      <YAxis 
                        hide={true} 
                        domain={[0, 50000]} 
                        ticks={[0, 16667, 33333, 50000]}
                        type="number"
                        scale="linear"
                        allowDecimals={false}
                      />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'total') return null;
                          return [`${value.toLocaleString()}K HKD`, name];
                        }}
                        contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", padding: "8px", fontSize: "11px" }}
                      />
                      <Bar dataKey="당시즌F" stackId="a" fill="#34D399" />
                      <Bar dataKey="당시즌S" stackId="a" fill="#60A5FA" />
                      <Bar dataKey="과시즌의류" stackId="a" fill="#FCA5A5" />
                      <Bar dataKey="모자" stackId="a" fill="#93C5FD" />
                      <Bar dataKey="신발" stackId="a" fill="#FCD34D" />
                      <Bar dataKey="가방외" stackId="a" fill="#C4B5FD" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          {/* X축 라벨 (월) - 좌측 그래프와 동일한 위치 */}
          <div className="flex gap-2 mt-2 ml-12">
            <div className="flex-1 flex justify-between text-[10px] text-gray-600 font-medium">
              {(salesPriceType === '실판' ? netSalesData : salesPriceType === '택가' ? grossSalesData : discountRateData).map((m: any, idx: number) => (
                <div key={idx} className="flex-1 text-center">{m.month}</div>
              ))}
            </div>
          </div>
          </div>
          
          {/* 범례 클릭 가능하게 만들기 */}
          <div className="mt-4">
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { name: '전체', color: '#FB923C' },
                { name: '당시즌F', color: '#34D399' },
                { name: '당시즌S', color: '#60A5FA' },
                { name: '과시즌의류', color: '#FCA5A5' },
                { name: '모자', color: '#93C5FD' },
                { name: '신발', color: '#FCD34D' },
                { name: '가방외', color: '#C4B5FD' }
              ].map(item => (
                <button
                  key={item.name}
                  onClick={() => setSelectedSalesItem(selectedSalesItem === item.name ? null : item.name)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${
                    selectedSalesItem === item.name
                      ? 'ring-2 ring-orange-600 scale-105'
                      : 'hover:scale-105'
                  }`}
                  style={{ 
                    backgroundColor: item.color,
                    color: '#1F2937'
                  }}
                >
                  {item.name}
                </button>
              ))}
            </div>
            
            {selectedSalesItem && (
              <div className="mt-4">
                {selectedSalesItem === '전체' ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={months.map((month, idx) => ({
                      month,
                      currSeasonF: idx < 6 ? (salesItemYOY as any)['당시즌S'][idx] : (salesItemYOY as any)['당시즌F'][idx], // 1~6월은 당시즌S YOY(24F)를 당시즌F로 표시
                      currSeasonS: (salesItemYOY as any)['당시즌S'][idx],
                      pastSeason: (salesItemYOY as any)['과시즌의류'][idx],
                      cap: (salesItemYOY as any)['모자'][idx],
                      shoes: (salesItemYOY as any)['신발'][idx],
                      bagEtc: (salesItemYOY as any)['가방외'][idx]
                    }))} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(value) => `${value}%`} />
                      <Tooltip 
                        formatter={(value, name) => value ? [`${value}%`, name] : ['N/A', name]}
                        contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", fontSize: "11px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Line type="monotone" dataKey="currSeasonF" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} connectNulls name="당시즌F" />
                      <Line type="monotone" dataKey="currSeasonS" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} connectNulls name="당시즌S" />
                      <Line type="monotone" dataKey="pastSeason" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} connectNulls name="과시즌의류" />
                      <Line type="monotone" dataKey="cap" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} connectNulls name="모자" />
                      <Line type="monotone" dataKey="shoes" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} connectNulls name="신발" />
                      <Line type="monotone" dataKey="bagEtc" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4 }} connectNulls name="가방외" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={months.map((month, idx) => ({
                      month,
                      yoy: selectedSalesItem === '당시즌F' && idx < 6
                        ? ((salesItemYOY as any)['당시즌S']?.[idx] ?? null) // 1~6월 당시즌F는 당시즌S YOY 표시
                        : ((salesItemYOY[selectedSalesItem as keyof typeof salesItemYOY] as any)?.[idx] ?? null)
                    }))} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(value) => `${value}%`} />
                      <Tooltip 
                        formatter={(value, name) => value ? [`${value}%`, name] : ['N/A', name]}
                        contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", fontSize: "11px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Line type="monotone" dataKey="yoy" stroke="#EA580C" strokeWidth={3} dot={{ r: 4 }} connectNulls name="YOY" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
                
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-2 py-1 text-left font-semibold">{selectedSalesItem === '전체' ? '아이템' : selectedSalesItem}</th>
                        {months.map(month => (
                          <th key={month} className="border border-gray-300 px-2 py-1 text-center font-semibold">{month}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSalesItem === '전체' ? (
                        <>
                          {['당시즌F', '당시즌S', '과시즌의류', '모자', '신발', '가방외'].map(item => (
                            <tr key={item}>
                              <td className="border border-gray-300 px-2 py-1 font-semibold bg-orange-50">{item}</td>
                              {(salesItemYOY as any)[item].map((yoy: number, idx: number) => {
                                // 1~6월 당시즌F는 당시즌S YOY를 표시
                                const displayYoy = (item === '당시즌F' && idx < 6) 
                                  ? (salesItemYOY as any)['당시즌S'][idx] 
                                  : yoy;
                                return (
                                  <td key={idx} className={`border border-gray-300 px-2 py-1 text-center font-bold ${displayYoy === null ? 'text-gray-400' : displayYoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                                    {displayYoy === null ? '-' : `${displayYoy}%`}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                          <tr className="bg-blue-100 font-bold border-t-2 border-blue-300">
                            <td className="border border-gray-300 px-2 py-1 text-blue-900">합계</td>
                            {(salesItemYOY as any)['합계'].map((yoy: number, idx: number) => (
                              <td key={idx} className={`border border-gray-300 px-2 py-1 text-center ${yoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                                {yoy}%
                              </td>
                            ))}
                          </tr>
                        </>
                      ) : (
                        <>
                          <tr>
                            <td className="border border-gray-300 px-2 py-1 font-semibold bg-orange-50">YOY</td>
                            {(salesItemYOY as any)[selectedSalesItem]?.map((yoy: number, idx: number) => {
                              // 당시즌F 선택 시 1~6월은 당시즌S YOY 표시
                              const displayYoy = (selectedSalesItem === '당시즌F' && idx < 6)
                                ? (salesItemYOY as any)['당시즌S'][idx]
                                : yoy;
                              return (
                                <td key={idx} className={`border border-gray-300 px-2 py-1 text-center font-bold ${displayYoy === null ? 'text-gray-400' : displayYoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                                  {displayYoy === null ? '-' : `${displayYoy}%`}
                                </td>
                              );
                            }) || []}
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="bg-red-50 border border-red-200 rounded-lg p-2">
              <h4 className="text-xs font-bold text-red-800 mb-1">🔥 시즌 트렌드</h4>
              <div className="space-y-0.5 text-xs text-red-700">
                <div>• 1~3월: 24FW 강세 (당시즌F)</div>
                <div>• 4~6월: 25SS 전환 (당시즌S)</div>
                <div>• 7~10월: 25FW 본격화, 10월 8,940K</div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
              <h4 className="text-xs font-bold text-blue-800 mb-1">👔 카테고리 분석</h4>
              <div className="space-y-0.5 text-xs text-blue-700">
                <div>• 신발: 1월 최대 10,448K, 10월 3,973K</div>
                <div>• 모자: 안정적 4,000K 수준 유지</div>
                <div>• 가방외: 1,200~2,300K 소폭 기여</div>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
              <h4 className="text-xs font-bold text-amber-800 mb-1">⚡ 핵심 액션</h4>
              <div className="space-y-0.5 text-xs text-amber-700">
                <div>• 과시즌의류 조기 소진 가속화</div>
                <div>• 신발 YOY 75% 회복 전략 시급</div>
                <div>• 25FW 판매 모멘텀 지속 강화</div>
              </div>
            </div>
          </div>
        </div>

        {/* 월별 아이템별 재고 추세 (이동됨) */}
        <div className="bg-white rounded-lg shadow-md p-4 relative" id="inventory-chart">
          <DataStatusBadge status="connected" label="아이템별재고그래프" />
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
            2025년 월별 아이템별 재고 추세 (TAG, 1K HKD)
          </h3>
          {/* 전문적인 세로 막대 차트 (다른 그래프와 동일한 패딩) */}
          <div className="relative px-4 py-2">
          <div className="flex gap-2">
            {/* Y축 레이블과 눈금 */}
            <div className="flex flex-col justify-between h-64 text-[10px] text-gray-500 font-medium pr-2">
              <div className="text-right">450,000</div>
              <div className="text-right">337,500</div>
              <div className="text-right">225,000</div>
              <div className="text-right">0</div>
            </div>
            
            {/* 차트 영역 */}
            <div className="flex-1 relative h-64">
              {/* 격자선 (Horizontal Grid Lines) */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-0">
                <div className="border-t border-dashed border-gray-300"></div>
                <div className="border-t border-dashed border-gray-300"></div>
                <div className="border-t border-dashed border-gray-300"></div>
                <div className="border-t border-gray-400"></div>
              </div>
              
              {/* Recharts 차트 */}
              <div className="absolute inset-0 z-10">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly_item_inventory && monthly_item_inventory.length > 0 ? monthly_item_inventory.map((m, idx) => ({
              month: m.month,
              'F당시즌': idx < 6 ? (m['S당시즌'] || 0) : (m['F당시즌'] || 0), // 1~6월은 S당시즌(24F)을 F당시즌으로 표시
              'S당시즌': m['S당시즌'] || 0, // S당시즌(25S)은 항상 원래 값 유지
              '과시즌FW': idx < 6 ? Math.max(0, (m['과시즌FW'] || 0) - (m['S당시즌'] || 0)) : (m['과시즌FW'] || 0), // 1~6월은 과시즌FW에서 24F(S당시즌) 제외
              '과시즌SS': m['과시즌SS'] || 0,
              '모자': m['모자'] || 0,
              '신발': m['신발'] || 0,
              '가방외': m['가방외'] || 0,
              total: m.total || 0
            })) : []} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap="1%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" hide={true} />
              <YAxis hide={true} domain={[0, 450000]} tickFormatter={(value) => value.toLocaleString()} />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'total') return null;
                  return [`${value.toLocaleString()}K HKD`, name];
                }}
                contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", padding: "8px", fontSize: "11px" }}
              />
              <Bar dataKey="F당시즌" stackId="a" fill="#FCA5A5" />
              <Bar dataKey="S당시즌" stackId="a" fill="#86EFAC" />
              <Bar dataKey="과시즌FW" stackId="a" fill="#D1D5DB" />
              <Bar dataKey="과시즌SS" stackId="a" fill="#E5E7EB" />
              <Bar dataKey="모자" stackId="a" fill="#93C5FD" />
              <Bar dataKey="신발" stackId="a" fill="#FCD34D" />
              <Bar dataKey="가방외" stackId="a" fill="#C4B5FD" />
            </BarChart>
          </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          {/* X축 라벨 (월) - 다른 그래프와 동일한 위치 */}
          <div className="flex gap-2 mt-2 ml-12">
            <div className="flex-1 flex justify-between text-[10px] text-gray-600 font-medium">
              {monthly_item_inventory && monthly_item_inventory.length > 0 ? monthly_item_inventory.map((m, idx) => (
                <div key={idx} className="flex-1 text-center">{m.month}</div>
              )) : []}
            </div>
          </div>
          </div>
          
          {/* 범례 클릭 가능하게 만들기 */}
          <div className="mt-4">
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { name: '전체', color: '#A855F7' },
                { name: 'F당시즌', color: '#FCA5A5' },
                { name: 'S당시즌', color: '#86EFAC' },
                { name: '과시즌FW', color: '#D1D5DB' },
                { name: '과시즌SS', color: '#E5E7EB' },
                { name: '모자', color: '#93C5FD' },
                { name: '신발', color: '#FCD34D' },
                { name: '가방외', color: '#C4B5FD' }
              ].map(item => (
                <button
                  key={item.name}
                  onClick={() => setSelectedInventoryItem(selectedInventoryItem === item.name ? null : item.name)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded transition-all ${
                    selectedInventoryItem === item.name
                      ? 'ring-2 ring-purple-600 scale-105'
                      : 'hover:scale-105'
                  }`}
                  style={{ 
                    backgroundColor: item.color,
                    color: '#1F2937'
                  }}
                >
                  {item.name}
                </button>
              ))}
            </div>
            
            {selectedInventoryItem && (
              <div className="mt-4 relative">
                <DataStatusBadge status="connected" label="아이템별재고YOY" />
                {selectedInventoryItem === '전체' ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={months.map((month, idx) => ({
                      month,
                      fSeason: idx < 6 ? inventoryItemYOY['S당시즌'][idx] : inventoryItemYOY['F당시즌'][idx], // 1~6월은 S당시즌 YOY(24F)를 F당시즌으로 표시
                      sSeason: inventoryItemYOY['S당시즌'][idx],
                      pastFW: inventoryItemYOY['과시즌FW'][idx],
                      pastSS: inventoryItemYOY['과시즌SS'][idx],
                      cap: inventoryItemYOY['모자'][idx],
                      shoes: inventoryItemYOY['신발'][idx],
                      bagEtc: inventoryItemYOY['가방외'][idx]
                    }))} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(value) => `${value}%`} />
                      <Tooltip 
                        formatter={(value, name) => value ? [`${value}%`, name] : ['N/A', name]}
                        contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", fontSize: "11px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Line type="monotone" dataKey="fSeason" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} connectNulls name="F당시즌" />
                      <Line type="monotone" dataKey="sSeason" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} connectNulls name="S당시즌" />
                      <Line type="monotone" dataKey="pastFW" stroke="#9CA3AF" strokeWidth={3} dot={{ r: 4 }} connectNulls name="과시즌FW" />
                      <Line type="monotone" dataKey="pastSS" stroke="#D1D5DB" strokeWidth={3} dot={{ r: 4 }} connectNulls name="과시즌SS" />
                      <Line type="monotone" dataKey="cap" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} connectNulls name="모자" />
                      <Line type="monotone" dataKey="shoes" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} connectNulls name="신발" />
                      <Line type="monotone" dataKey="bagEtc" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4 }} connectNulls name="가방외" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={months.map((month, idx) => ({
                      month,
                      yoy: (inventoryItemYOY as any)[selectedInventoryItem]?.[idx]
                    }))} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(value) => `${value}%`} />
                      <Tooltip 
                        formatter={(value, name) => value ? [`${value}%`, name] : ['N/A', name]}
                        contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", fontSize: "11px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Line type="monotone" dataKey="yoy" stroke="#9333EA" strokeWidth={3} dot={{ r: 4 }} connectNulls name="YOY" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
                
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-2 py-1 text-left font-semibold">{selectedInventoryItem === '전체' ? '아이템' : selectedInventoryItem}</th>
                        {months.map(month => (
                          <th key={month} className="border border-gray-300 px-2 py-1 text-center font-semibold">{month}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInventoryItem === '전체' ? (
                        <>
                          {['F당시즌', 'S당시즌', '과시즌FW', '과시즌SS', '모자', '신발', '가방외'].map(item => (
                            <tr key={item}>
                              <td className="border border-gray-300 px-2 py-1 font-semibold bg-purple-50">{item}</td>
                              {(inventoryItemYOY as any)[item].map((yoy: number, idx: number) => {
                                // 1~6월 F당시즌은 S당시즌 YOY를 표시
                                const displayYoy = (item === 'F당시즌' && idx < 6) 
                                  ? (inventoryItemYOY as any)['S당시즌'][idx] 
                                  : yoy;
                                return (
                                  <td key={idx} className={`border border-gray-300 px-2 py-1 text-center font-bold ${displayYoy === null ? 'text-gray-400' : displayYoy >= 100 ? 'text-red-600' : 'text-green-600'}`}>
                                    {displayYoy === null ? '-' : `${displayYoy}%`}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </>
                      ) : (
                        <tr>
                          <td className="border border-gray-300 px-2 py-1 font-semibold bg-purple-50">YOY</td>
                          {(inventoryItemYOY as any)[selectedInventoryItem].map((yoy: number, idx: number) => {
                            // F당시즌 선택 시 1~6월은 S당시즌 YOY 표시
                            const displayYoy = (selectedInventoryItem === 'F당시즌' && idx < 6)
                              ? (inventoryItemYOY as any)['S당시즌'][idx]
                              : yoy;
                            return (
                              <td key={idx} className={`border border-gray-300 px-2 py-1 text-center font-bold ${displayYoy === null ? 'text-gray-400' : displayYoy >= 100 ? 'text-red-600' : 'text-green-600'}`}>
                                {displayYoy === null ? '-' : `${displayYoy}%`}
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
          </div>
          
          {/* 인사이트 카드 이동 */}
          <div className="mt-3 grid grid-cols-3 gap-1">
            <div className="bg-red-50 border border-red-200 rounded-lg p-1.5">
              <h4 className="text-xs font-bold text-red-800 mb-1">🚨 Critical Alert</h4>
              <div className="space-y-0.5 text-xs text-red-700">
                <div>• 과시즌FW 재고 YOY 139% 급증</div>
                <div>• 과시즌SS 재고 YOY 122% 증가</div>
                <div>• 총재고 384,314K (전년비 △8.5%)</div>
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-1.5">
              <h4 className="text-xs font-bold text-orange-800 mb-1">⚠️ Risk Monitoring</h4>
              <div className="space-y-0.5 text-xs text-orange-700">
                <div>• 신발 재고주수 48.0주 (전년 51.7주)</div>
                <div>• 가방외 재고주수 40.8주 (전년 35.2주)</div>
                <div>• F당시즌 YOY 54% 정상화 중</div>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-1.5">
              <h4 className="text-xs font-bold text-green-800 mb-1">✅ Positive Sign</h4>
              <div className="space-y-0.5 text-xs text-green-700">
                <div>• 신발 재고 YOY 86% 개선</div>
                <div>• 가방외 재고 YOY 75% 개선</div>
                <div>• 9월 임시매장 운영으로 과시즌SS 대폭 소진</div>
              </div>
            </div>
          </div>
        </div>
      </div>




      <div className="mt-4 bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
            오프라인 매장별 현황 (실판V-, 25년 10월 기준)
          </h3>
          <a
            href="https://claude.ai/public/artifacts/3eebba20-bc08-41ff-a93f-1061e125c7ed?fullscreen=true"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center space-x-2"
          >
            <span>📊 YOY 추세</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
        
        <div className="grid grid-cols-5 gap-4 mb-6">
          {/* 전체 매장 요약 */}
          <div className="bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg shadow-md p-4 border-l-4 border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-200">오프라인 매장 요약</div>
            </div>
            
            <div className="text-2xl font-bold mb-2 text-white">20개 매장</div>
                            <div className="text-xs mb-2 text-gray-300">실판매출 YOY 95.2%*</div>
            <div className="text-[10px] text-gray-400 mb-3 italic">* 종료매장·온라인 제외, 전년동일매장기준</div>
            
            <div className="border-t pt-3 space-y-1.5 border-gray-600 mb-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-300">전체 직접이익</span>
                <span className="text-xs font-semibold text-red-300">-398K HKD</span>
              </div>
            </div>
            
            <div className="border-t pt-3 border-gray-600 mb-3">
              <div className="text-xs text-gray-300 mb-2 font-semibold">채널별 구분</div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center bg-gray-600 px-2 py-1 rounded">
                  <span className="text-xs text-gray-200">홍콩 리테일</span>
                  <span className="text-xs font-semibold text-gray-200">12개 | YOY 104% | -279K</span>
                </div>
                <div className="flex justify-between items-center bg-gray-600 px-2 py-1 rounded">
                  <span className="text-xs text-gray-200">홍콩 아울렛</span>
                  <span className="text-xs font-semibold text-green-300">4개 | YOY 90% | +22K</span>
                </div>
                <div className="flex justify-between items-center bg-gray-600 px-2 py-1 rounded">
                  <span className="text-xs text-gray-200">마카오</span>
                  <span className="text-xs font-semibold text-gray-200">4개 | YOY 76% | -141K</span>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-3 border-gray-600">
              <div className="text-xs text-gray-300 w-full space-y-1">
                <button
                  onClick={() => setShowProfitStores(!showProfitStores)}
                  className="flex justify-between gap-1 py-1 border-b-2 border-gray-500 font-semibold w-full hover:bg-gray-600 px-1 rounded transition-colors"
                >
                  <span className="w-20">흑자매장:</span>
                  <span className="w-16 text-right font-bold text-green-300">9개 {showProfitStores ? '▼' : '▶'}</span>
                </button>
                
                {showProfitStores && (
                  <div className="pl-3 space-y-0.5 text-[10px] bg-gray-800 rounded p-2 mt-1">
                    <div className="text-gray-400 font-semibold mb-1">홍콩 리테일 (5개)</div>
                    <div className="flex justify-between pl-2">
                      <span>LANGHAM</span>
                      <span className="text-green-300">+279K</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>APM</span>
                      <span className="text-green-300">+258K</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>I Square</span>
                      <span className="text-green-300">+130K</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>TMT</span>
                      <span className="text-green-300">+111K</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>NTP</span>
                      <span className="text-green-300">+45K</span>
                    </div>
                    
                    <div className="text-gray-400 font-semibold mb-1 mt-2">홍콩 아울렛 (1개)</div>
                    <div className="flex justify-between pl-2">
                      <span>City Gate</span>
                      <span className="text-green-300">+69K</span>
                    </div>
                    
                    <div className="text-gray-400 font-semibold mb-1 mt-2">마카오 (3개)</div>
                    <div className="flex justify-between pl-2">
                      <span>Venetian</span>
                      <span className="text-green-300">+617K</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>Senado</span>
                      <span className="text-green-300">+48K</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>Londoner</span>
                      <span className="text-green-300">+11K</span>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={() => setShowLossStores(!showLossStores)}
                  className="flex justify-between gap-1 py-0.5 w-full hover:bg-gray-600 px-1 rounded transition-colors"
                >
                  <span className="w-20">적자매장:</span>
                  <span className="w-16 text-right font-semibold text-red-300">11개 {showLossStores ? '▼' : '▶'}</span>
                </button>
                
                {showLossStores && (
                  <div className="pl-3 space-y-0.5 text-[10px] bg-gray-800 rounded p-2 mt-1">
                    <div className="text-gray-400 font-semibold mb-1">홍콩 리테일 (7개)</div>
                    <div className="flex justify-between pl-2">
                      <span>LCX</span>
                      <span className="text-red-300">-219K</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>Yoho</span>
                      <span className="text-red-300">-210K</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>Time Square</span>
                      <span className="text-red-300">-174K</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>NTP 3</span>
                      <span className="text-red-300">-167K</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>Hysan</span>
                      <span className="text-red-300">-106K</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>Mongkok</span>
                      <span className="text-red-300">-45K</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>Shangshui</span>
                      <span className="text-red-300">-3K</span>
                    </div>
                    
                    <div className="text-gray-400 font-semibold mb-1 mt-2">홍콩 아울렛 (3개)</div>
                    <div className="flex justify-between pl-2">
                      <span>Megamall</span>
                      <span className="text-red-300">-68K</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>Moko</span>
                      <span className="text-red-300">-28K</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span>Yuenlong</span>
                      <span className="text-red-300">-19K</span>
                    </div>
                    
                    <div className="text-gray-400 font-semibold mb-1 mt-2">마카오 (1개)</div>
                    <div className="flex justify-between pl-2">
                      <span>Senado 아울렛</span>
                      <span className="text-red-300">-123K</span>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between gap-1 py-0.5 mt-2">
                  <span className="w-20">최고YOY:</span>
                  <span className="w-16 text-right font-semibold text-green-300">Yoho 152%</span>
                </div>
                <div className="flex justify-between gap-1 py-0.5 mt-2">
                  <span className="w-20">최저YOY:</span>
                  <span className="w-16 text-right font-semibold text-red-300">Senado OL 63%</span>
                </div>
              </div>
            </div>
          </div>

          {/* TOP 성과 매장 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">TOP 성과 매장</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700">
                흑자+성장률
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-green-800">TMT</span>
                  <span className="text-lg font-bold text-green-700">132%</span>
                </div>
                <div className="text-xs text-green-600">
                  직접이익: +111K HKD | 연간 106%
                </div>
                <div className="text-xs text-gray-600 mt-1 italic">
                  흑자 매장 중 최고 성장률
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-green-800">LANGHAM</span>
                  <span className="text-lg font-bold text-green-700">118%</span>
                </div>
                <div className="text-xs text-green-600">
                  직접이익: +279K HKD | 연간 107%
                </div>
                <div className="text-xs text-gray-600 mt-1 italic">
                  최대 흑자 + 안정 성장
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-green-800">APM</span>
                  <span className="text-lg font-bold text-green-700">109%</span>
                </div>
                <div className="text-xs text-green-600">
                  직접이익: +258K HKD | 연간 96%
                </div>
                <div className="text-xs text-gray-600 mt-1 italic">
                  2위 흑자 + 고성장
                </div>
              </div>
            </div>
          </div>

          {/* 직접이익 우수 매장 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">직접이익 우수</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-700">
                10월 직접이익
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-blue-800">LANGHAM</span>
                  <span className="text-lg font-bold text-blue-700">+279K</span>
                </div>
                <div className="text-xs text-blue-600">
                  10월 YOY: 118% | 연간 107%
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-blue-800">APM</span>
                  <span className="text-lg font-bold text-blue-700">+258K</span>
                </div>
                <div className="text-xs text-blue-600">
                  10월 YOY: 109% | 연간 96%
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-blue-800">I Square</span>
                  <span className="text-lg font-bold text-blue-700">+130K</span>
                </div>
                <div className="text-xs text-blue-600">
                  10월 YOY: 101% | 연간 98%
                </div>
              </div>
            </div>
          </div>

          {/* 관리 필요 매장 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">관리 필요 매장</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-orange-100 text-orange-700">
                적자 or 저성과
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="bg-orange-50 rounded-lg p-2 border border-orange-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-orange-800">Yoho</span>
                  <span className="text-lg font-bold text-red-700">-210K</span>
                </div>
                <div className="text-xs text-orange-600">
                  10월 YOY: 152% | 연간 105%
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  고성장 중이나 수익성 개선 필요
                </div>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-2 border border-orange-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-orange-800">Time Square</span>
                  <span className="text-lg font-bold text-red-700">-174K</span>
                </div>
                <div className="text-xs text-orange-600">
                  10월 YOY: 87% | 연간 81%
                </div>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-2 border border-orange-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-orange-800">NTP 3</span>
                  <span className="text-lg font-bold text-red-700">-167K</span>
                </div>
                <div className="text-xs text-orange-600">
                  10월 YOY: 146% | 연간 102%
                </div>
                <div className="text-xs text-gray-600 mt-1 italic">
                  현시즌 외 과재고 판매로 개선 중
                </div>
              </div>
            </div>
          </div>

          {/* 마카오 매장 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">마카오 매장</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-red-100 text-red-700">
                특별 관리
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="bg-red-50 rounded-lg p-2 border border-red-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-red-800">Senado 아울렛</span>
                  <span className="text-lg font-bold text-red-700">63%</span>
                </div>
                <div className="text-xs text-red-600">
                  10월: 63% | 직접이익: -123K HKD
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  연간 106% 성장에도 불구 당월 급감
                </div>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-2 border border-orange-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-orange-800">Venetian</span>
                  <span className="text-lg font-bold text-orange-700">82%</span>
                </div>
                <div className="text-xs text-orange-600">
                  10월: 82% | 직접이익: +617K HKD
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  최대 흑자이나 YOY 82% 부진
                </div>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-2 border border-orange-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-orange-800">Londoner</span>
                  <span className="text-lg font-bold text-orange-700">86%</span>
                </div>
                <div className="text-xs text-orange-600">
                  10월: 86% | 직접이익: +11K HKD
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  미미한 흑자, 연간 79% 저성장
                </div>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-red-200">
              <div className="text-xs text-red-700">
                <div className="font-semibold mb-1">🎯 마카오 개선 전략</div>
                <div className="text-red-600">IN-store VMD 직원 발탁 및 컬러 프린트 현지 구비로 프로모션 대응 속도 개선</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 매장 운영 전략 & 액션 플랜 */}
      <div className="mt-4 bg-white rounded-lg shadow-md p-4">
        <button
          onClick={() => setShowStoreTable(!showStoreTable)}
          className="w-full flex items-center justify-between hover:bg-gray-50 rounded-lg p-2 transition-colors"
        >
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
            🎯 매장 운영 전략 & 액션 플랜
          </h3>
          {showStoreTable ? (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-600" />
          )}
        </button>
        
        {showStoreTable && (
          <div className="mt-4 grid grid-cols-4 gap-4">
            {/* 전사 프로모션 */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border-l-4 border-blue-500">
              <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center">
                <span className="text-lg mr-2">🎯</span>
                전사 프로모션
              </h4>
              <div className="space-y-2 text-xs text-gray-700">
                <div className="bg-white rounded p-2 border border-blue-200">
                  <div className="font-semibold text-blue-800 mb-1">GWP 증정</div>
                  <div>HKD 2,000 이상 구매 시 도시락 GWP 제공</div>
                  <div className="text-blue-600 mt-1">→ ATV 증대 효과 확인됨</div>
                </div>
                <div className="bg-white rounded p-2 border border-blue-200">
                  <div className="font-semibold text-blue-800 mb-1">ATV 증대 프로모션</div>
                  <div>HKD 4,000 이상 구매 시 15% 할인</div>
                </div>
                <div className="bg-white rounded p-2 border border-blue-200">
                  <div className="font-semibold text-blue-800 mb-1">Karina 포스터 증정</div>
                  <div>11/13부터 HKD 600 이상 구매 고객 대상</div>
                </div>
                <div className="bg-white rounded p-2 border border-blue-200">
                  <div className="font-semibold text-blue-800 mb-1">다운 제품 집중 홍보</div>
                  <div>Karina Curve Down 중심 VMD 전환</div>
                </div>
              </div>
            </div>

            {/* 핫 아이템 & CRM */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border-l-4 border-green-500">
              <h4 className="text-sm font-bold text-green-900 mb-3 flex items-center">
                <span className="text-lg mr-2">🔥</span>
                핫 아이템 & CRM
              </h4>
              <div className="space-y-2 text-xs text-gray-700">
                <div className="bg-white rounded p-2 border border-green-200">
                  <div className="font-semibold text-green-800 mb-1">미야오 비니 판매 호조</div>
                  <div>비니 매출 비중 YoY 2% → 6%</div>
                  <div className="text-green-600 mt-1">• 리오더 진행 (12월 중순 입고)</div>
                  <div className="text-green-600">• 차기 SKU 런칭 조율 중</div>
                </div>
                <div className="bg-white rounded p-2 border border-green-200">
                  <div className="font-semibold text-green-800 mb-1">중국 관광객 대응</div>
                  <div>• VIP 고객 관리 강화 (핸드폰/번호 구비)</div>
                  <div>• 중국과 차별화된 제품 라인</div>
                  <div>• Red Book 운영으로 홍콩/마카오 유입</div>
                </div>
              </div>
            </div>

            {/* 교육 & 이벤트 */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border-l-4 border-purple-500">
              <h4 className="text-sm font-bold text-purple-900 mb-3 flex items-center">
                <span className="text-lg mr-2">📚</span>
                교육 & 이벤트
              </h4>
              <div className="space-y-2 text-xs text-gray-700">
                <div className="bg-white rounded p-2 border border-purple-200">
                  <div className="font-semibold text-purple-800 mb-1">제품 교육</div>
                  <div>• 일정: 11월 12일</div>
                  <div>• 대상: 매장 SIC 및 Operation 팀</div>
                </div>
                <div className="bg-white rounded p-2 border border-purple-200">
                  <div className="font-semibold text-purple-800 mb-1">DIY 이벤트</div>
                  <div>• 가방 DIY</div>
                  <div>• 11월 말 4개 매장 선 실행</div>
                </div>
              </div>
            </div>

            {/* 매장별 주요 액션 */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 border-l-4 border-orange-500">
              <h4 className="text-sm font-bold text-orange-900 mb-3 flex items-center">
                <span className="text-lg mr-2">🏬</span>
                매장별 주요 액션
              </h4>
              <div className="space-y-2 text-xs text-gray-700">
                <div className="bg-white rounded p-2 border border-orange-200">
                  <div className="font-semibold text-orange-800">Mong Kok Hollywood</div>
                  <div>신발 판매 비중 확대, Fullset 구성</div>
                </div>
                <div className="bg-white rounded p-2 border border-orange-200">
                  <div className="font-semibold text-orange-800">NTP Kids</div>
                  <div>과재고 판매, YoY 200% 기대</div>
                </div>
                <div className="bg-white rounded p-2 border border-orange-200">
                  <div className="font-semibold text-orange-800">NTP</div>
                  <div>문제 SIC 퇴출 → 매출 안정화</div>
                </div>
                <div className="bg-white rounded p-2 border border-orange-200">
                  <div className="font-semibold text-orange-800">Online</div>
                  <div>11.11 이벤트, 자사몰 500% 신장 예상</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 점당매출 계산근거 모달 */}
      {showStoreCalcModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowStoreCalcModal(false)}>
          <div className="bg-white rounded-lg shadow-2xl p-3 max-w-md w-full mx-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900">📊 점당매출 계산근거</h3>
              <button
                onClick={() => setShowStoreCalcModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
            
            {/* 2025/2024 토글 버튼 */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setCalcYearView('2025')}
                className={`flex-1 px-3 py-2 text-sm font-semibold rounded transition-colors ${
                  calcYearView === '2025'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                2025년 10월 (당월)
              </button>
              <button
                onClick={() => setCalcYearView('2024')}
                className={`flex-1 px-3 py-2 text-sm font-semibold rounded transition-colors ${
                  calcYearView === '2024'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                2024년 10월 (전년)
              </button>
            </div>
            
            <div className="space-y-3">
              {calcYearView === '2025' ? (
                <>
                  {/* 2025년 10월 계산 */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border-l-4 border-green-500">
                <h4 className="text-sm font-bold text-green-900 mb-2">2025년 10월 (당월)</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center bg-white p-1.5 rounded">
                    <span className="text-gray-700">총 매출</span>
                    <span className="font-bold text-gray-900">20,077K</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-1.5 rounded">
                    <span className="text-gray-700">온라인 제외</span>
                    <span className="font-bold text-red-600">- 936K</span>
                  </div>
                  <div className="flex justify-between items-center bg-green-100 p-1.5 rounded border border-green-400">
                    <span className="text-green-800 font-semibold">오프라인 매출 (A)</span>
                    <span className="font-bold text-green-900">19,141K</span>
                  </div>
                  
                  {/* 제외 매장 상세 - 토글 */}
                  <div className="bg-orange-50 border border-orange-200 rounded p-2 mt-2">
                    <button
                      onClick={() => setShowStoreListInModal(!showStoreListInModal)}
                      className="w-full flex justify-between items-center text-xs font-semibold text-orange-800 hover:bg-orange-100 p-1 rounded transition-colors"
                    >
                      <span>🔍 제외 매장 (비정상 운영)</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-red-700">- 449K</span>
                        {showStoreListInModal ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </div>
                    </button>
                    {showStoreListInModal && (
                      <div className="space-y-0.5 text-xs text-orange-700 mt-2 pt-2 border-t border-orange-300">
                        <div className="flex justify-between">
                          <span>• LCX (리뉴얼)</span>
                          <span className="font-semibold">- 435K</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• WTC (종료)</span>
                          <span className="font-semibold">- 14K</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center bg-blue-100 p-1.5 rounded border border-blue-400">
                    <span className="text-blue-800 font-semibold">순수 매출 (B = A - 449K)</span>
                    <span className="font-bold text-blue-900">18,692K</span>
                  </div>
                  
                  {/* 정상운영 매장 - 토글 */}
                  <div className="bg-white p-1.5 rounded border border-gray-300">
                    <button
                      onClick={() => setShowStoreListInModal2024(!showStoreListInModal2024)}
                      className="w-full flex justify-between items-center text-xs hover:bg-gray-50 p-1 rounded transition-colors"
                    >
                      <span className="text-gray-700">정상운영 매장 수</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">÷ 18개</span>
                        {showStoreListInModal2024 ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </div>
                    </button>
                    {showStoreListInModal2024 && (
                      <div className="bg-gray-50 p-2 rounded text-xs space-y-1 mt-2 pt-2 border-t border-gray-200">
                        <div className="font-semibold text-gray-700 mb-1">HK Retail (11개)</div>
                        <div className="grid grid-cols-2 gap-1 pl-2 text-gray-600">
                          <div>• LANGHAM</div>
                          <div>• APM</div>
                          <div>• I Square</div>
                          <div>• TMT</div>
                          <div>• NTP</div>
                          <div>• Yoho</div>
                          <div>• Time Square</div>
                          <div>• NTP3 Kids</div>
                          <div>• Hysan</div>
                          <div>• Mongkok</div>
                          <div>• Shangshui</div>
                        </div>
                        <div className="font-semibold text-gray-700 mt-2 mb-1">HK Outlet (4개)</div>
                        <div className="grid grid-cols-2 gap-1 pl-2 text-gray-600">
                          <div>• City Gate</div>
                          <div>• Megamall</div>
                          <div>• Moko</div>
                          <div>• Yuenlong</div>
                        </div>
                        <div className="font-semibold text-gray-700 mt-2 mb-1">MC Retail (3개)</div>
                        <div className="grid grid-cols-2 gap-1 pl-2 text-gray-600">
                          <div>• Venetian</div>
                          <div>• Senado</div>
                          <div>• Londoner</div>
                        </div>
                        <div className="font-semibold text-gray-700 mt-2 mb-1">MC Outlet (1개)</div>
                        <div className="pl-2 text-gray-600">
                          <div>• Senado 아울렛</div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-300 text-red-600 font-semibold">
                          제외 매장 (점당매출 계산 제외):
                        </div>
                        <div className="pl-2 text-red-600 text-xs">
                          <div className="font-semibold mb-1">매출 있음 (매출·매장수 모두 제외):</div>
                          <div>• LCX: 435K (리뉴얼, 비정상 운영)</div>
                          <div>• WTC: 14K (10/11 종료, 불완전 월)</div>
                          <div className="font-semibold mt-2 mb-1">이미 종료 (매출 0):</div>
                          <div>• V City: 0K</div>
                          <div>• OT KIDS: 0K</div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center bg-gradient-to-r from-green-200 to-emerald-200 p-2 rounded border-2 border-green-600">
                    <span className="text-green-900 font-bold">점당 매출 (B ÷ 18개)</span>
                    <span className="font-bold text-green-900 text-lg">1,038K</span>
                  </div>
                </div>
              </div>
                </>
              ) : (
                <>
                  {/* 2024년 10월 계산 */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border-l-4 border-blue-500">
                <h4 className="text-sm font-bold text-blue-900 mb-2">2024년 10월 (전년)</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center bg-white p-1.5 rounded">
                    <span className="text-gray-700">총 매출</span>
                    <span className="font-bold text-gray-900">21,629K</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-1.5 rounded">
                    <span className="text-gray-700">온라인 제외</span>
                    <span className="font-bold text-red-600">- 289K</span>
                  </div>
                  <div className="flex justify-between items-center bg-blue-100 p-1.5 rounded border border-blue-400">
                    <span className="text-blue-800 font-semibold">오프라인 매출</span>
                    <span className="font-bold text-blue-900">21,340K</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-1.5 rounded">
                    <span className="text-gray-700">매장 수</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">÷ 23개</span>
                      <button
                        onClick={() => setShowStoreListInModal2024(!showStoreListInModal2024)}
                        className="text-blue-600 hover:text-blue-800 text-xs underline"
                      >
                        {showStoreListInModal2024 ? '숨기기' : '매장보기'}
                      </button>
                    </div>
                  </div>
                  {showStoreListInModal2024 && (
                    <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
                      <div className="font-semibold text-gray-700 mb-1">HK Retail (15개)</div>
                      <div className="grid grid-cols-2 gap-1 pl-2 text-gray-600">
                        <div>• LANGHAM</div>
                        <div>• APM</div>
                        <div>• I Square</div>
                        <div>• TMT</div>
                        <div>• NTP</div>
                        <div>• Yoho</div>
                        <div>• Time Square</div>
                        <div>• NTP3 Kids</div>
                        <div>• Hysan</div>
                        <div>• Mongkok</div>
                        <div>• Shangshui</div>
                        <div>• LCX</div>
                        <div>• V City</div>
                        <div>• WTC</div>
                        <div>• OT KIDS</div>
                      </div>
                      <div className="font-semibold text-gray-700 mt-2 mb-1">HK Outlet (4개)</div>
                      <div className="grid grid-cols-2 gap-1 pl-2 text-gray-600">
                        <div>• City Gate</div>
                        <div>• Megamall</div>
                        <div>• Moko</div>
                        <div>• Yuenlong</div>
                      </div>
                      <div className="font-semibold text-gray-700 mt-2 mb-1">MC Retail (3개)</div>
                      <div className="grid grid-cols-2 gap-1 pl-2 text-gray-600">
                        <div>• Venetian</div>
                        <div>• Senado</div>
                        <div>• Londoner</div>
                      </div>
                      <div className="font-semibold text-gray-700 mt-2 mb-1">MC Outlet (1개)</div>
                      <div className="pl-2 text-gray-600">
                        <div>• Senado 아울렛</div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-300 text-blue-600 font-semibold">
                        총 23개 매장
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center bg-gradient-to-r from-blue-200 to-indigo-200 p-2 rounded border-2 border-blue-600">
                    <span className="text-blue-900 font-bold">점당 매출</span>
                    <span className="font-bold text-blue-900 text-lg">928K</span>
                  </div>
                </div>
              </div>
                </>
              )}

              {/* YOY 계산 - 항상 표시 */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border-l-4 border-purple-500">
                <h4 className="text-sm font-bold text-purple-900 mb-2">YOY 비교</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center bg-white p-1.5 rounded">
                    <span className="text-gray-700">당월 점당매출</span>
                    <span className="font-bold text-green-600">1,038K</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-1.5 rounded">
                    <span className="text-gray-700">전년 점당매출</span>
                    <span className="font-bold text-blue-600">928K</span>
                  </div>
                  <div className="flex justify-between items-center bg-gradient-to-r from-purple-200 to-pink-200 p-2 rounded border-2 border-purple-600">
                    <span className="text-purple-900 font-bold">YOY (1,038 ÷ 928)</span>
                    <span className="font-bold text-purple-900 text-lg">112% ✅</span>
                  </div>
                </div>
              </div>

              {/* 참고사항 */}
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 rounded">
                <p className="text-xs text-yellow-800">
                  <strong>📌 참고:</strong> 온라인 제외. LCX·WTC는 비정상 운영으로 점당매출 계산 제외. NTP3는 과재고 특별 매장으로 제외 (전년에는 NTP Kids로 표기). 정상 운영 18개 매장만 계산.
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowStoreCalcModal(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-semibold transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 직접비 & 유통수수료 요약 섹션 */}
      <div className="mt-4 bg-white rounded-lg shadow-md p-4" id="expense-detail-section">
        <div className="flex items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
            직접비 요약 (1K HKD)
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
                <div className="text-2xl font-bold mb-2 text-indigo-900">11,686K</div>
                <div className="text-xs mb-3 text-red-600">YOY 97% (▼ 391K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-indigo-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-indigo-700">매출대비율</span>
                    <span className="text-xs font-semibold text-indigo-900">58.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-indigo-700">전년비</span>
                    <span className="text-xs font-semibold text-red-600">+2.4%p</span>
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
                <div className="text-2xl font-bold mb-2 text-gray-800">2,275K</div>
                <div className="text-xs mb-3 text-green-600">YOY 106% (▲ 134K)</div>
                
                <div className="border-t pt-3 space-y-1 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 w-24">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800 text-right">11.9%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 w-24">전년비</span>
                    <span className="text-xs font-semibold text-red-600 text-right">+1.9%p</span>
                  </div>
                </div>
                
                {/* 당월 증감내용 토글 */}
                <div className="border-t pt-3 mt-3">
                  <button 
                    onClick={() => setShowAccExpenseDetail(!showAccExpenseDetail)}
                    className="text-xs text-cyan-600 hover:text-cyan-800 font-semibold flex items-center w-full justify-between"
                  >
                    <span>당월 증감 분석</span>
                    {showAccExpenseDetail ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {showAccExpenseDetail && (
                  <div className="mt-3 pt-3 border-t bg-cyan-50 rounded p-2">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-start">
                        <span className="text-cyan-600 mr-1">•</span>
                        <span className="text-gray-700">인건비 전년비 106%, 매출액 대비 인건비율 전년대비 +1.9%p 증가</span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-cyan-600 mr-1">•</span>
                        <span className="text-gray-700">인원수 111%, 인당 인건비 96%</span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-cyan-600 mr-1">•</span>
                        <span className="text-gray-700">전년 동매장기준 실판 YOY 98%, 판매 인센티브 +209K 👉 매장인원 턴오버 감소를 위한 매출타겟 조정</span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-cyan-600 mr-1">•</span>
                        <span className="text-gray-700">매장 당 인원수 5.4명(전년 4.7명 → 인원수 증가사유 확인)</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">21,390K</div>
                <div className="text-xs mb-3 text-green-600">YOY 100% (▲ 36K)</div>
                
                <div className="border-t pt-3 space-y-1 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 w-24">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800 text-right">10.8%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 w-24">전년비</span>
                    <span className="text-xs font-semibold text-red-600 text-right">+1.6%p</span>
                  </div>
                </div>
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
                <div className="text-2xl font-bold mb-2 text-gray-800">5,844K</div>
                <div className="text-xs mb-3 text-blue-600">YOY 96% (▼ 257K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">30.5%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전년비</span>
                    <span className="text-xs font-semibold text-red-600">+1.9%p</span>
                  </div>
                </div>
                
                {/* 당월 증감분석 토글 */}
                <div className="border-t pt-3 mt-3">
                  <button 
                    onClick={() => setShowDiscountDetail(!showDiscountDetail)}
                    className="text-xs text-teal-600 hover:text-teal-800 font-semibold flex items-center w-full justify-between"
                  >
                    <span>당월 증감 분석</span>
                    {showDiscountDetail ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {showDiscountDetail && (
                  <div className="mt-3 pt-3 border-t bg-teal-50 rounded p-2">
                    <div className="text-xs font-semibold text-teal-800 mb-2">임차료 할인효과</div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-700">• LCX</span>
                        <span className="font-semibold text-blue-600">-80K</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">• Yuenlong</span>
                        <span className="font-semibold text-blue-600">-12K</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">• Megamall</span>
                        <span className="font-semibold text-blue-600">-20K</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-1 mt-1 border-teal-200">
                        <span className="text-gray-700">• 종료매장</span>
                        <span className="text-blue-600">-145K</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-teal-200 text-xs text-teal-800 font-semibold">
                      → 총 할인효과: -257K
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">59,221K</div>
                <div className="text-xs mb-3 text-blue-600">YOY 96% (▼ 2,739K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">29.9%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전년비</span>
                    <span className="text-xs font-semibold text-red-600">+3.1%p</span>
                  </div>
                </div>
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
                <div className="text-2xl font-bold mb-2 text-gray-800">1,105K</div>
                <div className="text-xs mb-3 text-blue-600">YOY 78% (▼ 305K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">4.5%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전년비</span>
                    <span className="text-xs font-semibold text-blue-600">△0.8%p</span>
                  </div>
                </div>
                
                {/* 당월 증감내역 토글 */}
                <div className="border-t pt-3 mt-3">
                  <button 
                    onClick={() => setShowItemDiscountDetail(!showItemDiscountDetail)}
                    className="text-xs text-amber-600 hover:text-amber-800 font-semibold flex items-center w-full justify-between"
                  >
                    <span>당월 증감 분석</span>
                    {showItemDiscountDetail ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {showItemDiscountDetail && (
                  <div className="mt-3 pt-3 border-t bg-amber-50 rounded p-2">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-start">
                        <span className="text-amber-600 mr-1">•</span>
                        <span className="text-gray-700"><span className="font-semibold">Storage</span>: 1,135K → 862K (<span className="text-blue-600 font-semibold">△273K, 76%</span>) - 보관 CBM 76%</span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-amber-600 mr-1">•</span>
                        <span className="text-gray-700"><span className="font-semibold">Handling</span>: 291K → 149K (<span className="text-blue-600 font-semibold">△142K, 51%</span>)</span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-amber-600 mr-1">•</span>
                        <span className="text-gray-700"><span className="font-semibold">Delivery</span>: 116K → 94K (<span className="text-blue-600 font-semibold">△22K, 81%</span>)</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-amber-200 text-xs text-amber-800 font-semibold">
                      → 총 절감 305K (재고소진 및 신발재고 YOY 86%로, 보관비 감소 효과)
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">12,035K</div>
                <div className="text-xs mb-3 text-blue-600">YOY 88% (▼ 1,596K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">4.7%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전년비</span>
                    <span className="text-xs font-semibold text-blue-600">△0.1%p</span>
                  </div>
                </div>
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
                <div className="text-2xl font-bold mb-2 text-gray-800">2,462K</div>
                <div className="text-xs mb-3 text-blue-600">YOY 101% (▲ 37K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매장관리비</span>
                    <span className="text-xs font-semibold text-gray-800">1,081K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">감가상각비</span>
                    <span className="text-xs font-semibold text-gray-800">708K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">지급수수료</span>
                    <span className="text-xs font-semibold text-gray-800">385K</span>
                  </div>
                </div>
                
                {/* 당월 증감내역 토글 */}
                <div className="border-t pt-3 mt-3">
                  <button 
                    onClick={() => setShowMuDetail(!showMuDetail)}
                    className="text-xs text-purple-600 hover:text-purple-800 font-semibold flex items-center w-full justify-between"
                  >
                    <span>당월 증감 분석</span>
                    {showMuDetail ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {showMuDetail && (
                  <div className="mt-3 pt-3 border-t bg-purple-50 rounded p-2">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-700">• 매장관리비</span>
                        <span className="font-semibold text-red-600">+81K (108%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">• 감가상각비</span>
                        <span className="font-semibold text-blue-600">△204K (78%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">• 지급수수료</span>
                        <span className="font-semibold text-red-600">+82K (127%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">• 광고비</span>
                        <span className="font-semibold text-red-600">+44K (283%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">• 기타</span>
                        <span className="font-semibold text-red-600">+34K (118%)</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-purple-200 text-xs text-purple-800 font-semibold">
                      → 순증가 +37K (감가상각비 감소 -204K, 타 항목 증가 +241K)
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">23,034K</div>
                <div className="text-xs mb-3 text-blue-600">YOY 95% (▼ 1,163K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매장관리비</span>
                    <span className="text-xs font-semibold text-gray-800">9,867K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">감가상각비</span>
                    <span className="text-xs font-semibold text-gray-800">7,036K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">지급수수료</span>
                    <span className="text-xs font-semibold text-gray-800">3,210K</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 영업비 요약 섹션 */}
      <div className="mt-4 bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
            영업비 요약 (1K HKD)
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
                <div className="text-2xl font-bold mb-2 text-emerald-900">1,451K</div>
                <div className="text-xs mb-3 text-red-600">YOY 130% (+333K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-emerald-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">매출 대비 비율</span>
                    <span className="text-xs font-semibold text-emerald-900">7.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">전년 비율</span>
                    <span className="text-xs font-semibold text-emerald-900">5.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">효율성 악화</span>
                    <span className="text-xs font-semibold text-red-600">▲ 2.0%p</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-emerald-900">13,385K</div>
                <div className="text-xs mb-3 text-red-600">YOY 103% (+403K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-emerald-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">매출 대비 비율</span>
                    <span className="text-xs font-semibold text-emerald-900">6.6%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">전년 비율</span>
                    <span className="text-xs font-semibold text-emerald-900">5.5%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700">효율성 악화</span>
                    <span className="text-xs font-semibold text-red-600">▲ 1.1%p</span>
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
                <div className="text-2xl font-bold mb-2 text-gray-800">605K</div>
                <div className="text-xs mb-3 text-red-600">YOY 137% (+164K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">41.7%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">3.0%</span>
                  </div>
                </div>
                
                {/* 당월 증감분석 토글 */}
                <div className="border-t pt-3 mt-3">
                  <button 
                    onClick={() => setShowSeasonSalesDetail(!showSeasonSalesDetail)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center w-full justify-between"
                  >
                    <span>당월 증감 분석</span>
                    {showSeasonSalesDetail ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {showSeasonSalesDetail && (
                  <div className="mt-3 pt-3 border-t bg-blue-50 rounded p-2">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-start">
                        <span className="text-blue-600 mr-1">•</span>
                        <span className="text-gray-700">HK Office 급여 +164K (YOY 137%), 인원수 +5명 (145%), 인당인건비 97%</span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-blue-600 mr-1">•</span>
                        <span className="text-gray-700">신규 채용: MD+1, VM+1, Logi+1, Ecom+1, Retail+1</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">5,232K</div>
                <div className="text-xs mb-3 text-red-600">YOY 114% (+626K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">39.1%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">2.6%</span>
                  </div>
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
                <div className="text-2xl font-bold mb-2 text-gray-800">417K</div>
                <div className="text-xs mb-3 text-red-600">YOY 136% (+111K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">28.7%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">2.1%</span>
                  </div>
                </div>
                
                {/* 당월 증감분석 토글 */}
                <div className="border-t pt-3 mt-3">
                  <button 
                    onClick={() => setShowCurrentSeasonDetail(!showCurrentSeasonDetail)}
                    className="text-xs text-purple-600 hover:text-purple-800 font-semibold flex items-center w-full justify-between"
                  >
                    <span>당월 증감 분석</span>
                    {showCurrentSeasonDetail ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {showCurrentSeasonDetail && (
                  <div className="mt-3 pt-3 border-t bg-purple-50 rounded p-2">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-start">
                        <span className="text-purple-600 mr-1">•</span>
                        <span className="text-gray-700">소셜마케팅 +28K (소셜 249K)</span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-purple-600 mr-1">•</span>
                        <span className="text-gray-700">구글광고비 +93K (구글 108K)</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">3,137K</div>
                <div className="text-xs mb-3 text-blue-600">YOY 76% (▼989K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">23.4%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">1.5%</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 지급수수료 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-pink-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">지급수수료</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-pink-100 text-pink-700">
                {opexType}
              </div>
            </div>
            
            {opexType === '당월' ? (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">131K</div>
                <div className="text-xs mb-3 text-red-600">YOY 243% (+77K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">9.0%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출 대비</span>
                    <span className="text-xs font-semibold text-gray-800">0.7%</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">1,964K</div>
                <div className="text-xs mb-3 text-red-600">YOY 194% (+953K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">14.7%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출 대비</span>
                    <span className="text-xs font-semibold text-gray-800">1.0%</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 기타 영업비 */}
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">기타 영업비</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-orange-100 text-orange-700">
                {opexType}
              </div>
            </div>
            
            {opexType === '당월' ? (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">298K</div>
                <div className="text-xs mb-3 text-blue-600">YOY 87% (▼44K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">임차료</span>
                    <span className="text-xs font-semibold text-gray-800">85K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">기타</span>
                    <span className="text-xs font-semibold text-gray-800">116K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">감가상각비</span>
                    <span className="text-xs font-semibold text-gray-800">59K</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">3,052K</div>
                <div className="text-xs mb-3 text-blue-600">YOY 92% (▼261K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">기타</span>
                    <span className="text-xs font-semibold text-gray-800">1,210K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">임차료</span>
                    <span className="text-xs font-semibold text-gray-800">1,015K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">감가상각비</span>
                    <span className="text-xs font-semibold text-gray-800">426K</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HongKongReport;