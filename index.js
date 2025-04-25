const express = require('express');
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.get('/', async (req, res) => {
  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://longtermcare.or.kr/npbs/r/a/201/selectXLtcoSrch', {
      waitUntil: 'networkidle2'
    });

    // '목록검색' 버튼 기다렸다가 클릭
    await page.waitForSelector('.btn.btnBlue');
    await page.click('.btn.btnBlue');
    await page.waitForSelector('#contents > div.tbl_wrap > table > tbody > tr');

    const allData = [];

    const totalPages = 4387;
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      // 페이지 번호 입력 후 이동
      await page.evaluate((num) => {
        document.querySelector('input#pageIndex').value = num;
        document.querySelector('a.btn_srch').click();
      }, pageNum);

      await page.waitForSelector('#contents > div.tbl_wrap > table > tbody > tr');

      const rows = await page.$$eval('#contents > div.tbl_wrap > table > tbody > tr', trs =>
        trs.map(tr => {
          const tds = tr.querySelectorAll('td');
          return {
            number: tds[0]?.innerText.trim(),
            name: tds[1]?.innerText.trim(),
            category: tds[2]?.innerText.trim(),
            score: tds[3]?.innerText.trim(),
            address: tds[4]?.innerText.trim()
          };
        })
      );

      allData.push(...rows);
      console.log(`📄 Page ${pageNum} done`);
    }

    await browser.close();

    // Supabase에 업로드
    const { error } = await supabase.from('longtermcare').insert(allData);
    if (error) throw error;

    res.send(`✅ 크롤링 완료: ${allData.length}건 업로드됨`);
  } catch (err) {
    console.error(err);
    res.status(500).send('크롤링 실패');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
