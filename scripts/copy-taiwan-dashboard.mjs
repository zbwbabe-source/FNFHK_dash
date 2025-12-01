import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Read source file
const sourcePath = join(rootDir, '기초세팅', '리테일추세', 'remixed-75baa23f.tsx');
const targetPath = join(rootDir, 'components', 'dashboard', 'taiwan-report.tsx');

try {
  let content = readFileSync(sourcePath, 'utf8');
  
  // Add 'use client' at the top
  content = "'use client';\n\n" + content;
  
  // Remove useEffect from import
  content = content.replace(
    "import React, { useState, useEffect } from 'react';",
    "import React, { useState } from 'react';"
  );
  
  // Remove the useEffect that sets document.title
  content = content.replace(
    /  \/\/ 크롬 탭 타이틀 설정\s+useEffect\(\(\) => \{\s+document\.title = [^;]+;\s+\}, \[\]\);/g,
    "  // Title is handled by Next.js metadata"
  );
  
  // Write to target file
  writeFileSync(targetPath, content, 'utf8');
  console.log('✅ Successfully created taiwan-report.tsx');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}


