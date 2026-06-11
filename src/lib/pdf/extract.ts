import type { Line, PageContent, TextItem } from './types';

/** getOperatorList에서 가로/세로 직선을 best-effort로 추출한다. CTM 미적용(단순 표 가정). */
async function extractLines(page: any, OPS: any): Promise<{ hLines: Line[]; vLines: Line[] }> {
  const opList = await page.getOperatorList();
  const hLines: Line[] = [];
  const vLines: Line[] = [];
  const eps = 2;
  const add = (x1: number, y1: number, x2: number, y2: number) => {
    if (Math.abs(y1 - y2) <= eps && Math.abs(x1 - x2) > eps) hLines.push({ x1, y1, x2, y2 });
    else if (Math.abs(x1 - x2) <= eps && Math.abs(y1 - y2) > eps) vLines.push({ x1, y1, x2, y2 });
  };
  for (let i = 0; i < opList.fnArray.length; i++) {
    if (opList.fnArray[i] !== OPS.constructPath) continue;
    const [ops, coords] = opList.argsArray[i];
    let cx = 0;
    let cy = 0;
    let k = 0;
    let aborted = false;
    for (const op of ops) {
      if (op === OPS.moveTo) {
        cx = coords[k++];
        cy = coords[k++];
      } else if (op === OPS.lineTo) {
        const nx = coords[k++];
        const ny = coords[k++];
        add(cx, cy, nx, ny);
        cx = nx;
        cy = ny;
      } else if (op === OPS.rectangle) {
        const x = coords[k++];
        const y = coords[k++];
        const w = coords[k++];
        const h = coords[k++];
        add(x, y, x + w, y);
        add(x, y + h, x + w, y + h);
        add(x, y, x, y + h);
        add(x + w, y, x + w, y + h);
        cx = x;
        cy = y;
      } else {
        aborted = true; // 알 수 없는 op(curveTo 등) → 좌표 소비 추정 불가, 이 path 중단
        break;
      }
    }
    void aborted;
  }
  return { hLines, vLines };
}

/**
 * PDF ArrayBuffer를 페이지별 PageContent로 추출한다. (브라우저 전용 — pdfjs 동적 로드)
 * 텍스트가 한 글자도 없으면 스캔본으로 간주, 빈 items 페이지가 된다.
 */
export async function extractPages(buf: ArrayBuffer): Promise<PageContent[]> {
  const pdfjs: any = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages: PageContent[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const items: TextItem[] = tc.items
      .filter((it: any) => typeof it.str === 'string' && it.str.trim() !== '')
      .map((it: any) => ({
        str: it.str,
        x: it.transform[4],
        y: it.transform[5],
        width: it.width,
        height: it.height
      }));
    const { hLines, vLines } = await extractLines(page, pdfjs.OPS);
    pages.push({ width: viewport.width, height: viewport.height, items, hLines, vLines });
  }
  return pages;
}
