const SHEET_ID = "1TczAOqrVcYBUxsXvHIsM6iqDGbpdK2QbHwdNxz4NSPk";

const baseUrl =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=`;

const questionsUrl = baseUrl + "Questions";
const interventionsUrl = baseUrl + "Interventions";
const outcomesUrl = baseUrl + "Outcomes";

let questions = [];
let interventions = [];  // 👈 THIS IS REQUIRED
let currentQuestion = 0;
let answers = {};
let outcomes = [];

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

  renderQuestion();
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
  const quiz = document.getElementById("quiz");

  showResults();


  quiz.innerHTML = `
    <h2>Results</h2>
    <p>${outcomeIds.length ? outcomeIds.join(", ") : "No matches found"}</p>

    <button id="restartBtn">Restart quiz</button>
  `;

  nextBtn.style.display = "none";
  backBtn.style.display = "none";

  document.getElementById("restartBtn").onclick = restartQuiz;

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
    currentQuestion = questions.length; // go to results
  } else {
    currentQuestion++;
  }

  renderQuestion();
};

  /* BACK */
  backBtn.onclick = () => {
    currentQuestion = getPreviousValidIndex(currentQuestion);

    renderQuestion();
  };
}
function restartQuiz() {
  currentQuestion = 0;
  answers = {};
  document.getElementById("progressBar").parentElement.style.display = "block";
  document.getElementById("nextBtn").style.display = "inline-block";
  document.getElementById("backBtn").style.display = "inline-block";

  renderQuestion();
  updateProgress();
}
function generateOutcomeIds() {
  console.log("🔥 ANSWERS:", answers);

  const matches = interventions.filter(intervention => {

    for (const rawField in intervention) {

      const field = rawField.trim();

      const lowerField = field.toLowerCase();

      // ❌ skip metadata fields
      if (
        lowerField === "outcome_id" ||
        lowerField === "interventions" ||
        lowerField === "sub-type" ||
        field === ""
      ) continue;

      const rule = intervention[rawField];

      if (!rule || rule === "Does not matter") continue;

      // 🔥 ONLY MATCH IF USER ACTUALLY ANSWERED THIS QUESTION
      const userAnswer =
        answers[field] ??
        answers[lowerField];

      // if this field was never part of the quiz → ignore it
      if (userAnswer === undefined) continue;

      console.log("CHECK FIELD:", {
        field,
        rule,
        userAnswer
      });

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
  if (!value) return "";

  const levels = {
    "1": "€",
    "2": "€€",
    "3": "€€€"
  };

  return value
    .split(",")
    .map(v => levels[v.trim()] || v.trim())
    .join(" / ");
}
function yesNoIcon(value) {
  if (!value) return "";

  if (value === "Yes") return "✅";
  if (value === "No") return "❌";

  return value;
}
function formatList(value, icon = "") {
  if (!value) return "";

  return value
    .split(",")
    .map(v => icon + " " + v.trim())
    .join(" ");
}
// ─── showResults ──────────────────────────────────────────────────────────────
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
      : "";

    // ── Resilience badges (one per comma-separated value)
    const resilienceHtml = buildResilienceBadges(outcome.Resilliance);

    // ── Landlord tile
    const landlordHtml = outcome["Landlord permission"] === "Yes"
      ? `<div class="info-tile landlord">
           <span class="info-tile-icon">🏠</span>
           <div class="info-tile-text">
             <strong>Landlord approval required</strong>
             <a href="#">Get mediation help →</a>
           </div>
         </div>`
      : "";

    // ── Financial tile
    const financialHtml = outcome["Financial support"] === "Yes"
      ? `<div class="info-tile financial">
           <span class="info-tile-icon">💰</span>
           <div class="info-tile-text">
             <strong>Financial support available</strong>
             <a href="#">See what you qualify for →</a>
           </div>
         </div>`
      : "";

    const infoTilesHtml = (landlordHtml || financialHtml)
      ? `<div class="info-tiles">${landlordHtml}${financialHtml}</div>`
      : "";

    // ── Permanent meta
    const permanentHtml = outcome.Permanent
      ? `<p class="meta-text">${outcome.Permanent === "Yes" ? "🔒 Permanent change" : "↩️ Reversible change"}</p>`
      : "";

    cardsHtml += `
      <div class="card">

        ${imageHtml}

        <div class="card-body">

          <h3>${intervention.Interventions}</h3>

          <div class="stats-row">
            <span class="stat-pill">💰 ${formatMoney(outcome.Money)}</span>
            <span class="stat-pill">⚡ ${formatMoney(outcome.Effort)}</span>
          </div>

          ${resilienceHtml}

          <p class="description">${outcome.Description || ""}</p>

          ${infoTilesHtml}

          ${permanentHtml}

          <a class="info-button" href="#">More information</a>

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

// ─── Resilience badges: splits on comma, one badge per type ──────────────────
function buildResilienceBadges(value) {
  if (!value) return "";

  // Support both "Heat resilience, Green resilience" and single values
  const parts = value.split(",").map(s => s.trim()).filter(Boolean);

  if (parts.length === 0) return "";

  const badges = parts.map(part => {
    const lower = part.toLowerCase();
    let cls = "other";
    let icon = "🌱";

    if (lower.includes("heat"))  { cls = "heat resillian";  icon = "🔥"; }
    else if (lower.includes("green")) { cls = "green"; icon = "🌿"; }
    else if (lower.includes("water")) { cls = "water"; icon = "💧"; }

    return `<span class="resilience-badge ${cls}">${icon} ${part}</span>`;
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

function resilienceIcon(value) {
  if (!value) return "";
  const lower = value.toLowerCase();
  if (lower.includes("heat"))  return "🔥";
  if (lower.includes("green")) return "🌿";
  if (lower.includes("water")) return "💧";
  return "🌱";
}
/* ---------------- START ---------------- */

init();