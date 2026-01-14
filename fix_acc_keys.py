import re

# 파일 읽기
with open('components/dashboard/taiwan-ceo-dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 정규식으로 정확하게 치환
replacements = [
    (r"acc_by_category\?\.SHO\?", "acc_by_category?.['신발']?"),
    (r"acc_by_category\?\.HEA\?", "acc_by_category?.['모자']?"),
    (r"acc_by_category\?\.BAG\?", "acc_by_category?.['가방']?"),
]

for old, new in replacements:
    content = re.sub(old, new, content)

# 파일 쓰기
with open('components/dashboard/taiwan-ceo-dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("수정 완료!")
print(f"신발 변경: {content.count('신발')}개")
print(f"모자 변경: {content.count('모자')}개")
print(f"가방 변경: {content.count('가방')}개")
