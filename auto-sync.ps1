# 자동 동기화 스크립트 (pull + push)
# 사용법: .\auto-sync.ps1 "커밋 메시지"

param(
    [string]$message = "자동 동기화: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "🔄 Git 자동 동기화 시작" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan

# 1. 원격 저장소에서 최신 버전 가져오기
Write-Host "`n⬇️  원격 저장소에서 최신 버전 가져오는 중..." -ForegroundColor Yellow
git fetch origin

# 2. 로컬 변경사항 확인
$changes = git status --porcelain
if (-not [string]::IsNullOrEmpty($changes)) {
    Write-Host "`n📋 로컬 변경사항 발견" -ForegroundColor Yellow
    
    # 3. 변경사항 추가
    Write-Host "➕ 변경사항 추가 중..." -ForegroundColor Yellow
    git add -A
    
    # 4. 커밋
    Write-Host "💾 커밋 중: $message" -ForegroundColor Yellow
    git commit -m "$message"
}

# 5. 원격과 로컬 비교
$behind = git rev-list HEAD..origin/main --count
$ahead = git rev-list origin/main..HEAD --count

if ($behind -gt 0) {
    Write-Host "`n⚠️  원격 저장소에 새로운 커밋이 $behind 개 있습니다." -ForegroundColor Yellow
    Write-Host "병합 중..." -ForegroundColor Yellow
    git pull origin main --no-rebase
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌ 병합 실패. 충돌을 해결해야 합니다." -ForegroundColor Red
        exit 1
    }
}

if ($ahead -gt 0) {
    Write-Host "`n🚀 로컬 커밋 $ahead 개를 원격으로 푸시 중..." -ForegroundColor Yellow
    git push origin main
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌ 푸시 실패" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "✅ 동기화 완료!" -ForegroundColor Green
Write-Host "로컬과 원격이 최신 상태입니다." -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan










