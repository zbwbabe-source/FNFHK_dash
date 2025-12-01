import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const convertFile = (inputPath, outputPath) => {
  console.log(`Reading ${inputPath}...`);
  let content = readFileSync(inputPath, 'utf-8');
  
  // 'use client' 추가
  if (!content.startsWith("'use client'")) {
    content = "'use client';\n\n" + content;
  }
  
  // document.title 제거
  content = content.replace(
    /useEffect\(\(\) => \{[\s\S]*?document\.title = [^;]+;[\s\S]*?\}, \[\]\);/,
    '// Title handled by Next.js metadata in layout.tsx'
  );
  
  // 출력 디렉토리 생성
  mkdirSync(dirname(outputPath), { recursive: true });
  
  // 파일 저장
  writeFileSync(outputPath, content, 'utf-8');
  console.log(`✓ Converted: ${outputPath}`);
};

// 홍콩법인
convertFile(
  '기초세팅/리테일추세/remixed-ef463aa5.tsx',
  'components/dashboard/hongkong-report.tsx'
);

// 대만법인
convertFile(
  '기초세팅/리테일추세/remixed-75baa23f.tsx',
  'components/dashboard/taiwan-report.tsx'
);

console.log('✓ All files converted!');


