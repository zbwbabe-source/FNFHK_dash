# 자동 저장 스크립트
# 사용법: .\auto-save.ps1 "커밋 메시지"

param(
    [string]$message = "자동 저장: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "🔄 Git 자동 저장 시작" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan

# 1. 현재 상태 확인
Write-Host "`n📋 현재 상태 확인 중..." -ForegroundColor Yellow
git status

# 2. 변경사항이 있는지 확인
$changes = git status --porcelain
if ([string]::IsNullOrEmpty($changes)) {
    Write-Host "`n✅ 변경사항이 없습니다." -ForegroundColor Green
    exit 0
}

# 3. 모든 변경사항 추가
Write-Host "`n➕ 변경사항 추가 중..." -ForegroundColor Yellow
git add -A

# 4. 커밋
Write-Host "`n💾 커밋 중: $message" -ForegroundColor Yellow
git commit -m "$message"

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ 커밋 실패" -ForegroundColor Red
    exit 1
}

# 5. 원격 저장소로 푸시
Write-Host "`n🚀 원격 저장소로 푸시 중..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=====================================" -ForegroundColor Cyan
    Write-Host "✅ 저장 완료!" -ForegroundColor Green
    Write-Host "=====================================" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ 푸시 실패. 원격 저장소를 먼저 pull 해야 할 수 있습니다." -ForegroundColor Red
    Write-Host "다음 명령어를 실행하세요: git pull origin main" -ForegroundColor Yellow
    exit 1
}

