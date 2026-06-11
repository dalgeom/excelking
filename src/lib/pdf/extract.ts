import type { Line, PageContent, TextItem } from './types';

/**
 * getOperatorList에서 가로/세로 직선을 best-effort로 추출한다.
 * pdfjs v5의 constructPath 인자는 [pathType, pathData, minMax]이며, 마지막 인자가
 * 경로의 바운딩박스 [x0,y0,x1,y1]다. 한 변이 거의 0인(얇은) 박스를 직선으로 본다.
 * CTM 미적용(단순 표 가정). 여러 선분이 한 path로 묶인 경우는 bbox로 근사(한계).
 */
async function extractLines(page: any, OPS: any): Promise<{ hLines: Line[]; vLines: Line[] }> {
  const opList = await page.getOperatorList();
  const hLines: Line[] = [];
  const vLines: Line[] = [];
  const eps = 2;
  for (let i = 0; i < opList.fnArray.length; i++) {
    if (opList.fnArray[i] !== OPS.constructPath) continue;
    const args = opList.argsArray[i];
    const mm = args[args.length - 1];
    if (!mm || mm.length < 4) continue;
    const x0 = mm[0];
    const y0 = mm[1];
    const x1 = mm[2];
    const y1 = mm[3];
    const w = Math.abs(x1 - x0);
    const h = Math.abs(y1 - y0);
    if (h <= eps && w > eps) hLines.push({ x1: x0, y1: y0, x2: x1, y2: y0 });
    else if (w <= eps && h > eps) vLines.push({ x1: x0, y1: y0, x2: x0, y2: y1 });
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
