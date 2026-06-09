const models = [
  { name: "Claude", accuracy: 86, points: 1420, tag: "Calm Prophet" },
  { name: "GPT", accuracy: 84, points: 1390, tag: "Bracket Brain" },
  { name: "DeepSeek", accuracy: 82, points: 1355, tag: "Hardcore Analyst" },
  { name: "Gemini", accuracy: 79, points: 1280, tag: "Momentum Reader" },
  { name: "Grok", accuracy: 76, points: 1225, tag: "Reverse Curse" },
  { name: "Kimi", accuracy: 74, points: 1190, tag: "Late Winner" },
  { name: "Qianwen", accuracy: 72, points: 1168, tag: "Pattern Hunter" },
  { name: "GLM", accuracy: 70, points: 1132, tag: "Steady Scout" },
  { name: "Doubao", accuracy: 68, points: 1098, tag: "Upset Whisperer" }
];

const leaderboardList = document.querySelector("#leaderboard-list");
const coachGrid = document.querySelector("#coach-grid");
const selectedCoach = document.querySelector("#selected-coach");
const posterCoach = document.querySelector("#poster-coach");
const posterButton = document.querySelector("#poster-button");

function renderLeaderboard() {
  leaderboardList.innerHTML = models
    .map(
      (model, index) => `
        <div class="leaderboard-row">
          <div class="model-name">
            <span class="rank">${index + 1}</span>
            <span>${model.name}</span>
          </div>
          <div class="accuracy">${model.accuracy}%</div>
          <div class="points">${model.points}</div>
          <div><span class="tag">${model.tag}</span></div>
        </div>
      `
    )
    .join("");
}

function renderCoaches() {
  coachGrid.innerHTML = models
    .map(
      (model, index) => `
        <button class="coach-card ${index === 1 ? "selected" : ""}" type="button" data-coach="${model.name}">
          <div>
            <strong>${model.name}</strong>
            <span>${model.tag} · ${model.accuracy}%</span>
          </div>
          <i class="coach-orb" aria-hidden="true"></i>
        </button>
      `
    )
    .join("");
}

function selectCoach(name) {
  selectedCoach.textContent = name;
  posterCoach.textContent = name;
  document.querySelectorAll(".coach-card").forEach((card) => {
    card.classList.toggle("selected", card.dataset.coach === name);
  });
}

function shufflePoster() {
  const nextModel = models[Math.floor(Math.random() * models.length)];
  selectCoach(nextModel.name);
}

renderLeaderboard();
renderCoaches();

coachGrid.addEventListener("click", (event) => {
  const card = event.target.closest(".coach-card");
  if (!card) return;
  selectCoach(card.dataset.coach);
});

posterButton.addEventListener("click", shufflePoster);
