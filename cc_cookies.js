const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://www.codechef.com/login', { waitUntil: 'networkidle2' });

  console.log('Please log in to CodeChef manually in the opened browser window.');
  // Wait for 60 seconds for manual login
  await new Promise(resolve => setTimeout(resolve, 60000));

  const cookies = await page.cookies();
  console.log('Cookies:', cookies);

  fs.writeFileSync('codechef_cookies.json', JSON.stringify(cookies, null, 2));
  console.log('Cookies saved to codechef_cookies.json');

  await browser.close();
})();