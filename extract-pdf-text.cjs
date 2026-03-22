const fs = require('fs');
const pdfParse = require('pdf-parse');

async function extractPdfText(pdfPath) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

async function main() {
  console.log('Extracting PDF 1...');
  const text1 = await extractPdfText('./src/resources/1.pdf');
  fs.writeFileSync('./src/resources/1.txt', text1);
  console.log('PDF 1 extracted:', text1.length, 'characters');

  console.log('Extracting PDF 2...');
  const text2 = await extractPdfText('./src/resources/2.pdf');
  fs.writeFileSync('./src/resources/2.txt', text2);
  console.log('PDF 2 extracted:', text2.length, 'characters');

  console.log('Done!');
}

main();
