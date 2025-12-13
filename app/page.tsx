'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import hkStoreAreas from '@/components/dashboard/hongkong-store-areas.json';
import twStoreAreas from '@/components/dashboard/taiwan-store-areas.json';

export default function Home() {
  const [hkData, setHkData] = useState<any>(null);
  const [twData, setTwData] = useState<any>(null);
  const [hkPlData, setHkPlData] = useState<any>(null);
  const [twPlData, setTwPlData] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('2511'); // 기본값: 25년 11월
  const [isLoading, setIsLoading] = useState(true);
  const [showHkmcDiscovery, setShowHkmcDiscovery] = useState(false);
  const [showTwDiscovery, setShowTwDiscovery] = useState(false);
  const [reportDate, setReportDate] = useState('2024-11-17'); // 보고일자 (YYYY-MM-DD)
  const [isEditingDate, setIsEditingDate] = useState(false);

  // localStorage에서 보고일자 불러오기
  useEffect(() => {
    const savedDate = localStorage.getItem('reportDate');
    if (savedDate) {
      setReportDate(savedDate);
    }
  }, []);

  // 보고일자 변경시 localStorage에 저장
  const handleDateChange = (newDate: string) => {
    setReportDate(newDate);
    localStorage.setItem('reportDate', newDate);
  };

  // 날짜 포맷 함수
  const formatReportDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const weekday = weekdays[date.getDay()];
    return `${month}월 ${day}일 ${weekday}`;
  };

  // Period별 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Period별 파일명 생성
        const hkDashboardPath = `/dashboard/hongkong-dashboard-data-${selectedPeriod}.json`;
        const twDashboardPath = `/dashboard/taiwan-dashboard-data-${selectedPeriod}.json`;
        
        // PL 데이터도 동일한 period 사용
        const hkPlPath = `/dashboard/hongkong-pl-data-${selectedPeriod}.json`;
        const twPlPath = `/dashboard/taiwan-pl-data-${selectedPeriod}.json`;

        // Period별 파일 로드 시도, 없으면 기본 파일 사용
        const loadWithFallback = async (periodPath: string, defaultPath: string) => {
          try {
            const res = await fetch(periodPath);
            if (res.ok) {
              return await res.json();
            }
          } catch (e) {
            console.warn(`Period 파일 로드 실패 (${periodPath}), 기본 파일 사용`);
          }
          // 기본 파일 로드
          const defaultRes = await fetch(defaultPath);
          if (defaultRes.ok) {
            return await defaultRes.json();
          }
          throw new Error(`파일을 찾을 수 없습니다: ${defaultPath}`);
        };

        // 모든 데이터 병렬 로드
        const [hkDashboard, twDashboard, hkPl, twPl] = await Promise.all([
          loadWithFallback(hkDashboardPath, '/dashboard/hongkong-dashboard-data.json'),
          loadWithFallback(twDashboardPath, '/dashboard/taiwan-dashboard-data.json'),
          loadWithFallback(hkPlPath, '/dashboard/hongkong-pl-data.json'),
          loadWithFallback(twPlPath, '/dashboard/taiwan-pl-data.json')
        ]);

        // ending_inventory는 components 폴더에서 import
        let hkDefaultData = null;
        let twDefaultData = null;
        try {
          const [hkModule, twModule] = await Promise.all([
            import('@/components/dashboard/hongkong-dashboard-data.json'),
            import('@/components/dashboard/taiwan-dashboard-data.json')
          ]);
          hkDefaultData = hkModule.default || hkModule;
          twDefaultData = twModule.default || twModule;
        } catch (e) {
          console.warn('Components 폴더에서 ending_inventory 로드 실패:', e);
        }

        // 디버깅: 로드된 데이터 확인
        console.log('Period별 파일 로드 결과:', {
          hkDashboard: !!hkDashboard,
          hkHasEndingInventory: !!(hkDashboard as any)?.ending_inventory,
          hkDefaultData: !!hkDefaultData,
          hkDefaultHasEndingInventory: !!(hkDefaultData as any)?.ending_inventory,
          hkDefaultEndingInventory: (hkDefaultData as any)?.ending_inventory?.total
        });

        // period별 파일에 ending_inventory가 없으면 기본 파일에서 가져오기
        if (hkDashboard && !(hkDashboard as any).ending_inventory && (hkDefaultData as any)?.ending_inventory) {
          console.log('홍콩 ending_inventory 병합:', (hkDefaultData as any).ending_inventory);
          (hkDashboard as any).ending_inventory = (hkDefaultData as any).ending_inventory;
        }
        if (twDashboard && !(twDashboard as any).ending_inventory && (twDefaultData as any)?.ending_inventory) {
          console.log('대만 ending_inventory 병합:', (twDefaultData as any).ending_inventory);
          (twDashboard as any).ending_inventory = (twDefaultData as any).ending_inventory;
        }

        console.log('홍콩 데이터 로드 완료:', {
          hasEndingInventory: !!(hkDashboard as any)?.ending_inventory,
          endingInventoryTotal: (hkDashboard as any)?.ending_inventory?.total
        });

        setHkData(hkDashboard);
        setTwData(twDashboard);
        setHkPlData(hkPl);
        setTwPlData(twPl);
      } catch (e) {
        console.error('데이터 로드 오류:', e);
        // 에러 발생 시 components 폴더에서 동적 import 시도
        try {
          const [hkModule, twModule, hkPlModule, twPlModule] = await Promise.all([
            import('@/components/dashboard/hongkong-dashboard-data.json'),
            import('@/components/dashboard/taiwan-dashboard-data.json'),
            import('@/components/dashboard/hongkong-pl-data.json'),
            import('@/components/dashboard/taiwan-pl-data.json')
          ]);
          
          setHkData(hkModule.default || hkModule);
          setTwData(twModule.default || twModule);
          setHkPlData(hkPlModule.default || hkPlModule);
          setTwPlData(twPlModule.default || twPlModule);
        } catch (fallbackError) {
          console.error('기본 데이터 로드 오류:', fallbackError);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [selectedPeriod]);

  const formatPercent = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(Number(num))) return '0';
    const value = Number(num);
    if (!isFinite(value)) return '0';
    return Math.round(value).toString();
  };

  const formatNumber = (num: number | undefined | null) => {
    try {
      if (num === undefined || num === null || isNaN(Number(num))) return '0';
      const value = Number(num);
      if (!isFinite(value)) return '0';
      const rounded = Math.round(value / 1000);
      return typeof rounded.toLocaleString === 'function' 
        ? rounded.toLocaleString('ko-KR') 
        : rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    } catch (e) {
      return '0';
    }
  };

  // PL 데이터용 포맷 (이미 1K HKD 단위)
  const formatPlNumber = (num: number | undefined | null) => {
    try {
      if (num === undefined || num === null || isNaN(Number(num))) return '0';
      const value = Number(num);
      if (!isFinite(value)) return '0';
      const rounded = Math.round(value);
      return typeof rounded.toLocaleString === 'function' 
        ? rounded.toLocaleString('ko-KR') 
        : rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    } catch (e) {
      return '0';
    }
  };

  // 기간 옵션 생성 (대시보드가 있는 기간만)
  const periodOptions = useMemo(() => {
    return [
      { value: '2510', label: '25년 10월' },
      { value: '2511', label: '25년 11월' },
    ];
  }, []);

  // 선택된 기간에서 년도와 월 추출
  const selectedYear = selectedPeriod.substring(0, 2);
  const selectedMonth = parseInt(selectedPeriod.substring(2, 4));
  const periodLabel = `${selectedYear}년 ${selectedMonth}월`;

  // 브라우저 탭 제목 설정
  useEffect(() => {
    document.title = `${periodLabel} 경영실적 종합`;
  }, [selectedPeriod, periodLabel]);

  // 해당 월의 일수 계산
  const getDaysInMonth = (year: number, month: number) => {
    // 20XX 형식의 년도를 2000 + XX로 변환
    const fullYear = 2000 + year;
    return new Date(fullYear, month, 0).getDate();
  };

  // 누적 일수 계산 (1월부터 해당 월까지)
  const getCumulativeDays = (year: number, month: number) => {
    const fullYear = 2000 + year;
    let totalDays = 0;
    for (let m = 1; m <= month; m++) {
      totalDays += new Date(fullYear, m, 0).getDate();
    }
    return totalDays;
  };

  const currentMonthDays = getDaysInMonth(parseInt(selectedYear), selectedMonth);
  const cumulativeDays = getCumulativeDays(parseInt(selectedYear), selectedMonth);

  // 매장 코드로 홍콩/마카오 판단
  const isHongKongOrMacauStore = (storeCode: string): boolean => {
    return storeCode.startsWith('M');
  };
  
  // 홍콩만 판단 (마카오 제외)
  const isHongKongOnlyStore = (storeCode: string): boolean => {
    return storeCode.startsWith('M') && !storeCode.startsWith('MC');
  };

  // 홍콩 오프라인 매장 총 면적 계산 (평당매출 계산용, 마카오 제외)
  const hkOfflineTotalArea = useMemo(() => {
    if (!hkData?.store_summary) return 0;
    const storeAreas = hkStoreAreas?.store_areas || {};
    let totalArea = 0;
    const storesWithArea: string[] = [];
    const storesWithoutArea: string[] = [];

    Object.keys(hkData.store_summary).forEach(storeCode => {
      const store = hkData.store_summary[storeCode];
      
      // M10A는 M10에 합쳐서 계산하므로 건너뛰기
      if (storeCode === 'M10A') {
        return;
      }
      
      // 홍콩만, MLB 브랜드만, 온라인 제외, 오프라인만 (Retail, Outlet)
      if (store.brand === 'MLB' && isHongKongOnlyStore(storeCode) && store.channel !== 'Online' && store.current?.net_sales > 0) {
        const area = (storeAreas as Record<string, number>)[storeCode] || 0;
        
        // 폐점이면서 매출이 매우 적은 매장 제외 (정리 매출만 있는 경우)
        // 평당매출이 1 K HKD/평 미만이면 제외
        if (store.closed === true && area > 0) {
          const salesPerPyeong = (store.current.net_sales / 1000) / area;
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
    
    // 디버깅: 면적 계산 확인 (항상 출력)
    const allStores = Object.keys(hkData.store_summary);
    const offlineStores = allStores.filter(code => {
      const store = hkData.store_summary[code];
      return store.brand === 'MLB' && isHongKongOrMacauStore(code) && store.channel !== 'Online' && store.current?.net_sales > 0;
    });
    
    // 디버깅: 샘플 매장 데이터 확인
    const sampleStores = allStores.slice(0, 10).map(code => {
      const store = hkData.store_summary[code];
      const isHKOnly = isHongKongOnlyStore(code);
      const matches = store.brand === 'MLB' && isHKOnly && store.channel !== 'Online' && store.current?.net_sales > 0;
      return {
        code,
        isHKOnly: isHKOnly,
        brand: store.brand,
        channel: store.channel,
        netSales: store.current?.net_sales || 0,
        matches: matches,
        reason: !store.brand || store.brand !== 'MLB' ? 'brand' : 
                !isHKOnly ? 'macau_or_online' : 
                store.channel === 'Online' ? 'online' : 
                !store.current?.net_sales ? 'no_sales' : 'ok'
      };
    });
    
    const storeDetails = offlineStores.map(code => {
      const store = hkData.store_summary[code];
      const area = (storeAreas as Record<string, number>)[code] || 0;
      return {
        code,
        isHKOnly: isHongKongOnlyStore(code),
        channel: store.channel,
        netSales: store.current?.net_sales,
        area
      };
    });
    
    console.log('=== 홍콩 오프라인 면적 계산 (평당매출용, 마카오 제외) ===');
    console.log('전체 매장 수:', allStores.length, '개');
    console.log('샘플 매장 데이터 (처음 10개):', JSON.stringify(sampleStores, null, 2));
    console.log('총 면적:', totalArea, '평');
    console.log('면적 있는 매장:', storesWithArea.length, '개', storesWithArea);
    console.log('면적 없는 매장:', storesWithoutArea.length, '개', storesWithoutArea);
    console.log('홍콩 오프라인 매장 목록:', offlineStores);
    console.log('면적 데이터 키:', Object.keys(storeAreas));
    console.log('매장별 상세:', storeDetails);
    console.log('=====================================');
    
    if (totalArea === 0 || totalArea < 10) {
      console.error('⚠️⚠️⚠️ 면적 계산 경고: 면적이 0이거나 너무 작습니다! ⚠️⚠️⚠️');
      console.error('총 면적:', totalArea, '평');
      console.error('면적 있는 매장:', storesWithArea);
      console.error('면적 없는 매장:', storesWithoutArea);
    }
    
    return totalArea;
  }, [hkData]);

  // 대만 오프라인 매장 총 면적 계산 (온라인 제외)
  const twOfflineTotalArea = useMemo(() => {
    if (!twData?.store_summary) return 0;
    const storeAreas = twStoreAreas.store_areas || {};
    let totalArea = 0;
    Object.keys(twData.store_summary).forEach(storeCode => {
      const store = twData.store_summary[storeCode];
      // 온라인 제외 (TE로 시작하는 매장 제외), 오프라인만
      if (!storeCode.startsWith('TE') && store.current?.net_sales > 0) {
        totalArea += (storeAreas as Record<string, number>)[storeCode] || 0;
      }
    });
    return totalArea;
  }, [twData]);

  // 대만 누적 오프라인 매출 계산 (온라인 제외)
  // PL 데이터에 cumulative.offline.net_sales가 있음!
  const twOfflineCumulative = useMemo(() => {
    return twPlData?.cumulative?.offline?.net_sales || 0;
  }, [twPlData]);

  // 홍콩+마카오 오프라인 매출 (MLB 브랜드만, 실판매출용)
  // store_summary에서 MLB 브랜드만 필터링하여 계산
  const hkOfflineCurrent = useMemo(() => {
    if (!hkData?.store_summary) {
      console.log('⚠️ hkData.store_summary가 없습니다');
      return 0;
    }
    let total = 0;
    let count = 0;
    const debugStores: any[] = [];
    let debugCount = 0;
    Object.entries(hkData.store_summary).forEach(([code, store]: [string, any]) => {
      const isHKOrMC = isHongKongOrMacauStore(code);
      const isMatch = store.brand === 'MLB' && isHKOrMC && store.channel !== 'Online' && store.current?.net_sales;
      // 디버깅: 샘플 매장 확인 (처음 10개)
      if (debugCount < 10) {
        debugStores.push({
          code,
          isHKOrMC: isHKOrMC,
          brand: store.brand,
          channel: store.channel,
          netSales: store.current?.net_sales || 0,
          matches: isMatch,
          reason: !store.brand || store.brand !== 'MLB' ? 'brand' : 
                  !isHKOrMC ? 'not_hk_mc' : 
                  store.channel === 'Online' ? 'online' : 
                  !store.current?.net_sales ? 'no_sales' : 'ok'
        });
        debugCount++;
      }
      if (isMatch) {
        total += store.current.net_sales;
        count++;
      }
    });
    console.log('홍콩/마카오 오프라인 매출 계산 (실판매출용):', { total: total / 1000, count, unit: 'K HKD', sampleStores: debugStores });
    return total;
  }, [hkData]);

  const hkOfflinePrevious = useMemo(() => {
    if (!hkData?.store_summary) return 0;
    let total = 0;
    Object.entries(hkData.store_summary).forEach(([code, store]: [string, any]) => {
      if (store.brand === 'MLB' && isHongKongOrMacauStore(code) && store.channel !== 'Online' && store.previous?.net_sales) {
        total += store.previous.net_sales;
      }
    });
    return total;
  }, [hkData]);

  const hkOfflineYoy = hkOfflinePrevious > 0 ? (hkOfflineCurrent / hkOfflinePrevious) * 100 : 0;

  // 홍콩만 온라인 (MLB 브랜드만, 마카오 제외)
  const hkOnlineCurrent = useMemo(() => {
    if (!hkData?.store_summary) return 0;
    let total = 0;
    Object.entries(hkData.store_summary).forEach(([code, store]: [string, any]) => {
      if (store.brand === 'MLB' && isHongKongOrMacauStore(code) && store.channel === 'Online' && store.current?.net_sales) {
        total += store.current.net_sales;
      }
    });
    return total;
  }, [hkData]);

  const hkOnlinePrevious = useMemo(() => {
    if (!hkData?.store_summary) return 0;
    let total = 0;
    Object.entries(hkData.store_summary).forEach(([code, store]: [string, any]) => {
      if (store.brand === 'MLB' && isHongKongOrMacauStore(code) && store.channel === 'Online' && store.previous?.net_sales) {
        total += store.previous.net_sales;
      }
    });
    return total;
  }, [hkData]);

  const hkOnlineYoy = hkOnlinePrevious > 0 ? (hkOnlineCurrent / hkOnlinePrevious) * 100 : 0;

  // 마카오 (MLB 브랜드만, Retail + Outlet)
  const mcCurrent = useMemo(() => {
    if (!hkData?.store_summary) return 0;
    let total = 0;
    Object.values(hkData.store_summary).forEach((store: any) => {
      if (store.brand === 'MLB' && store.country === 'MC' && store.channel !== 'Online' && store.current?.net_sales) {
        total += store.current.net_sales;
      }
    });
    return total;
  }, [hkData]);

  const mcPrevious = useMemo(() => {
    if (!hkData?.store_summary) return 0;
    let total = 0;
    Object.values(hkData.store_summary).forEach((store: any) => {
      if (store.brand === 'MLB' && store.country === 'MC' && store.channel !== 'Online' && store.previous?.net_sales) {
        total += store.previous.net_sales;
      }
    });
    return total;
  }, [hkData]);

  const mcYoy = mcPrevious > 0 ? (mcCurrent / mcPrevious) * 100 : 0;

  // 홍콩마카오법인 합계 (PL 데이터 사용, 이미 K HKD 단위)
  const hkmcTotalCurrent = ((hkPlData?.current_month?.hk?.net_sales || 0) + (hkPlData?.current_month?.mc?.net_sales || 0)); // K HKD 단위
  const hkmcTotalPrevious = ((hkPlData?.prev_month?.hk?.net_sales || 0) + (hkPlData?.prev_month?.mc?.net_sales || 0)); // 전년 동월
  const hkmcTotalYoy = hkmcTotalPrevious > 0 ? (hkmcTotalCurrent / hkmcTotalPrevious) * 100 : 0;
  

  // 홍콩만 누적 오프라인 매출 계산 (마카오 제외)
  // PL 데이터의 cumulative.offline.net_sales 직접 사용 (이미 오프라인만 집계됨, 홍콩만)
  const hkOfflineCumulative = useMemo(() => {
    return hkPlData?.cumulative?.offline?.net_sales || 0;
  }, [hkPlData]);

  // 홍콩 PL 데이터
  const hkPlCurrent = hkPlData?.current_month?.total;
  const hkPlCumulative = hkPlData?.cumulative?.total;
  const hkPlPrevMonth = hkPlData?.prev_month?.total;
  const hkPlPrevCumulative = hkPlData?.cumulative?.prev_cumulative?.total;
  
  // 홍콩 누적 YOY 계산
  const hkCumulativeNetSales = hkPlCumulative?.net_sales || 0;
  const hkPrevCumulativeNetSales = hkPlPrevCumulative?.net_sales || 0;
  const hkCumulativeYoy = hkPrevCumulativeNetSales > 0 
    ? (hkCumulativeNetSales / hkPrevCumulativeNetSales) * 100 
    : 0;

  // 홍콩 재고 데이터 (전체 기말재고)
  const hkStockCurrent = hkData?.ending_inventory?.total?.current || 0;
  const hkStockPrevious = hkData?.ending_inventory?.total?.previous || 0;
  const hkStockYoy = hkStockPrevious > 0 ? (hkStockCurrent / hkStockPrevious) * 100 : 0;

  // 대만 PL 데이터
  const twPlCurrent = twPlData?.current_month?.total;
  const twPlCumulative = twPlData?.cumulative?.total;
  const twPlPrevMonth = twPlData?.prev_month?.total;
  const twPlPrevCumulative = twPlData?.cumulative?.prev_cumulative?.total;
  
  // 대만 누적 YOY 계산
  const twCumulativeNetSales = twPlCumulative?.net_sales || 0;
  const twPrevCumulativeNetSales = twPlPrevCumulative?.net_sales || 0;
  const twCumulativeYoy = twPrevCumulativeNetSales > 0 
    ? (twCumulativeNetSales / twPrevCumulativeNetSales) * 100 
    : 0;

  // 대만 재고 데이터
  const twStockCurrent = twData?.ending_inventory?.total?.current || 0;
  const twStockPrevious = twData?.ending_inventory?.total?.previous || 0;
  const twStockYoy = twStockPrevious > 0 ? (twStockCurrent / twStockPrevious) * 100 : 0;

  // 평당매출 계산용: 홍콩만 오프라인 매출 (마카오 제외)
  const hkOnlyOfflineCurrent = useMemo(() => {
    if (!hkData?.store_summary) return 0;
    let total = 0;
    let m10CombinedSales = 0;
    
    Object.entries(hkData.store_summary).forEach(([code, store]: [string, any]) => {
      // M으로 시작하고 MC로 시작하지 않으면 홍콩
      const isHKOnly = code.startsWith('M') && !code.startsWith('MC');
      
      if (store.brand === 'MLB' && isHKOnly && store.channel !== 'Online' && store.current?.net_sales) {
        // M10과 M10A의 매출을 합산
        if (code === 'M10') {
          m10CombinedSales = store.current.net_sales;
          // M10A 매출도 추가
          if (hkData.store_summary['M10A']?.current?.net_sales) {
            m10CombinedSales += hkData.store_summary['M10A'].current.net_sales;
          }
          total += m10CombinedSales;
        } else if (code === 'M10A') {
          // M10A는 M10에 이미 합산되었으므로 건너뛰기
          return;
        } else {
          total += store.current.net_sales;
        }
      }
    });
    return total;
  }, [hkData]);

  // 홍콩 할인율 계산: 1 - (실판매출 / 택매출)
  const hkDiscountRateCurrent = useMemo(() => {
    const pl = hkPlData?.current_month?.total;
    if (!pl || !pl.tag_sales || pl.tag_sales === 0) return 0;
    return ((pl.tag_sales - pl.net_sales) / pl.tag_sales) * 100;
  }, [hkPlData]);

  const hkDiscountRateCumulative = useMemo(() => {
    const pl = hkPlData?.cumulative?.total;
    if (!pl || !pl.tag_sales || pl.tag_sales === 0) return 0;
    return ((pl.tag_sales - pl.net_sales) / pl.tag_sales) * 100;
  }, [hkPlData]);

  // 홍콩 전년 할인율 계산
  const hkDiscountRatePrevMonth = useMemo(() => {
    const pl = hkPlData?.prev_month?.total;
    if (!pl || !pl.tag_sales || pl.tag_sales === 0) return 0;
    return ((pl.tag_sales - pl.net_sales) / pl.tag_sales) * 100;
  }, [hkPlData]);

  const hkDiscountRatePrevCumulative = useMemo(() => {
    const pl = hkPlData?.cumulative?.prev_cumulative?.total;
    if (!pl || !pl.tag_sales || pl.tag_sales === 0) return 0;
    return ((pl.tag_sales - pl.net_sales) / pl.tag_sales) * 100;
  }, [hkPlData]);

  // 대만 할인율 계산: 1 - (실판매출 * 1.05 / 택매출)
  const twDiscountRateCurrent = useMemo(() => {
    const pl = twPlData?.current_month?.total;
    if (!pl || !pl.tag_sales || pl.tag_sales === 0) return 0;
    return ((pl.tag_sales - (pl.net_sales * 1.05)) / pl.tag_sales) * 100;
  }, [twPlData]);

  const twDiscountRateCumulative = useMemo(() => {
    const pl = twPlData?.cumulative?.total;
    if (!pl || !pl.tag_sales || pl.tag_sales === 0) return 0;
    return ((pl.tag_sales - (pl.net_sales * 1.05)) / pl.tag_sales) * 100;
  }, [twPlData]);

  // 대만 전년 할인율 계산
  const twDiscountRatePrevMonth = useMemo(() => {
    const pl = twPlData?.prev_month?.total;
    if (!pl || !pl.tag_sales || pl.tag_sales === 0) return 0;
    return ((pl.tag_sales - (pl.net_sales * 1.05)) / pl.tag_sales) * 100;
  }, [twPlData]);

  const twDiscountRatePrevCumulative = useMemo(() => {
    const pl = twPlData?.cumulative?.prev_cumulative?.total;
    if (!pl || !pl.tag_sales || pl.tag_sales === 0) return 0;
    return ((pl.tag_sales - (pl.net_sales * 1.05)) / pl.tag_sales) * 100;
  }, [twPlData]);

  // 데이터 로드 확인
  if (isLoading || !hkData || !twData || !hkPlData || !twPlData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-600 mb-2">
            {isLoading ? '데이터를 불러오는 중...' : '데이터를 불러올 수 없습니다'}
          </div>
          {isLoading && (
            <div className="mt-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 디버깅: PL 데이터 확인
  console.log('=== 홍콩 PL 데이터 확인 ===');
  console.log('당월 영업이익:', hkPlCurrent?.operating_profit, 'K HKD');
  console.log('누적 영업이익:', hkPlCumulative?.operating_profit, 'K HKD');
  console.log('당월 매출:', hkPlCurrent?.net_sales, 'K HKD');
  console.log('누적 매출:', hkPlCumulative?.net_sales, 'K HKD');
  console.log('========================');
  
  // 디버깅: 재고 데이터 확인
  console.log('홍콩 재고 데이터:', {
    hkStockCurrent,
    hkStockPrevious,
    hkStockYoy,
    rawData: hkData?.ending_inventory
  });

  // 디버깅: 대만 PL 데이터 확인
  console.log('=== 대만 PL 데이터 확인 ===');
  console.log('당월 영업이익:', twPlCurrent?.operating_profit, 'K HKD');
  console.log('누적 영업이익:', twPlCumulative?.operating_profit, 'K HKD');
  console.log('당월 매출:', twPlCurrent?.net_sales, 'K HKD');
  console.log('누적 매출:', twPlCumulative?.net_sales, 'K HKD');
  console.log('========================');

  // 대만 YOY 계산
  const twRetail = twData?.country_channel_summary?.TW_Retail;
  const twOutlet = twData?.country_channel_summary?.TW_Outlet;
  const twOnline = twData?.country_channel_summary?.TW_Online;

  // 대만 오프라인 (모두 K HKD 단위로 통일)
  const twOfflineCurrent = twPlData?.current_month?.offline?.net_sales || 0; // PL: K HKD
  const twOfflinePrevious = ((twRetail?.previous?.net_sales || 0) + (twOutlet?.previous?.net_sales || 0)) / 1000; // Dashboard: HKD → K HKD
  const twOfflineYoy = twOfflinePrevious > 0 ? (twOfflineCurrent / twOfflinePrevious) * 100 : 0;

  // 대만 온라인 (K HKD 단위로 변환)
  const twOnlineCurrent = (twOnline?.current?.net_sales || 0) / 1000; // Dashboard: HKD → K HKD
  const twOnlinePrevious = (twOnline?.previous?.net_sales || 0) / 1000; // Dashboard: HKD → K HKD
  const twOnlineYoy = twOnlinePrevious > 0 ? (twOnlineCurrent / twOnlinePrevious) * 100 : 0;

  // 대만법인 합계 (모두 K HKD 단위)
  const twTotalCurrent = twOfflineCurrent + twOnlineCurrent;
  const twTotalPrevious = twOfflinePrevious + twOnlinePrevious;
  const twTotalYoy = twTotalPrevious > 0 ? (twTotalCurrent / twTotalPrevious) * 100 : 0;

  // 평당매출 계산 (면적: 홍콩만, 매출: 홍콩만 오프라인)
  // PL 데이터 사용 (이미 K HKD 단위)
  const hkOnlyOfflineCurrentKHKD = hkPlData?.current_month?.hk?.net_sales || 0; // K HKD 단위
  const hkSalesPerPyeongCurrent = hkOfflineTotalArea > 0 ? hkOnlyOfflineCurrentKHKD / hkOfflineTotalArea : 0; // K HKD/평 단위
  // hkOfflineCumulative는 PL 데이터에서 가져오므로 K HKD 단위 (1000으로 나누지 않음)
  // 누적 평균 면적 (PL 데이터에서 월별 면적 합계를 모두 더한 후 월수로 나눈 값, 홍콩만)
  const hkCumulativeAvgArea = hkPlData?.cumulative?.offline?.average_area || hkOfflineTotalArea; // 누적 평균 면적, 없으면 당월 면적 사용
  // 누적 평당매출 계산: 누적 매출을 누적 평균 면적로 나눔
  const hkSalesPerPyeongCumulative = hkCumulativeAvgArea > 0 ? hkOfflineCumulative / hkCumulativeAvgArea : 0; // 누적 평당매출 (K HKD/평 단위)
  // 평당매출/1일 계산: 평당매출(K HKD/평)을 HKD로 변환(1000 곱하기) 후 일수로 나누기
  const hkDailySalesPerPyeongCurrent = currentMonthDays > 0 && hkSalesPerPyeongCurrent > 0 ? (hkSalesPerPyeongCurrent * 1000) / currentMonthDays : 0; // 당월은 해당 월 일수 기준
  const hkDailySalesPerPyeongCumulative = cumulativeDays > 0 && hkSalesPerPyeongCumulative > 0 ? (hkSalesPerPyeongCumulative * 1000) / cumulativeDays : 0; // 누적은 누적 일수로 나누기
  
  // 전년도 평당매출/1일 계산 (홍콩)
  const hkOnlyOfflinePreviousKHKD = hkPlData?.prev_month?.hk?.net_sales || 0; // K HKD 단위
  const hkOfflineTotalAreaPrevious = useMemo(() => {
    if (!hkData?.store_summary) return 0;
    const storeAreas = hkStoreAreas?.store_areas || {};
    let totalArea = 0;
    Object.keys(hkData.store_summary).forEach(storeCode => {
      const store = hkData.store_summary[storeCode];
      if (storeCode === 'M10A') return;
      if (store.brand === 'MLB' && isHongKongOnlyStore(storeCode) && store.channel !== 'Online' && store.previous?.net_sales > 0) {
        const area = (storeAreas as Record<string, number>)[storeCode] || 0;
        if (store.closed === true && area > 0) {
          const salesPerPyeong = (store.previous.net_sales / 1000) / area;
          if (salesPerPyeong < 1) return;
        }
        if (area > 0) {
          totalArea += area;
        }
      }
    });
    return totalArea;
  }, [hkData, hkStoreAreas]);
  const hkSalesPerPyeongPrevious = hkOfflineTotalAreaPrevious > 0 ? hkOnlyOfflinePreviousKHKD / hkOfflineTotalAreaPrevious : 0; // K HKD/평 단위
  const hkDailySalesPerPyeongPrevious = currentMonthDays > 0 && hkSalesPerPyeongPrevious > 0 ? (hkSalesPerPyeongPrevious * 1000) / currentMonthDays : 0;
  const hkDailySalesPerPyeongYoy = hkDailySalesPerPyeongPrevious > 0 ? (hkDailySalesPerPyeongCurrent / hkDailySalesPerPyeongPrevious) * 100 : 0;
  
  // 전년도 누적 평당매출/1일 계산 (홍콩)
  const hkOfflineCumulativePrevious = hkPlData?.cumulative?.prev_cumulative?.hk?.net_sales || 0; // K HKD 단위
  const hkCumulativeAvgAreaPrevious = hkPlData?.cumulative?.prev_cumulative?.offline?.average_area || hkOfflineTotalAreaPrevious;
  const hkSalesPerPyeongCumulativePrevious = hkCumulativeAvgAreaPrevious > 0 ? hkOfflineCumulativePrevious / hkCumulativeAvgAreaPrevious : 0;
  const hkDailySalesPerPyeongCumulativePrevious = cumulativeDays > 0 && hkSalesPerPyeongCumulativePrevious > 0 ? (hkSalesPerPyeongCumulativePrevious * 1000) / cumulativeDays : 0;
  const hkDailySalesPerPyeongCumulativeYoy = hkDailySalesPerPyeongCumulativePrevious > 0 ? (hkDailySalesPerPyeongCumulative / hkDailySalesPerPyeongCumulativePrevious) * 100 : 0;
  
  // 디버깅: 평당매출 계산 확인 (면적: 홍콩만, 매출: 홍콩만 오프라인)
  console.log('=== 홍콩 평당매출 계산 (면적: 홍콩만, 매출: PL 데이터, M10A는 M10에 포함) ===');
  console.log('[당월]');
  console.log('홍콩 오프라인 매출 (PL 데이터):', hkOnlyOfflineCurrentKHKD.toFixed(2), 'K HKD');
  console.log('홍콩 오프라인 면적:', hkOfflineTotalArea, '평 (M10A는 M10에 포함, 면적 0인 매장 제외)');
  console.log('평당매출:', hkSalesPerPyeongCurrent.toFixed(2), 'K HKD/평');
  console.log('당월 일수:', currentMonthDays, '일');
  console.log('1일 평당매출:', hkDailySalesPerPyeongCurrent.toFixed(1), 'HKD/평/일');
  console.log('계산식: ' + hkOnlyOfflineCurrentKHKD.toFixed(2) + ' / ' + hkOfflineTotalArea + ' = ' + hkSalesPerPyeongCurrent.toFixed(2) + ' K HKD/평');
  console.log('일평균 계산식: (' + hkSalesPerPyeongCurrent.toFixed(2) + ' * 1000) / ' + currentMonthDays + ' = ' + hkDailySalesPerPyeongCurrent.toFixed(1) + ' HKD/평/일');
    console.log('[누적]');
    console.log('누적 오프라인 매출:', hkOfflineCumulative.toFixed(2), 'K HKD (PL 데이터, 이미 K HKD 단위)');
    console.log('당월 오프라인 면적:', hkOfflineTotalArea, '평');
    console.log('누적 평균 면적:', hkCumulativeAvgArea.toFixed(2), '평 (월별 면적 합계를 모두 더한 후 월수로 나눈 값, 홍콩만)');
    console.log('평당매출:', hkSalesPerPyeongCumulative.toFixed(2), 'K HKD/평');
    console.log('누적 일수:', cumulativeDays, '일');
    console.log('1일 평당매출:', hkDailySalesPerPyeongCumulative.toFixed(1), 'HKD/평/일');
    console.log('계산식: ' + hkOfflineCumulative.toFixed(2) + ' / ' + hkCumulativeAvgArea.toFixed(2) + ' = ' + hkSalesPerPyeongCumulative.toFixed(2) + ' K HKD/평');
    console.log('일평균 계산식: (' + hkSalesPerPyeongCumulative.toFixed(2) + ' * 1000) / ' + cumulativeDays + ' = ' + hkDailySalesPerPyeongCumulative.toFixed(1) + ' HKD/평/일');
  console.log('=====================================');
  
  if (hkDailySalesPerPyeongCurrent > 100000) {
    console.error('⚠️⚠️⚠️ 1일 평당매출이 비정상적으로 큽니다! ⚠️⚠️⚠️');
    console.error('면적이 제대로 계산되지 않았을 가능성이 있습니다.');
  }

  // 대만 평당매출 계산 (당월, 누적)
  // twOfflineCurrent는 PL 데이터에서 가져오므로 K HKD 단위 (1000으로 나누지 않음)
  const twSalesPerPyeongCurrent = twOfflineTotalArea > 0 ? twOfflineCurrent / twOfflineTotalArea : 0; // K HKD/평 단위
  // twOfflineCumulative는 PL 데이터에서 가져오므로 K HKD 단위 (1000으로 나누지 않음)
  const twSalesPerPyeongCumulative = twOfflineTotalArea > 0 ? twOfflineCumulative / twOfflineTotalArea : 0; // K HKD/평 단위
  // 평당매출/1일 계산: 평당매출(K HKD/평)을 HKD로 변환(1000 곱하기) 후 일수로 나누기
  const twDailySalesPerPyeongCurrent = currentMonthDays > 0 ? (twSalesPerPyeongCurrent * 1000) / currentMonthDays : 0; // 당월은 해당 월 일수 기준
  const twDailySalesPerPyeongCumulative = cumulativeDays > 0 ? (twSalesPerPyeongCumulative * 1000) / cumulativeDays : 0; // 누적은 1월부터 해당 월까지 누적 일수 기준
  
  // 전년도 평당매출/1일 계산 (대만)
  const twOfflineTotalAreaPrevious = useMemo(() => {
    if (!twData?.store_summary) return 0;
    const storeAreas = twStoreAreas?.store_areas || {};
    let totalArea = 0;
    Object.values(twData.store_summary).forEach((store: any) => {
      if (store.channel === 'Online') return;
      if ((store.previous?.net_sales || 0) === 0) return;
      const area = storeAreas[store.store_code] || 0;
      if (store.closed === true && area > 0) {
        const salesPerPyeong = (store.previous.net_sales / 1000) / area;
        if (salesPerPyeong < 1) return;
      }
      if (area > 0) {
        totalArea += area;
      }
    });
    return totalArea;
  }, [twData]);
  const twSalesPerPyeongPrevious = twOfflineTotalAreaPrevious > 0 ? twOfflinePrevious / twOfflineTotalAreaPrevious : 0; // K HKD/평 단위
  const twDailySalesPerPyeongPrevious = currentMonthDays > 0 && twSalesPerPyeongPrevious > 0 ? (twSalesPerPyeongPrevious * 1000) / currentMonthDays : 0;
  const twDailySalesPerPyeongYoy = twDailySalesPerPyeongPrevious > 0 ? (twDailySalesPerPyeongCurrent / twDailySalesPerPyeongPrevious) * 100 : 0;
  
  // 전년도 누적 평당매출/1일 계산 (대만)
  const twOfflineCumulativePrevious = twPlData?.cumulative?.prev_cumulative?.offline?.net_sales || 0; // K HKD 단위
  const twCumulativeAvgAreaPrevious = twPlData?.cumulative?.prev_cumulative?.offline?.average_area || twOfflineTotalAreaPrevious;
  const twSalesPerPyeongCumulativePrevious = twCumulativeAvgAreaPrevious > 0 ? twOfflineCumulativePrevious / twCumulativeAvgAreaPrevious : 0;
  const twDailySalesPerPyeongCumulativePrevious = cumulativeDays > 0 && twSalesPerPyeongCumulativePrevious > 0 ? (twSalesPerPyeongCumulativePrevious * 1000) / cumulativeDays : 0;
  const twDailySalesPerPyeongCumulativeYoy = twDailySalesPerPyeongCumulativePrevious > 0 ? (twDailySalesPerPyeongCumulative / twDailySalesPerPyeongCumulativePrevious) * 100 : 0;

  // HKD 포맷 함수 (소수점 1자리)
  const formatHKD = (num: number) => {
    if (num === undefined || num === null || isNaN(Number(num))) return '0';
    const value = Number(num);
    if (!isFinite(value)) return '0';
    return value.toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* 메인 컨텐츠 */}
      {/* 원래 값: max-w-7xl px-6 py-8, mb-8 */}
      <main className="max-w-[1920px] mx-auto px-8 py-4">
        {/* 히어로 섹션 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 leading-tight mb-1">
                {periodLabel} 홍콩법인 경영대시보드
              </h2>
              <div className="flex items-center gap-2">
                {isEditingDate ? (
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    onBlur={() => setIsEditingDate(false)}
                    autoFocus
                    className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />
                ) : (
                  <p 
                    className="text-sm text-gray-500 cursor-pointer hover:text-blue-600 hover:underline"
                    onClick={() => setIsEditingDate(true)}
                    title="클릭하여 수정"
                  >
                    보고일자 {formatReportDate(reportDate)}
                  </p>
                )}
              </div>
            </div>
            <div className="relative">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="appearance-none bg-white/90 backdrop-blur-sm border-2 border-gray-300 rounded-lg px-4 py-2 text-lg font-semibold text-gray-900 hover:border-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 cursor-pointer pr-10 shadow-sm hover:shadow-md transition-all"
              >
                {periodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 대시보드 선택 카드 */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {/* 법인 섹션 */}
          <div className="col-span-2 bg-blue-100 rounded-2xl p-4">
            <div className="grid grid-cols-2 gap-4">
              {/* 1. 홍콩마카오법인 카드 - 브랜드 스타일 */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden hover:border-blue-400 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
            <div className="p-6">
              {/* 헤더: 아이콘 + 상태 배지 */}
              <div className="flex items-start justify-between mb-4">
                {/* 브랜드 아이콘 */}
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-xl font-bold text-white">HKMC</span>
                </div>
                
                {/* 상태 배지 */}
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    hkmcTotalYoy >= 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    매출 {hkmcTotalYoy >= 100 ? '↑' : '↓'}
                  </span>
                </div>
              </div>

              {/* 제목 */}
              <h3 className="text-2xl font-bold text-gray-900 mb-1">홍콩마카오법인</h3>
              <p className="text-sm text-gray-500 mb-4">{selectedMonth}월 실적 요약 (MLB 기준)</p>
              
              {/* 주요 지표 배지 */}
              <div className="flex gap-2 mb-3">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-600">매출 </span>
                  <span className={`text-lg font-bold ${
                    hkmcTotalYoy >= 100 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercent(hkmcTotalYoy)}%
                  </span>
                </div>
                <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-600">할인율 </span>
                  <span className="text-lg font-bold text-amber-700">
                    {hkDiscountRateCurrent.toFixed(1)}%
                  </span>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-600">재고 </span>
                  <span className="text-lg font-bold text-purple-600">
                    {formatPercent(hkStockYoy)}%
                  </span>
                </div>
              </div>

              {/* 핵심 지표 카드들 */}
              <div className="space-y-3 mb-6">
                {/* 실판매출 */}
                <div className="bg-gradient-to-r from-blue-50 to-transparent rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-blue-900">💰 실판매출</div>
                    <div className="text-xs text-gray-500">1K HKD</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">당월</div>
                      <div className="text-xl font-bold text-gray-900">
                        {formatPlNumber(hkmcTotalCurrent)}
                      </div>
                      <div className={`text-xs font-semibold ${
                        hkmcTotalYoy >= 100 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        YOY {formatPercent(hkmcTotalYoy)}%
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        평당매출/1일: {formatHKD(hkDailySalesPerPyeongCurrent)} HKD
                        {hkDailySalesPerPyeongYoy > 0 && (
                          <span className={`ml-2 font-semibold ${hkDailySalesPerPyeongYoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                            ({formatPercent(hkDailySalesPerPyeongYoy)}%)
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">누적</div>
                      <div className="text-xl font-bold text-gray-900">
                        {formatPlNumber(hkPlCumulative?.net_sales || 0)}
                      </div>
                      <div className="text-xs font-semibold text-green-600">
                        YOY {formatPercent(hkCumulativeYoy)}%
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        평당매출/1일: {formatHKD(hkDailySalesPerPyeongCumulative)} HKD
                        {hkDailySalesPerPyeongCumulativeYoy > 0 && (
                          <span className={`ml-2 font-semibold ${hkDailySalesPerPyeongCumulativeYoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                            ({formatPercent(hkDailySalesPerPyeongCumulativeYoy)}%)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-blue-100">
                    *평당매출: 마카오 및 온라인 제외
                  </div>
                </div>

                {/* 할인율 */}
                <div className="bg-gradient-to-r from-amber-50 to-transparent rounded-xl p-3 border border-amber-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-amber-900">🏷️ 할인율</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">당월</div>
                      <div className="text-xl font-bold text-gray-900">
                        {hkDiscountRateCurrent.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        전년 {hkDiscountRatePrevMonth.toFixed(1)}% |
                        <span className={`ml-1 font-semibold ${
                          (hkDiscountRateCurrent - hkDiscountRatePrevMonth) >= 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {(hkDiscountRateCurrent - hkDiscountRatePrevMonth) >= 0 ? '+' : ''}
                          {(hkDiscountRateCurrent - hkDiscountRatePrevMonth).toFixed(1)}%p
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">누적</div>
                      <div className="text-xl font-bold text-gray-900">
                        {hkDiscountRateCumulative.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        전년 {hkDiscountRatePrevCumulative.toFixed(1)}% |
                        <span className={`ml-1 font-semibold ${
                          (hkDiscountRateCumulative - hkDiscountRatePrevCumulative) >= 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {(hkDiscountRateCumulative - hkDiscountRatePrevCumulative) >= 0 ? '+' : ''}
                          {(hkDiscountRateCumulative - hkDiscountRatePrevCumulative).toFixed(1)}%p
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 영업이익 */}
                <div className="bg-gradient-to-r from-red-50 to-transparent rounded-xl p-3 border border-red-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-red-900">📉 영업이익</div>
                    <div className="text-xs text-gray-500">1K HKD</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">당월</div>
                      <div className={`text-xl font-bold ${
                        (hkPlCurrent?.operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPlNumber(hkPlCurrent?.operating_profit || 0)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(hkPlCurrent?.operating_profit || 0) >= 0 ? '흑자' : '적자'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        전년 {formatPlNumber(hkPlPrevMonth?.operating_profit || 0)} |
                        <span className={`ml-1 font-semibold ${
                          ((hkPlCurrent?.operating_profit || 0) - (hkPlPrevMonth?.operating_profit || 0)) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {((hkPlCurrent?.operating_profit || 0) - (hkPlPrevMonth?.operating_profit || 0)) >= 0 ? '+' : '△'}
                          {formatPlNumber(Math.abs((hkPlCurrent?.operating_profit || 0) - (hkPlPrevMonth?.operating_profit || 0)))}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">누적</div>
                      <div className={`text-xl font-bold ${
                        (hkPlCumulative?.operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPlNumber(hkPlCumulative?.operating_profit || 0)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(hkPlCumulative?.operating_profit || 0) >= 0 ? '흑자' : '적자'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        전년 {formatPlNumber(hkPlPrevCumulative?.operating_profit || 0)} |
                        <span className={`ml-1 font-semibold ${
                          ((hkPlCumulative?.operating_profit || 0) - (hkPlPrevCumulative?.operating_profit || 0)) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {((hkPlCumulative?.operating_profit || 0) - (hkPlPrevCumulative?.operating_profit || 0)) >= 0 ? '+' : '△'}
                          {formatPlNumber(Math.abs((hkPlCumulative?.operating_profit || 0) - (hkPlPrevCumulative?.operating_profit || 0)))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 재고 */}
                <div className="bg-gradient-to-r from-purple-50 to-transparent rounded-xl p-4 border border-purple-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-purple-900">📦 기말재고</div>
                    <div className="text-xs text-gray-500">Tag 기준 (1K HKD)</div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatPlNumber(hkStockCurrent)}
                    </div>
                    <div className="text-sm font-semibold text-purple-600">
                      YOY {formatPercent(hkStockYoy)}%
                    </div>
                  </div>
                </div>

                {/* 디스커버리 실적 */}
                {hkPlData?.discovery && (
                  <div className="bg-gradient-to-r from-orange-50 to-transparent rounded-xl p-4 border border-orange-100">
                    <button
                      onClick={() => setShowHkmcDiscovery(!showHkmcDiscovery)}
                      className="flex items-center justify-between w-full mb-2"
                    >
                      <div className="text-sm font-semibold text-orange-900">🔍 디스커버리 실적</div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-500">1K HKD</div>
                        {showHkmcDiscovery ? (
                          <ChevronDown size={16} className="text-orange-600" />
                        ) : (
                          <ChevronRight size={16} className="text-orange-600" />
                        )}
                      </div>
                    </button>
                    
                    {showHkmcDiscovery && (
                      <>
                        {/* 매장수 */}
                        <div className="mb-3 pb-2 border-b border-orange-200">
                          <div className="text-xs text-gray-600 mb-1">매장수</div>
                          <div className="flex gap-2 text-xs">
                            <span className="text-gray-700">
                              오프라인: <span className="font-semibold">{hkPlData?.discovery?.store_count?.offline || 0}개</span>
                              {hkPlData?.discovery?.prev_store_count?.offline !== undefined && (
                                <span className="text-gray-500 ml-1">(전월: {hkPlData.discovery.prev_store_count.offline}개)</span>
                              )}
                            </span>
                            <span className="text-gray-700">
                              온라인: <span className="font-semibold">{hkPlData?.discovery?.store_count?.online || 0}개</span>
                              {hkPlData?.discovery?.prev_store_count?.online !== undefined && (
                                <span className="text-gray-500 ml-1">(전월: {hkPlData.discovery.prev_store_count.online}개)</span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* 실판매출 */}
                        <div className="mb-3">
                          <div className="text-xs text-gray-600 mb-1">💰 실판매출</div>
                          <div className="flex items-baseline gap-2">
                            <div className="text-lg font-bold text-gray-900">
                              {formatPlNumber(hkPlData?.discovery?.net_sales || 0)}
                            </div>
                            {hkPlData?.discovery?.prev_net_sales !== undefined && hkPlData.discovery.prev_net_sales > 0 && (
                              <>
                                <div className="text-xs text-gray-500">
                                  (전월: {formatPlNumber(hkPlData.discovery.prev_net_sales)})
                                </div>
                                <div className={`text-xs font-semibold ${
                                  hkPlData.discovery.net_sales_mom >= 100 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  전월비 {formatPercent(hkPlData.discovery.net_sales_mom)}%
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* 영업이익 */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-gray-600 mb-1">당월</div>
                            <div className={`text-xl font-bold ${
                              (hkPlData?.discovery?.operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatPlNumber(hkPlData?.discovery?.operating_profit || 0)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(hkPlData?.discovery?.operating_profit || 0) >= 0 ? '흑자' : '적자'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600 mb-1">누적</div>
                            <div className={`text-xl font-bold ${
                              (hkPlData?.discovery?.cumulative_operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatPlNumber(hkPlData?.discovery?.cumulative_operating_profit || 0)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(hkPlData?.discovery?.cumulative_operating_profit || 0) >= 0 ? '흑자' : '적자'}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>


              {/* 대시보드 버튼 */}
              <Link
                href={`/hongkong?period=${selectedPeriod}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-center py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                전체 대시보드 보기
              </Link>
            </div>
              </div>

              {/* 2. 대만법인 카드 - 브랜드 스타일 */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden hover:border-purple-400 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
            <div className="p-6">
              {/* 헤더: 아이콘 + 상태 배지 */}
              <div className="flex items-start justify-between mb-4">
                {/* 브랜드 아이콘 */}
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-bold text-white">TW</span>
                </div>
                
                {/* 상태 배지 */}
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    twTotalYoy >= 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    매출 {twTotalYoy >= 100 ? '↑' : '↓'}
                  </span>
                </div>
              </div>

              {/* 제목 */}
              <h3 className="text-2xl font-bold text-gray-900 mb-1">대만법인</h3>
              <p className="text-sm text-gray-500 mb-4">{selectedMonth}월 실적 요약 (MLB 기준)</p>
              
              {/* 주요 지표 배지 */}
              <div className="flex gap-2 mb-3">
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-600">매출 </span>
                  <span className={`text-lg font-bold ${
                    twTotalYoy >= 100 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercent(twTotalYoy)}%
                  </span>
                </div>
                <div className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-600">할인율 </span>
                  <span className="text-lg font-bold text-amber-700">
                    {twDiscountRateCurrent.toFixed(1)}%
                  </span>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-600">재고 </span>
                  <span className="text-lg font-bold text-purple-600">
                    {formatPercent(twStockYoy)}%
                  </span>
                </div>
              </div>

              {/* 핵심 지표 카드들 */}
              <div className="space-y-3 mb-6">
                {/* 실판매출 */}
                <div className="bg-gradient-to-r from-purple-50 to-transparent rounded-xl p-4 border border-purple-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-purple-900">💰 실판매출</div>
                    <div className="text-xs text-gray-500">1K HKD</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">당월</div>
                      <div className="text-xl font-bold text-gray-900">
                        {formatPlNumber(twTotalCurrent)}
                      </div>
                      <div className={`text-xs font-semibold ${
                        twTotalYoy >= 100 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        YOY {formatPercent(twTotalYoy)}%
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        평당매출/1일: {formatHKD(twDailySalesPerPyeongCurrent)} HKD
                        {twDailySalesPerPyeongYoy > 0 && (
                          <span className={`ml-2 font-semibold ${twDailySalesPerPyeongYoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                            ({formatPercent(twDailySalesPerPyeongYoy)}%)
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">누적</div>
                      <div className="text-xl font-bold text-gray-900">
                        {formatPlNumber(twPlCumulative?.net_sales || 0)}
                      </div>
                      <div className="text-xs font-semibold text-green-600">
                        YOY {formatPercent(twCumulativeYoy)}%
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        평당매출/1일: {formatHKD(twDailySalesPerPyeongCumulative)} HKD
                        {twDailySalesPerPyeongCumulativeYoy > 0 && (
                          <span className={`ml-2 font-semibold ${twDailySalesPerPyeongCumulativeYoy >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                            ({formatPercent(twDailySalesPerPyeongCumulativeYoy)}%)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-purple-100">
                    *평당매출: 온라인 제외
                  </div>
                </div>

                {/* 할인율 */}
                <div className="bg-gradient-to-r from-amber-50 to-transparent rounded-xl p-3 border border-amber-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-amber-900">🏷️ 할인율</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">당월</div>
                      <div className="text-xl font-bold text-gray-900">
                        {twDiscountRateCurrent.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        전년 {twDiscountRatePrevMonth.toFixed(1)}% |
                        <span className={`ml-1 font-semibold ${
                          (twDiscountRateCurrent - twDiscountRatePrevMonth) >= 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {(twDiscountRateCurrent - twDiscountRatePrevMonth) >= 0 ? '+' : ''}
                          {(twDiscountRateCurrent - twDiscountRatePrevMonth).toFixed(1)}%p
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">누적</div>
                      <div className="text-xl font-bold text-gray-900">
                        {twDiscountRateCumulative.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        전년 {twDiscountRatePrevCumulative.toFixed(1)}% |
                        <span className={`ml-1 font-semibold ${
                          (twDiscountRateCumulative - twDiscountRatePrevCumulative) >= 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {(twDiscountRateCumulative - twDiscountRatePrevCumulative) >= 0 ? '+' : ''}
                          {(twDiscountRateCumulative - twDiscountRatePrevCumulative).toFixed(1)}%p
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 영업이익 */}
                <div className="bg-gradient-to-r from-green-50 to-transparent rounded-xl p-3 border border-green-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-green-900">📈 영업이익</div>
                    <div className="text-xs text-gray-500">1K HKD</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">당월</div>
                      <div className={`text-xl font-bold ${
                        (twPlCurrent?.operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPlNumber(twPlCurrent?.operating_profit || 0)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(twPlCurrent?.operating_profit || 0) >= 0 ? '흑자' : '적자'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        전년 {formatPlNumber(twPlPrevMonth?.operating_profit || 0)} |
                        <span className={`ml-1 font-semibold ${
                          ((twPlCurrent?.operating_profit || 0) - (twPlPrevMonth?.operating_profit || 0)) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {((twPlCurrent?.operating_profit || 0) - (twPlPrevMonth?.operating_profit || 0)) >= 0 ? '+' : '△'}
                          {formatPlNumber(Math.abs((twPlCurrent?.operating_profit || 0) - (twPlPrevMonth?.operating_profit || 0)))}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">누적</div>
                      <div className={`text-xl font-bold ${
                        (twPlCumulative?.operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPlNumber(twPlCumulative?.operating_profit || 0)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(twPlCumulative?.operating_profit || 0) >= 0 ? '흑자' : '적자'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        전년 {formatPlNumber(twPlPrevCumulative?.operating_profit || 0)} |
                        <span className={`ml-1 font-semibold ${
                          ((twPlCumulative?.operating_profit || 0) - (twPlPrevCumulative?.operating_profit || 0)) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {((twPlCumulative?.operating_profit || 0) - (twPlPrevCumulative?.operating_profit || 0)) >= 0 ? '+' : '△'}
                          {formatPlNumber(Math.abs((twPlCumulative?.operating_profit || 0) - (twPlPrevCumulative?.operating_profit || 0)))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 재고 */}
                <div className="bg-gradient-to-r from-purple-50 to-transparent rounded-xl p-4 border border-purple-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-purple-900">📦 기말재고</div>
                    <div className="text-xs text-gray-500">Tag 기준 (1K HKD)</div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatPlNumber(twStockCurrent)}
                    </div>
                    <div className="text-sm font-semibold text-purple-600">
                      YOY {formatPercent(twStockYoy)}%
                    </div>
                  </div>
                </div>

                {/* 디스커버리 실적 */}
                {twPlData?.discovery && (
                  <div className="bg-gradient-to-r from-orange-50 to-transparent rounded-xl p-4 border border-orange-100">
                    <button
                      onClick={() => setShowTwDiscovery(!showTwDiscovery)}
                      className="flex items-center justify-between w-full mb-2"
                    >
                      <div className="text-sm font-semibold text-orange-900">🔍 디스커버리 실적</div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-500">1K HKD</div>
                        {showTwDiscovery ? (
                          <ChevronDown size={16} className="text-orange-600" />
                        ) : (
                          <ChevronRight size={16} className="text-orange-600" />
                        )}
                      </div>
                    </button>
                    
                    {showTwDiscovery && (
                      <>
                        {/* 매장수 */}
                        <div className="mb-3 pb-2 border-b border-orange-200">
                          <div className="text-xs text-gray-600 mb-1">매장수</div>
                          <div className="flex gap-2 text-xs">
                            <span className="text-gray-700">
                              오프라인: <span className="font-semibold">{twPlData?.discovery?.store_count?.offline || 0}개</span>
                              {twPlData?.discovery?.prev_store_count?.offline !== undefined && (
                                <span className="text-gray-500 ml-1">(전월: {twPlData.discovery.prev_store_count.offline}개)</span>
                              )}
                            </span>
                            <span className="text-gray-700">
                              온라인: <span className="font-semibold">{twPlData?.discovery?.store_count?.online || 0}개</span>
                              {twPlData?.discovery?.prev_store_count?.online !== undefined && (
                                <span className="text-gray-500 ml-1">(전월: {twPlData.discovery.prev_store_count.online}개)</span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* 실판매출 */}
                        <div className="mb-3">
                          <div className="text-xs text-gray-600 mb-1">💰 실판매출</div>
                          <div className="flex items-baseline gap-2">
                            <div className="text-lg font-bold text-gray-900">
                              {formatPlNumber(twPlData?.discovery?.net_sales || 0)}
                            </div>
                            {twPlData?.discovery?.prev_net_sales !== undefined && twPlData.discovery.prev_net_sales > 0 && (
                              <>
                                <div className="text-xs text-gray-500">
                                  (전월: {formatPlNumber(twPlData.discovery.prev_net_sales)})
                                </div>
                                <div className={`text-xs font-semibold ${
                                  twPlData.discovery.net_sales_mom >= 100 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  전월비 {formatPercent(twPlData.discovery.net_sales_mom)}%
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* 영업이익 */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-gray-600 mb-1">당월</div>
                            <div className={`text-xl font-bold ${
                              (twPlData?.discovery?.operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatPlNumber(twPlData?.discovery?.operating_profit || 0)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(twPlData?.discovery?.operating_profit || 0) >= 0 ? '흑자' : '적자'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600 mb-1">누적</div>
                            <div className={`text-xl font-bold ${
                              (twPlData?.discovery?.cumulative_operating_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatPlNumber(twPlData?.discovery?.cumulative_operating_profit || 0)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(twPlData?.discovery?.cumulative_operating_profit || 0) >= 0 ? '흑자' : '적자'}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>


              {/* 대시보드 버튼 */}
              <Link
                href={`/taiwan?period=${selectedPeriod}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-center py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                전체 대시보드 보기
              </Link>
            </div>
              </div>
            </div>
          </div>

          {/* 기타 섹션 */}
          <div className="col-span-2 bg-green-100 rounded-2xl p-4">
            <div className="grid grid-cols-2 gap-4">
              {/* 3. 홍마대 BS / 현금흐름 / 자본계획 */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden hover:border-green-400 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 min-h-[800px] flex flex-col">
            <div className="p-6 flex-1 flex flex-col">
              {/* 헤더: 아이콘 */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">📈</span>
                </div>
              </div>

              {/* 제목 */}
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                홍마대 BS / 현금흐름
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Balance Sheet / Cash Flow / Capital Plan
              </p>

              {/* 재무상태표 주요 지표 */}
              <div className="space-y-3 mb-6 flex-1">
                {/* 총자산 */}
                <div className="bg-gradient-to-r from-blue-50 to-transparent rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-blue-900">💰 총자산</div>
                    <div className="text-xs text-gray-500">25.12 E</div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    390M HKD
                  </div>
                  <div className="text-xs text-gray-600 mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span>• 매출채권 (대만 백화점):</span>
                      <span><strong>34M</strong> <span className="text-red-600 font-semibold">(+13M)</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span>• 재고자산:</span>
                      <span><strong>161M</strong> <span className="text-green-600 font-semibold">(△25M)</span></span>
                    </div>
                  </div>
                </div>

                {/* 총부채 */}
                <div className="bg-gradient-to-r from-red-50 to-transparent rounded-xl p-4 border border-red-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-red-900">💳 총부채</div>
                    <div className="text-xs text-gray-500">25.12 E</div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    374M HKD
                  </div>
                  <div className="text-xs text-gray-600 mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span>• 물대채무 (AP):</span>
                      <span><strong>133M</strong> <span className="text-green-600 font-semibold">(△1M)</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span>• TP채무:</span>
                      <span><strong>115M</strong> <span className="text-gray-500 font-semibold">(변동없음)</span></span>
                    </div>
                  </div>
                </div>

                {/* 총자본 */}
                <div className="bg-gradient-to-r from-green-50 to-transparent rounded-xl p-4 border border-green-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-green-900">💎 총자본</div>
                    <div className="text-xs text-gray-500">25.12 E</div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    16M HKD
                  </div>
                  <div className="text-xs text-gray-600 mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span>전년 대비:</span>
                      <span><span className="text-green-600 font-bold">+4M</span> <span className="text-green-600 font-semibold">(30% ↑)</span></span>
                    </div>
                    <div className="flex justify-between">
                      <span>• 이익잉여금:</span>
                      <span><strong>△3M</strong> <span className="text-green-600 font-semibold">(적자 감소 +2M)</span></span>
                    </div>
                  </div>
                </div>

                {/* 부채비율 */}
                <div className="bg-gradient-to-r from-yellow-50 to-transparent rounded-xl p-4 border border-yellow-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-yellow-900">📊 부채비율</div>
                    <div className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">TP채무 제외</div>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    198.5%
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    자기자본비율 <span className="text-green-600 font-semibold">33.5%</span> (정상 구조)
                  </div>
                </div>

                {/* 현금흐름 */}
                <div className="bg-gradient-to-r from-indigo-50 to-transparent rounded-xl p-4 border border-indigo-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-indigo-900">💧 현금흐름</div>
                    <div className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">작업중</div>
                  </div>
                  <div className="text-2xl font-bold text-gray-400">
                    -
                  </div>
                  <div className="text-xs text-gray-400 mt-1 italic">
                    영업/투자/재무 현금흐름 분석 예정
                  </div>
                </div>
              </div>

              {/* 대시보드 버튼 */}
              <Link
                href="/bs"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-center py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                전체 대시보드 보기
              </Link>
            </div>
              </div>

              {/* 4. 2026년 계획 */}
              <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden hover:border-orange-400 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
            <div className="p-6">
              {/* 헤더: 아이콘 */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">🎯</span>
                </div>
              </div>

              {/* 제목 */}
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                2026년 계획
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Business Plan 2026
              </p>

              {/* 정보 카드 */}
              <div className="bg-gradient-to-r from-orange-50 to-transparent rounded-xl p-4 border border-orange-100 mb-6">
                <div className="text-sm font-semibold text-orange-900 mb-2">
                  연간 예상 PL / 예상 물량표
                </div>
                <div className="text-xs text-gray-500 italic">
                  작업중 (매출계획 수신완료)
                </div>
              </div>

              {/* 대시보드 버튼 */}
              <Link
                href="/plan-2026"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white text-center py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                전체 대시보드 보기
              </Link>
            </div>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 정보 */}
        <div className="text-center pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            💡 각 항목을 클릭하여 상세 정보를 확인할 수 있습니다
            </p>
        </div>
      </main>
    </div>
  );
}
