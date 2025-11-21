const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

async function splitPdf(filePath, parts = 10) {
  if (!fs.existsSync(filePath)) {
    console.error('❌ 파일을 찾을 수 없습니다:', filePath);
    return;
  }

  console.log(`📂 파일 읽는 중: ${filePath}`);
  const pdfBytes = fs.readFileSync(filePath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  const totalPages = pdfDoc.getPageCount();
  const pagesPerPart = Math.ceil(totalPages / parts);
  
  console.log(`📄 총 ${totalPages}페이지. ${parts}개로 분할합니다. (약 ${pagesPerPart}페이지씩)`);

  const baseName = path.basename(filePath, '.pdf');
  const dirName = path.dirname(filePath);
  const outputDir = path.join(dirName, `${baseName}_split`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  for (let i = 0; i < parts; i++) {
    const start = i * pagesPerPart;
    const end = Math.min(start + pagesPerPart, totalPages);
    
    if (start >= totalPages) break;

    const newPdf = await PDFDocument.create();
    const pageIndices = Array.from({ length: end - start }, (_, k) => start + k);
    
    const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
    copiedPages.forEach((page) => newPdf.addPage(page));

    const outputBytes = await newPdf.save();
    const outputName = `${baseName}_part${i + 1}.pdf`;
    const outputPath = path.join(outputDir, outputName);
    
    fs.writeFileSync(outputPath, outputBytes);
    console.log(`✅ 저장 완료: ${outputName} (${start + 1} ~ ${end}페이지)`);
  }

  console.log(`\n🎉 모든 작업이 완료되었습니다! 결과물 폴더: ${outputDir}`);
}

// CLI 실행: node split_pdf.js "파일명.pdf" [조각수]
const args = process.argv.slice(2);
if (args.length < 1) {
  console.log('사용법: node split_pdf.js "파일경로.pdf" [나눌 개수(기본 10)]');
} else {
  const file = args[0];
  const count = args[1] ? parseInt(args[1]) : 10;
  splitPdf(file, count).catch(err => console.error('오류 발생:', err));
}
