# Git 자동 저장 가이드

## 🚀 빠른 사용법

### 1. 간단 저장 (로컬 → Git)
```powershell
.\auto-save.ps1
```
또는 커밋 메시지와 함께:
```powershell
.\auto-save.ps1 "홍콩 대시보드 업데이트"
```

### 2. 동기화 (Git ↔ 로컬)
```powershell
.\auto-sync.ps1
```
또는 커밋 메시지와 함께:
```powershell
.\auto-sync.ps1 "대만 분석 페이지 수정"
```

## 📌 각 스크립트 설명

### `auto-save.ps1` - 빠른 저장
- **용도**: 로컬 작업 내용을 Git에 빠르게 저장
- **동작**:
  1. 변경사항 확인
  2. 모든 변경사항 추가 (git add)
  3. 커밋 (git commit)
  4. 원격 저장소로 푸시 (git push)
- **언제 사용?**: 작업 후 빠르게 백업하고 싶을 때

### `auto-sync.ps1` - 완전 동기화
- **용도**: 원격과 로컬을 완전히 동기화
- **동작**:
  1. 원격 최신 버전 확인
  2. 로컬 변경사항 커밋
  3. 원격 변경사항 병합
  4. 로컬 커밋 푸시
- **언제 사용?**: 다른 곳에서도 작업했거나, 원격이 업데이트되었을 때

## ⚙️ Git 설정 (이미 완료됨)

현재 저장소는 다음과 같이 설정되어 있습니다:
- ✅ Pull 시 병합 방식 사용 (rebase 아님)
- ✅ 자동으로 오래된 브랜치 정리

## 🔒 안전 장치

### 절대 걱정하지 마세요!
1. **모든 커밋은 보존됩니다**: Git은 모든 변경 이력을 저장합니다.
2. **복구 가능**: 실수해도 `git reflog`로 복구할 수 있습니다.
3. **충돌 감지**: 자동으로 충돌을 감지하고 알려줍니다.

### 혹시 문제가 생기면?
```powershell
# 최근 30개 커밋 이력 보기
git reflog -30

# 특정 커밋으로 되돌리기 (예: HEAD@{5})
git reset --hard HEAD@{5}
```

## 💡 추천 워크플로우

### 작업 시작 전
```powershell
.\auto-sync.ps1
```
→ 최신 버전으로 동기화

### 작업 중 (정기적으로)
```powershell
.\auto-save.ps1 "작업 내용 간단 설명"
```
→ 중간 저장

### 작업 완료 후
```powershell
.\auto-save.ps1 "최종 완료: 기능 설명"
```
→ 최종 저장

## 📊 현재 상태 확인

```powershell
# 현재 브랜치와 상태 확인
git status

# 최근 커밋 이력 5개 보기
git log --oneline -5

# 원격과의 차이 확인
git fetch origin
git status
```

## 🎯 핵심 원칙

1. **자주 저장하세요**: 작업할 때마다 `auto-save.ps1` 실행
2. **의미있는 메시지**: 무엇을 변경했는지 간단히 적으세요
3. **동기화 습관**: 하루 시작과 끝에 `auto-sync.ps1` 실행

## ❓ 자주 묻는 질문

### Q: 스크립트 실행이 안 돼요
A: PowerShell 실행 정책 설정:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Q: 충돌이 발생했어요
A: 자동 병합 실패 시 수동으로 처리:
```powershell
# 충돌 파일 확인
git status

# 충돌 해결 후
git add .
git commit -m "충돌 해결"
git push origin main
```

### Q: 실수로 저장했어요
A: 최근 커밋 취소:
```powershell
# 커밋만 취소 (파일은 유지)
git reset --soft HEAD~1

# 커밋과 변경사항 모두 취소 (주의!)
git reset --hard HEAD~1
```

## 🎉 이제 걱정 없이 작업하세요!

항상 최신 버전이 Git에 안전하게 저장됩니다.







