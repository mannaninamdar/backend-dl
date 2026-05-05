const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const CONFIG = {
  START_DATE: "2026-05-01",
  END_DATE: "2026-05-07",
  QUESTIONS: [
    "CREDCOINS",
    "THREETOPICS",
    "SUBSCRIBE",
  ],
  DAILY_QUESTION_COUNT: {
    MIN: 1,
    MAX: 2,
  },
  LOG_FILE_NAME: "daily-submissions.md",
  COMMIT_MESSAGE_PREFIX: "chore: add daily question submissions",
  REMOTE_NAME: "origin",
  TARGET_REPOSITORY_URL: "",
  PUSH_BRANCH: "HEAD",
  REPOSITORY_PATH: ".",
  SLEEP_MILLISECONDS_BETWEEN_DAYS: 2000,
};

const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

function validateConfig() {
  if (!DATE_FORMAT_REGEX.test(CONFIG.START_DATE) || !DATE_FORMAT_REGEX.test(CONFIG.END_DATE)) {
    throw new Error("Dates must be in YYYY-MM-DD format.");
  }

  if (CONFIG.QUESTIONS.length === 0) {
    throw new Error("QUESTIONS must contain at least one question.");
  }

  if (CONFIG.DAILY_QUESTION_COUNT.MIN < 1) {
    throw new Error("DAILY_QUESTION_COUNT.MIN must be at least 1.");
  }

  if (CONFIG.DAILY_QUESTION_COUNT.MIN > CONFIG.DAILY_QUESTION_COUNT.MAX) {
    throw new Error("DAILY_QUESTION_COUNT.MIN cannot be greater than DAILY_QUESTION_COUNT.MAX.");
  }

  if (CONFIG.SLEEP_MILLISECONDS_BETWEEN_DAYS < 0) {
    throw new Error("SLEEP_MILLISECONDS_BETWEEN_DAYS cannot be negative.");
  }

  if (typeof CONFIG.REPOSITORY_PATH !== "string" || CONFIG.REPOSITORY_PATH.trim().length === 0) {
    throw new Error("REPOSITORY_PATH must be a non-empty string.");
  }

  if (typeof CONFIG.REMOTE_NAME !== "string" || CONFIG.REMOTE_NAME.trim().length === 0) {
    throw new Error("REMOTE_NAME must be a non-empty string.");
  }

  if (typeof CONFIG.TARGET_REPOSITORY_URL !== "string") {
    throw new Error("TARGET_REPOSITORY_URL must be a string.");
  }
}

function parseDate(dateString) {
  return new Date(`${dateString}T00:00:00Z`);
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getRandomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandomQuestions(questions, count) {
  const shuffledQuestions = [...questions];

  for (let index = shuffledQuestions.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const temporaryValue = shuffledQuestions[index];
    shuffledQuestions[index] = shuffledQuestions[randomIndex];
    shuffledQuestions[randomIndex] = temporaryValue;
  }

  return shuffledQuestions.slice(0, count);
}

function appendSubmissionLog(logFilePath, dateString, dailyQuestions) {
  const line = `- ${dateString}: ${dailyQuestions.join(", ")}\n`;
  fs.appendFileSync(logFilePath, line, "utf8");
}

function runGitCommand(command, repositoryPath, environmentVariables = {}) {
  execSync(command, {
    stdio: "inherit",
    cwd: repositoryPath,
    env: {
      ...process.env,
      ...environmentVariables,
    },
  });
}

function toDoubleQuotedShellString(value) {
  const escapedValue = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escapedValue}"`;
}

function commitForDate(dateString, logFilePath, dailyQuestions, repositoryPath) {
  const commitDateValue = `${dateString}T12:00:00Z`;
  const commitMessage = `${CONFIG.COMMIT_MESSAGE_PREFIX} (${dateString})`;

  appendSubmissionLog(logFilePath, dateString, dailyQuestions);
  runGitCommand(`git add "${logFilePath}"`, repositoryPath);
  runGitCommand(`git commit -m "${commitMessage}"`, repositoryPath, {
    GIT_AUTHOR_DATE: commitDateValue,
    GIT_COMMITTER_DATE: commitDateValue,
  });
}

function pushCurrentCommit(repositoryPath) {
  runGitCommand(`git push ${CONFIG.REMOTE_NAME} ${CONFIG.PUSH_BRANCH}`, repositoryPath);
}

function resolveRepositoryPath() {
  return path.resolve(process.cwd(), CONFIG.REPOSITORY_PATH);
}

function ensureRepositoryPathIsValid(repositoryPath) {
  if (!fs.existsSync(repositoryPath)) {
    throw new Error(`Repository path does not exist: ${repositoryPath}`);
  }

  const repositoryStats = fs.statSync(repositoryPath);
  if (!repositoryStats.isDirectory()) {
    throw new Error(`Repository path must be a directory: ${repositoryPath}`);
  }

  try {
    runGitCommand("git rev-parse --is-inside-work-tree", repositoryPath);
  } catch (error) {
    throw new Error(`Repository path is not a git repository: ${repositoryPath}`);
  }
}

function configureTargetRemote(repositoryPath) {
  const targetRepositoryUrl = CONFIG.TARGET_REPOSITORY_URL.trim();
  if (targetRepositoryUrl.length === 0) {
    return;
  }

  const quotedRemoteName = toDoubleQuotedShellString(CONFIG.REMOTE_NAME);
  const quotedRepositoryUrl = toDoubleQuotedShellString(targetRepositoryUrl);

  try {
    runGitCommand(`git remote get-url ${quotedRemoteName}`, repositoryPath);
    runGitCommand(`git remote set-url ${quotedRemoteName} ${quotedRepositoryUrl}`, repositoryPath);
  } catch (error) {
    runGitCommand(`git remote add ${quotedRemoteName} ${quotedRepositoryUrl}`, repositoryPath);
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function getDatesInRange(startDateString, endDateString) {
  const startDate = parseDate(startDateString);
  const endDate = parseDate(endDateString);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error("Unable to parse dates.");
  }

  if (startDate > endDate) {
    throw new Error("START_DATE cannot be after END_DATE.");
  }

  const dates = [];
  let currentDate = startDate;

  while (currentDate <= endDate) {
    dates.push(formatDate(currentDate));
    currentDate = new Date(currentDate.getTime() + DAY_IN_MILLISECONDS);
  }

  return dates;
}

async function run() {
  validateConfig();

  const repositoryPath = resolveRepositoryPath();
  ensureRepositoryPathIsValid(repositoryPath);
  configureTargetRemote(repositoryPath);

  const logFilePath = path.join(repositoryPath, CONFIG.LOG_FILE_NAME);
  const datesToProcess = getDatesInRange(CONFIG.START_DATE, CONFIG.END_DATE);

  for (let index = 0; index < datesToProcess.length; index += 1) {
    const dateString = datesToProcess[index];
    const maxSelectableQuestions = Math.min(CONFIG.DAILY_QUESTION_COUNT.MAX, CONFIG.QUESTIONS.length);
    const questionCountForTheDay = getRandomInteger(CONFIG.DAILY_QUESTION_COUNT.MIN, maxSelectableQuestions);
    const dailyQuestions = pickRandomQuestions(CONFIG.QUESTIONS, questionCountForTheDay);

    console.log(`Processing ${dateString} with ${dailyQuestions.length} question(s).`);
    commitForDate(dateString, logFilePath, dailyQuestions, repositoryPath);
    pushCurrentCommit(repositoryPath);

    const isLastDate = index === datesToProcess.length - 1;
    if (!isLastDate && CONFIG.SLEEP_MILLISECONDS_BETWEEN_DAYS > 0) {
      console.log(`Sleeping for ${CONFIG.SLEEP_MILLISECONDS_BETWEEN_DAYS}ms before next day.`);
      await sleep(CONFIG.SLEEP_MILLISECONDS_BETWEEN_DAYS);
    }
  }

  console.log("All days processed, pushed, and throttled successfully.");
}

run();
