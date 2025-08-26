const puppeteer = require('puppeteer');
const fs = require('fs');

// --- USER CONFIGURABLE SECTION ---
// Optionally set these arrays directly in the file:
// Each index corresponds to a question, its solution file, and language value
const QUESTION_LINKS = [
  'https://www.codechef.com/practice/course/logical-problems/DIFF800/problems/CREDCOINS',
'https://www.codechef.com/practice/course/logical-problems/DIFF800/problems/THREETOPICS',

];
const SOLUTION_FILES = [
  'CREDCOINS.cpp',
  'THREETOPICS.cpp',

];
const LANGUAGE_VALUES = [
  'C++',
  'C++',


  // Add more language values here (e.g., 'C++')
];
// --- END USER CONFIGURABLE SECTION ---

if (
  QUESTION_LINKS.length !== SOLUTION_FILES.length ||
  QUESTION_LINKS.length !== LANGUAGE_VALUES.length
) {
  console.error('QUESTION_LINKS, SOLUTION_FILES, and LANGUAGE_VALUES must have the same length.');
  process.exit(1);
}

(async () => {
  const cookies = JSON.parse(fs.readFileSync('codechef_cookies.json', 'utf8'));
  const browser = await puppeteer.launch({ headless: false });

  for (let i = 0; i < QUESTION_LINKS.length; i++) {
    const problemLink = QUESTION_LINKS[i];
    const solutionFile = SOLUTION_FILES[i];
    const languageValue = LANGUAGE_VALUES[i] || '44';
    const SOLUTION = fs.readFileSync(solutionFile, 'utf8');

    const page = await browser.newPage();
    await page.setCookie(...cookies);

    try {
      await page.goto(problemLink, { waitUntil: 'networkidle2' });
      await page.waitForSelector('.ace_text-input, .monaco-editor, textarea, [contenteditable="true"]', { timeout: 10000 });

      // Scrape the current content of the editor (try common selectors)
      const editorContent = await page.evaluate(() => {
        const monaco = document.querySelector('.monaco-editor');
        if (monaco) return monaco.innerText;
        const ace = document.querySelector('.ace_text-input');
        if (ace && ace.closest('.ace_editor')) return ace.closest('.ace_editor').innerText;
        const textarea = document.querySelector('textarea');
        if (textarea) return textarea.value;
        const ce = document.querySelector('[contenteditable="true"]');
        if (ce) return ce.innerText;
        return null;
      });
      // console.log(`Current editor content for question ${i + 1}:`, editorContent);

      // Set the editor content to your solution (try common editors)
      await page.evaluate((solution) => {
        const monaco = document.querySelector('.monaco-editor');
        if (monaco && window.monaco) {
          const editor = window.monaco.editor.getEditors()[0];
          if (editor) editor.setValue(solution);
        }
        const ace = document.querySelector('.ace_text-input');
        if (ace && ace.closest('.ace_editor') && window.ace) {
          const editor = window.ace.edit(ace.closest('.ace_editor'));
          editor.setValue(solution, -1);
        }
        const textarea = document.querySelector('textarea');
        if (textarea) {
          textarea.value = solution;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const ce = document.querySelector('[contenteditable="true"]');
        if (ce) {
          ce.innerText = solution;
          ce.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, SOLUTION);

      await page.screenshot({ path: `editor_filled_${i + 1}.png` });

      const submitButtonSelector = '#submit_btn';
      await page.waitForSelector(submitButtonSelector, { timeout: 10000 });
      await page.click(submitButtonSelector);

      // Optionally, wait a bit before moving to the next question
      await new Promise(res => setTimeout(res, 3000));
    } catch (err) {
      console.error(`Error submitting question ${i + 1}:`, err.message);
      continue;
    } finally {
      await page.close();
    }
  }

  await browser.close();
})();