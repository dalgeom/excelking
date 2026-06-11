/** 표 1개를 나타내는 격자. 바깥 배열=행, 안쪽 배열=셀 값. */
export type Grid = string[][];

/** PDF에서 추출한 텍스트 조각 하나. 좌표는 PDF 좌하단 원점(y는 위로 갈수록 큼). */
export interface TextItem {
  str: string;
  x: number; // 왼쪽 시작
  y: number; // baseline y
  width: number;
  height: number;
}

/** 선분 하나(가로 또는 세로 괘선). */
export interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** PDF 한 페이지의 추출 결과. */
export interface PageContent {
  width: number;
  height: number;
  items: TextItem[];
  hLines: Line[];
  vLines: Line[];
}

/** 엑셀 시트 하나로 내보낼 페이지 단위 데이터. */
export interface PdfSheet {
  name: string;
  grid: Grid;
}
