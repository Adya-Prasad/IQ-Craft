// Generate and display flashcards
export async function generateFlashcards(
  summary,
  articleTitle,
  containerId,
  statusElement
) {
  try {
    statusElement.innerHTML = "Creating flashcards… ✦";

    // Extract bullet points from summary
    const lines = summary.split("\n").filter((line) => line.trim());
    const flashcards = [];
    const allPoints = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("*") || trimmed.startsWith("-")) {
        const point = trimmed.substring(1).trim();
        if (point) {
          allPoints.push(point);
        }
      }
    }

    // Grouping: adjust points per card based on text length
    let i = 0;
    while (i < allPoints.length) {
      const currentPoint = allPoints[i];
      const nextPoint = allPoints[i + 1];

      // Calculate combined length
      const currentLength = currentPoint.length;
      const nextLength = nextPoint ? nextPoint.length : 0;
      const combinedLength = currentLength + nextLength;

      let cardPoints;

      // If both points are very long (combined > 500 chars), put only 1 per card
      if (combinedLength > 500 && nextPoint) {
        cardPoints = [currentPoint];
        i += 1;
      }
      // If single point is extremely long (> 300 chars), put it alone
      else if (currentLength > 300) {
        cardPoints = [currentPoint];
        i += 1;
      }
      // Otherwise, put 2 points per card (default)
      else {
        cardPoints = nextPoint ? [currentPoint, nextPoint] : [currentPoint];
        i += nextPoint ? 2 : 1;
      }

      flashcards.push({
        title: articleTitle || `Key Concept ${flashcards.length + 1}`,
        points: cardPoints,
      });
    }

    // Ensure we have at least 1 flashcard
    if (flashcards.length === 0) {
      flashcards.push({
        title: articleTitle || "Summary",
        points: [
          "No bullet points found in summary",
          "Try a different article",
          "Or paste text directly",
        ],
      });
    }

    // Render carousel
    renderFlashcardCarousel(flashcards, articleTitle, containerId);

    statusElement.innerHTML = "Flashcards ready [✔]";
  } catch (error) {
    console.error("Error generating flashcards:", error);
    statusElement.innerHTML = "Error generating flashcards ⚠︎";
    throw error;
  }
}

// Render flashcard carousel
function renderFlashcardCarousel(flashcards, articleTitle, containerId) {
  const container = document.getElementById(containerId);

  const colors = [
    "#f5eee6ff",
    "#e8f3e8ff",
    "#e2e7f3ff",
    "#eee2f0ff",
    "#f7ebe4ff",
    "#f3ddddff",
    "#e5f3f0ff",
  ];

  const carouselHTML = `
    <section class="output-section">
      <h2>🎴 Flashcards (${flashcards.length} cards)</h2>
      <div class="flashcard-carousel-wrapper">
        <div class="flashcard-track-container">
          <div class="flashcard-track" id="flashcardTrack">
            ${flashcards
              .map(
                (card, index) => `
              <div class="flashcard" data-index="${index}" style="background-color: ${
                  colors[index % colors.length]
                }">
                <div class="flashcard-content">
                  <h4 class="flashcard-title">${escapeHtml(card.title)}</h4>
                  <ul class="flashcard-points">
                    ${card.points
                      .map((point) => `<li>${escapeHtml(point)}</li>`)
                      .join("")}
                  </ul>
                </div>
                <div class="flashcard-footer">
                  <span>IQ-Craft</span><span class="flashcard-number">${
                    index + 1
                  }/${flashcards.length}</span>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
        
        <div class="carousel-indicators">
          <button class="carousel-btn prev" id="prevCard">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <span id="carouselPosition">1-2 of ${flashcards.length}</span>
          <button class="carousel-btn next" id="nextCard">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>
      </section>
      
      <div class="btns-wrapper">
        <button id="downloadFlashcardsBtn" class="action-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download Flashcards
        </button>
      </div>
  `;

  container.insertAdjacentHTML("beforeend", carouselHTML);

  initializeCarousel(flashcards);
}

// Initialize carousel controls
function initializeCarousel(flashcards) {
  let currentPosition = 0;
  const track = document.getElementById("flashcardTrack");
  const prevBtn = document.getElementById("prevCard");
  const nextBtn = document.getElementById("nextCard");
  const downloadBtn = document.getElementById("downloadFlashcardsBtn");
  const positionIndicator = document.getElementById("carouselPosition");

  const cardsPerView = 2;
  const maxPosition = Math.max(0, flashcards.length - cardsPerView);

  function updateCarousel() {
    // Move the track
    const offset = currentPosition * -340;
    track.style.transform = `translateX(${offset}px)`;

    // Update position indicator
    const start = currentPosition + 1;
    const end = Math.min(currentPosition + cardsPerView, flashcards.length);
    positionIndicator.textContent = `${start}-${end} of ${flashcards.length}`;

    // Update button states
    prevBtn.disabled = currentPosition === 0;
    nextBtn.disabled = currentPosition >= maxPosition;

    prevBtn.style.opacity = currentPosition === 0 ? "0.3" : "1";
    nextBtn.style.opacity = currentPosition >= maxPosition ? "0.3" : "1";
  }

  prevBtn.addEventListener("click", () => {
    if (currentPosition > 0) {
      currentPosition--;
      updateCarousel();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (currentPosition < maxPosition) {
      currentPosition++;
      updateCarousel();
    }
  });

  // Download functionality
  downloadBtn.addEventListener("click", () => {
    downloadFlashcardsAsPNG(
      flashcards,
      document.querySelectorAll(".flashcard")
    );
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
  updateCarousel();
}

// Download flashcards as PNG images
async function downloadFlashcardsAsPNG(flashcards, cardElements) {
  const liveStatus = document.getElementById("liveStatus");

  for (let i = 0; i < flashcards.length; i++) {
    liveStatus.innerHTML = `Downloading flashcard ${i + 1} of ${
      flashcards.length
    }… ⮯`;

    const card = flashcards[i];
    const cardElement = cardElements[i];

    // Create high resolution canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { alpha: false });

    // Set canvas size (2:3 ratio)
    const scale = 2;
    canvas.width = 800 * scale;
    canvas.height = 1200 * scale;

    // Enable high quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Get background color from card element
    const bgColor = cardElement.style.backgroundColor || "#fff8ef";

    // Fill background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add border
    ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Draw title
    ctx.fillStyle = "#311d30";
    ctx.font = "bold 96px Arial, sans-serif";
    ctx.textAlign = "left";
    const titleLines = wrapText(ctx, card.title, canvas.width - 240);
    let yPos = 200;
    titleLines.forEach((line) => {
      ctx.fillText(line, 120, yPos);
      yPos += 110;
    });

    // Starting position for points
    yPos += 160;

    // Draw points
    card.points.forEach((point, idx) => {
      ctx.font = "600 56px Arial, sans-serif";
      const pointLines = wrapText(ctx, point, canvas.width - 600);
      const pointHeight = pointLines.length * 72 + 165;

      // Draw point background with rounded corners
      const bgX = 120;
      const bgY = yPos - 90;
      const bgWidth = canvas.width - 240;
      const bgHeight = pointHeight;
      const radius = 32;

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(bgX + radius, bgY);
      ctx.lineTo(bgX + bgWidth - radius, bgY);
      ctx.quadraticCurveTo(bgX + bgWidth, bgY, bgX + bgWidth, bgY + radius);
      ctx.lineTo(bgX + bgWidth, bgY + bgHeight - radius);
      ctx.quadraticCurveTo(
        bgX + bgWidth,
        bgY + bgHeight,
        bgX + bgWidth - radius,
        bgY + bgHeight
      );
      ctx.lineTo(bgX + radius, bgY + bgHeight);
      ctx.quadraticCurveTo(bgX, bgY + bgHeight, bgX, bgY + bgHeight - radius);
      ctx.lineTo(bgX, bgY + radius);
      ctx.quadraticCurveTo(bgX, bgY, bgX + radius, bgY);
      ctx.closePath();
      ctx.fill();

      // Draw list style bullet
      ctx.fillStyle = "#463949";
      ctx.font = "bold 70px Arial";
      ctx.textAlign = "left";
      ctx.fillText("•", 160, yPos + 10);

      // Draw list text
      ctx.fillStyle = "#463949";
      ctx.font = "600 65px Arial, sans-serif";
      let lineY = yPos;
      pointLines.forEach((line) => {
        ctx.fillText(line, 260, lineY);
        lineY += 72;
      });

      yPos += pointHeight + 50;
    });

    // Draw footer
    const footerY = canvas.height - 140;
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    ctx.fillRect(0, footerY - 50, canvas.width, 4);

    // Draw footer brand name
    ctx.fillStyle = "#d935a0";
    ctx.font = "bold 64px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("IQ-Craft", canvas.width / 2 - 140, footerY + 40);

    // Draw card number
    const numberText = `${i + 1}/${flashcards.length}`;
    ctx.font = "600 52px Arial, sans-serif";
    const numberWidth = ctx.measureText(numberText).width;
    const numberX = canvas.width / 2 + 180;
    const numberY = footerY + 40;
    const padding = 24;
    const bgRadius = 40;
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    ctx.beginPath();
    ctx.moveTo(numberX - numberWidth / 2 - padding + bgRadius, numberY - 48);
    ctx.lineTo(numberX + numberWidth / 2 + padding - bgRadius, numberY - 48);
    ctx.quadraticCurveTo(
      numberX + numberWidth / 2 + padding,
      numberY - 48,
      numberX + numberWidth / 2 + padding,
      numberY - 48 + bgRadius
    );
    ctx.lineTo(numberX + numberWidth / 2 + padding, numberY + 20 - bgRadius);
    ctx.quadraticCurveTo(
      numberX + numberWidth / 2 + padding,
      numberY + 20,
      numberX + numberWidth / 2 + padding - bgRadius,
      numberY + 20
    );
    ctx.lineTo(numberX - numberWidth / 2 - padding + bgRadius, numberY + 20);
    ctx.quadraticCurveTo(
      numberX - numberWidth / 2 - padding,
      numberY + 20,
      numberX - numberWidth / 2 - padding,
      numberY + 20 - bgRadius
    );
    ctx.lineTo(numberX - numberWidth / 2 - padding, numberY - 48 + bgRadius);
    ctx.quadraticCurveTo(
      numberX - numberWidth / 2 - padding,
      numberY - 48,
      numberX - numberWidth / 2 - padding + bgRadius,
      numberY - 48
    );
    ctx.closePath();
    ctx.fill();

    // Draw card number text
    ctx.fillStyle = "#333";
    ctx.fillText(numberText, numberX, numberY);

    // Convert canvas to blob and download
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    // Generate filename: title[4words]-[number]-IQ-Craft-Flashcard
    const titleWords = card.title.split(" ").slice(0, 4).join("-");
    const sanitizedTitle = titleWords.replace(/[^a-zA-Z0-9-]/g, "");
    link.download = `${sanitizedTitle}-${i + 1}-IQ-Craft-Flashcard.png`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);

    // Small delay between downloads
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  liveStatus.innerHTML = `All ${flashcards.length} flashcards downloaded! ✔`;
}

// Helper function to wrap text
function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const testLine = currentLine + (currentLine ? " " : "") + word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
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
