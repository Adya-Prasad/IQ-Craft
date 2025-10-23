// Generate quiz questions using summary and Chrome Prompt API
export async function generateQuiz(
  summary,
  articleTitle,
  containerId,
  statusElement
) {
  // Render the initial quiz section with loading state
  const container = document.getElementById(containerId);
  const initialHTML = `
  <div id="quizLiveStatus" >Initializing quiz generation… ⏳</div>
    <section class="output-section">
      <h2>📝 Quiz (10 questions)</h2>
      <h2 class="gen-title">Quiz: ${escapeHtml(articleTitle || "Quiz")}</h2>
      <div id="quizContent"></div>
    </section>
  `;
  container.insertAdjacentHTML("beforeend", initialHTML);

  const quizLiveStatus = document.getElementById("quizLiveStatus");

  try {
    const updateStatus = (message) => {
      statusElement.innerHTML = message;
      quizLiveStatus.innerHTML = message;
    };

    updateStatus("Checking AI availability… 🔍");

    // Confirming Prompt API
    const available = await LanguageModel.availability();
    if (available !== "available") {
      updateStatus("Error Occurred ⛌");
      throw new Error(
        `Language Model status: "${available}". Make sure you are using Chrome Version 138 and enabled AI Flags`
      );
    }

    updateStatus("Creating AI session… ✦");

    // Create AI session
    const session = await LanguageModel.create();

    updateStatus("Creating quiz questions… ⍰");

    // Prepare prompt for quiz generation
    const qPrompt = `Based on this summary, create exactly 10 multiple-choice quiz questions to test understanding of this topic of students.
    Summary: ${summary}
    Return ONLY a valid JSON array with exactly 10 questions in this format:
    [
      {
        "question": "What is the main topic?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": "Option A"
      }
    ]
    Requirements:
    - Exactly 10 questions
    - Each question must have exactly 4 options
    - Questions should test key concepts from the summary
    - Options should be plausible but only one correct
    - Make sure the correct_answer is exactly same as the correct options in options list
    - Return ONLY the JSON array code, no additional text`;

    // Get response from AI
    updateStatus("Generating quiz question with AI… ✎");
    const response = await session.prompt(qPrompt);
    session.destroy();
    updateStatus("Processing and rendering quiz data… ⮔");

    // Parse the JSON response
    let quizData;
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Could not find JSON in response");
      }
      quizData = JSON.parse(jsonMatch[0]);

      // Validate we have 10 questions
      if (!Array.isArray(quizData) || quizData.length !== 10) {
        throw new Error("Invalid quiz format");
      }
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      updateStatus("Using fallback quiz generation… ⟳");
      // Fallback: create simple quiz from summary
      quizData = createFallbackQuiz(summary);
    }

    updateStatus("Rendering quiz… ✎");

    // Render quiz in the quizContent div
    renderQuizContent(quizData);

    updateStatus("Quiz ready! [✔]");
  } catch (error) {
    console.error("Error generating quiz:", error);
    const errorMsg = "Error generating quiz ⚠︎";
    statusElement.innerHTML = errorMsg;
    if (quizLiveStatus) {
      quizLiveStatus.innerHTML =
        errorMsg + `<br><small>${escapeHtml(error.message)}</small>`;
    }
    throw error;
  }
}

// Fallback quiz generation from summary
function createFallbackQuiz(summary) {
  const lines = summary.split("\n").filter((line) => line.trim());
  const questions = [];

  lines.forEach((line, idx) => {
    if (
      (idx < 10 && line.trim().startsWith("*")) ||
      line.trim().startsWith("-")
    ) {
      const point = line.trim().substring(1).trim();
      questions.push({
        question: `Which statement is true about the topic?`,
        options: [
          point.substring(0, 50) + "...",
          "This is incorrect option A",
          "This is incorrect option B",
          "This is incorrect option C",
        ],
        correct_answer: point.substring(0, 50) + "...",
      });
    }
  });

  // Ensure we have 10 questions
  while (questions.length < 10) {
    questions.push({
      question: `Question ${questions.length + 1} about the topic?`,
      options: ["Option A", "Option B", "Option C", "Option D"],
      correct_answer: "Option A",
    });
  }

  return questions.slice(0, 10);
}

// Render quiz content after quiz generation
function renderQuizContent(quizData) {
  const quizContent = document.getElementById("quizContent");

  const quizHTML = `
      <div class="quiz-carousel-wrapper">
        <div class="quiz-track-container">
          <div class="quiz-track" id="quizTrack">
            ${quizData
              .map(
                (q, index) => `
              <div class="quiz-card" data-index="${index}">
                <div class="quiz-question-number">Question ${index + 1}/10</div>
                <h4 class="quiz-question">${escapeHtml(q.question)}</h4>
                <div class="quiz-options">
                  ${q.options
                    .map(
                      (option, optIdx) => `
                    <label class="quiz-option">
                      <input type="radio" name="question-${index}" value="${escapeHtml(
                        option
                      )}" data-question="${index}">
                      <span class="option-text">${escapeHtml(option)}</span>
                    </label>
                  `
                    )
                    .join("")}
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
        
        <div class="quiz-navigation">
          <button class="carousel-btn prev" id="prevQuiz">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <span id="quizPosition">1 of 10</span>
          <button class="carousel-btn next" id="nextQuiz">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>
      
      <div class="btns-wrapper">
        <button id="submitQuizBtn" class="action-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Submit Quiz
        </button>
      </div>
      
      <div id="quizResults" class="quiz-results hidden"></div>
  `;

  quizContent.innerHTML = quizHTML;

  initializeQuiz(quizData);
}

// Initialize quiz controls
function initializeQuiz(quizData) {
  let currentPosition = 0;
  const track = document.getElementById("quizTrack");
  const prevBtn = document.getElementById("prevQuiz");
  const nextBtn = document.getElementById("nextQuiz");
  const submitBtn = document.getElementById("submitQuizBtn");
  const positionIndicator = document.getElementById("quizPosition");
  const userAnswers = new Array(10).fill(null);

  function updateQuiz() {
    // Move the track
    const offset = currentPosition * -100;
    track.style.transform = `translateX(${offset}%)`;

    // Update position indicator
    positionIndicator.textContent = `${currentPosition + 1} of 10`;

    // Update button states
    prevBtn.disabled = currentPosition === 0;
    nextBtn.disabled = currentPosition === 9;

    prevBtn.style.opacity = currentPosition === 0 ? "0.3" : "1";
    nextBtn.style.opacity = currentPosition === 9 ? "0.3" : "1";
  }

  prevBtn.addEventListener("click", () => {
    if (currentPosition > 0) {
      currentPosition--;
      updateQuiz();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (currentPosition < 9) {
      currentPosition++;
      updateQuiz();
    }
  });

  // Track user answers
  document.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const questionIndex = parseInt(e.target.dataset.question);
      userAnswers[questionIndex] = e.target.value;
    });
  });

  // Submit quiz with confirmation
  submitBtn.addEventListener("click", () => {
    showSubmitConfirmation(() => {
      evaluateQuiz(quizData, userAnswers);
    });
  });

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      prevBtn.click();
    } else if (e.key === "ArrowRight") {
      nextBtn.click();
    }
  });

  // Initial state
  updateQuiz();
}

// Evaluate quiz and show results
function evaluateQuiz(quizData, userAnswers) {
  let score = 0;
  const results = [];

  quizData.forEach((q, index) => {
    const userAnswer = userAnswers[index];
    const isCorrect = userAnswer === q.correct_answer;

    if (isCorrect) {
      score++;
    }

    results.push({
      question: q.question,
      userAnswer: userAnswer || "Not answered",
      correctAnswer: q.correct_answer,
      isCorrect: isCorrect,
    });
  });

  // Display results
  const resultsContainer = document.getElementById("quizResults");
  resultsContainer.classList.remove("hidden");

  const percentage = (score / 10) * 100;
  let emoji = "😢";
  if (percentage >= 80) emoji = "🎉";
  else if (percentage >= 60) emoji = "😊";
  else if (percentage >= 40) emoji = "😐";

  resultsContainer.innerHTML = `
    <div class="quiz-score">
      <h3>Your Score: ${score}/10 ${emoji}</h3>
      <div class="score-bar">
        <div class="score-fill" style="width: ${percentage}%"></div>
      </div>
      <p>${percentage}% Correct</p>
    </div>
    
    <div class="quiz-answers">
      <h4>Review Answers:</h4>
      ${results
        .map(
          (r, idx) => `
        <div class="answer-item ${r.isCorrect ? "correct" : "incorrect"}">
          <strong>Q${idx + 1}:</strong> ${escapeHtml(r.question)}
          <div class="answer-details">
            <span class="user-answer">Your answer: ${escapeHtml(
              r.userAnswer
            )}</span>
            ${
              !r.isCorrect
                ? `<span class="correct-answer">Correct: ${escapeHtml(
                    r.correctAnswer
                  )}</span>`
                : ""
            }
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;

  resultsContainer.scrollIntoView({ behavior: "smooth" });
}

// Submit confirmation modal overlay
function showSubmitConfirmation(onConfirm) {
  const modal = document.createElement("div");
  modal.className = "quiz-modal-overlay";
  modal.innerHTML = `
    <div class="quiz-modal">
      <h3>Submit Quiz?</h3>
      <p>Are you sure you want to submit your answers? You won't be able to change them after submission.</p>
      <div class="quiz-modal-buttons">
        <button class="quiz-modal-btn cancel">Cancel</button>
        <button class="quiz-modal-btn submit">Submit</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Handle button clicks
  const cancelBtn = modal.querySelector(".cancel");
  const submitBtn = modal.querySelector(".submit");

  cancelBtn.addEventListener("click", () => {
    document.body.removeChild(modal);
  });

  submitBtn.addEventListener("click", () => {
    document.body.removeChild(modal);
    onConfirm();
  });

  // Close on overlay click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

// Helper function
function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ])
  );
}
    
