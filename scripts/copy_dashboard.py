#!/usr/bin/env python3
"""대시보드 TSX 파일을 Next.js 컴포넌트로 변환"""
import re
import os

def convert_to_nextjs_component(input_path: str, output_path: str):
    """TSX 파일을 Next.js Client Component로 변환"""
    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 'use client' 추가 (이미 있으면 스킵)
    if not content.startswith("'use client'"):
        content = "'use client';\n\n" + content
    
    # document.title 제거 또는 주석 처리
    content = re.sub(
        r"useEffect\(\(\) => \{[\s\S]*?document\.title = [^;]+;[\s\S]*?\}, \[\]\);",
        "// Title handled by Next.js metadata in layout.tsx",
        content
    )
    
    # 출력 디렉토리 생성
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # 파일 저장
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✓ Converted: {input_path} -> {output_path}")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # 홍콩법인 대시보드
    convert_to_nextjs_component(
        os.path.join(base_dir, "기초세팅", "리테일추세", "remixed-ef463aa5.tsx"),
        os.path.join(base_dir, "components", "dashboard", "hongkong-report.tsx")
    )
    
    # 대만법인 대시보드
    convert_to_nextjs_component(
        os.path.join(base_dir, "기초세팅", "리테일추세", "remixed-75baa23f.tsx"),
        os.path.join(base_dir, "components", "dashboard", "taiwan-report.tsx")
    )


