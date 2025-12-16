'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface BSItem {
  prev_year: number;
  current_month: number;
  year_end: number;
  yoy: number;
  note: string;
}

interface WCItem {
  prev_year: number;
  current_month: number;
  year_end: number;
  yoy_krw: number;
}

interface WCData {
  summary: WCItem;
  receivables: {
    total: WCItem;
    inventory: WCItem;
    accounts_receivable: WCItem;
  };
  payables: {
    total: WCItem;
    cash: WCItem;
    borrowings: WCItem;
    accounts_payable: WCItem;
  };
  profit_creation: {
    total: WCItem;
    retained_earnings: WCItem;
    accounts_payable_tp: WCItem;
  };
  other_wc_items: {
    total: WCItem;
    prepaid: WCItem;
    accrued: WCItem;
    fixed_assets: WCItem;
    net_other: WCItem;
    other?: WCItem;
  };
  lease_related: {
    total: WCItem;
    right_of_use: WCItem;
    lease_liabilities: WCItem;
  };
  balance_check: WCItem;
}

interface BSData {
  period: string;
  balance_sheet: {
    assets: {
      total: BSItem;
      current_assets: {
        total: BSItem;
        cash: BSItem;
        receivables: BSItem;
        inventory: BSItem;
        other_current: BSItem;
      };
      non_current_assets: {
        total: BSItem;
        right_of_use: BSItem;
        tangible: BSItem;
        intangible: BSItem;
        deposits: BSItem;
        other_non_current: BSItem;
      };
    };
    liabilities: {
      total: BSItem;
      current_liabilities: {
        total: BSItem;
        accounts_payable: BSItem;
        accounts_payable_tp: BSItem;
        accrued_expenses: BSItem;
        borrowings: BSItem;
        lease_liabilities_current: BSItem;
        other_current: BSItem;
      };
      non_current_liabilities: {
        total: BSItem;
        lease_liabilities_non_current: BSItem;
        restoration_provision: BSItem;
      };
    };
    equity: {
      total: BSItem;
      capital: BSItem;
      other_capital: BSItem;
      retained_earnings: BSItem;
    };
    working_capital?: WCData;
  };
}

export default function BSPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('2511');
  const [bsData, setBsData] = useState<BSData | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['wc-main']));
  const [showVerification, setShowVerification] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editingNote, setEditingNote] = useState<string | null>(null);

  useEffect(() => {
    loadBSData(selectedPeriod);
    // 로컬 스토리지에서 비고 불러오기
    const savedNotes = localStorage.getItem(`bs-notes-${selectedPeriod}`);
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
  }, [selectedPeriod]);

  const saveNote = (key: string, value: string) => {
    const newNotes = { ...notes, [key]: value };
    setNotes(newNotes);
    localStorage.setItem(`bs-notes-${selectedPeriod}`, JSON.stringify(newNotes));
  };

  const loadBSData = async (period: string) => {
    try {
      const response = await fetch(`/dashboard/bs-data-${period}.json`);
      if (response.ok) {
        const data = await response.json();
        setBsData(data);
      }
    } catch (error) {
      console.error('Failed to load BS data:', error);
    }
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

  const toggleAll = () => {
    if (expandedSections.size > 0) {
      setExpandedSections(new Set());
    } else {
      setExpandedSections(new Set(['assets', 'liabilities', 'equity']));
    }
  };

  const formatNumber = (num: number): string => {
    return Math.round(num).toLocaleString();
  };

  const calculateYoYAmount = (yearEnd: number, prevYear: number): number => {
    return yearEnd - prevYear;
  };

  const formatYoY = (yearEnd: number, prevYear: number): string => {
    const yoy = calculateYoYAmount(yearEnd, prevYear);
    if (yoy >= 0) {
      return `+${formatNumber(yoy)}`;
    } else {
      return `△${formatNumber(Math.abs(yoy))}`;
    }
  };

  const getYoYClass = (yearEnd: number, prevYear: number): string => {
    const yoy = calculateYoYAmount(yearEnd, prevYear);
    return yoy >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold';
  };

  const calculateYoYPercent = (prevYear: number, yearEnd: number): string => {
    if (prevYear === 0) return '-';
    const percent = (yearEnd / prevYear) * 100;
    return `${percent.toFixed(1)}%`;
  };

  // 비고란 아이템 생성 헬퍼
  const noteItem = (label: string, change: number) => {
    const isPositive = change >= 0;
    const color = isPositive ? 'text-green-600' : 'text-red-600';
    const sign = isPositive ? '+' : '△';
    return (
      <span className={color}>
        {label} {sign}{Math.abs(Math.round(change / 1000))}m
      </span>
    );
  };

  // 행 렌더링 헬퍼 함수
  const renderRow = (label: string, item: BSItem | undefined, indent: number = 0, isBold: boolean = false) => {
    // item이 undefined인 경우 빈 행 반환
    if (!item) {
      return (
        <tr className={`hover:bg-gray-100 ${indent === 1 ? 'bg-gray-50' : ''}`}>
          <td className={`px-4 py-3 border border-gray-300 ${indent === 0 ? '' : indent === 1 ? 'pl-8' : 'pl-12'}`}>{label}</td>
          <td className="px-4 py-3 border border-gray-300 text-right">-</td>
          <td className="px-4 py-3 border border-gray-300 text-right">-</td>
          <td className="px-4 py-3 border border-gray-300 text-right">-</td>
          <td className="px-4 py-3 border border-gray-300 text-right">-</td>
          <td className="px-4 py-3 border border-gray-300 text-right">-</td>
          <td className="px-4 py-3 border border-gray-300 text-left text-sm text-gray-600">-</td>
        </tr>
      );
    }
    
    const indentClass = indent === 0 ? '' : indent === 1 ? 'pl-8' : 'pl-12';
    const bgClass = indent === 1 ? 'bg-gray-50' : '';
    const fontClass = isBold ? 'font-semibold' : '';
    
    return (
      <tr className={`hover:bg-gray-100 ${bgClass}`}>
        <td className={`px-4 py-3 border border-gray-300 ${indentClass} ${fontClass}`}>{label}</td>
        <td className={`px-4 py-3 border border-gray-300 text-right ${fontClass}`}>{formatNumber(item.prev_year)}</td>
        <td className={`px-4 py-3 border border-gray-300 text-right ${fontClass}`}>{formatNumber(item.current_month)}</td>
        <td className={`px-4 py-3 border border-gray-300 text-right ${fontClass}`}>{formatNumber(item.year_end)}</td>
        <td className={`px-4 py-3 border border-gray-300 text-right ${getYoYClass(item.year_end, item.prev_year)}`}>
          {formatYoY(item.year_end, item.prev_year)}
        </td>
        <td className={`px-4 py-3 border border-gray-300 text-right ${getYoYClass(item.year_end, item.prev_year)}`}>
          {calculateYoYPercent(item.prev_year, item.year_end)}
        </td>
        <td className="px-4 py-3 border border-gray-300 text-left text-sm text-gray-600">{item.note}</td>
      </tr>
    );
  };

  if (!bsData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">데이터 로딩 중...</div>
      </div>
    );
  }

  const bs = bsData.balance_sheet;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 네비게이션 바 */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">재무상태표 (B/S)</h1>
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
              className="px-6 py-2 bg-white text-blue-900 rounded-lg font-semibold hover:bg-blue-50 transition"
            >
              홈으로
              </Link>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 요약 섹션 */}
        <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center mb-3">
            <span className="text-red-400 text-xl mr-2">★</span>
            <h2 className="text-lg font-bold">재무상태표 핵심 요약 (24.12 → 25.12 E)</h2>
            </div>
          <div className="text-sm leading-relaxed">
            <p>
              <strong>재고 {Math.abs(Math.round((bsData?.balance_sheet.assets.current_assets.inventory.year_end - bsData?.balance_sheet.assets.current_assets.inventory.prev_year) / bsData.balance_sheet.assets.current_assets.inventory.prev_year * 100))}% 감소(△{Math.abs(Math.round((bsData?.balance_sheet.assets.current_assets.inventory.year_end - bsData?.balance_sheet.assets.current_assets.inventory.prev_year) / 1000))}백만 HKD)와 현금 {Math.abs(Math.round((bsData?.balance_sheet.assets.current_assets.cash.year_end - bsData?.balance_sheet.assets.current_assets.cash.prev_year) / bsData.balance_sheet.assets.current_assets.cash.prev_year * 100))}% 감소(△{Math.abs(Math.round((bsData?.balance_sheet.assets.current_assets.cash.year_end - bsData?.balance_sheet.assets.current_assets.cash.prev_year) / 1000))}백만 HKD)로 유동자산 {Math.abs(Math.round((bsData?.balance_sheet.assets.current_assets.total.year_end - bsData?.balance_sheet.assets.current_assets.total.prev_year) / bsData.balance_sheet.assets.current_assets.total.prev_year * 100))}% 감소(△{Math.abs(Math.round((bsData?.balance_sheet.assets.current_assets.total.year_end - bsData?.balance_sheet.assets.current_assets.total.prev_year) / 1000))}백만 HKD).</strong><br />
              사용권자산 {Math.round((bsData?.balance_sheet.assets.non_current_assets.right_of_use.year_end - bsData?.balance_sheet.assets.non_current_assets.right_of_use.prev_year) / bsData.balance_sheet.assets.non_current_assets.right_of_use.prev_year * 100)}% 증가(+{Math.round((bsData?.balance_sheet.assets.non_current_assets.right_of_use.year_end - bsData?.balance_sheet.assets.non_current_assets.right_of_use.prev_year) / 1000)}백만 HKD)로 비유동자산 {Math.round((bsData?.balance_sheet.assets.non_current_assets.total.year_end - bsData?.balance_sheet.assets.non_current_assets.total.prev_year) / bsData.balance_sheet.assets.non_current_assets.total.prev_year * 100)}% 증가(+{Math.round((bsData?.balance_sheet.assets.non_current_assets.total.year_end - bsData?.balance_sheet.assets.non_current_assets.total.prev_year) / 1000)}백만 HKD), 부채 {Math.round((bsData?.balance_sheet.liabilities.total.year_end - bsData?.balance_sheet.liabilities.total.prev_year) / bsData.balance_sheet.liabilities.total.prev_year * 100)}% 증가(+{Math.round((bsData?.balance_sheet.liabilities.total.year_end - bsData?.balance_sheet.liabilities.total.prev_year) / 1000)}백만 HKD)로<br />
              <strong className="text-yellow-300 bg-yellow-900 px-2 py-1 rounded">부채비율 {((bsData?.balance_sheet.liabilities.total.year_end || 0) / (bsData?.balance_sheet.equity.total.year_end || 1) * 100).toFixed(0).toLocaleString()}% 기록 (TP채무 제외 시 부채비율 {(((bsData?.balance_sheet.liabilities.total.year_end || 0) - (bsData?.balance_sheet.liabilities.current_liabilities.accounts_payable_tp?.year_end || 0)) / ((bsData?.balance_sheet.equity.total.year_end || 1) + (bsData?.balance_sheet.liabilities.current_liabilities.accounts_payable_tp?.year_end || 0)) * 100).toFixed(1)}%, 자기자본비율 {(((bsData?.balance_sheet.equity.total.year_end || 0) + (bsData?.balance_sheet.liabilities.current_liabilities.accounts_payable_tp?.year_end || 0)) / (bsData?.balance_sheet.assets.total.year_end || 1) * 100).toFixed(1)}%로 정상 재무구조)</strong>
            </p>
          </div>
        </div>

        {/* 부채비율 검증 */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg shadow-md p-5 mb-6">
          <div 
            className="flex items-center cursor-pointer hover:opacity-80 transition"
            onClick={() => setShowVerification(!showVerification)}
          >
            <span className="text-yellow-600 text-lg mr-2">📊</span>
            <h3 className="text-md font-bold text-yellow-900">부채비율 검증</h3>
          </div>
          {showVerification && (
          <div className="text-sm text-yellow-900 space-y-2 mt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded border border-yellow-200">
                <div className="font-semibold text-yellow-800 mb-2">💡 전체 부채비율</div>
                <div className="text-xs space-y-1">
                  <div>• 총부채: {formatNumber(bsData?.balance_sheet.liabilities.total.year_end || 0)} (25.12 E)</div>
                  <div>• 총자본: {formatNumber(bsData?.balance_sheet.equity.total.year_end || 0)} (25.12 E)</div>
                  <div className="border-t border-yellow-200 mt-2 pt-2">
                    <strong>부채비율 = (총부채 ÷ 총자본) × 100</strong><br />
                    = ({formatNumber(bsData?.balance_sheet.liabilities.total.year_end || 0)} ÷ {formatNumber(bsData?.balance_sheet.equity.total.year_end || 0)}) × 100<br />
                    = <strong className="text-red-600">
                      {((bsData?.balance_sheet.liabilities.total.year_end || 0) / (bsData?.balance_sheet.equity.total.year_end || 1) * 100).toFixed(1)}%
                    </strong>
                  </div>
                </div>
              </div>
              <div className="bg-white p-3 rounded border border-green-200">
                <div className="font-semibold text-green-800 mb-2">✅ TP채무 제외 시</div>
                <div className="text-xs space-y-1">
                  <div>• 총부채 (TP제외): {formatNumber((bsData?.balance_sheet.liabilities.total.year_end || 0) - (bsData?.balance_sheet.liabilities.current_liabilities.accounts_payable_tp?.year_end || 0))} (25.12 E)</div>
                  <div>• 총자본 (TP포함): {formatNumber((bsData?.balance_sheet.equity.total.year_end || 0) + (bsData?.balance_sheet.liabilities.current_liabilities.accounts_payable_tp?.year_end || 0))} (25.12 E)</div>
                  <div className="border-t border-green-200 mt-2 pt-2">
                    <strong>부채비율 = ((총부채 - TP채무) ÷ (총자본 + TP채무)) × 100</strong><br />
                    = ({formatNumber((bsData?.balance_sheet.liabilities.total.year_end || 0) - (bsData?.balance_sheet.liabilities.current_liabilities.accounts_payable_tp?.year_end || 0))} ÷ {formatNumber((bsData?.balance_sheet.equity.total.year_end || 0) + (bsData?.balance_sheet.liabilities.current_liabilities.accounts_payable_tp?.year_end || 0))}) × 100<br />
                    = <strong className="text-green-600">
                      {(((bsData?.balance_sheet.liabilities.total.year_end || 0) - (bsData?.balance_sheet.liabilities.current_liabilities.accounts_payable_tp?.year_end || 0)) / ((bsData?.balance_sheet.equity.total.year_end || 1) + (bsData?.balance_sheet.liabilities.current_liabilities.accounts_payable_tp?.year_end || 0)) * 100).toFixed(1)}%
                    </strong>
                  </div>
                  <div className="border-t border-green-200 mt-2 pt-2">
                    <strong>자기자본비율 = ((총자본 + TP채무) ÷ 총자산) × 100</strong><br />
                    = ({formatNumber((bsData?.balance_sheet.equity.total.year_end || 0) + (bsData?.balance_sheet.liabilities.current_liabilities.accounts_payable_tp?.year_end || 0))} ÷ {formatNumber(bsData?.balance_sheet.assets.total.year_end || 0)}) × 100<br />
                    = <strong className="text-green-600">
                      {(((bsData?.balance_sheet.equity.total.year_end || 0) + (bsData?.balance_sheet.liabilities.current_liabilities.accounts_payable_tp?.year_end || 0)) / (bsData?.balance_sheet.assets.total.year_end || 1) * 100).toFixed(1)}%
                    </strong>
                  </div>
                </div>
            </div>
          </div>
        </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-end mb-4">
          <button
            onClick={toggleAll}
              className="px-6 py-2 bg-gradient-to-r from-blue-900 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-800 hover:to-blue-600 transition"
          >
            전체 접기/펴기
          </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="bg-blue-800 text-white px-4 py-3 text-center border border-gray-300 font-semibold">
                    계정과목
                  </th>
                  <th className="bg-blue-800 text-white px-4 py-3 text-center border border-gray-300 font-semibold">
                    2024.12
                  </th>
                  <th className="bg-blue-800 text-white px-4 py-3 text-center border border-gray-300 font-semibold">
                    2025.11
                  </th>
                  <th className="bg-blue-800 text-white px-4 py-3 text-center border border-gray-300 font-semibold">
                    2025.12 E
                  </th>
                  <th className="bg-blue-800 text-white px-4 py-3 text-center border border-gray-300 font-semibold">
                    증감액
                  </th>
                  <th className="bg-blue-800 text-white px-4 py-3 text-center border border-gray-300 font-semibold">
                    증감율
                  </th>
                  <th className="bg-blue-800 text-white px-4 py-3 text-center border border-gray-300 font-semibold">
                    비고
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* 자산 섹션 */}
                <tr
                  className="bg-blue-50 hover:bg-blue-100 cursor-pointer transition font-bold"
                  onClick={() => toggleSection('assets')}
                >
                  <td className="px-4 py-3 border border-gray-300 text-left">
                    {expandedSections.has('assets') ? '▼' : '▶'} 자산총계
                  </td>
                  <td className="px-4 py-3 border border-gray-300 text-right">{formatNumber(bs.assets.total.prev_year)}</td>
                  <td className="px-4 py-3 border border-gray-300 text-right">{formatNumber(bs.assets.total.current_month)}</td>
                  <td className="px-4 py-3 border border-gray-300 text-right">{formatNumber(bs.assets.total.year_end)}</td>
                  <td className={`px-4 py-3 border border-gray-300 text-right ${getYoYClass(bs.assets.total.year_end, bs.assets.total.prev_year)}`}>
                    {formatYoY(bs.assets.total.year_end, bs.assets.total.prev_year)}
                  </td>
                  <td className={`px-4 py-3 border border-gray-300 text-right ${getYoYClass(bs.assets.total.year_end, bs.assets.total.prev_year)}`}>
                    {calculateYoYPercent(bs.assets.total.prev_year, bs.assets.total.year_end)}
                  </td>
                  <td className="px-4 py-3 border border-gray-300 text-left text-sm text-gray-600">{bs.assets.total.note}</td>
                </tr>

                {expandedSections.has('assets') && (
                  <>
                    {renderRow('유동자산', bs.assets.current_assets.total, 1, true)}
                    {renderRow('현금', bs.assets.current_assets.cash, 2)}
                    {renderRow('매출채권', bs.assets.current_assets.receivables, 2)}
                    {renderRow('재고자산', bs.assets.current_assets.inventory, 2)}
                    {renderRow('기타', bs.assets.current_assets.other_current, 2)}
                    
                    {renderRow('비유동자산', bs.assets.non_current_assets.total, 1, true)}
                    {renderRow('유형자산', bs.assets.non_current_assets.tangible, 2)}
                    {renderRow('무형자산', bs.assets.non_current_assets.intangible, 2)}
                    {renderRow('사용권자산', bs.assets.non_current_assets.right_of_use, 2)}
                    {renderRow('보증금', bs.assets.non_current_assets.deposits, 2)}
                    {renderRow('이연법인세', bs.assets.non_current_assets.other_non_current, 2)}
                  </>
                )}

                {/* 부채 섹션 */}
                <tr
                  className="bg-red-50 hover:bg-red-100 cursor-pointer transition font-bold"
                  onClick={() => toggleSection('liabilities')}
                >
                  <td className="px-4 py-3 border border-gray-300 text-left">
                    {expandedSections.has('liabilities') ? '▼' : '▶'} 부채총계
                  </td>
                  <td className="px-4 py-3 border border-gray-300 text-right">{formatNumber(bs.liabilities.total.prev_year)}</td>
                  <td className="px-4 py-3 border border-gray-300 text-right">{formatNumber(bs.liabilities.total.current_month)}</td>
                  <td className="px-4 py-3 border border-gray-300 text-right">{formatNumber(bs.liabilities.total.year_end)}</td>
                  <td className={`px-4 py-3 border border-gray-300 text-right ${getYoYClass(bs.liabilities.total.year_end, bs.liabilities.total.prev_year)}`}>
                    {formatYoY(bs.liabilities.total.year_end, bs.liabilities.total.prev_year)}
                  </td>
                  <td className={`px-4 py-3 border border-gray-300 text-right ${getYoYClass(bs.liabilities.total.year_end, bs.liabilities.total.prev_year)}`}>
                    {calculateYoYPercent(bs.liabilities.total.prev_year, bs.liabilities.total.year_end)}
                  </td>
                  <td className="px-4 py-3 border border-gray-300 text-left text-sm text-gray-600">{bs.liabilities.total.note}</td>
                </tr>

                {expandedSections.has('liabilities') && (
                  <>
                    {renderRow('유동부채', bs.liabilities.current_liabilities.total, 1, true)}
                    {renderRow('매입채무', bs.liabilities.current_liabilities.accounts_payable, 2)}
                    {renderRow('매입채무(TP)', bs.liabilities.current_liabilities.accounts_payable_tp, 2)}
                    {renderRow('미지급비용', bs.liabilities.current_liabilities.accrued_expenses, 2)}
                    {renderRow('유동성리스부채', bs.liabilities.current_liabilities.lease_liabilities_current, 2)}
                    {renderRow('기타', bs.liabilities.current_liabilities.other_current, 2)}
                    
                    {renderRow('비유동부채', bs.liabilities.non_current_liabilities.total, 1, true)}
                    {renderRow('비유동성리스부채', bs.liabilities.non_current_liabilities.lease_liabilities_non_current, 2)}
                    {renderRow('복구충당부채', bs.liabilities.non_current_liabilities.restoration_provision, 2)}
                  </>
                )}

                {/* 자본 섹션 */}
                <tr
                  className="bg-green-50 hover:bg-green-100 cursor-pointer transition font-bold"
                  onClick={() => toggleSection('equity')}
                >
                  <td className="px-4 py-3 border border-gray-300 text-left">
                    {expandedSections.has('equity') ? '▼' : '▶'} 총자본
                  </td>
                  <td className="px-4 py-3 border border-gray-300 text-right">{formatNumber(bs.equity.total.prev_year)}</td>
                  <td className="px-4 py-3 border border-gray-300 text-right">{formatNumber(bs.equity.total.current_month)}</td>
                  <td className="px-4 py-3 border border-gray-300 text-right">{formatNumber(bs.equity.total.year_end)}</td>
                  <td className={`px-4 py-3 border border-gray-300 text-right ${getYoYClass(bs.equity.total.year_end, bs.equity.total.prev_year)}`}>
                    {formatYoY(bs.equity.total.year_end, bs.equity.total.prev_year)}
                  </td>
                  <td className={`px-4 py-3 border border-gray-300 text-right ${getYoYClass(bs.equity.total.year_end, bs.equity.total.prev_year)}`}>
                    {calculateYoYPercent(bs.equity.total.prev_year, bs.equity.total.year_end)}
                  </td>
                  <td className="px-4 py-3 border border-gray-300 text-left text-sm text-gray-600">{bs.equity.total.note}</td>
                </tr>

                {expandedSections.has('equity') && (
                  <>
                    {renderRow('자본금', bs.equity.capital, 1)}
                    {renderRow('기타자본', bs.equity.other_capital, 1)}
                    {renderRow('이익잉여금', bs.equity.retained_earnings, 1)}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* 운전자본 증감표 */}
          {bsData?.balance_sheet?.working_capital && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-blue-800">📋 운전자본 표 (Working Capital)</h2>
                <button
                  onClick={() => {
                    const allExpanded = expandedSections.has('wc-main') &&
                                       expandedSections.has('wc-cash') && 
                                       expandedSections.has('wc-profit') &&
                                       expandedSections.has('wc-other') &&
                                       expandedSections.has('wc-lease');
                    
                    if (allExpanded) {
                      // 전체 접기 - 모든 섹션 접기
                      setExpandedSections(new Set());
                    } else {
                      // 전체 펼치기 - 모든 섹션 펼치기
                      setExpandedSections(new Set(['wc-main', 'wc-cash', 'wc-profit', 'wc-other', 'wc-lease']));
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-semibold"
                >
                  {(expandedSections.has('wc-main') &&
                    expandedSections.has('wc-cash') && 
                    expandedSections.has('wc-profit') &&
                    expandedSections.has('wc-other') &&
                    expandedSections.has('wc-lease')) ? '전체 접기' : '전체 펼치기'}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-blue-700 text-white">
                      <th className="px-4 py-3 border border-gray-300 text-left font-semibold">계정과목</th>
                      <th className="px-4 py-3 border border-gray-300 text-center font-semibold">24년기말</th>
                      <th className="px-4 py-3 border border-gray-300 text-center font-semibold">2025-11</th>
                      <th className="px-4 py-3 border border-gray-300 text-center font-semibold">2025-12</th>
                      <th className="px-4 py-3 border border-gray-300 text-center font-semibold">연간비교</th>
                      <th className="px-4 py-3 border border-gray-300 text-center font-semibold">비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* 운전자본 총계 - 클릭 가능 */}
                    <WCRow
                      label="▼ 운전자본"
                      item={bsData.balance_sheet.working_capital.summary}
                      isSection={true}
                      bgColor="bg-yellow-50"
                      expanded={expandedSections.has('wc-main')}
                      onClick={() => toggleSection('wc-main')}
                      note="AR +13m, 재고 △25m, 선급금 △0m, AP +1m"
                    />

                    {expandedSections.has('wc-main') && (
                      <>
                        {/* 매출채권 */}
                        <WCRow 
                          label="  매출채권" 
                          item={bsData.balance_sheet.working_capital.receivables.accounts_receivable} 
                          isPositive={true}
                          noteKey="receivables_accounts_receivable"
                          noteValue={notes['receivables_accounts_receivable'] || '대만 백화점채권(d+45일 결제)'}
                          onNoteChange={saveNote}
                          isEditingNote={editingNote === 'receivables_accounts_receivable'}
                          onNoteEdit={setEditingNote}
                          highlight={true}
                        />
                        
                        {/* 재고자산 */}
                        <WCRow 
                          label="  재고자산" 
                          item={bsData.balance_sheet.working_capital.receivables.inventory} 
                          isPositive={true}
                          noteKey="receivables_inventory"
                          noteValue={notes['receivables_inventory'] || '26년말 재고자산 120m Target(재고일수 320일 → 240일) → 현금창출 50m (40m은 매입채무 상환, 10m 리뉴얼 투자)'}
                          onNoteChange={saveNote}
                          isEditingNote={editingNote === 'receivables_inventory'}
                          onNoteEdit={setEditingNote}
                          highlight={true}
                        />
                        
                        {/* 매입채무 */}
                        <WCRow 
                          label="  매입채무" 
                          item={bsData.balance_sheet.working_capital.payables.accounts_payable} 
                          isPositive={false}
                          noteKey="payables_accounts_payable"
                          noteValue={notes['payables_accounts_payable'] || '26년말 매입채무 90m Target(25년말 대비 40m 감소)'}
                          onNoteChange={saveNote}
                          isEditingNote={editingNote === 'payables_accounts_payable'}
                          onNoteEdit={setEditingNote}
                          highlight={true}
                        />
                      </>
                    )}

                    {/* 현금 */}
                    <WCRow
                      label="▼ 현금"
                      item={bsData.balance_sheet.working_capital.payables.cash}
                      isSection={true}
                      bgColor="bg-blue-50"
                      expanded={expandedSections.has('wc-cash')}
                      onClick={() => toggleSection('wc-cash')}
                      isPositive={true}
                      note={noteItem('현금', bsData.balance_sheet.working_capital.payables.cash.year_end - bsData.balance_sheet.working_capital.payables.cash.prev_year)}
                    />
                    {expandedSections.has('wc-cash') && (
                      <WCRow 
                        label="  현금" 
                        item={bsData.balance_sheet.working_capital.payables.cash} 
                        isPositive={true}
                        noteKey="payables_cash"
                        noteValue={notes['payables_cash'] || '현금 및 현금성자산'}
                        onNoteChange={saveNote}
                        isEditingNote={editingNote === 'payables_cash'}
                        onNoteEdit={setEditingNote}
                        highlight={true}
                      />
                    )}

                    {/* 이익창출 */}
                    <WCRow
                      label="▼ 이익창출"
                      item={bsData.balance_sheet.working_capital.profit_creation.total}
                      isSection={true}
                      bgColor="bg-purple-50"
                      expanded={expandedSections.has('wc-profit')}
                      onClick={() => toggleSection('wc-profit')}
                      isPositive={false}
                      note={(() => {
                        const retainedEarnings = bsData.balance_sheet.working_capital.profit_creation.retained_earnings;
                        const tpPayable = bsData.balance_sheet.working_capital.profit_creation.accounts_payable_tp;
                        const reYoy = calculateYoYAmount(retainedEarnings.year_end, retainedEarnings.prev_year);
                        const tpYoy = calculateYoYAmount(tpPayable.year_end, tpPayable.prev_year);
                        return (
                          <>
                            {noteItem('이익잉여금', reYoy)}
                            {', '}
                            {noteItem('매입채무(TP)', tpYoy)}
                          </>
                        );
                      })()}
                    />
                    {expandedSections.has('wc-profit') && (() => {
                      const retainedEarnings = bsData.balance_sheet.working_capital.profit_creation.retained_earnings;
                      const yoyAmount = calculateYoYAmount(retainedEarnings.year_end, retainedEarnings.prev_year);
                      const yoyInMillions = Math.round(Math.abs(yoyAmount) / 1000);
                      const sign = yoyAmount >= 0 ? '+' : '△';
                      const defaultNote = `이익잉여금 ${sign}${yoyInMillions}m`;
                      return (
                        <>
                          <WCRow 
                            label="  이익잉여금" 
                            item={retainedEarnings} 
                            isPositive={false}
                            noteKey="profit_creation_retained_earnings"
                            noteValue={notes['profit_creation_retained_earnings'] || defaultNote}
                            onNoteChange={saveNote}
                            isEditingNote={editingNote === 'profit_creation_retained_earnings'}
                            onNoteEdit={setEditingNote}
                          />
                          <WCRow 
                            label="  매입채무(TP)" 
                            item={bsData.balance_sheet.working_capital.profit_creation.accounts_payable_tp} 
                            isPositive={false}
                            noteKey="profit_creation_accounts_payable_tp"
                            noteValue={notes['profit_creation_accounts_payable_tp'] || 'Transfer Price'}
                            onNoteChange={saveNote}
                            isEditingNote={editingNote === 'profit_creation_accounts_payable_tp'}
                            onNoteEdit={setEditingNote}
                            highlight={true}
                          />
                        </>
                      );
                    })()}

                    {/* 기타 운전자본 */}
                    <WCRow
                      label="▼ 기타 운전자본"
                      item={bsData.balance_sheet.working_capital.other_wc_items.total}
                      isSection={true}
                      bgColor="bg-green-50"
                      expanded={expandedSections.has('wc-other')}
                      onClick={() => toggleSection('wc-other')}
                      note={<>
                        {noteItem('선급', bsData.balance_sheet.working_capital.other_wc_items.prepaid.year_end - bsData.balance_sheet.working_capital.other_wc_items.prepaid.prev_year)}
                        {', '}
                        {noteItem('미지급', bsData.balance_sheet.working_capital.other_wc_items.accrued.year_end - bsData.balance_sheet.working_capital.other_wc_items.accrued.prev_year)}
                        {', '}
                        {noteItem('보증금', bsData.balance_sheet.working_capital.other_wc_items.fixed_assets.year_end - bsData.balance_sheet.working_capital.other_wc_items.fixed_assets.prev_year)}
                        {', '}
                        {noteItem('미수금', bsData.balance_sheet.working_capital.other_wc_items.net_other.year_end - bsData.balance_sheet.working_capital.other_wc_items.net_other.prev_year)}
                      </>}
                    />
                    {expandedSections.has('wc-other') && (
                      <>
                        <WCRow 
                          label="  선급비용" 
                          item={bsData.balance_sheet.working_capital.other_wc_items.prepaid} 
                          isPositive={true}
                          noteKey="other_wc_items_prepaid"
                          noteValue={notes['other_wc_items_prepaid'] || '선급임차료, 선급보험료 등'}
                          onNoteChange={saveNote}
                          isEditingNote={editingNote === 'other_wc_items_prepaid'}
                          onNoteEdit={setEditingNote}
                        />
                        <WCRow 
                          label="  미지급비용" 
                          item={bsData.balance_sheet.working_capital.other_wc_items.accrued} 
                          isPositive={false}
                          noteKey="other_wc_items_accrued"
                          noteValue={notes['other_wc_items_accrued'] || '미지급급여, 미지급임차료 등'}
                          onNoteChange={saveNote}
                          isEditingNote={editingNote === 'other_wc_items_accrued'}
                          onNoteEdit={setEditingNote}
                        />
                        <WCRow 
                          label="  고정자산/보증금" 
                          item={bsData.balance_sheet.working_capital.other_wc_items.fixed_assets} 
                          isPositive={true}
                          noteKey="other_wc_items_fixed_assets"
                          noteValue={notes['other_wc_items_fixed_assets'] || '유형자산, 임대보증금'}
                          onNoteChange={saveNote}
                          isEditingNote={editingNote === 'other_wc_items_fixed_assets'}
                          onNoteEdit={setEditingNote}
                        />
                        <WCRow 
                          label="  미수금 - 미지급금 (순액)" 
                          item={bsData.balance_sheet.working_capital.other_wc_items.net_other}
                          isPositive={undefined}
                          noteKey="other_wc_items_net_other"
                          noteValue={notes['other_wc_items_net_other'] || '미수금에서 미지급금을 뺀 순액 (기타유동부채 포함)'}
                          onNoteChange={saveNote}
                          isEditingNote={editingNote === 'other_wc_items_net_other'}
                          onNoteEdit={setEditingNote}
                        />
                        {bsData.balance_sheet.working_capital.other_wc_items.other && (
                          <WCRow 
                            label="  기타" 
                            item={bsData.balance_sheet.working_capital.other_wc_items.other} 
                            isPositive={undefined}
                            noteKey="other_wc_items_other"
                            noteValue={notes['other_wc_items_other'] || '기타유동부채, 기타비유동자산, 복구충당부채 등'}
                            onNoteChange={saveNote}
                            isEditingNote={editingNote === 'other_wc_items_other'}
                            onNoteEdit={setEditingNote}
                          />
                        )}
                      </>
                    )}

                    {/* 리스관련 */}
                    <WCRow
                      label="▼ 리스관련"
                      item={bsData.balance_sheet.working_capital.lease_related.total}
                      isSection={true}
                      bgColor="bg-indigo-50"
                      expanded={expandedSections.has('wc-lease')}
                      onClick={() => toggleSection('wc-lease')}
                      note={<>
                        {noteItem('사용권', bsData.balance_sheet.working_capital.lease_related.right_of_use.year_end - bsData.balance_sheet.working_capital.lease_related.right_of_use.prev_year)}
                        {', '}
                        {noteItem('리스부채', bsData.balance_sheet.working_capital.lease_related.lease_liabilities.year_end - bsData.balance_sheet.working_capital.lease_related.lease_liabilities.prev_year)}
                      </>}
                    />
                    {expandedSections.has('wc-lease') && (
                      <>
                        <WCRow 
                          label="  사용권자산" 
                          item={bsData.balance_sheet.working_capital.lease_related.right_of_use} 
                          isPositive={true}
                          noteKey="lease_related_right_of_use"
                          noteValue={notes['lease_related_right_of_use'] || '매장 임차권 (IFRS16)'}
                          onNoteChange={saveNote}
                          isEditingNote={editingNote === 'lease_related_right_of_use'}
                          onNoteEdit={setEditingNote}
                        />
                        <WCRow 
                          label="  리스부채" 
                          item={bsData.balance_sheet.working_capital.lease_related.lease_liabilities} 
                          isPositive={false}
                          noteKey="lease_related_lease_liabilities"
                          noteValue={notes['lease_related_lease_liabilities'] || '임차료 미래지급의무 (IFRS16)'}
                          onNoteChange={saveNote}
                          isEditingNote={editingNote === 'lease_related_lease_liabilities'}
                          onNoteEdit={setEditingNote}
                        />
                      </>
                    )}

                    {/* Balance Check - 항상 표시 */}
                    <tr className="bg-green-100 border-t-2 border-green-500">
                      <td className="px-4 py-3 border border-gray-300 font-bold text-green-800">
                        합계 (Balance Check)
                      </td>
                      <td className={`px-4 py-3 border border-gray-300 text-center font-bold ${Math.abs(bsData.balance_sheet.working_capital.balance_check.prev_year) <= 1 ? 'text-green-800' : 'text-red-600'}`}>
                        {Math.abs(bsData.balance_sheet.working_capital.balance_check.prev_year) <= 1 ? '0' : (bsData.balance_sheet.working_capital.balance_check.prev_year >= 0 ? '+' : '△') + formatNumber(Math.abs(bsData.balance_sheet.working_capital.balance_check.prev_year))}
                      </td>
                      <td className={`px-4 py-3 border border-gray-300 text-center font-bold ${Math.abs(bsData.balance_sheet.working_capital.balance_check.current_month) <= 1 ? 'text-green-800' : 'text-red-600'}`}>
                        {Math.abs(bsData.balance_sheet.working_capital.balance_check.current_month) <= 1 ? '0' : (bsData.balance_sheet.working_capital.balance_check.current_month >= 0 ? '+' : '△') + formatNumber(Math.abs(bsData.balance_sheet.working_capital.balance_check.current_month))}
                      </td>
                      <td className={`px-4 py-3 border border-gray-300 text-center font-bold ${Math.abs(bsData.balance_sheet.working_capital.balance_check.year_end) <= 1 ? 'text-green-800' : 'text-red-600'}`}>
                        {Math.abs(bsData.balance_sheet.working_capital.balance_check.year_end) <= 1 ? '0' : (bsData.balance_sheet.working_capital.balance_check.year_end >= 0 ? '+' : '△') + formatNumber(Math.abs(bsData.balance_sheet.working_capital.balance_check.year_end))}
                      </td>
                      <td className={`px-4 py-3 border border-gray-300 text-center font-bold ${Math.abs(bsData.balance_sheet.working_capital.balance_check.year_end - bsData.balance_sheet.working_capital.balance_check.prev_year) <= 1 ? 'text-green-800' : 'text-red-600'}`}>
                        {(() => {
                          const yoy = bsData.balance_sheet.working_capital.balance_check.year_end - bsData.balance_sheet.working_capital.balance_check.prev_year;
                          return Math.abs(yoy) <= 1 ? '0' : (yoy >= 0 ? '+' : '△') + formatNumber(Math.abs(yoy));
                        })()}
                      </td>
                      <td className={`px-4 py-3 border border-gray-300 text-center font-bold text-xl ${Math.abs(bsData.balance_sheet.working_capital.balance_check.year_end) <= 1 ? 'text-green-600' : 'text-red-600'}`}>
                        {Math.abs(bsData.balance_sheet.working_capital.balance_check.year_end) <= 1 ? '✓ 균형' : '✗ 불균형'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 재무비율 분석 */}
          {bsData && (() => {
            const bs = bsData.balance_sheet;
            
            // 기본 값 (year_end 기준)
            const totalAssets = bs.assets.total.year_end;
            const totalLiabilities = bs.liabilities.total.year_end;
            const totalEquity = bs.equity.total.year_end;
            const currentAssets = bs.assets.current_assets.total.year_end;
            const currentLiabilities = bs.liabilities.current_liabilities.total.year_end;
            const inventory = bs.assets.current_assets.inventory.year_end;
            const tpPayable = bs.liabilities.current_liabilities.accounts_payable_tp?.year_end || 0;
            
            // 전년도 값 (prev_year 기준)
            const prevTotalAssets = bs.assets.total.prev_year;
            const prevTotalLiabilities = bs.liabilities.total.prev_year;
            const prevTotalEquity = bs.equity.total.prev_year;
            const prevCurrentAssets = bs.assets.current_assets.total.prev_year;
            const prevCurrentLiabilities = bs.liabilities.current_liabilities.total.prev_year;
            const prevInventory = bs.assets.current_assets.inventory.prev_year;
            const prevTpPayable = bs.liabilities.current_liabilities.accounts_payable_tp?.prev_year || 0;
            
            // 부채비율 = (총부채 ÷ 총자본) × 100
            const debtRatio = (totalLiabilities / (totalEquity || 1)) * 100;
            const prevDebtRatio = (prevTotalLiabilities / (prevTotalEquity || 1)) * 100;
            const debtRatioExclTp = ((totalLiabilities - tpPayable) / ((totalEquity + tpPayable) || 1)) * 100;
            
            // 유동비율 = (유동자산 ÷ 유동부채) × 100
            const currentRatio = (currentAssets / (currentLiabilities || 1)) * 100;
            const prevCurrentRatio = (prevCurrentAssets / (prevCurrentLiabilities || 1)) * 100;
            const currentRatioExclTp = (currentAssets / ((currentLiabilities - tpPayable) || 1)) * 100;
            
            // 당좌비율 = ((유동자산 - 재고) ÷ 유동부채) × 100
            const quickRatio = ((currentAssets - inventory) / (currentLiabilities || 1)) * 100;
            const prevQuickRatio = ((prevCurrentAssets - prevInventory) / (prevCurrentLiabilities || 1)) * 100;
            const quickRatioExclTp = ((currentAssets - inventory) / ((currentLiabilities - tpPayable) || 1)) * 100;
            
            // 자기자본비율 = (총자본 ÷ 총자산) × 100
            const equityRatio = (totalEquity / (totalAssets || 1)) * 100;
            const prevEquityRatio = (prevTotalEquity / (prevTotalAssets || 1)) * 100;
            const equityRatioExclTp = ((totalEquity + tpPayable) / (totalAssets || 1)) * 100;
            
            // 조정 후 값
            const adjustedLiabilities = totalLiabilities - tpPayable;
            const adjustedEquity = totalEquity + tpPayable;
            
            return (
          <div className="mt-8 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center mb-4">
              <span className="text-2xl mr-2">📊</span>
              <h3 className="text-lg font-bold text-orange-900">재무비율 분석</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {/* 부채비율 */}
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-sm text-gray-600 mb-2">부채비율</div>
                    <div className="text-3xl font-bold text-red-600 mb-1">{debtRatio.toFixed(0)}%</div>
                    <div className="text-xs text-gray-500">24년 {prevDebtRatio.toFixed(0)}%</div>
                    <div className="text-xs font-semibold text-blue-600 mt-2">TP제무 제외시: {debtRatioExclTp.toFixed(0)}%</div>
              </div>

              {/* 유동비율 */}
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-sm text-gray-600 mb-2">유동비율</div>
                    <div className="text-3xl font-bold text-orange-600 mb-1">{currentRatio.toFixed(0)}%</div>
                    <div className="text-xs text-gray-500">24년 {prevCurrentRatio.toFixed(0)}%</div>
                    <div className="text-xs font-semibold text-blue-600 mt-2">TP제무 제외시: {currentRatioExclTp.toFixed(0)}%</div>
              </div>

              {/* 당좌비율 */}
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-sm text-gray-600 mb-2">당좌비율</div>
                    <div className="text-3xl font-bold text-orange-600 mb-1">{quickRatio.toFixed(0)}%</div>
                    <div className="text-xs text-gray-500">24년 {prevQuickRatio.toFixed(0)}%</div>
                    <div className="text-xs font-semibold text-blue-600 mt-2">TP제무 제외시: {quickRatioExclTp.toFixed(0)}%</div>
              </div>

              {/* 자기자본비율 */}
              <div className="bg-white rounded-lg p-4 shadow">
                <div className="text-sm text-gray-600 mb-2">자기자본비율</div>
                    <div className="text-3xl font-bold text-green-600 mb-1">{equityRatio.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">24년 {prevEquityRatio.toFixed(1)}%</div>
                    <div className="text-xs font-semibold text-blue-600 mt-2">TP제무 제외시: {equityRatioExclTp.toFixed(1)}%</div>
              </div>
            </div>

            {/* 핵심 설명 */}
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="flex items-start mb-2">
                <span className="text-orange-600 font-bold mr-2">💡 핵심:</span>
              </div>
              <ul className="space-y-1 text-sm text-gray-700">
                    <li>• <strong>부채비율 {debtRatio.toFixed(0)}%:</strong> 자본금 {formatNumber(totalEquity)} 대비 부채 {formatNumber(totalLiabilities)} (TP제무 제외시 {debtRatioExclTp.toFixed(0)}% - 정상 수준)</li>
                    <li>• <strong>유동비율 {currentRatio.toFixed(0)}%:</strong> 유동자산 {formatNumber(currentAssets)} 대비 유동부채 {formatNumber(currentLiabilities)} (TP제무 제외시 {currentRatioExclTp.toFixed(0)}% - 양호)</li>
                    <li>• <strong>당좌비율 {quickRatio.toFixed(0)}%:</strong> 재고 제외 시 단기 지급능력 (TP제무 제외시 {quickRatioExclTp.toFixed(0)}% - 개선)</li>
                    <li>• <strong>자기자본비율 {equityRatio.toFixed(1)}%:</strong> 총자산 대비 자본 비중 (TP제무 제외시 {equityRatioExclTp.toFixed(1)}% - 안정적)</li>
                    <li>• <strong>TP채무 조정:</strong> 매입채무(TP) {formatNumber(tpPayable)}는 본사 선수금(무이자)으로, 부채 제외(-) 및 자본 포함(+) 시 조정</li>
                    <li>• <strong>실질 재무구조:</strong> 조정 후 부채 {formatNumber(adjustedLiabilities)}, 조정 후 자본 {formatNumber(adjustedEquity)}</li>
              </ul>
            </div>
          </div>
            );
          })()}
          </div>
        </div>
    </div>
  );
}

// 운전자본 Row 컴포넌트
function WCRow({ 
  label, 
  item, 
  isSection = false, 
  isSubSection = false, 
  bgColor = '', 
  expanded = false, 
  onClick, 
  isPositive,
  note,
  noteKey,
  noteValue,
  onNoteChange,
  isEditingNote,
  onNoteEdit,
  highlight = false
}: {
  label: string;
  item: WCItem;
  isSection?: boolean;
  isSubSection?: boolean;
  bgColor?: string;
  expanded?: boolean;
  onClick?: () => void;
  isPositive?: boolean;
  note?: React.ReactNode;
  noteKey?: string;
  noteValue?: string;
  onNoteChange?: (key: string, value: string) => void;
  isEditingNote?: boolean;
  onNoteEdit?: (key: string | null) => void;
  highlight?: boolean;
}) {
  const formatNumber = (value: number, isPositive?: boolean, isYoy?: boolean): string => {
    // 연간비교(yoy)는 실제 증감량을 표시하므로 isPositive 무시
    if (isYoy) {
      const sign = value >= 0 ? '+' : '△';
      return `${sign}${Math.abs(value).toLocaleString()}`;
    }
    // isPositive가 지정되면 항목 성격에 따라 고정 기호 사용
    // 자산 항목(isPositive=true): 항상 + 표시
    // 부채/자본 항목(isPositive=false): 항상 △ 표시
    if (isPositive !== undefined) {
      const sign = isPositive ? '+' : '△';
      return `${sign}${Math.abs(value).toLocaleString()}`;
    }
    // isPositive가 없으면 기존 로직 (값의 부호에 따라)
    const sign = value >= 0 ? '+' : '△';
    return `${sign}${Math.abs(value).toLocaleString()}`;
  };

  const getColorClass = (value: number, forceSign?: boolean): string => {
    if (forceSign === undefined) {
      return value >= 0 ? 'text-green-600' : 'text-red-600';
    }
    // 자산항목이면 증가(+)가 녹색, 감소(-)가 빨간색
    // 부채항목이면 감소(+, 음수의 증가)가 녹색, 증가(-, 음수의 감소)가 빨간색
    // 하지만 부채는 이미 음수로 저장되어 있으므로, year_end - prev_year 결과:
    // - 양수(+) = 부채 감소 = 좋음 = 녹색
    // - 음수(-) = 부채 증가 = 나쁨 = 빨간색
    // 따라서 자산/부채 모두 동일하게 처리
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const rowClass = `hover:bg-gray-100 ${bgColor} ${onClick ? 'cursor-pointer' : ''} ${highlight ? 'border-l-4 border-l-yellow-400' : ''}`;
  const fontClass = isSection || isSubSection ? 'font-bold' : '';
  
  // 연간비교 = 25년 기말 - 24년 기말 (직접 계산)
  // 부채 항목은 음수로 저장되어 있으므로, 계산 결과가 양수면 부채 감소(좋음), 음수면 부채 증가(나쁨)
  const calculatedYoy = item.year_end - item.prev_year;

  return (
    <tr className={rowClass} onClick={onClick}>
      <td className={`px-4 py-3 border border-gray-300 ${fontClass}`}>
        {label}
      </td>
      <td className={`px-4 py-3 border border-gray-300 text-right ${fontClass}`}>
        {formatNumber(item.prev_year, isPositive)}
      </td>
      <td className={`px-4 py-3 border border-gray-300 text-right ${fontClass}`}>
        {formatNumber(item.current_month, isPositive)}
      </td>
      <td className={`px-4 py-3 border border-gray-300 text-right ${fontClass}`}>
        {formatNumber(item.year_end, isPositive)}
      </td>
      <td className={`px-4 py-3 border border-gray-300 text-right ${fontClass} ${getColorClass(calculatedYoy, isPositive)}`}>
        {formatNumber(calculatedYoy, undefined, true)}
      </td>
      <td className="px-4 py-3 border border-gray-300 text-left text-xs text-gray-700" style={{ minWidth: '250px' }}>
        {noteKey && onNoteChange ? (
          isEditingNote ? (
            <input
              type="text"
              value={noteValue || ''}
              onChange={(e) => onNoteChange(noteKey, e.target.value)}
              onBlur={() => onNoteEdit?.(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onNoteEdit?.(null);
                }
              }}
              className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <div 
              className={`cursor-pointer hover:bg-blue-50 px-2 py-1 rounded ${noteValue || note ? '' : 'min-h-[24px]'}`}
              onClick={(e) => {
                e.stopPropagation();
                onNoteEdit?.(noteKey);
              }}
            >
              {noteValue || note || null}
            </div>
          )
        ) : (
          note
        )}
      </td>
    </tr>
  );
}
