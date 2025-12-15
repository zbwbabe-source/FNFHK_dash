'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface CFItem {
  prev_year: number;
  current_1_11: number;  // 2025년 1~11월 (실적)
  current_12: number;    // 2025년 12월 (E)
  current_total: number; // 2025년 (E)
}

interface CFData {
  period: string;
  summary: {
    beginning_cash: {
      prev_year: number;
      current: number;
      current_12?: number;  // 2025년 12월 기초현금
    };
    operating_cash_flow: CFItem;
    investing_cash_flow: CFItem;
    financing_cash_flow: CFItem;
    net_cash_flow: CFItem;
    ending_cash: {
      prev_year: number;
      current_1_11: number;  // 2025년 1~11월 (실적)
      current_12: number;    // 2025년 12월 (E)
      current_total: number; // 2025년 (E)
    };
  };
  operating_activities: {
    sales_hk: CFItem;
    sales_tw: CFItem;
    sales_total: CFItem;
    goods_and_duties_hk: CFItem;
    goods_and_duties_tw: CFItem;
    goods_and_duties_total: CFItem;
    operating_expenses_hk: CFItem;
    operating_expenses_tw: CFItem;
    operating_expenses_total: CFItem;
  };
  investing_activities: {
    hk_capex: CFItem;
    tw_capex: CFItem;
    total_capex: CFItem;
  };
  financing_activities: {
    total: CFItem;
  };
  ending_cash_detail: {
    hk_ending_cash: CFItem;
    tw_ending_cash: CFItem;
  };
}

function CashFlowPageContent() {
  const searchParams = useSearchParams();
  const periodParam = searchParams.get('period') || '2511';
  const [selectedPeriod, setSelectedPeriod] = useState(periodParam || '2511');
  const [cfData, setCfData] = useState<CFData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showDetailColumns, setShowDetailColumns] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/dashboard/cf-data-${selectedPeriod}.json`);
        if (!response.ok) {
          throw new Error('데이터를 불러올 수 없습니다');
        }
        const data = await response.json();
        setCfData(data);
      } catch (error) {
        console.error('Error loading cash flow data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedPeriod]);

  const formatNumber = (value: number): string => {
    if (value === 0) return '0';
    return Math.abs(value).toLocaleString();
  };

  const formatChange = (value: number): string => {
    if (value === 0) return '0';
    const sign = value > 0 ? '+' : '△';
    return `${sign}${Math.abs(value).toLocaleString()}`;
  };

  const getChangeClass = (value: number): string => {
    if (value === 0) return 'text-gray-500';
    return value > 0 ? 'text-green-600' : 'text-red-600';
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const toggleItem = (item: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(item)) {
      newExpanded.delete(item);
    } else {
      newExpanded.add(item);
    }
    setExpandedItems(newExpanded);
  };

  const toggleAll = () => {
    if (expandedSections.size >= 3) {
      setExpandedSections(new Set());
    } else {
      setExpandedSections(new Set(['opcf', 'invcf', 'fincf']));
    }
  };

  const renderRow = (
    label: string,
    item: CFItem | undefined,
    indent: number = 0,
    isHeader: boolean = false,
    note?: string,
    toggleId?: string
  ) => {
    if (!item) return null;

    const indentStyle = indent > 0 ? { paddingLeft: `${indent * 1.5}rem` } : {};
    const fontClass = isHeader ? 'font-bold' : 'font-semibold';
    const bgClass = isHeader ? 'bg-blue-50' : '';
    const cursorClass = toggleId ? 'cursor-pointer' : '';

    // 유입(+)은 초록색, 유출(-)은 빨간색
    const isInflow = item.current_total > 0;
    const amountColorClass = isInflow ? 'text-green-600' : 'text-red-600';

    const yoy = item.current_total - item.prev_year;
    const yoyPercent = item.prev_year !== 0 
      ? Math.round((item.current_total / item.prev_year) * 100) 
      : 0;

    // 금액 표시 함수 (유입은 +, 유출은 -)
    const formatAmount = (value: number): string => {
      if (value === 0) return '0';
      const sign = value > 0 ? '+' : '-';
      return `${sign}${Math.abs(value).toLocaleString()}`;
    };

    const handleClick = () => {
      if (toggleId) {
        toggleItem(toggleId);
      }
    };

    return (
      <tr className={`hover:bg-gray-100 ${bgClass} ${cursorClass}`} onClick={handleClick}>
        <td className={`px-2 py-3 border border-gray-300 ${fontClass}`} style={indentStyle}>{label}</td>
        <td className={`px-2 py-3 border border-gray-300 text-right ${fontClass} ${item.prev_year > 0 ? 'text-green-600' : item.prev_year < 0 ? 'text-red-600' : 'text-gray-900'}`}>
          {formatAmount(item.prev_year)}
        </td>
        {showDetailColumns && (
          <>
            <td className={`px-2 py-3 border border-gray-300 text-right ${fontClass} ${item.current_1_11 > 0 ? 'text-green-600' : item.current_1_11 < 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {formatAmount(item.current_1_11)}
            </td>
            <td className={`px-2 py-3 border border-gray-300 text-right ${fontClass} ${item.current_12 > 0 ? 'text-green-600' : item.current_12 < 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {formatAmount(item.current_12)}
            </td>
          </>
        )}
        <td className={`px-2 py-3 border border-gray-300 text-right ${fontClass} ${amountColorClass}`}>
          {formatAmount(item.current_total)}
        </td>
        <td className={`px-2 py-3 border border-gray-300 text-right ${fontClass} ${getChangeClass(yoy)}`}>
          {formatChange(yoy)} ({yoyPercent}%)
        </td>
        <td className={`px-4 py-3 border border-gray-300 text-left ${fontClass} text-gray-700 text-sm`}>
          {note || ''}
        </td>
      </tr>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">데이터 로딩 중...</div>
      </div>
    );
  }

  if (!cfData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-600">데이터를 불러올 수 없습니다</div>
      </div>
    );
  }

  const { summary, operating_activities, investing_activities, financing_activities, ending_cash_detail } = cfData;

  // 요약 계산
  const opcfYoy = summary.operating_cash_flow.current_total - summary.operating_cash_flow.prev_year;
  const opcfYoyPercent = summary.operating_cash_flow.prev_year !== 0
    ? Math.round((summary.operating_cash_flow.current_total / summary.operating_cash_flow.prev_year) * 100)
    : 0;

  // 현금 순유출 계산 (순현금흐름 사용)
  const currentNetCashFlow = summary.net_cash_flow.current_total;
  const prevNetCashFlow = summary.net_cash_flow.prev_year;
  const netCashFlowYoy = currentNetCashFlow - prevNetCashFlow;

  // 영업활동 항목별 증감 계산
  const salesTotalYoy = operating_activities.sales_total.current_total - operating_activities.sales_total.prev_year;
  const salesHkYoy = operating_activities.sales_hk.current_total - operating_activities.sales_hk.prev_year;
  const salesTwYoy = operating_activities.sales_tw.current_total - operating_activities.sales_tw.prev_year;
  const goodsDutiesTotalYoy = operating_activities.goods_and_duties_total.current_total - operating_activities.goods_and_duties_total.prev_year;
  const goodsDutiesHkYoy = operating_activities.goods_and_duties_hk.current_total - operating_activities.goods_and_duties_hk.prev_year;
  const goodsDutiesTwYoy = operating_activities.goods_and_duties_tw.current_total - operating_activities.goods_and_duties_tw.prev_year;
  const operatingExpensesTotalYoy = operating_activities.operating_expenses_total.current_total - operating_activities.operating_expenses_total.prev_year;
  const operatingExpensesHkYoy = operating_activities.operating_expenses_hk.current_total - operating_activities.operating_expenses_hk.prev_year;
  const operatingExpensesTwYoy = operating_activities.operating_expenses_tw.current_total - operating_activities.operating_expenses_tw.prev_year;

  // 영업활동 비고 생성
  const operatingNote = (() => {
    const netAmount = summary.operating_cash_flow.current_total;
    const isNetInflow = netAmount > 0;
    const prefix = isNetInflow ? '순유입' : '순유출';
    const netAmountStr = `${prefix} ${(Math.abs(netAmount) / 1000).toFixed(1)}m HKD`;
    
    const salesTotal = operating_activities.sales_total.current_total;
    const goodsDutiesTotal = operating_activities.goods_and_duties_total.current_total;
    const operatingExpensesTotal = operating_activities.operating_expenses_total.current_total;
    
    const details: string[] = [];
    details.push(`매출 ${salesTotal > 0 ? '+' : ''}${(salesTotal / 1000).toFixed(1)}m`);
    details.push(`물품대·관세 ${goodsDutiesTotal > 0 ? '+' : ''}${(goodsDutiesTotal / 1000).toFixed(1)}m`);
    details.push(`운영비 ${operatingExpensesTotal > 0 ? '+' : ''}${(operatingExpensesTotal / 1000).toFixed(1)}m`);

    const detailsStr = ` (${details.join(', ')})`;
    return `${netAmountStr}${detailsStr}`;
  })();

  const invcfYoy = summary.investing_cash_flow.current_total - summary.investing_cash_flow.prev_year;
  const invcfYoyPercent = summary.investing_cash_flow.prev_year !== 0
    ? Math.round((invcfYoy / Math.abs(summary.investing_cash_flow.prev_year)) * 100)
    : 0;

  // 투자활동 비고 생성
  const investingNote = (() => {
    const netAmount = summary.investing_cash_flow.current_total;
    const prefix = '순유출';
    const netAmountStr = `${prefix} ${(Math.abs(netAmount) / 1000).toFixed(1)}m HKD`;
    
    const hkCapex = investing_activities.hk_capex.current_total;
    const twCapex = investing_activities.tw_capex.current_total;
    
    const details = `홍콩 ${(Math.abs(hkCapex) / 1000).toFixed(1)}m, 대만 ${(Math.abs(twCapex) / 1000).toFixed(1)}m`;
    
    return `${netAmountStr} (${details})`;
  })();

  // 재무활동 비고 생성
  const financingNote = (() => {
    const netAmount = financing_activities.total.current_total;
    const isNetInflow = netAmount > 0;
    const prefix = isNetInflow ? '순유입' : '순유출';
    const netAmountStr = `${prefix} ${(Math.abs(netAmount) / 1000).toFixed(1)}m HKD`;
    
    if (netAmount === 0 && financing_activities.total.prev_year === 0) {
      return `${netAmountStr}, 차입금 입출금 없음. 무차입 경영 유지`;
    }
    
    const financingYoy = financing_activities.total.current_total - financing_activities.total.prev_year;
    const details = financingYoy !== 0 ? `, ${financingYoy > 0 ? '+' : '△'}${(Math.abs(financingYoy) / 1000).toFixed(1)}m` : '';
    return `${netAmountStr}${details}`;
  })();

  const endingCashYoy = summary.ending_cash.current_total - summary.ending_cash.prev_year;
  const endingCashYoyPercent = summary.ending_cash.prev_year !== 0
    ? Math.round((summary.ending_cash.current_total / summary.ending_cash.prev_year) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">현금흐름표</h1>
          <div className="flex items-center gap-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white text-gray-800 font-semibold"
            >
              <option value="2511">2511</option>
            </select>
            <Link
              href="/"
              className="px-4 py-2 rounded-lg bg-white text-gray-800 font-semibold hover:bg-gray-100 transition"
            >
              홈으로
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* 한줄 요약 */}
          <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-l-4 border-blue-500">
            <div className="text-center">
              <div className="text-sm font-semibold mb-3 opacity-90 text-blue-900">
                📌 현금흐름 한줄 요약 (24년 → 25년 E)
              </div>
              <div className="text-base font-bold leading-relaxed text-gray-800 space-y-2">
                <div>
                  <span className={currentNetCashFlow < 0 ? "text-red-600" : "text-green-600"}>1. 순현금흐름</span> {currentNetCashFlow < 0 ? '순유출' : '순유입'} {Math.abs(currentNetCashFlow).toLocaleString()}k HKD
                  (전년비 {netCashFlowYoy > 0 ? '+' : '△'}{Math.abs(netCashFlowYoy).toLocaleString()}k {netCashFlowYoy < 0 ? '감소' : '증가'})
                  (기말현금 {summary.ending_cash.current_total.toLocaleString()}k, YOY {endingCashYoyPercent}%)
                </div>
                <div>
                  <span className="text-blue-700">2. 영업활동</span> {summary.operating_cash_flow.current_total > 0 ? '순유입' : '순유출'} {Math.abs(summary.operating_cash_flow.current_total).toLocaleString()}k HKD
                  (전년비 {opcfYoy > 0 ? '+' : '△'}{Math.abs(opcfYoy).toLocaleString()}k, YOY {opcfYoyPercent}%)
                </div>
                <div>
                  <span className="text-purple-700">3. 투자활동</span> 순유출 {Math.abs(summary.investing_cash_flow.current_total).toLocaleString()}k HKD
                  (전년비 △{Math.abs(invcfYoy).toLocaleString()}k 유출 증가, 홍콩 {Math.abs(investing_activities.hk_capex.current_total).toLocaleString()}k, 대만 {Math.abs(investing_activities.tw_capex.current_total).toLocaleString()}k)
                </div>
              </div>
            </div>
          </div>

          {/* 전체 접기/펴기 버튼 */}
          <div className="mb-4 flex justify-between items-center">
            <button
              onClick={() => setShowDetailColumns(!showDetailColumns)}
              className="px-6 py-2 bg-gradient-to-r from-purple-900 to-purple-700 text-white rounded-lg font-semibold hover:from-purple-800 hover:to-purple-600 transition"
            >
              {showDetailColumns ? '25년 1~11월/12월 컬럼 숨기기' : '25년 1~11월/12월 컬럼 보이기'}
            </button>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 font-semibold">단위: 1k HKD</span>
              <button
                onClick={toggleAll}
                className="px-6 py-2 bg-gradient-to-r from-blue-900 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-800 hover:to-blue-600 transition"
              >
                전체 접기/펴기
              </button>
            </div>
          </div>

          {/* 현금흐름표 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-2 py-3 border border-gray-300 bg-gray-100 font-bold text-center" style={{ width: '15%' }}>
                    구분
                  </th>
                  <th className="px-2 py-3 border border-gray-300 bg-gradient-to-br from-blue-600 to-blue-800 text-white font-bold text-center" style={{ width: '9%' }}>
                    2024년
                  </th>
                  {showDetailColumns && (
                    <>
                      <th className="px-2 py-3 border border-gray-300 bg-gray-500 text-white font-bold text-center" style={{ width: '9%' }}>
                        25년 1~11월 (실적)
                      </th>
                      <th className="px-2 py-3 border border-gray-300 bg-gray-500 text-white font-bold text-center" style={{ width: '9%' }}>
                        25년 12월 (E)
                      </th>
                    </>
                  )}
                  <th className="px-2 py-3 border border-gray-300 bg-gradient-to-br from-blue-600 to-blue-800 text-white font-bold text-center" style={{ width: '9%' }}>
                    2025년 (E)
                  </th>
                  <th className="px-2 py-3 border border-gray-300 bg-gray-100 font-bold text-center" style={{ width: '7%' }}>
                    YOY
                  </th>
                  <th className="px-4 py-3 border border-gray-300 bg-gray-100 font-bold text-center" style={{ width: showDetailColumns ? '30%' : '40%' }}>
                    비고
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* 기초현금 */}
                <tr className="bg-yellow-50 font-bold">
                  <td className="px-2 py-3 border border-gray-300 text-center text-blue-900">기초현금</td>
                  <td className="px-2 py-3 border border-gray-300 text-right text-gray-900">
                    {formatNumber(summary.beginning_cash.prev_year)}
                  </td>
                  {showDetailColumns && (
                    <>
                      <td className="px-2 py-3 border border-gray-300 text-right bg-gray-100 text-gray-900">
                        {formatNumber(summary.beginning_cash.current)}
                      </td>
                      <td className="px-2 py-3 border border-gray-300 text-right bg-gray-100 text-gray-900">
                        {formatNumber(summary.beginning_cash.current_12 || summary.ending_cash.current_1_11)}
                      </td>
                    </>
                  )}
                  <td className="px-2 py-3 border border-gray-300 text-right text-gray-900">
                    {formatNumber(summary.beginning_cash.current)}
                  </td>
                  <td className={`px-2 py-3 border border-gray-300 text-right ${getChangeClass(summary.beginning_cash.current - summary.beginning_cash.prev_year)}`}>
                    {formatChange(summary.beginning_cash.current - summary.beginning_cash.prev_year)}
                  </td>
                  <td className="px-4 py-3 border border-gray-300 text-left text-gray-700 text-sm"></td>
                </tr>

                {/* 영업활동 현금흐름 */}
                <tr
                  className="bg-blue-50 font-bold cursor-pointer"
                  onClick={() => toggleSection('opcf')}
                >
                  <td className="px-2 py-3 border border-gray-300">
                    1. 영업활동 현금흐름 {expandedSections.has('opcf') ? '▼' : '▶'}
                  </td>
                  <td className={`px-2 py-3 border border-gray-300 text-right ${summary.operating_cash_flow.prev_year > 0 ? 'text-green-600 font-bold' : summary.operating_cash_flow.prev_year < 0 ? 'text-red-600 font-bold' : 'text-gray-900 font-bold'}`}>
                    {summary.operating_cash_flow.prev_year > 0 ? '+' : summary.operating_cash_flow.prev_year < 0 ? '-' : ''}{formatNumber(summary.operating_cash_flow.prev_year)}
                  </td>
                  {showDetailColumns && (
                    <>
                      <td className={`px-2 py-3 border border-gray-300 text-right bg-gray-100 ${summary.operating_cash_flow.current_1_11 > 0 ? 'text-green-600 font-bold' : summary.operating_cash_flow.current_1_11 < 0 ? 'text-red-600 font-bold' : 'text-gray-900 font-bold'}`}>
                        {summary.operating_cash_flow.current_1_11 > 0 ? '+' : summary.operating_cash_flow.current_1_11 < 0 ? '-' : ''}{formatNumber(summary.operating_cash_flow.current_1_11)}
                      </td>
                      <td className={`px-2 py-3 border border-gray-300 text-right bg-gray-100 ${summary.operating_cash_flow.current_12 > 0 ? 'text-green-600 font-bold' : summary.operating_cash_flow.current_12 < 0 ? 'text-red-600 font-bold' : 'text-gray-900 font-bold'}`}>
                        {summary.operating_cash_flow.current_12 > 0 ? '+' : summary.operating_cash_flow.current_12 < 0 ? '-' : ''}{formatNumber(summary.operating_cash_flow.current_12)}
                      </td>
                    </>
                  )}
                  <td className={`px-2 py-3 border border-gray-300 text-right ${summary.operating_cash_flow.current_total > 0 ? 'text-green-600 font-bold' : summary.operating_cash_flow.current_total < 0 ? 'text-red-600 font-bold' : 'text-gray-900 font-bold'}`}>
                    {summary.operating_cash_flow.current_total > 0 ? '+' : summary.operating_cash_flow.current_total < 0 ? '-' : ''}{formatNumber(summary.operating_cash_flow.current_total)}
                  </td>
                  <td className={`px-2 py-3 border border-gray-300 text-right ${getChangeClass(opcfYoy)}`}>
                    {formatChange(opcfYoy)}
                  </td>
                  <td className="px-4 py-3 border border-gray-300 text-left text-gray-700 text-sm">
                    {operatingNote}
                  </td>
                </tr>

                {expandedSections.has('opcf') && (
                  <>
                    {/* 매출 */}
                    {renderRow(
                      `+ 매출 (합계) ${expandedItems.has('sales') ? '▼' : '▶'}`,
                      operating_activities.sales_total,
                      1,
                      false,
                      '',
                      'sales'
                    )}
                    {expandedItems.has('sales') && (
                      <>
                        {renderRow('  - 홍콩', operating_activities.sales_hk, 2)}
                        {renderRow('  - 대만', operating_activities.sales_tw, 2)}
                      </>
                    )}
                    
                    {/* 물품대, 관세 */}
                    {renderRow(
                      `△ 물품대, 관세 (합계) ${expandedItems.has('goods') ? '▼' : '▶'}`,
                      operating_activities.goods_and_duties_total,
                      1,
                      false,
                      '',
                      'goods'
                    )}
                    {expandedItems.has('goods') && (
                      <>
                        {renderRow('  - 홍콩', operating_activities.goods_and_duties_hk, 2)}
                        {renderRow('  - 대만', operating_activities.goods_and_duties_tw, 2)}
                      </>
                    )}
                    
                    {/* 운영비 */}
                    {renderRow(
                      `△ 운영비 (합계) ${expandedItems.has('opex') ? '▼' : '▶'}`,
                      operating_activities.operating_expenses_total,
                      1,
                      false,
                      '',
                      'opex'
                    )}
                    {expandedItems.has('opex') && (
                      <>
                        {renderRow('  - 홍콩', operating_activities.operating_expenses_hk, 2)}
                        {renderRow('  - 대만', operating_activities.operating_expenses_tw, 2)}
                      </>
                    )}
                  </>
                )}

                {/* 투자활동 현금흐름 */}
                <tr
                  className="bg-blue-50 font-bold cursor-pointer"
                  onClick={() => toggleSection('invcf')}
                >
                  <td className="px-2 py-3 border border-gray-300">
                    2. 투자활동 현금흐름 {expandedSections.has('invcf') ? '▼' : '▶'}
                  </td>
                  <td className={`px-2 py-3 border border-gray-300 text-right ${summary.investing_cash_flow.prev_year > 0 ? 'text-green-600 font-bold' : summary.investing_cash_flow.prev_year < 0 ? 'text-red-600 font-bold' : 'text-gray-900 font-bold'}`}>
                    {summary.investing_cash_flow.prev_year > 0 ? '+' : summary.investing_cash_flow.prev_year < 0 ? '-' : ''}{formatNumber(summary.investing_cash_flow.prev_year)}
                  </td>
                  {showDetailColumns && (
                    <>
                      <td className={`px-2 py-3 border border-gray-300 text-right bg-gray-100 ${summary.investing_cash_flow.current_1_11 > 0 ? 'text-green-600 font-bold' : summary.investing_cash_flow.current_1_11 < 0 ? 'text-red-600 font-bold' : 'text-gray-900 font-bold'}`}>
                        {summary.investing_cash_flow.current_1_11 > 0 ? '+' : summary.investing_cash_flow.current_1_11 < 0 ? '-' : ''}{formatNumber(summary.investing_cash_flow.current_1_11)}
                      </td>
                      <td className={`px-2 py-3 border border-gray-300 text-right bg-gray-100 ${summary.investing_cash_flow.current_12 > 0 ? 'text-green-600 font-bold' : summary.investing_cash_flow.current_12 < 0 ? 'text-red-600 font-bold' : 'text-gray-900 font-bold'}`}>
                        {summary.investing_cash_flow.current_12 > 0 ? '+' : summary.investing_cash_flow.current_12 < 0 ? '-' : ''}{formatNumber(summary.investing_cash_flow.current_12)}
                      </td>
                    </>
                  )}
                  <td className={`px-2 py-3 border border-gray-300 text-right ${summary.investing_cash_flow.current_total > 0 ? 'text-green-600 font-bold' : summary.investing_cash_flow.current_total < 0 ? 'text-red-600 font-bold' : 'text-gray-900 font-bold'}`}>
                    {summary.investing_cash_flow.current_total > 0 ? '+' : summary.investing_cash_flow.current_total < 0 ? '-' : ''}{formatNumber(summary.investing_cash_flow.current_total)}
                  </td>
                  <td className={`px-2 py-3 border border-gray-300 text-right ${getChangeClass(invcfYoy)}`}>
                    {formatChange(invcfYoy)}
                  </td>
                  <td className="px-4 py-3 border border-gray-300 text-left text-gray-700 text-sm">
                    {investingNote}
                  </td>
                </tr>

                {expandedSections.has('invcf') && (
                  <>
                    {/* 자산성지출 */}
                    {renderRow(
                      `△ 자산성지출 (합계) ${expandedItems.has('capex') ? '▼' : '▶'}`,
                      investing_activities.total_capex,
                      1,
                      false,
                      '리뉴얼 7개(홍콩 5개, 대만 2개), 신규점 5개(홍콩 1개, 대만 4개)',
                      'capex'
                    )}
                    {expandedItems.has('capex') && (
                      <>
                        {renderRow('  - 홍콩', investing_activities.hk_capex, 2, false, '리뉴얼 5개 (베네시안, 세나도, LCX, 몽콕, Isquare), 신규점 1개 (디스커버리 1호점)')}
                        {renderRow('  - 대만', investing_activities.tw_capex, 2, false, '리뉴얼 2개 (한신아레나, 중우타이중), 신규점 4개 (디스커버리 2개점, 라라포트 난강, 타이중점)')}
                      </>
                    )}
                  </>
                )}

                {/* 재무활동 현금흐름 */}
                <tr
                  className="bg-blue-50 font-bold cursor-pointer"
                  onClick={() => toggleSection('fincf')}
                >
                  <td className="px-2 py-3 border border-gray-300">
                    3. 재무활동 현금흐름 {expandedSections.has('fincf') ? '▼' : '▶'}
                  </td>
                  <td className="px-2 py-3 border border-gray-300 text-right text-gray-900">
                    {formatNumber(financing_activities.total.prev_year)}
                  </td>
                  {showDetailColumns && (
                    <>
                      <td className="px-2 py-3 border border-gray-300 text-right bg-gray-100 text-gray-900">
                        {formatNumber(financing_activities.total.current_1_11)}
                      </td>
                      <td className="px-2 py-3 border border-gray-300 text-right bg-gray-100 text-gray-900">
                        {formatNumber(financing_activities.total.current_12)}
                      </td>
                    </>
                  )}
                  <td className="px-2 py-3 border border-gray-300 text-right text-gray-900">
                    {formatNumber(financing_activities.total.current_total)}
                  </td>
                  <td className="px-2 py-3 border border-gray-300 text-right text-gray-500">
                    0
                  </td>
                  <td className="px-4 py-3 border border-gray-300 text-left text-gray-700 text-sm">
                    {financingNote}
                  </td>
                </tr>

                {/* 순현금흐름 */}
                <tr className="bg-green-50 font-bold">
                  <td className="px-2 py-3 border border-gray-300">순현금흐름</td>
                  <td className={`px-2 py-3 border border-gray-300 text-right ${summary.net_cash_flow.prev_year > 0 ? 'text-green-600 font-bold' : summary.net_cash_flow.prev_year < 0 ? 'text-red-600 font-bold' : 'text-gray-900 font-bold'}`}>
                    {summary.net_cash_flow.prev_year > 0 ? '+' : summary.net_cash_flow.prev_year < 0 ? '-' : ''}{formatNumber(summary.net_cash_flow.prev_year)}
                  </td>
                  {showDetailColumns && (
                    <>
                      <td className={`px-2 py-3 border border-gray-300 text-right bg-gray-100 ${summary.net_cash_flow.current_1_11 > 0 ? 'text-green-600 font-bold' : summary.net_cash_flow.current_1_11 < 0 ? 'text-red-600 font-bold' : 'text-gray-900 font-bold'}`}>
                        {summary.net_cash_flow.current_1_11 > 0 ? '+' : summary.net_cash_flow.current_1_11 < 0 ? '-' : ''}{formatNumber(summary.net_cash_flow.current_1_11)}
                      </td>
                      <td className={`px-2 py-3 border border-gray-300 text-right bg-gray-100 ${summary.net_cash_flow.current_12 > 0 ? 'text-green-600 font-bold' : summary.net_cash_flow.current_12 < 0 ? 'text-red-600 font-bold' : 'text-gray-900 font-bold'}`}>
                        {summary.net_cash_flow.current_12 > 0 ? '+' : summary.net_cash_flow.current_12 < 0 ? '-' : ''}{formatNumber(summary.net_cash_flow.current_12)}
                      </td>
                    </>
                  )}
                  <td className={`px-2 py-3 border border-gray-300 text-right ${summary.net_cash_flow.current_total > 0 ? 'text-green-600 font-bold' : summary.net_cash_flow.current_total < 0 ? 'text-red-600 font-bold' : 'text-gray-900 font-bold'}`}>
                    {summary.net_cash_flow.current_total > 0 ? '+' : summary.net_cash_flow.current_total < 0 ? '-' : ''}{formatNumber(summary.net_cash_flow.current_total)}
                  </td>
                  <td className={`px-2 py-3 border border-gray-300 text-right ${getChangeClass(netCashFlowYoy)}`}>
                    {formatChange(netCashFlowYoy)}
                  </td>
                  <td className="px-4 py-3 border border-gray-300 text-left text-gray-700 text-sm">
                    영업활동 + 투자활동 + 재무활동
                  </td>
                </tr>

                {/* 기말현금 */}
                <tr className="bg-yellow-100 font-bold">
                  <td className="px-2 py-3 border border-gray-300">기말현금</td>
                  <td className="px-2 py-3 border border-gray-300 text-right text-gray-900">
                    {formatNumber(summary.ending_cash.prev_year)}
                  </td>
                  {showDetailColumns && (
                    <>
                      <td className="px-2 py-3 border border-gray-300 text-right bg-gray-100 text-gray-900">
                        {formatNumber(summary.ending_cash.current_1_11)}
                      </td>
                      <td className="px-2 py-3 border border-gray-300 text-right bg-gray-100 text-gray-900">
                        {formatNumber(summary.ending_cash.current_12)}
                      </td>
                    </>
                  )}
                  <td className="px-2 py-3 border border-gray-300 text-right bg-yellow-200 font-bold text-gray-900">
                    {formatNumber(summary.ending_cash.current_total)}
                  </td>
                  <td className={`px-2 py-3 border border-gray-300 text-right ${getChangeClass(endingCashYoy)}`}>
                    {formatChange(endingCashYoy)} ({endingCashYoyPercent}%)
                  </td>
                  <td className="px-4 py-3 border border-gray-300 text-left text-gray-700 text-sm">
                    {endingCashYoy < 0 ? `전년비 ${Math.abs(endingCashYoy).toLocaleString()}k HKD 감소` : `전년비 ${endingCashYoy.toLocaleString()}k HKD 증가`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 현금흐름 분석 */}
          <div className="mt-8 p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border-l-4 border-green-500">
            <h3 className="text-green-900 mb-5 text-lg font-bold">
              <span className="text-xl mr-2">💵</span>현금흐름 분석
            </h3>
            <div className="grid grid-cols-4 gap-5 text-sm">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-gray-600 text-xs mb-2">순현금흐름</div>
                <div className={`text-2xl font-bold ${currentNetCashFlow < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {currentNetCashFlow < 0 ? '-' : '+'}{Math.abs(currentNetCashFlow).toLocaleString()}k HKD
                </div>
                <div className="text-gray-500 text-xs mt-1">전년: {prevNetCashFlow < 0 ? '-' : '+'}{Math.abs(prevNetCashFlow).toLocaleString()}k HKD</div>
                <div className={`text-xs mt-2 font-semibold ${getChangeClass(netCashFlowYoy)}`}>
                  {netCashFlowYoy > 0 ? '+' : '△'}{Math.abs(netCashFlowYoy).toLocaleString()}k HKD
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-gray-600 text-xs mb-2">영업활동 현금흐름</div>
                <div className="text-2xl font-bold text-green-600">
                  +{summary.operating_cash_flow.current_total.toLocaleString()}k HKD
                </div>
                <div className="text-gray-500 text-xs mt-1">전년: +{summary.operating_cash_flow.prev_year.toLocaleString()}k HKD</div>
                <div className={`text-xs mt-2 font-semibold ${getChangeClass(opcfYoy)}`}>
                  {opcfYoy > 0 ? '+' : '△'}{Math.abs(opcfYoy).toLocaleString()}k HKD ({opcfYoyPercent}%)
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-gray-600 text-xs mb-2">투자활동 현금흐름</div>
                <div className="text-2xl font-bold text-red-600">
                  -{Math.abs(summary.investing_cash_flow.current_total).toLocaleString()}k HKD
                </div>
                <div className="text-gray-500 text-xs mt-1">전년: -{Math.abs(summary.investing_cash_flow.prev_year).toLocaleString()}k HKD</div>
                <div className={`text-xs mt-2 font-semibold ${getChangeClass(invcfYoy)}`}>
                  △{Math.abs(invcfYoy).toLocaleString()}k HKD ({Math.abs(invcfYoyPercent)}%)
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-gray-600 text-xs mb-2">기말 현금 보유액</div>
                <div className="text-2xl font-bold text-blue-600">
                  {summary.ending_cash.current_total.toLocaleString()}k HKD
                </div>
                <div className="text-gray-500 text-xs mt-1">전년: {summary.ending_cash.prev_year.toLocaleString()}k HKD</div>
                <div className={`text-xs mt-2 font-semibold ${getChangeClass(endingCashYoy)}`}>
                  {endingCashYoy > 0 ? '+' : '△'}{Math.abs(endingCashYoy).toLocaleString()}k HKD ({endingCashYoyPercent}%)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CashFlowPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">데이터 로딩 중...</div>
      </div>
    }>
      <CashFlowPageContent />
    </Suspense>
  );
}

