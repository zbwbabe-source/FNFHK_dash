# Python 설치 확인 및 가상환경 설정 스크립트

Write-Host "=== Python 환경 설정 스크립트 ===" -ForegroundColor Cyan

# Python 설치 확인
Write-Host "`n[1/4] Python 설치 확인 중..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ Python 설치됨: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python이 설치되어 있지 않습니다." -ForegroundColor Red
    Write-Host "  Python을 먼저 설치해주세요: https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "  설치 시 'Add Python to PATH' 옵션을 체크하세요!" -ForegroundColor Yellow
    exit 1
}

# pip 확인
Write-Host "`n[2/4] pip 확인 중..." -ForegroundColor Yellow
try {
    $pipVersion = pip --version 2>&1
    Write-Host "✓ pip 설치됨: $pipVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ pip가 설치되어 있지 않습니다." -ForegroundColor Red
    Write-Host "  pip를 설치하는 중..." -ForegroundColor Yellow
    python -m ensurepip --upgrade
}

# pip 업그레이드
Write-Host "`n[3/4] pip 업그레이드 중..." -ForegroundColor Yellow
python -m pip install --upgrade pip --quiet
Write-Host "✓ pip 업그레이드 완료" -ForegroundColor Green

# 가상환경 생성
Write-Host "`n[4/4] 가상환경 생성 중..." -ForegroundColor Yellow
if (Test-Path "venv") {
    Write-Host "  가상환경이 이미 존재합니다." -ForegroundColor Yellow
    $response = Read-Host "  기존 가상환경을 삭제하고 새로 만들까요? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        Remove-Item -Recurse -Force venv
        python -m venv venv
        Write-Host "✓ 가상환경 재생성 완료" -ForegroundColor Green
    } else {
        Write-Host "  기존 가상환경을 유지합니다." -ForegroundColor Yellow
    }
} else {
    python -m venv venv
    Write-Host "✓ 가상환경 생성 완료" -ForegroundColor Green
}

# 가상환경 활성화 안내
Write-Host "`n=== 설정 완료 ===" -ForegroundColor Cyan
Write-Host "`n다음 명령어로 가상환경을 활성화하세요:" -ForegroundColor Yellow
Write-Host "  .\venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "`n가상환경 활성화 후 패키지를 설치하세요:" -ForegroundColor Yellow
Write-Host "  pip install -r requirements.txt" -ForegroundColor White

# 실행 정책 확인
Write-Host "`n만약 스크립트 실행 정책 오류가 발생하면:" -ForegroundColor Yellow
Write-Host "  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor White


