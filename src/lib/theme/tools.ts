export interface ToolDef {
  href: string;
  tab: string;
  title: string;
  desc: string;
}

export const TOOLS: ToolDef[] = [
  { href: '/excel-compare', tab: '비교', title: '두 엑셀 명단 비교·대조', desc: '두 파일을 키 열 기준으로 대조해 일치/불일치/변경을 찾아줍니다.' },
  { href: '/excel-split', tab: '분리', title: '엑셀 조건별 시트/파일 분리', desc: '열 값별로 행을 나눠 시트 또는 개별 파일(ZIP)로 내려받습니다.' },
  { href: '/pdf-to-excel', tab: 'PDF', title: 'PDF 표 → 엑셀 추출', desc: 'PDF 속 표를 찾아 페이지별 시트 엑셀로 추출합니다.' },
  { href: '/excel-merge', tab: '합치기', title: '엑셀 합치기', desc: '여러 엑셀 파일을 열에 맞춰 한 시트로 합쳐 드립니다.' },
  { href: '/excel-dashboard', tab: '대시보드', title: '엑셀 자동 대시보드', desc: '엑셀을 올리면 KPI·차트 대시보드를 자동 생성, 이미지로 저장합니다.' }
];
