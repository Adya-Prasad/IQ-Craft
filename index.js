// index.js (Express server)
const express = require("express");
const path = require("path");
const fetch = require("node-fetch"); // install if needed
const { JSDOM } = require("jsdom");   // install if needed
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, "src")));

// Fetch article route
app.get("/api/fetchArticle", async (req, res) => {
  try {
    const url = req.query.url;
    const resp = await fetch(url);
    const html = await resp.text();
    
    // Extract article text via DOM
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    // Try to find article content using common selectors
    let articleText = "";
    
    // Try common article selectors
    const selectors = [
      "article",
      '[role="main"]',
      ".article-content",
      ".post-content",
      ".entry-content",
      ".content",
      "main",
      "#content"
    ];
    
    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (element) {
        articleText = element.textContent || element.innerText;
        if (articleText.length > 200) break;
      }
    }
    
    // Fallback to body if nothing found
    if (!articleText || articleText.length < 200) {
      articleText = doc.body.textContent || doc.body.innerText;
    }
    
    // Clean up the text
    articleText = articleText
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "") // Remove control characters
      .replace(/\r\n/g, "\n") // Normalize line endings
      .replace(/\r/g, "\n") // Normalize line endings
      .replace(/\t/g, " ") // Replace tabs with spaces
      .replace(/ +/g, " ") // Replace multiple spaces with single space
      .replace(/\n{3,}/g, "\n\n") // Replace 3+ newlines with 2
      .trim();
    
    res.json({ text: articleText });
  } catch (err) {
    console.error("Error fetching article:", err);
    res.status(500).json({ error: "Unable to fetch article" });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 IQCraft running at http://localhost:${PORT}`);
});
