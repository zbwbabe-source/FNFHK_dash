"""
대만 대시보드 2512 전체 업데이트 스크립트
1단계: 대시보드 JSON 생성 (원본 CSV 사용, Tag 로직 내장)
2단계: 누적/CEO 인사이트 생성
"""
import subprocess
import os
import sys

print("=" * 80)
print("대만 대시보드 2512 전체 업데이트")
print("=" * 80)

# 1단계: 대시보드 JSON 생성
print("\n[1/2] 대시보드 JSON 생성 중...")
result = subprocess.run([sys.executable, "generate_taiwan_2512.py"], capture_output=True, text=True)
if result.returncode != 0:
    print("[ERROR] JSON 생성 실패:")
    print(result.stdout)
    print(result.stderr)
    sys.exit(1)
print("[OK] 대시보드 JSON 생성 완료")

# 2단계: 누적/CEO 인사이트 생성
print("\n[2/2] 누적 및 CEO 인사이트 생성 중...")

# 누적 데이터
if os.path.exists("generate_taiwan_cumulative_2512.py"):
    result = subprocess.run([sys.executable, "generate_taiwan_cumulative_2512.py"], capture_output=True, text=True)
    if result.returncode == 0:
        print("  [OK] 누적 데이터 생성 완료")
    else:
        print("  [WARN] 누적 데이터 생성 실패 (선택사항)")

# CEO 인사이트
if os.path.exists("generate_taiwan_ceo_insights_2512.py"):
    result = subprocess.run([sys.executable, "generate_taiwan_ceo_insights_2512.py"], capture_output=True, text=True)
    if result.returncode == 0:
        print("  [OK] CEO 인사이트 생성 완료")
    else:
        print("  [WARN] CEO 인사이트 생성 실패 (선택사항)")

print("\n" + "=" * 80)
print("[OK] 대만 대시보드 2512 전체 업데이트 완료!")
print("=" * 80)
print("\n다음 단계:")
print("1. 브라우저에서 대시보드 확인")
print("2. 데이터 검증")
print("3. Git commit & push")
