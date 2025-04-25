require('dotenv').config();
const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8080;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

async function scrapeAndUploadAll() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('https://longtermcare.or.kr/npbs/r/a/201/selectXLtcoSrch');

  // 목록검색 클릭
  await page.click('.btn.btnBlue'); 
  await page.waitForSelector('#searchForm > div.tblBoard > table > tbody > tr');

  const totalPages = 4387;

  for (let p = 1; p <= totalPages; p++) {
    console.log(`페이지 ${p} 수집 중...`);

    // 데이터 추출
    const rows = await page.$$eval('table.tblList > tbody > tr', trs =>
      trs.map(tr => {
        const tds = tr.querySelectorAll('td');
        return {
          number: parseInt(tds[0]?.innerText.trim(), 10),
          name: tds[1]?.innerText.trim(),
          category: tds[2]?.innerText.trim(),
          score: tds[3]?.innerText.trim(),
          address: tds[4]?.innerText.trim(),
        };
      })
    );

    // Supabase에 전송
    for (const row of rows) {
      await axios.post(`${SUPABASE_URL}/rest/v1/longtermcare`, row, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        }
      });
    }

    // 다음 페이지 클릭
    const nextButton = await page.$('a[title="다음 페이지"]');
    if (nextButton) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        nextButton.click()
      ]);
    } else {
      break; // 더 이상 페이지 없음
    }
  }

  await browser.close();
  return '크롤링 및 업로드 완료';
}

app.get('/', async (req, res) => {
  try {
    const result = await scrapeAndUploadAll();
    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send('크롤링 실패');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
