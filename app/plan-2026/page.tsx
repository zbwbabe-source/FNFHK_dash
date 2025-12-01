import Link from 'next/link';

export const metadata = {
  title: '2026년 계획',
  description: '2026년 비즈니스 계획',
};

export default function Plan2026Page() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-500 hover:text-gray-900 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">2026년 계획</h1>
            </div>
            <div className="text-sm text-gray-500">2025.10</div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">2026년 비즈니스 계획</h2>
          <div className="text-center py-20">
            <p className="text-gray-600 text-lg mb-4">2026년 계획 내용이 여기에 표시됩니다.</p>
            <p className="text-gray-400 text-sm">추후 업데이트 예정</p>
          </div>
        </div>
      </main>
    </div>
  );
}



