const SHEET_ID = "1TczAOqrVcYBUxsXvHIsM6iqDGbpdK2QbHwdNxz4NSPk";

const baseUrl =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=`;

const questionsUrl = baseUrl + "Questions";
const interventionsUrl = baseUrl + "Interventions";
const outcomesUrl = baseUrl + "Outcomes";

let questions = [];
let interventions = [];
let currentQuestion = 0;
let answers = {};
let outcomes = [];
let quizStarted = false;

/* ---------------- LOAD ---------------- */

async function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (res) => resolve(res.data || []),
      error: (err) => reject(err),
    });
  });
}

/* ---------------- INIT ---------------- */

async function init() {
  questions = await fetchCSV(questionsUrl);
  interventions = await fetchCSV(interventionsUrl);
  outcomes = await fetchCSV(outcomesUrl);

  renderIntroScreen();
updateProgress();

}
function goToIntro() {
  quizStarted = false;
  currentQuestion = 0;
  answers = {};

  document.getElementById("quiz").style.display = "block";
  document.getElementById("results").innerHTML = "";

  renderIntroScreen();
  updateProgress();
}
/* ---------------- PROGRESS ---------------- */

function updateProgress() {
  const bar = document.getElementById("progressBar");
  const percent = (currentQuestion / questions.length) * 100;
  bar.style.width = `${percent}%`;
}

/* ---------------- CONDITION ---------------- */

function isQuestionAllowed(question) {
  const condition = question.condition || question.Condition;

  if (!condition) return true;

  const [field, value] = condition.split("=");

  const actual = answers[field];

  console.log("CHECKING:", {
    field,
    expected: value,
    actual
  });

  return actual === value;
}

/* ---------------- NEXT INDEX ---------------- */

function getNextValidIndex(startIndex) {
  let i = startIndex;

  while (i < questions.length && !isQuestionAllowed(questions[i])) {
    i++;
  }

  return i;
}

/* ---------------- PREV INDEX ---------------- */

function getPreviousValidIndex(startIndex) {
  let i = startIndex - 1;

  while (i >= 0 && !isQuestionAllowed(questions[i])) {
    i--;
  }

  return i < 0 ? 0 : i;
}

/* ---------------- RENDER ---------------- */
function renderIntroScreen() {
  const quiz = document.getElementById("quiz");
  const nextBtn = document.getElementById("nextBtn");
  const backBtn = document.getElementById("backBtn");

  nextBtn.style.display = "none";
  backBtn.style.display = "none";

  quiz.innerHTML = `
  <div class="intro-screen">
    <h2>Welcome to the Resilience Quiz</h2>
    
    <p>
      Answer 5 short questions to receive personalized resilience recommendations
      tailored to your situation.
    </p>

 

    <button id="startQuizBtn">Start quiz</button>
  </div>
`;

  document.getElementById("startQuizBtn").onclick = () => {
    quizStarted = true;
    nextBtn.style.display = "inline-block";
    backBtn.style.display = "inline-block";

    currentQuestion = 0;
    renderQuestion();
    updateProgress();
  };
}
function renderQuestion() {
  const quiz = document.getElementById("quiz");
  const nextBtn = document.getElementById("nextBtn");
  const backBtn = document.getElementById("backBtn");

  updateProgress();

  while (
    currentQuestion < questions.length &&
    !isQuestionAllowed(questions[currentQuestion])
  ) {
    currentQuestion++;
  }

  if (currentQuestion >= questions.length) {
    showResults();

    nextBtn.style.display = "none";
    backBtn.style.display = "none";

    updateProgress();
    return;
  }

  const q = questions[currentQuestion];
  const isLastQuestion = currentQuestion === questions.length - 1;

  nextBtn.textContent = isLastQuestion ? "Submit" : "Next";
  nextBtn.disabled = true;

  const options = (q.options || "")
    .split(",")
    .map(v => v.trim())
    .filter(Boolean);

  quiz.innerHTML = `
    <h2>${q.question}</h2>

    ${options.map(option => `
      <label class="option">
        <input type="radio" name="answer" value="${option}"
          ${answers[q.id] === option ? "checked" : ""}>
        ${option}
      </label>
    `).join("")}
  `;

  const radios = document.querySelectorAll('input[name="answer"]');

  radios.forEach(radio => {
    radio.addEventListener("change", () => {
      nextBtn.disabled = false;
    });
  });

  /* NEXT */
  nextBtn.onclick = () => {
    const selected = document.querySelector('input[name="answer"]:checked');

    if (!selected) {
      alert("Select an answer");
      return;
    }

    const q = questions[currentQuestion];
    answers[q.id] = selected.value;

    const isLastQuestion = currentQuestion === questions.length - 1;

    if (isLastQuestion) {
      currentQuestion = questions.length;
    } else {
      currentQuestion++;
    }

    renderQuestion();
  };

  /* BACK */
  backBtn.onclick = () => {
  const prev = getPreviousValidIndex(currentQuestion);

  // If no previous valid question → go back to intro
  if (prev === 0 && currentQuestion === 0) {
    goToIntro();
    return;
  }

  currentQuestion = prev;
  renderQuestion();
};
}

function restartQuiz() {
  currentQuestion = 0;
  answers = {};
 goToIntro();
}

function generateOutcomeIds() {
  console.log("🔥 ANSWERS:", answers);

  const matches = interventions.filter(intervention => {

    for (const rawField in intervention) {

      const field = rawField.trim();
      const lowerField = field.toLowerCase();

      if (
        lowerField === "outcome_id" ||
        lowerField === "interventions" ||
        lowerField === "sub-type" ||
        field === ""
      ) continue;

      const rule = intervention[rawField];

      if (!rule || rule === "Does not matter") continue;

      const userAnswer =
        answers[field] ??
        answers[lowerField];

      if (userAnswer === undefined) continue;

      console.log("CHECK FIELD:", { field, rule, userAnswer });

      const allowed = rule.split(",").map(v => v.trim());

      if (!allowed.includes(userAnswer)) {
        console.log("❌ NO MATCH:", { field, allowed, userAnswer });
        return false;
      }
    }

    console.log("✅ MATCH FOUND:", intervention.Outcome_id);
    return true;
  });

  console.log("🎯 FINAL MATCHES:", matches);

  return [...new Set(matches.map(m => m.Outcome_id))];
}

function formatMoney(value) {
  if (!value) return "—";

  const levels = { "1": "€", "2": "€€", "3": "€€€" };

  return value
    .split(",")
    .map(v => levels[v.trim()] || v.trim())
    .join(" / ");
}

function formatEffort(value) {
  if (!value) return "—";

  const levels = { "1": "●", "2": "●●", "3": "●●●" };

  return value
    .split(",")
    .map(v => levels[v.trim()] || v.trim())
    .join(" / ");
}

// ─── showResults ──────────────────────────────────────────────────────────────
function showResults() {
  document.getElementById("quiz").style.display = "none";
  document.getElementById("nextBtn").style.display = "none";
  document.getElementById("backBtn").style.display = "none";
  document.getElementById("progressBar").parentElement.style.display = "none";

  const validIds = generateOutcomeIds();

  const matches = interventions.filter(intervention =>
    validIds.includes(intervention.Outcome_id)
  );

  const resultsDiv = document.getElementById("results");

  if (matches.length === 0) {
    resultsDiv.innerHTML = `
      <h2 class="results-title">No matching interventions found</h2>
      <div class="restart-row">
        <button id="restartBtn">Restart quiz</button>
      </div>
    `;
    document.getElementById("restartBtn").onclick = restartQuiz;
    return;
  }

  let cardsHtml = "";

  matches.forEach(intervention => {
    const outcome = outcomes.find(o =>
      String(o.Outcome_id).trim() === String(intervention.Outcome_id).trim()
    );
    if (!outcome) return;

    // ── Image
    const imageHtml = outcome.Picture
      ? `<div class="card-image-wrap">
           <img
             src="${normalizeImageUrl(outcome.Picture)}"
             alt="${intervention.Interventions}"
             loading="lazy"
           >
         </div>`
      : `<div class="card-image-wrap"></div>`;

    // ── Resilience badges (below image)
    const resilienceHtml = buildResilienceBadges(outcome.Resilliance);

    // ── Landlord tile
    const landlordHtml = outcome["Landlord permission"] === "Yes"
      ? `<a class="info-tile landlord" href="#">
           <span class="info-tile-icon">🏠</span>
           <span>This intervention needs approval from your landlord. <strong>Click for help →</strong></span>
         </a>`
      : "";

    // ── Financial tile
    const financialHtml = outcome["Financial support"] === "Yes"
      ? `<a class="info-tile financial" href="#">
           <span class="info-tile-icon">💰</span>
           <span>You might be eligible for financial support. <strong>See what you qualify for →</strong></span>
         </a>`
      : "";

    const infoTilesHtml = (landlordHtml || financialHtml)
      ? `<div class="info-tiles">${landlordHtml}${financialHtml}</div>`
      : "";

    // ── Permanence icon (custom images from icon/ folder)
    const permanenceIcon = outcome.Permanent === "Yes"
      ? `<img src="icon/permanent.png" alt="Permanent" class="stat-custom-icon" width="25">`
      : `<img src="icon/notpermanent.png" alt="Not permanent" class="stat-custom-icon" width="25">`;

    cardsHtml += `
      <div class="card">

        ${imageHtml}

        ${resilienceHtml}

        <div class="card-main">

          <div class="card-left">
            <h3>${intervention.Interventions}</h3>
            <p class="description">${outcome.Description || ""}</p>
            ${infoTilesHtml}
          </div>

          <div class="card-divider"></div>

          <div class="card-right">
            <div class="stat-block">
              <span class="stat-label">Permanence</span>
              ${permanenceIcon}
            </div>
            <div class="stat-block">
              <span class="stat-label">Investment</span>
              <span class="stat-value">${formatMoney(outcome.Money)}</span>
            </div>
            <div class="stat-block">
              <span class="stat-label">Effort</span>
              <span class="stat-effort">${formatEffort(outcome.Effort)}</span>
            </div>
          </div>

        </div>

        <div class="card-footer">
          <a class="info-button" href="#">Read more</a>
        </div>

      </div>
    `;
  });

  resultsDiv.innerHTML = `
    <h2 class="results-title">Recommended interventions</h2>
    <div class="results-grid">
      ${cardsHtml}
    </div>
    <div class="restart-row">
      <button id="restartBtn">Restart quiz</button>
    </div>
  `;

  document.getElementById("restartBtn").onclick = restartQuiz;
}

// ─── Resilience badges ────────────────────────────────────────────────────────
function buildResilienceBadges(value) {
  if (!value) return "";

  const parts = value.split(",").map(s => s.trim()).filter(Boolean);

  if (parts.length === 0) return "";

  const badges = parts.map(part => {
    const lower = part.toLowerCase();
    let cls = "other";
    let icon = "🌱";

    if (lower.includes("heat"))       { cls = "heat";  icon = "🔥"; }
    else if (lower.includes("green")) { cls = "green"; icon = "🌿"; }
    else if (lower.includes("water")) { cls = "water"; icon = "💧"; }

    return `<span class="resilience-badge ${cls}">${icon} ${part} resilliance </span>`;
  }).join("");

  return `<div class="resilience-row">${badges}</div>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizeImageUrl(url) {
  if (!url) return "";
  const driveMatch = url.match(/\/d\/(.*?)\//);
  if (driveMatch) {
    return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
  }
  return url;
}

/* ---------------- START ---------------- */

init();