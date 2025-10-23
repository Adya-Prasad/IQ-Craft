const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  // Handle preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  try {
    const url = event.queryStringParameters.url;

    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "URL parameter is required" }),
      };
    }

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
      "#content",
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text: articleText }),
    };
  } catch (err) {
    console.error("Error fetching article:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Unable to fetch article" }),
    };
  }
};
