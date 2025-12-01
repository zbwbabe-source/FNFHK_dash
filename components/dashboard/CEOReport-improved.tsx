/**
 * ============================================================
 * 홍콩법인 25년 10월 경영실적 대시보드
 * ============================================================
 * 
 * 📊 주요 기능
 * - 매출/이익/비용/재고 등 경영 실적 시각화
 * - 채널별/아이템별 상세 분석
 * - YOY(전년 동월 대비) 비교 분석
 * - 매장별 수익성 분석
 * - 시즌별 판매 및 재고 현황
 * 
 * 📁 파일 구조
 * 1. Import & Dependencies (1-3)
 * 2. State Management (11-42)
 * 3. Data Definitions (44-74)
 * 4. Helper Functions (76-98)
 * 5. UI Components (100-4254)
 *    - Header Section
 *    - CEO Insights (핵심성과/리스크/액션아이템)
 *    - Key Metrics Cards (매출/이익/재고/비용)
 *    - Sales Analysis (매출 분석)
 *    - Profit Analysis (이익 분석)
 *    - Inventory Analysis (재고 분석)
 *    - Expense Analysis (비용 분석)
 * 
 * 🔧 Cursor AI 활용 팁
 * - 특정 섹션 수정: "매출 분석 섹션 수정해줘"
 * - 차트 수정: "채널별 매출 차트에 라벨 추가해줘"
 * - State 추가: "새로운 토글 state 추가해줘"
 */

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ComposedChart, Legend, LabelList, ReferenceLine } from 'recharts';
import { TrendingDown, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';

const CEOReport = () => {
  // ============================================================
  // 브라우저 설정
  // ============================================================
  useEffect(() => {
    document.title = "홍콩법인 25년 10월 경영실적";
  }, []);

  // ============================================================
  // STATE 관리 - 상세보기 토글 상태
  // ============================================================
  const [showSalesDetail, setShowSalesDetail] = useState(false);              // 채널별 매출 상세
  const [showItemDetail, setShowItemDetail] = useState(false);                // 아이템별 매출 상세
  const [showProfitDetail, setShowProfitDetail] = useState(false);            // 채널별 이익 상세
  const [showItemProfitDetail, setShowItemProfitDetail] = useState(false);    // 아이템별 이익 상세
  const [showExpenseDetail, setShowExpenseDetail] = useState(false);          // 비용 상세
  const [showAccExpenseDetail, setShowAccExpenseDetail] = useState(false);    // 누적 비용 상세
  const [showDiscountDetail, setShowDiscountDetail] = useState(false);        // 채널별 할인 상세
  const [showItemDiscountDetail, setShowItemDiscountDetail] = useState(false);// 아이템별 할인 상세
  const [showStoreDetail, setShowStoreDetail] = useState(false);              // 매장 상세
  const [showStoreTable, setShowStoreTable] = useState(false);                // 매장 테이블
  const [showStoreCalcModal, setShowStoreCalcModal] = useState(false);        // 매장 계산 모달
  const [showStoreListInModal, setShowStoreListInModal] = useState(false);    // 모달 내 매장 리스트 (2025)
  const [showStoreListInModal2024, setShowStoreListInModal2024] = useState(false); // 모달 내 매장 리스트 (2024)
  const [showSeasonSalesDetail, setShowSeasonSalesDetail] = useState(false);  // 시즌별 매출 상세
  const [showMuDetail, setShowMuDetail] = useState(false);                    // MU 상세
  const [showAccInventoryDetail, setShowAccInventoryDetail] = useState(false);// 누적 재고 상세
  const [showEndInventoryDetail, setShowEndInventoryDetail] = useState(false);// 기말 재고 상세
  const [showPastSeasonDetail, setShowPastSeasonDetail] = useState(false);    // 과시즌 재고 상세
  const [showCurrentSeasonDetail, setShowCurrentSeasonDetail] = useState(false); // 당시즌 재고 상세
  const [showDiscoveryDetail, setShowDiscoveryDetail] = useState(false);      // Discovery 상세
  const [showProfitStores, setShowProfitStores] = useState(false);            // 흑자 매장 리스트
  const [showLossStores, setShowLossStores] = useState(false);                // 적자 매장 리스트

  // ============================================================
  // STATE 관리 - 뷰 옵션 및 선택 상태
  // ============================================================
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({}); // 확장된 아이템 (액션아이템 토글용)
  const [muType, setMuType] = useState('발주');                                // MU 타입: '발주' | '매출'
  const [costType, setCostType] = useState('발주');                            // 원가 타입: '발주' | '매출' (25FW 원가현황)
  const [expenseType, setExpenseType] = useState('당월');                      // 비용 타입: '당월' | '누적'
  const [opexType, setOpexType] = useState('당월');                            // 영업비 타입: '당월' | '누적'
  const [calcYearView, setCalcYearView] = useState('2025');                   // 계산 연도: '2025' | '2024'
  const [selectedChannel, setSelectedChannel] = useState(null);               // 선택된 채널 (차트 클릭 시)
  const [selectedSalesItem, setSelectedSalesItem] = useState(null);           // 선택된 매출 아이템 (차트 클릭 시)
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);   // 선택된 재고 아이템 (차트 클릭 시)
  const [salesPriceType, setSalesPriceType] = useState('실판');                // 가격 타입: '실판' | '택가' | '할인율'

  // ============================================================
  // 데이터 정의 - 채널별 YOY 데이터
  // YOY = Year Over Year (전년 동월 대비 비율 %)
  // 예: 100 = 전년과 동일, 110 = 전년 대비 10% 증가
  // ============================================================
  const channelYOY = {
    'HK Online': [72, 91, 53, 74, 106, 87, 52, 294, 251, 323],
    'HK Outlet': [114, 54, 73, 73, 70, 65, 105, 106, 71, 91],
    'HK Retail': [114, 50, 72, 80, 87, 84, 95, 103, 117, 97],
    'MC Outlet': [183, 109, 94, 84, 102, 97, 108, 127, 97, 63],
    'MC Retail': [87, 51, 62, 69, 79, 89, 93, 103, 83, 80]
  };

  // ============================================================
  // 데이터 정의 - 아이템별 매출 YOY 데이터
  // ============================================================
  const salesItemYOY = {
    '당시즌의류': [90, 73, 78, 80, 93, 89, 100, 102, 95, 99],
    '과시즌의류': [114, 53, 79, 94, 80, 81, 110, 186, 266, 125],
    '모자': [109, 68, 74, 87, 93, 88, 106, 120, 104, 109],
    '신발': [114, 42, 59, 71, 71, 73, 84, 102, 97, 75],
    '가방외': [62, 36, 47, 44, 47, 53, 66, 71, 80, 61],
    '합계': [108, 53, 70, 76, 82, 81, 95, 108, 109, 93]
  };

  // ============================================================
  // 데이터 정의 - 아이템별 재고 YOY 데이터
  // ============================================================
  const inventoryItemYOY = {
    'F당시즌': [null, null, 100, 100, 162, 118, 90, 63, 56, 54],
    'S당시즌': [137, 94, 84, 88, 87, 87, 84, 84, 84, 84],
    '과시즌FW': [130, 138, 140, 141, 140, 140, 140, 140, 138, 139],
    '과시즌SS': [129, 127, 129, 133, 135, 138, 138, 132, 122, 122],
    '모자': [116, 81, 87, 86, 88, 85, 79, 78, 86, 91],
    '신발': [69, 60, 65, 70, 67, 69, 64, 84, 82, 86],
    '가방외': [68, 76, 78, 83, 84, 80, 81, 76, 75, 75]
  };

  // ============================================================
  // 데이터 정의 - 월 라벨 (1-10월)
  // ============================================================
  const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월'];

  // ============================================================
  // 헬퍼 함수 - 전체 상세보기 토글
  // 모든 상세보기 State를 한번에 토글
  // ============================================================
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

  // ============================================================
  // 헬퍼 함수 - 액션 아이템 토글
  // CEO 인사이트의 액션 아이템 확장/축소
  // 인덱스는 'green-0', 'blue-2' 같은 문자열 키를 사용
  // ============================================================
  const toggleActionItem = (index: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index],
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
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-blue-500 hover:shadow-xl transition-shadow min-h-[400px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">📊</span>
                <h3 className="text-sm font-semibold text-gray-600">실판매출 (1K HKD)</h3>
              </div>
              <div className="text-3xl font-bold text-red-600 mb-2">
                20,077
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
                    <span className="text-red-600">14,703 (100%)</span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Retail</span>
                    <span className="font-semibold">10,662 <span className="text-red-600">(97%)</span></span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Outlet</span>
                    <span className="font-semibold">3,105 <span className="text-red-600">(90%)</span></span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Online</span>
                    <span className="font-semibold">936 <span className="text-green-600">(323%)</span></span>
                  </div>
                  
                  <div className="flex justify-between text-xs font-semibold text-gray-700 mt-3 pt-2 border-t">
                    <span>MC (마카오)</span>
                    <span className="text-red-600">5,374 (78%)</span>
                  </div>
                  <div className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600">- Retail</span>
                    <span className="font-semibold">4,840 <span className="text-red-600">(80%)</span></span>
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
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-orange-500 hover:shadow-xl transition-shadow min-h-[400px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">💰</span>
                <h3 className="text-sm font-semibold text-gray-600">영업이익 (1K HKD)</h3>
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
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-green-500 hover:shadow-xl transition-shadow min-h-[400px]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">📈</span>
                  <h3 className="text-sm font-semibold text-gray-600">영업비 (1K HKD)</h3>
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
                        <span className="text-gray-600">급여</span>
                        <span className="font-semibold">605 <span className="text-red-600">(137%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">마케팅비</span>
                        <span className="font-semibold">417 <span className="text-red-600">(136%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">지급수수료</span>
                        <span className="font-semibold">131 <span className="text-red-600">(243%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">물류비</span>
                        <span className="font-semibold">102 <span className="text-green-600">(94%)</span></span>
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
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">기타</span>
                        <span className="font-semibold">14 <span className="text-green-600">(95%)</span></span>
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
                            <span>• 물류비·기타 감소</span>
                            <span className="font-semibold text-blue-700">-54K</span>
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
                        <span className="text-gray-600">임차료</span>
                        <span className="font-semibold">1,015 <span className="text-green-600">(85%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">물류비</span>
                        <span className="font-semibold">1,000 <span className="text-green-600">(92%)</span></span>
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
                        <span className="text-gray-600">기타</span>
                        <span className="font-semibold">210 <span className="text-green-600">(92%)</span></span>
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
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-purple-500 hover:shadow-xl transition-shadow min-h-[400px]">
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
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-red-500 hover:shadow-xl transition-shadow min-h-[400px]">
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
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-cyan-500 hover:shadow-xl transition-shadow min-h-[150px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">📈</span>
                <h3 className="text-sm font-semibold text-gray-600">당시즌 판매 (25F 의류)</h3>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                17,195
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">전년 16,849</span> | <span className="text-green-600">YOY 102%</span>
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
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-indigo-500 hover:shadow-xl transition-shadow min-h-[150px]">
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
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-pink-500 hover:shadow-xl transition-shadow min-h-[150px]">
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
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">신발</span>
                        <span className="font-semibold">3,907 <span className="text-red-600">(75%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">모자</span>
                        <span className="font-semibold">4,184 <span className="text-green-600">(109%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">가방외</span>
                        <span className="font-semibold">1,262 <span className="text-red-600">(61%)</span></span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold border-t pt-1 mt-1">
                        <span className="text-gray-700">악세 합계</span>
                        <span className="text-indigo-600">9,354 <span className="text-red-600">(84%)</span></span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 기말재고 */}
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-amber-500 hover:shadow-xl transition-shadow min-h-[150px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">🏭</span>
                <h3 className="text-sm font-semibold text-gray-600">기말재고 (TAG, 1K HKD)</h3>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                396,982
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">전년 419,999</span> | <span className="text-green-600">YOY 95%</span>
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
            <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-red-500 hover:shadow-xl transition-shadow min-h-[150px]">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">📦</span>
                <h3 className="text-sm font-semibold text-gray-600">과시즌 FW 재고 (TAG, 1K HKD)</h3>
              </div>
              <div className="text-3xl font-bold text-red-600 mb-2">
                116,639
              </div>
              <div className="text-sm font-semibold mb-3">
                <span className="text-gray-600">전년 84,212</span> | <span className="text-red-600">YOY 139% 🔴</span>
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
      <div className="mb-4">
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
                    <th rowSpan="2" className="text-left py-2 px-2 text-gray-700 font-semibold border-r border-gray-300 min-w-[100px]">항목<br/>(1K HKD)</th>
                    <th colSpan="3" className="text-center py-1 px-1 text-gray-700 font-semibold bg-green-50 border-r border-gray-300">당월</th>
                    <th colSpan="3" className="text-center py-1 px-1 text-gray-700 font-semibold bg-orange-50 border-r border-gray-300">당월 전년비</th>
                    <th rowSpan="2" className="text-center py-2 px-2 text-gray-700 font-semibold bg-purple-50 border-r border-gray-300">YOY</th>
                    <th colSpan="3" className="text-center py-1 px-1 text-gray-700 font-semibold bg-cyan-50 border-r border-gray-300">누적</th>
                    <th colSpan="3" className="text-center py-1 px-1 text-gray-700 font-semibold bg-amber-50 border-r border-gray-300">누적 전년비</th>
                    <th rowSpan="2" className="text-center py-2 px-2 text-gray-700 font-semibold bg-indigo-50">누적<br/>YOY</th>
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
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            2025년 채널별 실판매출 추세 (1K HKD)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={[
              { month: '1월', 'HK Retail': 21811, 'HK Outlet': 5479, 'HK Online': 449, 'MC Retail': 7631, 'MC Outlet': 1365, total: 36735 },
              { month: '2월', 'HK Retail': 9265, 'HK Outlet': 2553, 'HK Online': 321, 'MC Retail': 4944, 'MC Outlet': 812, total: 17895 },
              { month: '3월', 'HK Retail': 9017, 'HK Outlet': 3054, 'HK Online': 223, 'MC Retail': 4007, 'MC Outlet': 690, total: 16991 },
              { month: '4월', 'HK Retail': 9655, 'HK Outlet': 3024, 'HK Online': 231, 'MC Retail': 4020, 'MC Outlet': 604, total: 17534 },
              { month: '5월', 'HK Retail': 9841, 'HK Outlet': 2774, 'HK Online': 330, 'MC Retail': 4190, 'MC Outlet': 604, total: 17739 },
              { month: '6월', 'HK Retail': 8706, 'HK Outlet': 2182, 'HK Online': 505, 'MC Retail': 3566, 'MC Outlet': 406, total: 15365 },
              { month: '7월', 'HK Retail': 11004, 'HK Outlet': 3282, 'HK Online': 324, 'MC Retail': 4907, 'MC Outlet': 590, total: 20107 },
              { month: '8월', 'HK Retail': 12216, 'HK Outlet': 3501, 'HK Online': 771, 'MC Retail': 6735, 'MC Outlet': 854, total: 24077 },
              { month: '9월', 'HK Retail': 9909, 'HK Outlet': 2215, 'HK Online': 589, 'MC Retail': 3121, 'MC Outlet': 417, total: 16251 },
              { month: '10월', 'HK Retail': 10662, 'HK Outlet': 3105, 'HK Online': 936, 'MC Retail': 4840, 'MC Outlet': 534, total: 20077 }
            ]} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
          
          {/* 범례 클릭 가능하게 만들기 */}
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
                              {channelYOY[channel].map((yoy, idx) => (
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
                          {channelYOY[selectedChannel].map((yoy, idx) => (
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

      {/* 직접비 & 영업비 상세 (그래프 아래) */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        {/* 직접비 상세 */}
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-indigo-600">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></div>
              직접비 상세 (1K HKD)
            </h3>
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
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-indigo-800">전체 직접비용</span>
                  <span className="text-xl font-bold text-indigo-900">11,686K</span>
                </div>
                <div className="text-xs text-red-600">YOY 97% (▼ 391K) | 매출대비 58.2%</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-gray-200">
                  <span className="text-xs text-gray-600">급여</span>
                  <span className="text-sm font-semibold">2,275K <span className="text-green-600">(106%)</span></span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-200">
                  <span className="text-xs text-gray-600">임차료</span>
                  <span className="text-sm font-semibold">5,844K <span className="text-blue-600">(96%)</span></span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-200">
                  <span className="text-xs text-gray-600">물류비</span>
                  <span className="text-sm font-semibold">1,105K <span className="text-blue-600">(78%)</span></span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs text-gray-600">기타 직접비</span>
                  <span className="text-sm font-semibold">2,462K <span className="text-blue-600">(101%)</span></span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-indigo-800">전체 직접비용</span>
                  <span className="text-xl font-bold text-indigo-900">115,680K</span>
                </div>
                <div className="text-xs text-blue-600">YOY 95% (▼ 6,426K) | 매출대비 57.0%</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-gray-200">
                  <span className="text-xs text-gray-600">급여</span>
                  <span className="text-sm font-semibold">21,390K <span className="text-green-600">(100%)</span></span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-200">
                  <span className="text-xs text-gray-600">임차료</span>
                  <span className="text-sm font-semibold">59,221K <span className="text-blue-600">(96%)</span></span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-200">
                  <span className="text-xs text-gray-600">물류비</span>
                  <span className="text-sm font-semibold">12,035K <span className="text-blue-600">(88%)</span></span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs text-gray-600">기타 직접비</span>
                  <span className="text-sm font-semibold">23,034K <span className="text-blue-600">(95%)</span></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 영업비 상세 */}
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-emerald-600">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></div>
              영업비 상세 (1K HKD)
            </h3>
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
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-emerald-800">전체 영업비</span>
                  <span className="text-xl font-bold text-emerald-900">1,451K</span>
                </div>
                <div className="text-xs text-red-600">YOY 130% (+333K) | 매출대비 7.2%</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-gray-200">
                  <span className="text-xs text-gray-600">급여</span>
                  <span className="text-sm font-semibold">605K <span className="text-red-600">(137%)</span></span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-200">
                  <span className="text-xs text-gray-600">마케팅비</span>
                  <span className="text-sm font-semibold">417K <span className="text-red-600">(136%)</span></span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-200">
                  <span className="text-xs text-gray-600">지급수수료</span>
                  <span className="text-sm font-semibold">131K <span className="text-red-600">(243%)</span></span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-200">
                  <span className="text-xs text-gray-600">물류비</span>
                  <span className="text-sm font-semibold">102K <span className="text-green-600">(94%)</span></span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-200">
                  <span className="text-xs text-gray-600">임차료</span>
                  <span className="text-sm font-semibold">85K <span className="text-green-600">(70%)</span></span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-200">
                  <span className="text-xs text-gray-600">감가상각비</span>
                  <span className="text-sm font-semibold">59K <span className="text-red-600">(152%)</span></span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-200">
                  <span className="text-xs text-gray-600">여비교통비</span>
                  <span className="text-sm font-semibold">47K <span className="text-red-600">(408%)</span></span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-200">
                  <span className="text-xs text-gray-600">보험료</span>
                  <span className="text-sm font-semibold">17K <span className="text-green-600">(92%)</span></span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs text-gray-600">기타</span>
                  <span className="text-sm font-semibold">14K <span className="text-green-600">(95%)</span></span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-emerald-800">전체 영업비</span>
                  <span className="text-xl font-bold text-emerald-900">13,385K</span>
                </div>
                <div className="text-xs text-red-600">YOY 103% (+403K) | 매출대비 6.6%</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1 border-b border-gray-200">
                  <span className="text-xs text-gray-600">급여</span>
                  <span className="text-sm font-semibold">5,232K <span className="text-red-600">(114%)</span></span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-200">
                  <span className="text-xs text-gray-600">마케팅비</span>
                  <span className="text-sm font-semibold">3,137K <span className="text-green-600">(76%)</span></span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-200">
                  <span className="text-xs text-gray-600">지급수수료</span>
                  <span className="text-sm font-semibold">1,964K <span className="text-red-600">(194%)</span></span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-200">
                  <span className="text-xs text-gray-600">물류비</span>
                  <span className="text-sm font-semibold">1,204K <span className="text-green-600">(88%)</span></span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-200">
                  <span className="text-xs text-gray-600">임차료</span>
                  <span className="text-sm font-semibold">1,001K <span className="text-green-600">(70%)</span></span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-200">
                  <span className="text-xs text-gray-600">감가상각비</span>
                  <span className="text-sm font-semibold">708K <span className="text-red-600">(152%)</span></span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-200">
                  <span className="text-xs text-gray-600">여비교통비</span>
                  <span className="text-sm font-semibold">430K <span className="text-red-600">(408%)</span></span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-200">
                  <span className="text-xs text-gray-600">보험료</span>
                  <span className="text-sm font-semibold">184K <span className="text-green-600">(92%)</span></span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs text-gray-600">기타</span>
                  <span className="text-sm font-semibold">525K <span className="text-green-600">(95%)</span></span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

        {/* 월별 아이템별 매출 추세 */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-4">
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
          
          <ResponsiveContainer width="100%" height={250}>
            {salesPriceType === '할인율' ? (
              <LineChart data={[
                { month: '1월', '당시즌의류': ((24546-19507)/24546*100).toFixed(1), '과시즌의류': ((596-327)/596*100).toFixed(1), '모자': ((4965-4520)/4965*100).toFixed(1), '신발': ((12488-10298)/12488*100).toFixed(1), '가방외': ((2438-2082)/2438*100).toFixed(1), total: ((45033-36734)/45033*100).toFixed(1) },
                { month: '2월', '당시즌의류': ((10520-8411)/10520*100).toFixed(1), '과시즌의류': ((716-388)/716*100).toFixed(1), '모자': ((4083-3713)/4083*100).toFixed(1), '신발': ((4840-3941)/4840*100).toFixed(1), '가방외': ((1675-1441)/1675*100).toFixed(1), total: ((21834-17895)/21834*100).toFixed(1) },
                { month: '3월', '당시즌의류': ((8108-6781)/8108*100).toFixed(1), '과시즌의류': ((2910-1597)/2910*100).toFixed(1), '모자': ((3849-3575)/3849*100).toFixed(1), '신발': ((4387-3684)/4387*100).toFixed(1), '가방외': ((1583-1355)/1583*100).toFixed(1), total: ((20837-16991)/20837*100).toFixed(1) },
                { month: '4월', '당시즌의류': ((7945-7011)/7945*100).toFixed(1), '과시즌의류': ((4053-2310)/4053*100).toFixed(1), '모자': ((3792-3544)/3792*100).toFixed(1), '신발': ((4109-3419)/4109*100).toFixed(1), '가방외': ((1449-1250)/1449*100).toFixed(1), total: ((21348-17534)/21348*100).toFixed(1) },
                { month: '5월', '당시즌의류': ((8442-7459)/8442*100).toFixed(1), '과시즌의류': ((3684-2080)/3684*100).toFixed(1), '모자': ((3937-3574)/3937*100).toFixed(1), '신발': ((3871-3187)/3871*100).toFixed(1), '가방외': ((1690-1437)/1690*100).toFixed(1), total: ((21624-17737)/21624*100).toFixed(1) },
                { month: '6월', '당시즌의류': ((7068-6245)/7068*100).toFixed(1), '과시즌의류': ((2842-1634)/2842*100).toFixed(1), '모자': ((3367-3113)/3367*100).toFixed(1), '신발': ((3567-2973)/3567*100).toFixed(1), '가방외': ((1686-1400)/1686*100).toFixed(1), total: ((18530-15366)/18530*100).toFixed(1) },
                { month: '7월', '당시즌의류': ((8739-7676)/8739*100).toFixed(1), '과시즌의류': ((4767-2361)/4767*100).toFixed(1), '모자': ((4896-4415)/4896*100).toFixed(1), '신발': ((4747-3875)/4747*100).toFixed(1), '가방외': ((2227-1779)/2227*100).toFixed(1), total: ((25377-20106)/25377*100).toFixed(1) },
                { month: '8월', '당시즌의류': ((8909-7741)/8909*100).toFixed(1), '과시즌의류': ((7717-3242)/7717*100).toFixed(1), '모자': ((6236-5570)/6236*100).toFixed(1), '신발': ((7010-5442)/7010*100).toFixed(1), '가방외': ((2771-2084)/2771*100).toFixed(1), total: ((32644-24078)/32644*100).toFixed(1) },
                { month: '9월', '당시즌의류': ((5535-4903)/5535*100).toFixed(1), '과시즌의류': ((8799-3170)/8799*100).toFixed(1), '모자': ((3682-3206)/3682*100).toFixed(1), '신발': ((5581-3690)/5581*100).toFixed(1), '가방외': ((2104-1282)/2104*100).toFixed(1), total: ((25702-16252)/25702*100).toFixed(1) },
                { month: '10월', '당시즌의류': ((9235-8089)/9235*100).toFixed(1), '과시즌의류': ((4616-2635)/4616*100).toFixed(1), '모자': ((4553-4184)/4553*100).toFixed(1), '신발': ((4730-3907)/4730*100).toFixed(1), '가방외': ((1545-1262)/1545*100).toFixed(1), total: ((24679-20077)/24679*100).toFixed(1) }
              ]} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 70]} tickFormatter={(value) => `${value}%`} />
                <Tooltip 
                  formatter={(value, name) => [`${value}%`, name]}
                  contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", padding: "8px", fontSize: "11px" }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Line type="monotone" dataKey="당시즌의류" stroke="#34D399" strokeWidth={3} dot={{ r: 4 }} name="당시즌의류" />
                <Line type="monotone" dataKey="과시즌의류" stroke="#FCA5A5" strokeWidth={3} dot={{ r: 4 }} name="과시즌의류" />
                <Line type="monotone" dataKey="모자" stroke="#93C5FD" strokeWidth={3} dot={{ r: 4 }} name="모자" />
                <Line type="monotone" dataKey="신발" stroke="#FCD34D" strokeWidth={3} dot={{ r: 4 }} name="신발" />
                <Line type="monotone" dataKey="가방외" stroke="#C4B5FD" strokeWidth={3} dot={{ r: 4 }} name="가방외" />
              </LineChart>
            ) : (
              <BarChart data={salesPriceType === '실판' ? [
              { month: '1월', '당시즌의류': 19507, '과시즌의류': 327, '모자': 4520, '신발': 10298, '가방외': 2082, total: 36734 },
              { month: '2월', '당시즌의류': 8411, '과시즌의류': 388, '모자': 3713, '신발': 3941, '가방외': 1441, total: 17895 },
              { month: '3월', '당시즌의류': 6781, '과시즌의류': 1597, '모자': 3575, '신발': 3684, '가방외': 1355, total: 16991 },
              { month: '4월', '당시즌의류': 7011, '과시즌의류': 2310, '모자': 3544, '신발': 3419, '가방외': 1250, total: 17534 },
              { month: '5월', '당시즌의류': 7459, '과시즌의류': 2080, '모자': 3574, '신발': 3187, '가방외': 1437, total: 17737 },
              { month: '6월', '당시즌의류': 6245, '과시즌의류': 1634, '모자': 3113, '신발': 2973, '가방외': 1400, total: 15366 },
              { month: '7월', '당시즌의류': 7676, '과시즌의류': 2361, '모자': 4415, '신발': 3875, '가방외': 1779, total: 20106 },
              { month: '8월', '당시즌의류': 7741, '과시즌의류': 3242, '모자': 5570, '신발': 5442, '가방외': 2084, total: 24078 },
              { month: '9월', '당시즌의류': 4903, '과시즌의류': 3170, '모자': 3206, '신발': 3690, '가방외': 1282, total: 16252 },
              { month: '10월', '당시즌의류': 8089, '과시즌의류': 2635, '모자': 4184, '신발': 3907, '가방외': 1262, total: 20077 }
            ] : salesPriceType === '택가' ? [
              { month: '1월', '당시즌의류': 24546, '과시즌의류': 596, '모자': 4965, '신발': 12488, '가방외': 2438, total: 45033 },
              { month: '2월', '당시즌의류': 10520, '과시즌의류': 716, '모자': 4083, '신발': 4840, '가방외': 1675, total: 21834 },
              { month: '3월', '당시즌의류': 8108, '과시즌의류': 2910, '모자': 3849, '신발': 4387, '가방외': 1583, total: 20837 },
              { month: '4월', '당시즌의류': 7945, '과시즌의류': 4053, '모자': 3792, '신발': 4109, '가방외': 1449, total: 21348 },
              { month: '5월', '당시즌의류': 8442, '과시즌의류': 3684, '모자': 3937, '신발': 3871, '가방외': 1690, total: 21624 },
              { month: '6월', '당시즌의류': 7068, '과시즌의류': 2842, '모자': 3367, '신발': 3567, '가방외': 1686, total: 18530 },
              { month: '7월', '당시즌의류': 8739, '과시즌의류': 4767, '모자': 4896, '신발': 4747, '가방외': 2227, total: 25377 },
              { month: '8월', '당시즌의류': 8909, '과시즌의류': 7717, '모자': 6236, '신발': 7010, '가방외': 2771, total: 32644 },
              { month: '9월', '당시즌의류': 5535, '과시즌의류': 8799, '모자': 3682, '신발': 5581, '가방외': 2104, total: 25702 },
              { month: '10월', '당시즌의류': 9235, '과시즌의류': 4616, '모자': 4553, '신발': 4730, '가방외': 1545, total: 24679 }
            ] : [
              { month: '1월', '당시즌의류': ((24546-19507)/24546*100).toFixed(1), '과시즌의류': ((596-327)/596*100).toFixed(1), '모자': ((4965-4520)/4965*100).toFixed(1), '신발': ((12488-10298)/12488*100).toFixed(1), '가방외': ((2438-2082)/2438*100).toFixed(1), total: ((45033-36734)/45033*100).toFixed(1) },
              { month: '2월', '당시즌의류': ((10520-8411)/10520*100).toFixed(1), '과시즌의류': ((716-388)/716*100).toFixed(1), '모자': ((4083-3713)/4083*100).toFixed(1), '신발': ((4840-3941)/4840*100).toFixed(1), '가방외': ((1675-1441)/1675*100).toFixed(1), total: ((21834-17895)/21834*100).toFixed(1) },
              { month: '3월', '당시즌의류': ((8108-6781)/8108*100).toFixed(1), '과시즌의류': ((2910-1597)/2910*100).toFixed(1), '모자': ((3849-3575)/3849*100).toFixed(1), '신발': ((4387-3684)/4387*100).toFixed(1), '가방외': ((1583-1355)/1583*100).toFixed(1), total: ((20837-16991)/20837*100).toFixed(1) },
              { month: '4월', '당시즌의류': ((7945-7011)/7945*100).toFixed(1), '과시즌의류': ((4053-2310)/4053*100).toFixed(1), '모자': ((3792-3544)/3792*100).toFixed(1), '신발': ((4109-3419)/4109*100).toFixed(1), '가방외': ((1449-1250)/1449*100).toFixed(1), total: ((21348-17534)/21348*100).toFixed(1) },
              { month: '5월', '당시즌의류': ((8442-7459)/8442*100).toFixed(1), '과시즌의류': ((3684-2080)/3684*100).toFixed(1), '모자': ((3937-3574)/3937*100).toFixed(1), '신발': ((3871-3187)/3871*100).toFixed(1), '가방외': ((1690-1437)/1690*100).toFixed(1), total: ((21624-17737)/21624*100).toFixed(1) },
              { month: '6월', '당시즌의류': ((7068-6245)/7068*100).toFixed(1), '과시즌의류': ((2842-1634)/2842*100).toFixed(1), '모자': ((3367-3113)/3367*100).toFixed(1), '신발': ((3567-2973)/3567*100).toFixed(1), '가방외': ((1686-1400)/1686*100).toFixed(1), total: ((18530-15366)/18530*100).toFixed(1) },
              { month: '7월', '당시즌의류': ((8739-7676)/8739*100).toFixed(1), '과시즌의류': ((4767-2361)/4767*100).toFixed(1), '모자': ((4896-4415)/4896*100).toFixed(1), '신발': ((4747-3875)/4747*100).toFixed(1), '가방외': ((2227-1779)/2227*100).toFixed(1), total: ((25377-20106)/25377*100).toFixed(1) },
              { month: '8월', '당시즌의류': ((8909-7741)/8909*100).toFixed(1), '과시즌의류': ((7717-3242)/7717*100).toFixed(1), '모자': ((6236-5570)/6236*100).toFixed(1), '신발': ((7010-5442)/7010*100).toFixed(1), '가방외': ((2771-2084)/2771*100).toFixed(1), total: ((32644-24078)/32644*100).toFixed(1) },
              { month: '9월', '당시즌의류': ((5535-4903)/5535*100).toFixed(1), '과시즌의류': ((8799-3170)/8799*100).toFixed(1), '모자': ((3682-3206)/3682*100).toFixed(1), '신발': ((5581-3690)/5581*100).toFixed(1), '가방외': ((2104-1282)/2104*100).toFixed(1), total: ((25702-16252)/25702*100).toFixed(1) },
              { month: '10월', '당시즌의류': 9235, '과시즌의류': 4616, '모자': 4553, '신발': 4730, '가방외': 1545, total: 24679 }
              ]} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 50000]} tickFormatter={(value) => value.toLocaleString()} />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'total') return null;
                    return [`${value.toLocaleString()}K HKD`, name];
                  }}
                  contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", padding: "8px", fontSize: "11px" }}
                />
                <Bar dataKey="당시즌의류" stackId="a" fill="#34D399" />
                <Bar dataKey="과시즌의류" stackId="a" fill="#FCA5A5" />
                <Bar dataKey="모자" stackId="a" fill="#93C5FD" />
                <Bar dataKey="신발" stackId="a" fill="#FCD34D" />
                <Bar dataKey="가방외" stackId="a" fill="#C4B5FD" />
              </BarChart>
            )}
          </ResponsiveContainer>
          
          {/* 범례 클릭 가능하게 만들기 */}
          <div className="mt-4">
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { name: '전체', color: '#FB923C' },
                { name: '당시즌의류', color: '#34D399' },
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
                      currSeason: salesItemYOY['당시즌의류'][idx],
                      pastSeason: salesItemYOY['과시즌의류'][idx],
                      cap: salesItemYOY['모자'][idx],
                      shoes: salesItemYOY['신발'][idx],
                      bagEtc: salesItemYOY['가방외'][idx]
                    }))} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} tickFormatter={(value) => `${value}%`} />
                      <Tooltip 
                        formatter={(value, name) => value ? [`${value}%`, name] : ['N/A', name]}
                        contentStyle={{ backgroundColor: "white", border: "1px solid #ccc", borderRadius: "4px", fontSize: "11px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Line type="monotone" dataKey="currSeason" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} connectNulls name="당시즌의류" />
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
                      yoy: salesItemYOY[selectedSalesItem]?.[idx]
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
                          {['당시즌의류', '과시즌의류', '모자', '신발', '가방외'].map(item => (
                            <tr key={item}>
                              <td className="border border-gray-300 px-2 py-1 font-semibold bg-orange-50">{item}</td>
                              {salesItemYOY[item].map((yoy, idx) => (
                                <td key={idx} className={`border border-gray-300 px-2 py-1 text-center font-bold ${yoy === null ? 'text-gray-400' : yoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                                  {yoy === null ? '-' : `${yoy}%`}
                                </td>
                              ))}
                            </tr>
                          ))}
                          <tr className="bg-blue-100 font-bold border-t-2 border-blue-300">
                            <td className="border border-gray-300 px-2 py-1 text-blue-900">합계</td>
                            {salesItemYOY['합계'].map((yoy, idx) => (
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
                            {salesItemYOY[selectedSalesItem].map((yoy, idx) => (
                              <td key={idx} className={`border border-gray-300 px-2 py-1 text-center font-bold ${yoy === null ? 'text-gray-400' : yoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                                {yoy === null ? '-' : `${yoy}%`}
                              </td>
                            ))}
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
                <div>• 1~3월: 24FW 강세 (당시즌 취급)</div>
                <div>• 4~6월: 25SS 전환, 과시즌 소진</div>
                <div>• 7~10월: 25FW 본격화, 10월 8,089K</div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
              <h4 className="text-xs font-bold text-blue-800 mb-1">👔 카테고리 분석</h4>
              <div className="space-y-0.5 text-xs text-blue-700">
                <div>• 신발: 1월 최대 10,298K, 10월 3,907K</div>
                <div>• 모자: 안정적 4,000K 수준 유지</div>
                <div>• 가방외: 1,200~2,000K 소폭 기여</div>
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
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
            2025년 월별 아이템별 재고 추세 (TAG, 1K HKD)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={[
              { month: '1월', 'F당시즌': 0, 'S당시즌': 38064, '과시즌FW': 136491, '과시즌SS': 87692, '모자': 43844, '신발': 57607, '가방외': 25986, total: 389684, capWeeks: '43.1주', shoeWeeks: '38.1주', bagWeeks: '39.2주' },
              { month: '2월', 'F당시즌': 0, 'S당시즌': 70172, '과시즌FW': 127251, '과시즌SS': 85172, '모자': 40066, '신발': 51850, '가방외': 27097, total: 401609, capWeeks: '39.1주', shoeWeeks: '34.4주', bagWeeks: '45.4주' },
              { month: '3월', 'F당시즌': 0, 'S당시즌': 74927, '과시즌FW': 125238, '과시즌SS': 82204, '모자': 39490, '신발': 51376, '가방외': 25568, total: 398803, capWeeks: '39.7주', shoeWeeks: '35.0주', bagWeeks: '48.0주' },
              { month: '4월', 'F당시즌': 0, 'S당시즌': 69153, '과시즌FW': 124782, '과시즌SS': 78630, '모자': 37571, '신발': 50226, '가방외': 24766, total: 385127, capWeeks: '39.8주', shoeWeeks: '35.2주', bagWeeks: '55.1주' },
              { month: '5월', 'F당시즌': 1485, 'S당시즌': 60632, '과시즌FW': 124584, '과시즌SS': 75118, '모자': 37591, '신발': 49706, '가방외': 23978, total: 373095, capWeeks: '38.9주', shoeWeeks: '35.4주', bagWeeks: '54.3주' },
              { month: '6월', 'F당시즌': 10175, 'S당시즌': 53544, '과시즌FW': 124437, '과시즌SS': 72353, '모자': 37450, '신발': 51962, '가방외': 23379, total: 373300, capWeeks: '40.1주', shoeWeeks: '40.2주', bagWeeks: '57.1주' },
              { month: '7월', 'F당시즌': 17967, 'S당시즌': 45834, '과시즌FW': 124023, '과시즌SS': 67934, '모자': 37424, '신발': 51692, '가방외': 22590, total: 367465, capWeeks: '40.2주', shoeWeeks: '52.1주', bagWeeks: '56.3주' },
              { month: '8월', 'F당시즌': 51450, 'S당시즌': 40213, '과시즌FW': 123027, '과시즌SS': 61141, '모자': 35308, '신발': 62396, '가방외': 21822, total: 395357, capWeeks: '34.8주', shoeWeeks: '57.9주', bagWeeks: '49.2주' },
              { month: '9월', 'F당시즌': 64392, 'S당시즌': 38614, '과시즌FW': 120205, '과시즌SS': 55221, '모자': 37442, '신발': 57774, '가방외': 20223, total: 393870, capWeeks: '37.2주', shoeWeeks: '51.4주', bagWeeks: '43.6주' },
              { month: '10월', 'F당시즌': 61187, 'S당시즌': 38109, '과시즌FW': 116639, '과시즌SS': 54150, '모자': 40100, '신발': 55057, '가방외': 19073, total: 384314, capWeeks: '38.7주', shoeWeeks: '48.0주', bagWeeks: '40.8주' }
            ]} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 450000]} tickFormatter={(value) => value.toLocaleString()} />
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
              <Bar dataKey="모자" stackId="a" fill="#93C5FD">
                <LabelList dataKey="capWeeks" position="center" fill="#000" fontSize={9} />
              </Bar>
              <Bar dataKey="신발" stackId="a" fill="#FCD34D">
                <LabelList dataKey="shoeWeeks" position="center" fill="#000" fontSize={9} />
              </Bar>
              <Bar dataKey="가방외" stackId="a" fill="#C4B5FD">
                <LabelList dataKey="bagWeeks" position="center" fill="#000" fontSize={9} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          
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
              <div className="mt-4">
                {selectedInventoryItem === '전체' ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={months.map((month, idx) => ({
                      month,
                      fSeason: inventoryItemYOY['F당시즌'][idx],
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
                      yoy: inventoryItemYOY[selectedInventoryItem]?.[idx]
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
                              {inventoryItemYOY[item].map((yoy, idx) => (
                                <td key={idx} className={`border border-gray-300 px-2 py-1 text-center font-bold ${yoy === null ? 'text-gray-400' : yoy >= 100 ? 'text-red-600' : 'text-green-600'}`}>
                                  {yoy === null ? '-' : `${yoy}%`}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </>
                      ) : (
                        <tr>
                          <td className="border border-gray-300 px-2 py-1 font-semibold bg-purple-50">YOY</td>
                          {inventoryItemYOY[selectedInventoryItem].map((yoy, idx) => (
                            <td key={idx} className={`border border-gray-300 px-2 py-1 text-center font-bold ${yoy === null ? 'text-gray-400' : yoy >= 100 ? 'text-red-600' : 'text-green-600'}`}>
                              {yoy === null ? '-' : `${yoy}%`}
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
            href="https://claude.ai/public/artifacts/624b1e7d-4907-4539-944a-bbab15ecf799?fullscreen=true"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-xl text-base font-bold transition-all duration-300 flex items-center space-x-3 shadow-lg hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transform border-2 border-white/20"
          >
            {/* 반짝이는 배경 효과 */}
            <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/0 via-white/20 to-white/0 group-hover:animate-shimmer"></span>
            
            {/* 글로우 효과 */}
            <span className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-pink-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-300"></span>
            
            <span className="relative z-10 flex items-center space-x-3">
              <span className="text-2xl">📊</span>
              <span className="tracking-wide">YOY 추세 분석</span>
            </span>
            
            <svg className="w-5 h-5 relative z-10 group-hover:translate-x-2 group-hover:scale-110 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
        
        <div className="grid grid-cols-6 gap-4 mb-6">
          {/* 전체 매장 요약 */}
          <div className="bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg shadow-md p-4 border-l-4 border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-200">전체 매장 요약</div>
            </div>
            
            <div className="text-2xl font-bold mb-2 text-white">18개 매장</div>
            <div className="text-xs mb-2 text-gray-300">점당매출 1,038K (YOY 112%)</div>
            <div className="text-[10px] text-gray-400 mb-3 italic">* 온라인·종료매장·리뉴얼(LCX·WTC) 제외, 정상운영 18개 매장 기준</div>
            
            <div className="border-t pt-3 space-y-1.5 border-gray-600 mb-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-300">전체 직접이익</span>
                <span className="text-xs font-semibold text-red-300">-521K HKD</span>
              </div>
            </div>
            
            <div className="border-t pt-3 border-gray-600 mb-3">
              <div className="text-xs text-gray-300 mb-2 font-semibold">홍콩 오프라인 (15개, 리뉴얼 1개 포함)</div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center bg-green-900 px-2 py-1 rounded">
                  <span className="text-xs text-green-200">흑자 & 개선</span>
                  <span className="text-xs font-semibold text-green-100">4개 ✅</span>
                </div>
                <div className="flex justify-between items-center bg-blue-900 px-2 py-1 rounded">
                  <span className="text-xs text-blue-200">흑자 & 악화</span>
                  <span className="text-xs font-semibold text-blue-100">2개 ⚠️</span>
                </div>
                <div className="flex justify-between items-center bg-yellow-900 px-2 py-1 rounded">
                  <span className="text-xs text-yellow-200">적자 & 개선</span>
                  <span className="text-xs font-semibold text-yellow-100">2개 📈</span>
                </div>
                <div className="flex justify-between items-center bg-red-900 px-2 py-1 rounded">
                  <span className="text-xs text-red-200">적자 & 악화</span>
                  <span className="text-xs font-semibold text-red-100">6개 🚨</span>
                </div>
                <div className="flex justify-between items-center bg-gray-800 px-2 py-1 rounded">
                  <span className="text-xs text-gray-300">리뉴얼 중</span>
                  <span className="text-xs font-semibold text-gray-200">1개 (LCX)</span>
                </div>
              </div>
              
              <div className="text-xs text-gray-300 mb-2 font-semibold mt-3 pt-3 border-t border-gray-600">마카오 매장 (4개)</div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center bg-green-900 px-2 py-1 rounded">
                  <span className="text-xs text-green-200">흑자</span>
                  <span className="text-xs font-semibold text-green-100">3개 ✅</span>
                </div>
                <div className="flex justify-between items-center bg-red-900 px-2 py-1 rounded">
                  <span className="text-xs text-red-200">적자</span>
                  <span className="text-xs font-semibold text-red-100">1개 📈</span>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-3 border-gray-600 mb-3">
              <div className="text-xs text-gray-300 w-full space-y-1">
                <div className="flex justify-between gap-1 py-0.5">
                  <span className="w-20">최고YOY:</span>
                  <span className="w-16 text-right font-semibold text-green-300">Yoho 152%</span>
                </div>
                <div className="flex justify-between gap-1 py-0.5">
                  <span className="w-20">최저YOY:</span>
                  <span className="w-16 text-right font-semibold text-red-300">Senado 65%</span>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-3 border-gray-600">
              <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded p-2">
                <div className="text-xs text-blue-200 font-semibold mb-1">💡 전략 인사이트</div>
                <div className="text-xs text-blue-100">
                  적자 7개 매장 집중 관리 필요, Yoho·NTP3 성장 모멘텀 수익화 전략 수립<br/>
                  <span className="font-bold text-yellow-300">⚠️ BEP 달성 기준: 임차료+인건비율 45% 미만 유지 필요</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* 흑자 & 매출개선 */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-md p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-green-800">흑자 & 매출개선</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700">
                ✅ 최우수
              </div>
            </div>
            
            <div className="text-2xl font-bold mb-2 text-green-900">4개 매장</div>
            <div className="text-xs mb-3 text-green-700"><span className="text-blue-600 font-semibold">직접이익 합계 +778K</span> | 평균 YOY 115%</div>
            
            <div className="border-t pt-3 space-y-1.5 border-green-200 mb-3">
              {[
                { name: 'TMT', yoy: '132%', profit: '+111K', annual: '106%', color: 'green' },
                { name: 'LANGHAM', yoy: '118%', profit: '+279K', annual: '107%', color: 'green' },
                { name: 'APM', yoy: '109%', profit: '+258K', annual: '96%', color: 'green' },
                { name: 'I Square', yoy: '101%', profit: '+130K', annual: '98%', color: 'green' }
              ].map((store, idx) => (
                <div key={idx}>
                  <button
                    onClick={() => toggleActionItem(`green-${idx}`)}
                    className="w-full bg-white rounded-lg p-2 border border-green-300 hover:bg-green-50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-green-800">{store.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-green-600">{store.profit}</span>
                        <span className="text-sm font-bold text-green-700">YOY {store.yoy}</span>
                        {expandedItems[`green-${idx}`] ? (
                          <ChevronDown className="w-4 h-4 text-green-600" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                    </div>
                  </button>
                  {expandedItems[`green-${idx}`] && (
                    <div className="ml-4 mt-1 text-xs bg-green-50 rounded p-2 border-l-2 border-green-400">
                      <div className="text-green-600">직접이익 {store.profit} | 연간 {store.annual}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* 임차료/인건비율 특징 */}
            <div className="border-t pt-3 border-green-200">
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded p-2.5 border-2 border-green-400">
                <button 
                  onClick={() => setShowProfitStores(!showProfitStores)}
                  className="w-full flex justify-between items-center text-sm text-green-900 font-bold hover:bg-green-200 p-1.5 rounded transition-colors"
                >
                  <span>📊 임차료/인건비율 합계: <span className="text-base text-green-600">33.8%</span></span>
                  {showProfitStores ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {showProfitStores && (
                  <div className="mt-2 pt-2 border-t border-green-300">
                    <div className="space-y-1 text-xs text-green-700">
                      <div className="flex justify-between">
                        <span className="font-semibold">임차료율:</span>
                        <span className="font-bold">22.9%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">인건비율:</span>
                        <span className="font-bold">10.9%</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-green-300 text-green-600 text-[10px]">
                        • TMT: 임차료 17.2%, 인건비 11.2% (효율적)<br/>
                        • APM: 임차료 15.8%, 인건비 12.6% (양호)<br/>
                        • LANGHAM: 임차료 23.3%, 인건비 9.1% (우수)<br/>
                        • I Square: 임차료 29.0%, 인건비 8.6% (임차료 높으나 인건비 우수)
                      </div>
                      <div className="mt-2 pt-2 border-t border-green-200 text-[8px] text-green-500 italic">
                        * 기준: 가중평균 (각 매장 비용합계 ÷ 매출합계)
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* 전략 인사이트 */}
            <div className="border-t pt-3 border-green-200 mt-3">
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded p-2">
                <div className="text-xs text-green-800 font-semibold mb-1">💡 전략 인사이트</div>
                <div className="text-xs text-green-700">성공 모델 분석 후 타 매장 롤아웃, 베스트 프랙티스 공유 세션 운영</div>
              </div>
            </div>
          </div>

          {/* 흑자 & 매출악화 */}
          <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-lg shadow-md p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-blue-800">흑자 & 매출악화</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-700">
                ⚠️ 주의
              </div>
            </div>
            
            <div className="text-2xl font-bold mb-2 text-blue-900">2개 매장</div>
            <div className="text-xs mb-3 text-blue-700"><span className="text-blue-600 font-semibold">직접이익 합계 +114K</span> | 평균 YOY 94%</div>
            
            <div className="border-t pt-3 space-y-1.5 border-blue-200 mb-3">
              {[
                { name: 'NTP', yoy: '96%', profit: '+45K', annual: '92%' },
                { name: 'City(아)', yoy: '92%', profit: '+69K', annual: '91%' }
              ].map((store, idx) => (
                <div key={idx}>
                  <button
                    onClick={() => toggleActionItem(`blue-${idx}`)}
                    className="w-full bg-white rounded-lg p-2 border border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-blue-800">{store.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-blue-600">{store.profit}</span>
                        <span className="text-sm font-bold text-orange-700">YOY {store.yoy}</span>
                        {expandedItems[`blue-${idx}`] ? (
                          <ChevronDown className="w-4 h-4 text-blue-600" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                    </div>
                  </button>
                  {expandedItems[`blue-${idx}`] && (
                    <div className="ml-4 mt-1 text-xs bg-blue-50 rounded p-2 border-l-2 border-blue-400">
                      <div className="text-blue-600">직접이익 {store.profit} | 연간 {store.annual}</div>
                      {store.note && <div className="text-gray-600 mt-1 italic">{store.note}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* 임차료/인건비율 특징 */}
            <div className="border-t pt-3 border-blue-200">
              <div className="bg-gradient-to-r from-blue-100 to-sky-100 rounded p-2.5 border-2 border-blue-400">
                <button 
                  onClick={() => setShowLossStores(!showLossStores)}
                  className="w-full flex justify-between items-center text-sm text-blue-900 font-bold hover:bg-blue-200 p-1.5 rounded transition-colors"
                >
                  <span>📊 임차료/인건비율 합계: <span className="text-base text-blue-600">42.2%</span></span>
                  {showLossStores ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {showLossStores && (
                  <div className="mt-2 pt-2 border-t border-blue-300">
                    <div className="space-y-1 text-xs text-blue-700">
                      <div className="flex justify-between">
                        <span className="font-semibold">임차료율:</span>
                        <span className="font-bold">28.5%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">인건비율:</span>
                        <span className="font-bold">13.7%</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-blue-300 text-blue-600 text-[10px]">
                        • NTP: 임차료 35.0%, 인건비 13.0% (비용 관리 필요)<br/>
                        • City(아): 임차료 17.3%, 인건비 11.4% (양호)
                      </div>
                      <div className="mt-2 pt-2 border-t border-blue-200 text-[8px] text-blue-500 italic">
                        * 기준: 가중평균 (각 매장 비용합계 ÷ 매출합계)
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* 전략 인사이트 */}
            <div className="border-t pt-3 border-blue-200 mt-3">
              <div className="bg-gradient-to-r from-blue-100 to-sky-100 rounded p-2">
                <div className="text-xs text-blue-800 font-semibold mb-1">💡 전략 인사이트</div>
                <div className="text-xs text-blue-700">흑자 유지 중이나 트래픽 감소 원인 분석, 프로모션 강화로 매출 반등 유도</div>
              </div>
            </div>
          </div>

          {/* 적자 & 매출개선 */}
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg shadow-md p-4 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-yellow-800">적자 & 매출개선</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-yellow-100 text-yellow-700">
                📈 개선중
              </div>
            </div>
            
            <div className="text-2xl font-bold mb-2 text-yellow-900">2개 매장</div>
            <div className="text-xs mb-3 text-yellow-700"><span className="text-red-600 font-semibold">직접손실 합계 -377K</span> | 평균 YOY 149%</div>
            
            <div className="border-t pt-3 space-y-1.5 border-yellow-200 mb-3">
              {[
                { name: 'Yoho', yoy: '152%', profit: '-210K', annual: '105%', note: '고성장 중, 수익성 개선 필요' },
                { name: 'NTP3', yoy: '146%', profit: '-167K', annual: '102%', note: '과재고 판매로 개선 중' }
              ].map((store, idx) => (
                <div key={idx}>
                  <button
                    onClick={() => toggleActionItem(`yellow-${idx}`)}
                    className="w-full bg-white rounded-lg p-2 border border-yellow-300 hover:bg-yellow-50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-yellow-800">{store.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-600">{store.profit}</span>
                        <span className="text-sm font-bold text-green-700">YOY {store.yoy}</span>
                        {expandedItems[`yellow-${idx}`] ? (
                          <ChevronDown className="w-4 h-4 text-yellow-600" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-yellow-600" />
                        )}
                      </div>
                    </div>
                  </button>
                  {expandedItems[`yellow-${idx}`] && (
                    <div className="ml-4 mt-1 text-xs bg-yellow-50 rounded p-2 border-l-2 border-yellow-400">
                      <div className="text-red-600">직접손실 {store.profit} | 연간 {store.annual}</div>
                      {store.note && <div className="text-gray-600 mt-1 italic">{store.note}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* 임차료/인건비율 특징 */}
            <div className="border-t pt-3 border-yellow-200">
              <div className="bg-gradient-to-r from-yellow-100 to-amber-100 rounded p-2.5 border-2 border-yellow-500">
                <button 
                  onClick={() => setShowAccInventoryDetail(!showAccInventoryDetail)}
                  className="w-full flex justify-between items-center text-sm text-yellow-900 font-bold hover:bg-yellow-200 p-1.5 rounded transition-colors"
                >
                  <span>📊 임차료/인건비율 합계: <span className="text-base text-red-600">82.7%</span></span>
                  {showAccInventoryDetail ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {showAccInventoryDetail && (
                  <div className="mt-2 pt-2 border-t border-yellow-300">
                    <div className="space-y-1 text-xs text-yellow-700">
                      <div className="flex justify-between">
                        <span className="font-semibold">임차료율:</span>
                        <span className="font-bold text-red-600">61.9%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">인건비율:</span>
                        <span className="font-bold text-red-600">20.8%</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-yellow-300 text-yellow-600 text-[10px]">
                        <div className="font-semibold text-red-700 mb-1">⚠️ 고비용 구조 (긴급 개선 필요)</div>
                        • Yoho: 임차료 53.8%, 인건비 15.2% (매출 확대 시 개선 가능)<br/>
                        • NTP3: 임차료 96.3%, 인건비 44.9% (특수 매장, 과재고 소진 목적)
                      </div>
                      <div className="mt-2 pt-2 border-t border-yellow-200 text-[8px] text-yellow-500 italic">
                        * 기준: 가중평균 (각 매장 비용합계 ÷ 매출합계)
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* 전략 인사이트 */}
            <div className="border-t pt-3 border-yellow-200 mt-3">
              <div className="bg-gradient-to-r from-yellow-100 to-amber-100 rounded p-2">
                <div className="text-xs text-yellow-800 font-semibold mb-1">💡 전략 인사이트</div>
                <div className="text-xs text-yellow-700">고성장 모멘텀 유지하며 직접비 효율화로 BEP 조기 달성 목표</div>
              </div>
            </div>
          </div>

          {/* 적자 & 매출악화 */}
          <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-lg shadow-md p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-red-800">적자 & 매출악화</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-red-100 text-red-700">
                🚨 긴급
              </div>
            </div>
            
            <div className="text-2xl font-bold mb-2 text-red-900">6개 매장</div>
            <div className="text-xs mb-3 text-red-700"><span className="text-red-600 font-semibold">직접손실 합계 -440K</span> | 평균 YOY 84% (LCX 제외)</div>
            
            <div className="border-t pt-3 space-y-1.5 border-red-200 mb-3">
              {[
                { name: 'Time Square', yoy: '87%', profit: '-174K', annual: '81%' },
                { name: 'Hysan', yoy: '93%', profit: '-106K', annual: '92%' },
                { name: 'Mega(아)', yoy: '82%', profit: '-68K', annual: '85%' },
                { name: 'Mongkok', yoy: '86%', profit: '-45K', annual: '87%' },
                { name: 'Moko(아)', yoy: '84%', profit: '-28K', annual: '77%' },
                { name: 'Yuen(아)', yoy: '69%', profit: '-19K', annual: '75%' },
                { name: 'LCX', yoy: '91%', profit: '-219K', note: '10/13~11/7 리뉴얼공사', color: 'gray' }
              ].map((store, idx) => (
                <div key={idx}>
                  <button
                    onClick={() => toggleActionItem(`red-${idx}`)}
                    className={`w-full rounded-lg p-2 border ${
                      store.color === 'gray'
                        ? 'bg-gray-100 border-gray-300 hover:bg-gray-200'
                        : 'bg-white border-red-300 hover:bg-red-50'
                    } transition-colors`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`text-xs font-bold ${
                        store.color === 'gray' ? 'text-gray-500' : 'text-red-800'
                      }`}>{store.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${
                          store.color === 'gray' ? 'text-gray-500' : 'text-red-600'
                        }`}>{store.profit}</span>
                        <span className={`text-sm font-bold ${
                          store.color === 'gray' ? 'text-gray-500' : 'text-orange-700'
                        }`}>YOY {store.yoy}</span>
                        {expandedItems[`red-${idx}`] ? (
                          <ChevronDown className={`w-4 h-4 ${
                            store.color === 'gray' ? 'text-gray-500' : 'text-red-600'
                          }`} />
                        ) : (
                          <ChevronRight className={`w-4 h-4 ${
                            store.color === 'gray' ? 'text-gray-500' : 'text-red-600'
                          }`} />
                        )}
                      </div>
                    </div>
                  </button>
                  {expandedItems[`red-${idx}`] && (
                    <div className={`ml-4 mt-1 text-xs rounded p-2 border-l-2 ${
                      store.color === 'gray'
                        ? 'bg-gray-50 border-gray-400 text-gray-600'
                        : 'bg-red-50 border-red-400 text-red-600'
                    }`}>
                      <div>직접손실 {store.profit}{store.annual ? ` | 연간 ${store.annual}` : ''}</div>
                      {store.note && <div className="text-gray-600 mt-1 italic">{store.note}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* 임차료/인건비율 특징 */}
            <div className="border-t pt-3 border-red-200">
              <div className="bg-gradient-to-r from-red-100 to-rose-100 rounded p-2.5 border-2 border-red-400">
                <button 
                  onClick={() => setShowEndInventoryDetail(!showEndInventoryDetail)}
                  className="w-full flex justify-between items-center text-sm text-red-900 font-bold hover:bg-red-200 p-1.5 rounded transition-colors"
                >
                  <span>📊 임차료/인건비율 합계: <span className="text-base text-red-600">60.1%</span></span>
                  {showEndInventoryDetail ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {showEndInventoryDetail && (
                  <div className="mt-2 pt-2 border-t border-red-300">
                    <div className="space-y-1 text-xs text-red-700">
                      <div className="flex justify-between">
                        <span className="font-semibold">임차료율:</span>
                        <span className="font-bold text-red-600">42.4%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">인건비율:</span>
                        <span className="font-bold text-red-600">17.7%</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-red-300 text-[10px]">
                        <div className="font-semibold text-red-800 mb-1">🚨 고비용 매장 (임차료율 40% 이상)</div>
                        <div className="text-red-600 space-y-0.5">
                          • Time Square: 임차료 59.8%, 인건비 23.4%<br/>
                          • Hysan: 임차료 39.4%, 인건비 19.7%<br/>
                          • Mongkok: 임차료 36.2%, 인건비 11.6%<br/>
                          • Megamall: 임차료 35.2%, 인건비 19.7%
                        </div>
                        <div className="font-semibold text-red-800 mt-2 mb-1">⚠️ 종료/리뉴얼 매장</div>
                        <div className="text-gray-600 space-y-0.5">
                          • LCX: 임차료 71.7%, 인건비 22.8% (리뉴얼)<br/>
                          • WTC: 임차료 257.1%, 인건비 78.6% (종료)
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-red-200 text-[8px] text-red-500 italic">
                        * 기준: 가중평균 (각 매장 비용합계 ÷ 매출합계)
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* 전략 인사이트 */}
            <div className="border-t pt-3 border-red-200 mt-3">
              <div className="bg-gradient-to-r from-red-100 to-rose-100 rounded p-2">
                <div className="text-xs text-red-800 font-semibold mb-1">💡 전략 인사이트</div>
                <div className="text-xs text-red-700">Time Square·Yoho·Hysan 우선 개선, 임차료 협상 및 직접비 절감 집중</div>
              </div>
            </div>
          </div>

          {/* 마카오 특별 섹션 */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg shadow-md p-4 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-purple-800">마카오 매장 종합</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-purple-100 text-purple-700">
                🎰 MC
              </div>
            </div>
            
            <div className="text-2xl font-bold mb-2 text-purple-900">4개 매장</div>
            <div className="text-xs mb-3 text-purple-700"><span className="text-blue-600 font-semibold">직접이익 합계 +553K</span> | 전체 YOY 78%</div>
            
            <div className="border-t pt-3 space-y-1.5 border-purple-200 mb-3">
              {[
                { name: 'Venetian', yoy: '82%', profit: '+617K', annual: '82%', status: '✅', note: '최대 흑자' },
                { name: 'Senado', yoy: '65%', profit: '+48K', annual: '80%', status: '⚠️', note: '흑자유지' },
                { name: 'Londoner', yoy: '86%', profit: '+11K', annual: '79%', status: '⚠️', note: '미미한 흑자' },
                { name: 'Senado(아)', yoy: '150%', profit: '-193K', annual: '106%', status: '📈', note: '고성장' }
              ].map((store, idx) => (
                <div key={idx}>
                  <button
                    onClick={() => toggleActionItem(`purple-${idx}`)}
                    className="w-full bg-white rounded-lg p-2 border border-purple-300 hover:bg-purple-50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-purple-800">{store.status} {store.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${store.profit.includes('-') ? 'text-red-600' : 'text-purple-600'}`}>{store.profit}</span>
                        <span className={`text-sm font-bold ${store.yoy.includes('150') || store.yoy.includes('86') ? 'text-green-700' : 'text-orange-700'}`}>YOY {store.yoy}</span>
                        {expandedItems[`purple-${idx}`] ? (
                          <ChevronDown className="w-4 h-4 text-purple-600" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-purple-600" />
                        )}
                      </div>
                    </div>
                  </button>
                  {expandedItems[`purple-${idx}`] && (
                    <div className="ml-4 mt-1 text-xs bg-purple-50 rounded p-2 border-l-2 border-purple-400">
                      <div className={store.profit.includes('-') ? 'text-red-600' : 'text-blue-600'}>
                        {store.profit.includes('-') ? '직접손실' : '직접이익'} {store.profit} | 연간 {store.annual}
                      </div>
                      {store.note && <div className="text-gray-600 mt-1 italic">{store.note}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* 임차료/인건비율 특징 */}
            <div className="border-t pt-3 border-purple-200">
              <div className="bg-gradient-to-r from-purple-100 to-indigo-100 rounded p-2.5 border-2 border-purple-400">
                <button 
                  onClick={() => setShowPastSeasonDetail(!showPastSeasonDetail)}
                  className="w-full flex justify-between items-center text-sm text-purple-900 font-bold hover:bg-purple-200 p-1.5 rounded transition-colors"
                >
                  <span>📊 임차료/인건비율 합계: <span className="text-base text-purple-600">38.8%</span></span>
                  {showPastSeasonDetail ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {showPastSeasonDetail && (
                  <div className="mt-2 pt-2 border-t border-purple-300">
                    <div className="space-y-1 text-xs text-purple-700">
                      <div className="flex justify-between">
                        <span className="font-semibold">임차료율:</span>
                        <span className="font-bold">30.5%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">인건비율:</span>
                        <span className="font-bold">8.3%</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-purple-300 text-purple-600 text-[10px]">
                        • Venetian: 임차료 24.9%, 인건비 5.1% (우수)<br/>
                        • Senado: 임차료 40.6%, 인건비 9.8% (임차료 관리 필요)<br/>
                        • Londoner: 임차료 32.9%, 인건비 10.5% (양호)<br/>
                        • Senado(아): 임차료 33.7%, 인건비 18.5% (인건비 높음)
                      </div>
                      <div className="mt-2 pt-2 border-t border-purple-200 text-[8px] text-purple-500 italic">
                        * 기준: 가중평균 (각 매장 비용합계 ÷ 매출합계)
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* 전략 인사이트 */}
            <div className="border-t pt-3 border-purple-200 mt-3">
              <div className="bg-gradient-to-r from-purple-100 to-indigo-100 rounded p-2">
                <div className="text-xs text-purple-800 font-semibold mb-1">💡 전략 인사이트</div>
                <div className="text-xs text-purple-700">VMD 현지 발탁 및 프로모션 대응 속도 개선으로 전체 매출 반등 유도</div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">3,137K</div>
                <div className="text-xs mb-3 text-green-600">YOY 76% (▼ 1,000K)</div>
                
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
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">지급수수료</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-orange-100 text-orange-700">
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
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">0.7%</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">1,964K</div>
                <div className="text-xs mb-3 text-red-600">YOY 194% (+1,010K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">14.7%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">1.0%</span>
                  </div>
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
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">3,052K</div>
                <div className="text-xs mb-3 text-red-600">YOY 95% (+152K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">물류비</span>
                    <span className="text-xs font-semibold text-gray-800">1,204K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">임차료</span>
                    <span className="text-xs font-semibold text-gray-800">1,001K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">감가상각비</span>
                    <span className="text-xs font-semibold text-gray-800">708K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">여비교통비</span>
                    <span className="text-xs font-semibold text-gray-800">430K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">보험료</span>
                    <span className="text-xs font-semibold text-gray-800">184K</span>
                  </div>
                </div>
              </>
            )}
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

      {/* 직접비 & 유통수수료 요약 섹션 */}
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
                <div className="text-xs mb-3 text-green-600">YOY 76% (▼ 1,000K)</div>
                
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
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-gray-700">지급수수료</div>
              <div className="text-xs font-bold px-2 py-1 rounded bg-orange-100 text-orange-700">
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
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">0.7%</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">1,964K</div>
                <div className="text-xs mb-3 text-red-600">YOY 194% (+1,010K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">전체 영업비 중</span>
                    <span className="text-xs font-semibold text-gray-800">14.7%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">매출대비율</span>
                    <span className="text-xs font-semibold text-gray-800">1.0%</span>
                  </div>
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
              </>
            ) : (
              <>
                <div className="text-2xl font-bold mb-2 text-gray-800">3,052K</div>
                <div className="text-xs mb-3 text-red-600">YOY 95% (+152K)</div>
                
                <div className="border-t pt-3 space-y-1.5 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">물류비</span>
                    <span className="text-xs font-semibold text-gray-800">1,204K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">임차료</span>
                    <span className="text-xs font-semibold text-gray-800">1,001K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">감가상각비</span>
                    <span className="text-xs font-semibold text-gray-800">708K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">여비교통비</span>
                    <span className="text-xs font-semibold text-gray-800">430K</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">보험료</span>
                    <span className="text-xs font-semibold text-gray-800">184K</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
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
                          <div>• City(아)</div>
                          <div>• Mega(아)</div>
                          <div>• Moko(아)</div>
                          <div>• Yuen(아)</div>
                        </div>
                        <div className="font-semibold text-gray-700 mt-2 mb-1">MC Retail (3개)</div>
                        <div className="grid grid-cols-2 gap-1 pl-2 text-gray-600">
                          <div>• Venetian</div>
                          <div>• Senado</div>
                          <div>• Londoner</div>
                        </div>
                        <div className="font-semibold text-gray-700 mt-2 mb-1">MC Outlet (1개)</div>
                        <div className="pl-2 text-gray-600">
                          <div>• Senado(아)</div>
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
                        <div>• Senado(아)</div>
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
      <div className="mt-4 bg-white rounded-lg shadow-md p-4">
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

      {/* 직접비 & 유통수수료 요약 섹션 */}
      <div className="mt-4 bg-white rounded-lg shadow-md p-4">
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
                
                {/* 당월 증감분석 토글 */}
                <div className="border-t pt-3 mt-3">
                  <button 
                    onClick={() => setShowPastSeasonDetail(!showPastSeasonDetail)}
                    className="text-xs text-pink-600 hover:text-pink-800 font-semibold flex items-center w-full justify-between"
                  >
                    <span>당월 증감 분석</span>
                    {showPastSeasonDetail ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {showPastSeasonDetail && (
                  <div className="mt-3 pt-3 border-t bg-pink-50 rounded p-2">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-700">• Recruitment Fee</span>
                        <span className="font-semibold text-red-600">+95K (4569%)</span>
                      </div>
                      <div className="pl-4 text-[10px] text-gray-600">
                        마케팅직원 1명 채용수수료
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">• Other Professional Fee</span>
                        <span className="font-semibold text-blue-600">△20K (11%)</span>
                      </div>
                      <div className="pl-4 text-[10px] text-gray-600">
                        전년 물류 용역료 24K 감소
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">• License/Registration Fee</span>
                        <span className="font-semibold text-red-600">+3K (180%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">• Bank Charges</span>
                        <span className="font-semibold text-blue-600">△1K (89%)</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-pink-200 text-xs text-pink-800 font-semibold">
                      → 순증가 +77K (주요: 채용수수료 +95K)
                    </div>
                  </div>
                )}
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
                <div className="text-2xl font-bold mb-2 text-gray-800">260K</div>
                <div className="text-xs mb-3 text-blue-600">YOY 93% (▼20K)</div>
                
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
                    <span className="text-xs text-gray-600">기타</span>
                    <span className="text-xs font-semibold text-gray-800">14K</span>
                  </div>
                </div>
                
                {/* 당월 증감분석 토글 */}
                <div className="border-t pt-3 mt-3">
                  <button 
                    onClick={() => setShowDiscoveryDetail(!showDiscoveryDetail)}
                    className="text-xs text-orange-600 hover:text-orange-800 font-semibold flex items-center w-full justify-between"
                  >
                    <span>당월 증감 분석</span>
                    {showDiscoveryDetail ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {showDiscoveryDetail && (
                  <div className="mt-3 pt-3 border-t bg-orange-50 rounded p-2">
                    <div className="space-y-1.5 text-xs">
                      <div className="font-semibold text-orange-800 mb-2">임차료 (70% YOY, △36K)</div>
                      <div className="flex justify-between pl-2">
                        <span className="text-gray-700">• Base Rent</span>
                        <span className="font-semibold text-blue-600">△36K (69%)</span>
                      </div>
                      <div className="pl-4 text-[10px] text-gray-600">
                        주재원 주택보조금 절감
                      </div>
                      <div className="flex justify-between pl-2">
                        <span className="text-gray-700">• Government Rate</span>
                        <span className="font-semibold">0K (100%)</span>
                      </div>
                      <div className="flex justify-between pl-2">
                        <span className="text-gray-700">• Other Rent</span>
                        <span className="font-semibold text-blue-600">△0K (88%)</span>
                      </div>
                      
                      <div className="font-semibold text-orange-800 mb-2 mt-3 pt-2 border-t border-orange-200">물류비 (94% YOY, △6K)</div>
                      <div className="flex justify-between pl-2">
                        <span className="text-gray-700">• Storage</span>
                        <span className="font-semibold text-blue-600">△12K (88%)</span>
                      </div>
                      <div className="flex justify-between pl-2">
                        <span className="text-gray-700">• Courier</span>
                        <span className="font-semibold text-red-600">+6K (178%)</span>
                      </div>
                      
                      <div className="font-semibold text-orange-800 mb-2 mt-3 pt-2 border-t border-orange-200">기타 항목 (95% YOY, △1K)</div>
                      <div className="flex justify-between pl-2">
                        <span className="text-gray-700">• 수선유지비</span>
                        <span className="font-semibold text-blue-600">△4K (47%)</span>
                      </div>
                      <div className="flex justify-between pl-2">
                        <span className="text-gray-700">• 통신비</span>
                        <span className="font-semibold text-red-600">+1K (118%)</span>
                      </div>
                      <div className="flex justify-between pl-2">
                        <span className="text-gray-700">• 소모품비</span>
                        <span className="font-semibold">0K (103%)</span>
                      </div>
                      <div className="flex justify-between pl-2">
                        <span className="text-gray-700">• 수도광열비</span>
                        <span className="font-semibold text-blue-600">△0K (96%)</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-orange-200 text-xs text-orange-800 font-semibold">
                      → 총 절감 △20K (주요: 주택보조금 △36K, 물류비 △6K)
                    </div>
                  </div>
                )}
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

export default CEOReport;