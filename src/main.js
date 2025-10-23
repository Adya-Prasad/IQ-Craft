// DOM references
const userInput = document.getElementById("userInput");
const generateBtn = document.getElementById("generateBtn");
const outputContainer = document.getElementById("outputContainer");
const liveStatus = document.getElementById("liveStatus");
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");

liveStatus.innerHTML =
  "Waiting for your input 🥱... <br> <i>To work with URL, need internet connection!</i>";

// Clean and normalize text (remove harmful chars, extra spaces, etc.)
function cleanText(text) {
  if (!text) return "";
  
  return text
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "") // Remove control characters
    .replace(/\r\n/g, "\n") // Normalize line endings
    .replace(/\r/g, "\n") // Normalize line endings
    .replace(/\t/g, " ") // Replace tabs with spaces
    .replace(/ +/g, " ") // Replace multiple spaces with single space
    .replace(/\n{3,}/g, "\n\n") // Replace 3+ newlines with 2
    .trim();
}

// File upload handler
uploadBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.name.endsWith(".txt")) {
    liveStatus.innerHTML = "Please upload a .txt file ⚠︎";
    return;
  }

  try {
    liveStatus.innerHTML = "Reading file… 📄";
    const rawText = await file.text();
    const cleanedText = cleanText(rawText);
    userInput.value = cleanedText;
    liveStatus.innerHTML = `File loaded: ${file.name} (${cleanedText.length} chars) [✓]`;
    fileInput.value = ""; // Reset for next upload
  } catch (err) {
    liveStatus.innerHTML = "Failed to read file ⚠︎";
    console.error(err);
  }
});

// Check if input is URL or text
function isURL(input) {
  try {
    const url = new URL(input);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Fetch article text from URL via backend
async function fetchArticleFromURL(url) {
  liveStatus.innerHTML = "Fetching article from URL… 🔗";
  const resp = await fetch(`/api/fetchArticle?url=${encodeURIComponent(url)}`);
  if (!resp.ok) {
    throw new Error("Failed to fetch article from URL");
  }
  const data = await resp.json();
  if (data.error) {
    throw new Error(data.error);
  }
  // Validate we got meaningful content
  if (!data.text || data.text.trim().length < 100) {
    throw new Error(
      "URl article too short OR Could not extract article content from URL. Try pasting the article text directly."
    );
  }

  // Limit article length to prevent overwhelming the AI
  const MAX_ARTICLE_LENGTH = 100000;
  if (data.text.length > MAX_ARTICLE_LENGTH) {
    liveStatus.innerHTML = `Article too long (${data.text.length} chars), using first ${MAX_ARTICLE_LENGTH} chars…`;
    return data.text.substring(0, MAX_ARTICLE_LENGTH);
  }

  return data.text;
}

// Get article text (from URL or direct input)
async function getArticleText(input) {
  if (isURL(input)) {
    const urlText = await fetchArticleFromURL(input);
    return cleanText(urlText);
  } else {
    return cleanText(input);
  }
}

// Chrome AI Summarizer API Integration
async function summarizeWithChromeAI(text) {
  if (!self.Summarizer) {
    throw new Error(
      "Chrome Summarizer API not available. Please use Chrome 138+ with AI features enabled."
    );
  }

  // Check availability
  const availability = await self.Summarizer.availability();
  if (availability === "unavailable") {
    throw new Error("Summarizer API is not available on this device.");
  }
  if (availability === "after-download") {
    liveStatus.innerHTML = "Preparing AI model… [⮯] (first time only)";
  }

  // Create summarizer with options (single instance)
  const options = {
    sharedContext:
      "This is an article or document, summarize it including all essential points in",
    type: "key-points",
    format: "markdown",
    length: "long",
    monitor(m) {
      m.addEventListener("downloadprogress", (e) => {
        const percent = Math.round(e.loaded * 100);
        liveStatus.innerHTML = `Preparing AI model… ${percent}% ✦`;
      });
    },
  };

  const summarizer = await self.Summarizer.create(options);
  const MAX_LENGTH = 12000;

  try {
    let summary;

    // Check if text needs chunking
    if (text.length > MAX_LENGTH) {
      summary = await summarizeInChunks(summarizer, text, MAX_LENGTH);
    } else {
      // Text is within limits, summarize directly
      liveStatus.innerHTML = "Summarizing at once with Chrome builtin AI… ✦";
      summary = await summarizer.summarize(text, {
        context:
          "This is an article or document, summarize it in a very detailed bullet points and include all essential topics",
      });
    }

    // Generate title with Prompt API using the summary
    liveStatus.innerHTML = "Generating title… Ⓣ";

    const available = await LanguageModel.availability();
    if (available !== "available") {
      liveStatus.innerHTML = "Error Occured ⛌";
      throw new Error(
        `<div class="error">Language Model status: "${available}". Make sure you are using Chrome Version 138 and enabled AI Flags</div>`
      );
    }

    const session = await LanguageModel.create();
    const titlePrompt =
      summary.length > 3000 ? summary.substring(0, 3000) : summary;
    const resultTitle = await session.prompt(
      `In **one line**, provide **only one title** of **no more than 8 words** for this text: ${titlePrompt}`
    );

    summarizer.destroy();
    console.log("Prompt API used and completed successfully!");

    return {
      title: resultTitle
        .trim()
        .replace(/[#*\-]/g, "")
        .trim(),
      summary: summary,
    };
  } catch (error) {
    summarizer.destroy();
    throw error;
  }
}

// Helper function to summarize large text in chunks
async function summarizeInChunks(summarizer, text, maxLength) {
  liveStatus.innerHTML = "Processing large article in chunks… ";

  // Split text into chunks by sentences
  const chunks = [];
  let currentChunk = "";
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());

  // Summarize each chunk
  const chunkSummaries = [];
  for (let i = 0; i < chunks.length; i++) {
    liveStatus.innerHTML = `Summarizing part ${i + 1} of ${chunks.length}… ⮔`;
    const chunkSummary = await summarizer.summarize(chunks[i], {
      context: `This is part ${i + 1} of ${
        chunks.length
      } of a longer article. Extract all key points.`,
    });
    chunkSummaries.push(chunkSummary);
  }

  const combinedSummary = chunkSummaries.join("\n\n");

  // If combined summary is still too long, summarize it again
  if (combinedSummary.length > maxLength) {
    liveStatus.innerHTML = "Creating final summary… ✦";
    const finalSummary = await summarizer.summarize(combinedSummary, {
      context: "Combine these key points into a cohesive detailed overview.",
    });
    return finalSummary;
  }

  return combinedSummary;
}

generateBtn.addEventListener("click", async () => {
  const raw = userInput.value.trim();
  if (!raw) {
    liveStatus.innerHTML = "Please paste an article URL or text ⚠︎";
    return;
  }

  // Disable input and buttons during processing
  userInput.disabled = true;
  generateBtn.disabled = true;
  uploadBtn.disabled = true;
  generateBtn.style.opacity = "0.6";
  generateBtn.style.cursor = "not-allowed";

  try {
    const text = await getArticleText(raw);

    if (!text || text.trim().length < 100) {
      liveStatus.innerHTML =
        "Article text too short to summarize (minimum 100 characters).";
      outputContainer.innerHTML = `<div class="card"><p>Received ${
        text ? text.length : 0
      } characters. Please provide more content.</p></div>`;
      return;
    }
    liveStatus.innerHTML = "Summarizing with on-device AI… ✦";
    const result = await summarizeWithChromeAI(text);
    const { title, summary } = result;

    liveStatus.innerHTML = "Summarization Done [✔] ";

    // Re-enable input and buttons
    userInput.disabled = false;
    generateBtn.disabled = false;
    uploadBtn.disabled = false;
    generateBtn.style.opacity = "1";
    generateBtn.style.cursor = "pointer";
    generateBtn.innerHTML = `Go<svg width="25px" height="25px" viewBox="0 0 48 48" fill="none"><path d="M48 0H0V48H48V0Z" fill="none" fill-opacity="0.01" /><path d="M43 5L29.7 43L22.1 25.9L5 18.3L43 5Z" stroke="currentColor" stroke-width="4"
            stroke-linejoin="round" /><path d="M43.0001 5L22.1001 25.9" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" /></svg>`;

    // Display summary with title
    outputContainer.innerHTML = `
      <section class="output-section">
        <h2>📝 Summary</h2>
        <h2 class="gen-title">${escapeHtml(title)}</h2>
        <div class="ai-summary">${renderMarkdown(summary)}</div>
        <div class="summary-stats">
          <span>Original: ${text.length} chars</span>
          <span>Summary: ${summary.length} chars</span>
        </div>
      </div>
      </section>
      <div class="btns-wrapper">
        <button id="generateFlashcardsBtn" class="action-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18M9 21V9"/>
          </svg>
          Generate Flashcards
        </button>
        <button id="generateQuizBtn" class="action-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Generate Quiz
        </button>
    `;

    // Store the text, title and summary for later use
    window.currentArticleText = text;
    window.currentArticleTitle = title;
    window.currentSummary = summary;

    // Add event listeners to buttons
    document
      .getElementById("generateFlashcardsBtn")
      .addEventListener("click", async (e) => {
        // Disable all action buttons
        const allBtns = document.querySelectorAll(".action-btn");
        allBtns.forEach((btn) => {
          btn.disabled = true;
          btn.style.opacity = "0.6";
          btn.style.cursor = "not-allowed";
        });
        userInput.disabled = true;
        generateBtn.disabled = true;
        uploadBtn.disabled = true;

        try {
          const { generateFlashcards } = await import("./flashcard.js");
          await generateFlashcards(
            window.currentSummary,
            window.currentArticleTitle,
            "outputContainer",
            liveStatus
          );
        } finally {
          // Re-enable buttons
          allBtns.forEach((btn) => {
            btn.disabled = false;
            btn.style.opacity = "1";
            btn.style.cursor = "pointer";
          });
          userInput.disabled = false;
          generateBtn.disabled = false;
          uploadBtn.disabled = false;
        }
      });

    document
      .getElementById("generateQuizBtn")
      .addEventListener("click", async (e) => {
        const allBtns = document.querySelectorAll(".action-btn");
        allBtns.forEach((btn) => {
          btn.disabled = true;
          btn.style.opacity = "0.6";
          btn.style.cursor = "not-allowed";
        });
        userInput.disabled = true;
        generateBtn.disabled = true;
        uploadBtn.disabled = true;

        try {
          const { generateQuiz } = await import("./quiz.js");
          await generateQuiz(
            window.currentSummary,
            window.currentArticleTitle,
            "outputContainer",
            liveStatus
          );
        } finally {
          allBtns.forEach((btn) => {
            btn.disabled = false;
            btn.style.opacity = "1";
            btn.style.cursor = "pointer";
          });
          userInput.disabled = false;
          generateBtn.disabled = false;
          uploadBtn.disabled = false;
        }
      });
  } catch (err) {
    console.error(err);
    liveStatus.innerHTML = "Error occurred ⚠︎";
    outputContainer.innerHTML = `<div class="card error"><p><strong>Error:</strong> ${escapeHtml(
      err.message
    )}</p> Make sure you are using Chrome Version 138 and enabled AI Flags</div>`;
  } finally {
    // Always re-enable input and buttons
    userInput.disabled = false;
    generateBtn.disabled = false;
    uploadBtn.disabled = false;
    generateBtn.style.opacity = "1";
    generateBtn.style.cursor = "pointer";
    generateBtn.innerHTML = `Go<svg width="25px" height="25px" viewBox="0 0 48 48" fill="none"><path d="M48 0H0V48H48V0Z" fill="none" fill-opacity="0.01" /><path d="M43 5L29.7 43L22.1 25.9L5 18.3L43 5Z" stroke="currentColor" stroke-width="4"
            stroke-linejoin="round" /><path d="M43.0001 5L22.1001 25.9" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
  }
});

// Helper function to escape HTML
function escapeHtml(s) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ])
  );
}

// Simple markdown renderer
function renderMarkdown(text) {
  let html = escapeHtml(text);

  function applyInlineFormatting(str) {
    str = str.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    str = str.replace(/`(.+?)`/g, "<code>$1</code>");
    return str;
  }

  const lines = html.split("\n");
  let inList = false;
  let result = [];

  for (let line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("* ")) {
      if (!inList) {
        result.push("<ul>");
        inList = true;
      }
      result.push(`<li>${applyInlineFormatting(trimmed.substring(2))}</li>`);
    } else if (trimmed.startsWith("- ")) {
      if (!inList) {
        result.push("<ul>");
        inList = true;
      }
      result.push(`<li>${applyInlineFormatting(trimmed.substring(2))}</li>`);
    } else {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      if (trimmed) {
        result.push(`<p>${applyInlineFormatting(trimmed)}</p>`);
      }
    }
  }

  if (inList) {
    result.push("</ul>");
  }

  return result.join("");
}
