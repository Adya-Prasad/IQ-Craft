## Inspiration

We are all **learners!** Especially if you are a student, sometimes it can be a nightmare. As a student, you have to study, understand, and make sure that you don't forget what you have learned and do well when it's needed. Sometimes, due to pressure or boring study material, you can't learn and are even unsure how well you've prepared. _My mates and I struggle with similar problems._

Boring studies are very difficult! This motivated me to look for a handy and comprehensive application that solves this problem. Introducing **IQ-Craft** that lets you input your study materials _(articles, notes, & research papers)_ or its source _(URL)_ and instantly gives you interactive study materials: **comprehensive summary, revision flashcards,** and **quizzes** to test your preparation on the spot.

My goal was to create a simple, clean, responsive application that works both offline & online, with no privacy trade-offs and is handy to use anywhere.

> Say goodbye to boring learning

## What it does

**IQ-Craft** is a single-page web application that uses Chrome AI APIs and works online and offline, without any third-party medium (everything works locally).

- Takes flexible user inputs: article URL, notes, `.txt` file, and direct copy-paste texts.
- "Summarizes" large articles, reports, notes, research papers, and texts into bullet points for interactive reading.
- Turns any blog post, notes, and texts into "flashcards" for quick revision.
- Lets you instantly "download flashcards" for later use and sharing.
- Generates instant "quizzes" to test how well you learn and prepare, and evaluates your score by revealing the correct answers.
- Works offline and remains unaffected by unstable or weak internet connections in remote areas.
- That's it! Simple and handy, suitable for all learners: elementary students to PhD students

## How I built it

### 1. Architecture:

- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3 - keeping it lightweight and fast
- **Backend:** Node.js + Express.js (minimal server only for CORS-safe URL fetching)
- **AI APIs:** Chrome Summarizer API, Prompt API (LanguageModel)
- **Other APIs:** Fetch API and Canvas API

### 2. Technical Implementation:

1. **Smart Text Processing:** Created a unified `cleanText()` function that handles pasted text, uploaded files, and fetched URLs consistently by removing control characters and normalizing line endings.
2. **Chunking Algorithm:** For large articles, implemented sentence-based chunking (to prevent input tokens from exceeding the limit).
3. **Hybrid API Strategy:** Use `Summarizer API` for content processing and summarization, and `Prompt API` for concise title generation and quiz question `JSON` generation from summarization.
4. **Adaptive UI/UX:** Font size adjusts based on content length (14.5px for 2 items, 15px for 1), and confirmation modals for critical actions.
5. **Privacy-First Architecture:** 100% client-side processing - zero data leaves the device, no API keys, no authentication, no tracking.
6. **Local Markdown Rendering:** Custom function that handles bold text (`**text**`), inline code (`` `code` ``), and bullet points for rich formatting.
7. **High-Quality Flashcard Creation & Download:** Adaptive smart content grouping algorithm that analyzes text length and groups 1-2 points per card. Automatic font size adjustment for proper fitting, creates interactive flashcard carousel with navigation and one-click batch download.
   **Professional PNG Export:** Generates 2x resolution flashcard images for retina displays and easy sharing & printing.
8. **Dynamic Quiz Generation and Evaluation:**
   - Uses `Prompt API` to generate 10 contextual multiple-choice questions from the summary
   - Structured `JSON` prompt ensures consistent format: question, 4 options, and correct answer
   - Interactive carousel interface with keyboard navigation (arrow keys)
   - Confirmation modal prevents accidental quiz submission
   - Comprehensive results page with progress, score, and correct answer revealing

## How to setup and run locally

```bash
git clone https://github.com/Adya-Prasad/IQ-Craft.git
cd [folder]
npm install
npm start
```

- Application runs at `http://localhost:3000`
- Open the locallost URL in browser, enter your input (text, txt file or URL) and click 'Go'
- You will get summarization and action buttons to generate flashcards or quizzes. Choose the button and start learning.

## Challenges I ran into

Building IQ-Craft required a fast and lightweight technical implementation with hybrid AI APIs.

1. **Input Too Large Errors:** When generating titles, using `Prompt API` by passing the full 50k+ characters of large articles caused errors. I solved it by using the summary (not full text) for title generation. If summary > 3000 chars, truncate it. This reduced input size by 90% while maintaining quality.
2. **Inconsistent Title Generation by Prompt API:** Sometimes the `Prompt API` was revealing its system prompt rules in the title, and the title length exceeded the specified limit. I experimented with many prompt templates for a consistent response.
3. **Chunking Large Articles:** Some Wikipedia articles and reports exceeded the 15,000 character limit for Summarizer API, causing errors in summary generation. I implemented a sentence-based chunking algorithm that splits text by sentences (preserves context).
4. **Overflow in Flashcard Generation and Download:** Long bullet points (>400 chars) caused text to overflow flashcard boundaries. To prevent it, I implemented smart grouping: long text gets dedicated single-point cards and adjusted font sizes based on content length.

## Accomplishments that I'm proud of

IQ-Craft represents more than technical implementation—it is transforming boring learning into interactive and handy study materials. _It's a demonstration of what's possible when AI moves from the cloud to the **client side**._ Built what my mates and I were looking for, thanks to Chrome Built-in AI APIs for faster and offline working features.

Successfully created a fast and offline **adaptive intelligence** that transforms texts into interactive materials using AI that also _works with unstable internet connections_. Automatically adjusts to content:

- Sophisticated text chunking to prevent exceeding the token limit
- Automatic font size adaptation to prevent overflow
- Properly styled high-quality flashcard exporting

> I completed my machine learning (SVM) notes chapter with IQ-Craft quiz!

## What I learned

- Handling multiple APIs
- Creating an automatic adaptive intelligence
- Client-side AI implementation
- Working with Chrome Built-in AI APIs, Canvas API, and Fetch API

## What's next for IQ-Craft? (Open to contribute)

Looking ahead, I'm excited to expand IQ-Craft's capabilities with:

- Handling **math equations** and **PDFs** with proper rendering
- Smooth compatibility on mobile phones
- **Advanced testing materials** - True/false and fill-in-the-blank
- Instant sharing permissions in groups/friends circles
