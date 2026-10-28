# AI Mock Interview Platform — Complete Documentation

---

## Table of Contents

1. [Setup Guide](#setup-guide)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Tech Stack Comparison](#tech-stack-comparison)
5. [User Flow](#user-flow)
6. [Component Reference](#component-reference)
7. [AI System](#ai-system)
8. [Proctoring System](#proctoring-system)
9. [Scoring & Evaluation](#scoring--evaluation)
10. [Contributing](#contributing)
11. [Troubleshooting](#troubleshooting)

---

## Setup Guide

### Prerequisites

| Tool | Minimum Version | Check Command |
|------|----------------|---------------|
| Node.js | v18.0+ | `node --version` |
| npm | v9.0+ | `npm --version` |
| Git | any | `git --version` |
| Browser | Chrome/Edge (latest) | — |

### Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd PCU_AI_Interview_final

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and add your Gemini API key

# 4. Start development server
npm run dev
# Opens at http://localhost:5173/
```

### Getting a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key into your `.env` file:
   ```
   VITE_GEMINI_API_KEY=your_key_here
   ```

> Never commit `.env` to git. It is already in `.gitignore`.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

---

## Architecture

### Overview

This is a **100% frontend application** — no backend server. Everything runs in the browser.

```
┌──────────────────────────────────────────────────────────────┐
│                         Browser                              │
│                                                              │
│  ┌─────────┐   ┌──────────────┐   ┌───────────────────┐     │
│  │ React   │──▶│ State Machine│──▶│ Screen Components │     │
│  │ App.jsx │   │ (7 screens)  │   │                   │     │
│  └─────────┘   └──────────────┘   └───────────────────┘     │
│                                          │                   │
│           ┌──────────────────────────────┼──────────┐        │
│           ▼                              ▼          ▼        │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────┐      │
│  │ Gemini API     │  │ MediaPipe    │  │ Web Speech  │      │
│  │ (REST fetch)   │  │ FaceMesh     │  │ API         │      │
│  │                │  │ (WebGL/WASM) │  │ (STT + TTS) │      │
│  └────────────────┘  └──────────────┘  └─────────────┘      │
│           │                                                  │
│           ▼                                                  │
│  ┌────────────────┐  ┌──────────────┐                        │
│  │ pdfjs-dist     │  │ localStorage │                        │
│  │ (PDF → text)   │  │ (history)    │                        │
│  └────────────────┘  └──────────────┘                        │
└──────────────────────────────────────────────────────────────┘
```

### State Machine (App.jsx)

```
candidateSelect → domainResume → preInterview → interview → feedback
                                      ↑                        │
                                      └────── (back) ───────────┘
                                                                │
                  history ◄─────────────────────────────────────┘
```

No react-router. Navigation is controlled by `useState('candidateSelect')` in App.jsx.

### Project Structure

```
PCU_AI_Interview_final/
├── .env                          # Gemini API key (not committed)
├── .env.example                  # Template
├── index.html                    # Entry HTML (title: AI Mock Interview)
├── vite.config.js                # Vite + React + Tailwind v4
├── package.json                  # Dependencies
├── SETUP.md                      # Quick start guide
├── DOCUMENTATION.md              # This file
├── src/
│   ├── main.jsx                  # React entry point
│   ├── App.jsx                   # State machine, screen routing
│   ├── index.css                 # Design system: @theme, animations, utilities
│   ├── utils/
│   │   ├── interviewHistory.js   # localStorage CRUD (20 session cap)
│   │   └── domainRubrics.js      # 7 domain-specific scoring rubrics
│   └── assets/Components/
│       ├── CandidateSelectPage.jsx   # Landing page
│       ├── DomainAndResume.jsx       # Domain + resume + difficulty + practice mode
│       ├── PreInterviewScreen.jsx    # Briefing, rules, device check
│       ├── SplitScreen.jsx           # Interview: webcam + chat + proctoring
│       ├── FeedbackScreen.jsx        # Scores, Q&A review, model answers, advice
│       ├── HistoryScreen.jsx         # Past interview sessions
│       ├── BookInterviewOptions.jsx  # Expert/peer interview selection
│       ├── MeetingPage.jsx           # External meeting link
│       └── Screen2/
│           ├── ChatInterface.jsx     # AI chat, voice, evaluation engine
│           └── CodeEditor.jsx        # Code input for technical domains
└── public/
    └── vite.svg
```

### Data Flow: Interview → Feedback

```
DomainAndResume                     SplitScreen                    FeedbackScreen
┌─────────────┐                   ┌─────────────┐                ┌──────────────┐
│ domain      │──┐                │ webcam      │                │ scores       │
│ resumeText  │  │   App.jsx      │ timer       │   App.jsx      │ qaReview     │
│ difficulty  │──┼──▶ state ──▶   │ proctoring  │──▶ state ──▶   │ modelAnswers │
│ practiceMode│  │                │ ChatInterface│                │ advice       │
└─────────────┘  │                │   ├─ messages│                │ violations   │
                 │                │   ├─ scores  │                │ history save │
                 │                │   └─ qaReview│                └──────────────┘
                 │                └─────────────┘
                 │                       │
                 │                       ▼
                 │                ┌─────────────┐
                 └───────────────▶│ Gemini API  │
                   (resume in    │ multi-turn  │
                    prompt)      └─────────────┘
```

---

## Features

### Core Interview (9 features)
| # | Feature | Description |
|---|---------|-------------|
| 1 | AI Interviewer | Gemini 1.5 Flash multi-turn chat with system instructions and resume context |
| 2 | 7 Domains | AI, Web Dev, Data Science, Cybersecurity, Data Analytics, Chartered Accountant, Sales Executive |
| 3 | Difficulty Selection | Easy (basic) / Medium (scenario-based) / Hard (system design) |
| 4 | Voice Interaction | Speech-to-text input + text-to-speech AI responses with natural voice selection |
| 5 | Code Editor | In-chat code input with language selector and Tab indentation (technical domains only) |
| 6 | 20-Minute Timer | Countdown with color changes, auto-completes on expiry |
| 7 | 7-Question Progress | Gradient progress bar in chat header |
| 8 | Natural Flow | AI acknowledges answers before next question, closing message before evaluation |
| 9 | Keyboard Shortcuts | Ctrl+M toggle mic, Esc stop AI speech, Enter to send |

### Proctoring & Integrity (9 features)
| # | Feature | Description |
|---|---------|-------------|
| 10 | Eye Tracking | MediaPipe FaceMesh iris landmark detection |
| 11 | Tab-Switch Detection | `visibilitychange` API, warns on each switch |
| 12 | Score Penalties | 3% per violation, capped at 30% |
| 13 | Violation Counters | Real-time overlay on webcam feed |
| 14 | Practice Mode | Disables all proctoring — focus on answers only |
| 15 | Help Detection | Deflects when candidate asks AI for answers |
| 16 | Low-Effort Detection | Pushes candidates to elaborate on 1-3 word answers |
| 17 | Answer Leak Prevention | Post-processes AI responses, strips teaching patterns |
| 18 | Auto-Termination | Interview ends after 3 tab switches |

### Resume & Domain (4 features)
| # | Feature | Description |
|---|---------|-------------|
| 19 | PDF Resume Upload | Client-side text extraction via pdfjs-dist |
| 20 | Domain Matching | Weighted keyword scoring with coverage analysis |
| 21 | Resume Analysis | Shows top 3 matching domains with scores |
| 22 | Domain Validation | Blocks mismatched domain/resume with suggestions |

### Evaluation & Feedback (11 features)
| # | Feature | Description |
|---|---------|-------------|
| 23 | Domain-Specific Rubrics | Custom 3-category scoring per domain |
| 24 | Per-Answer Q&A Review | Expandable accordion with strong/adequate/weak ratings |
| 25 | Model Answer Comparison | AI-generated example of a strong answer for each question |
| 26 | Personalized Advice | AI-written "What to Improve Next" referencing actual answers |
| 27 | Engagement Metrics | Average answer length + short answer count fed into evaluation |
| 28 | Weighted Overall Score | Domain-specific category weights |
| 29 | Tiered Feedback | 5 tiers: Exceptional → Requires Attention |
| 30 | Proctoring Notes | Violation counts + penalty breakdown |
| 31 | Interview History | localStorage, up to 20 sessions |
| 32 | Session Review | Browse and re-open past session feedback |
| 33 | PDF Report Export | Print-optimized layout via `window.print()` |

### Pre-Interview (3 features)
| # | Feature | Description |
|---|---------|-------------|
| 34 | Briefing Screen | Rules, tips, keyboard shortcuts |
| 35 | Device Check | Automatic camera + mic permission test |
| 36 | Practice Mode Info | Different rules displayed when proctoring disabled |

### UI/UX (8 features)
| # | Feature | Description |
|---|---------|-------------|
| 37 | Design Token System | oklch colors via `@theme` in Tailwind v4 |
| 38 | Glassmorphism | `backdrop-blur` + translucent surfaces |
| 39 | Entrance Animations | fade-in-up, scale-in, stagger delays |
| 40 | Gradient Accents | Blue-to-purple brand gradient on CTAs + progress bars |
| 41 | Responsive Layout | Stacks vertically on mobile, side-by-side on desktop |
| 42 | Typing Indicator | Bouncing dots with staggered animation |
| 43 | Timer Glow | Red shadow pulse when under 2 minutes |
| 44 | Mic Pulse | Red ring animation when recording |

### Technical (7 features)
| # | Feature | Description |
|---|---------|-------------|
| 45 | API Key in .env | `import.meta.env.VITE_GEMINI_API_KEY` |
| 46 | Multi-Turn Chat | `system_instruction` + `contents[]` with role/parts |
| 47 | History Trimming | Caps at 20 turns to avoid Gemini token limits |
| 48 | Safety Settings | `BLOCK_ONLY_HIGH` on all harm categories |
| 49 | Stale Closure Fixes | Ref pattern for timer, tab-switch, keyboard handlers |
| 50 | Unused Dep Cleanup | Removed tensorflow, firebase, face-api, etc. |
| 51 | Delete/Clear History | Per-session delete or clear all with confirmation |

**Total: 51 features**

---

## Tech Stack Comparison

### Why React 19?

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **React 19** | `forwardRef` + `useImperativeHandle` for parent-child communication, largest ecosystem, best MediaPipe/pdfjs examples | Heavier than Svelte | **Chosen** — we need imperative handles for ChatInterface ↔ SplitScreen |
| Vue 3 | Composition API, smaller bundle | Fewer MediaPipe examples | Good alternative |
| Svelte | Smallest bundle, compiled | Smaller ecosystem | Would work for simpler app |
| Vanilla JS | Zero overhead | Unmaintainable at 10+ components | Not viable |

### Why Vite 6?

| Option | Dev Start | HMR | Config | Verdict |
|--------|-----------|-----|--------|---------|
| **Vite 6** | ~300ms | Instant (ESM) | 5 lines | **Chosen** — zero-config for React + Tailwind v4 |
| Webpack | 5-30s | Slow | 50-200 lines | Overkill |
| CRA | 10-30s | Slow | Ejected = chaos | Deprecated |
| Next.js | 2-5s | Fast | Opinionated | We have zero SSR/routing needs |

### Why Tailwind CSS v4?

| Option | Bundle | Tokens | Verdict |
|--------|--------|--------|---------|
| **Tailwind v4** | Only used classes | `@theme` native | **Chosen** — design system in 20 lines of CSS |
| Plain CSS | Everything | Manual CSS vars | Too verbose for 10 components |
| CSS Modules | Per-component | Manual | No design system |
| MUI/shadcn | 100KB+ | Built-in | Overkill, can't match our custom glassmorphism |

### Why Gemini 1.5 Flash?

| Option | Cost | Speed | Browser Direct | Verdict |
|--------|------|-------|----------------|---------|
| **Gemini Flash** | Free tier (15 RPM) | ~1-2s | Yes (no CORS) | **Chosen** — free, simple REST, `system_instruction` |
| GPT-4o Mini | $0.15/1M tokens | ~1-3s | Needs proxy | Requires billing |
| Claude Haiku | $0.25/1M tokens | ~1-2s | Needs proxy | Requires billing |
| Local LLM | Free | 5-30s | N/A | Users need GPU |

### Why MediaPipe FaceMesh?

| Option | Iris Tracking | FPS | Size | Verdict |
|--------|--------------|-----|------|---------|
| **MediaPipe FaceMesh** | Yes (478 landmarks) | 30+ | 3MB CDN | **Chosen** — only option with iris landmarks for gaze detection |
| TensorFlow.js Face | No iris | 15-25 | 10MB | Can't detect gaze direction |
| face-api.js | No (68 landmarks) | 10-20 | 6MB | Can detect face, not where you're looking |
| OpenCV.js | No mesh | 15-20 | 8MB | No face mesh at all |

### Why pdfjs-dist?

| Option | Browser | PDF Support | Verdict |
|--------|---------|-------------|---------|
| **pdfjs-dist** | Yes (with worker) | Full text extraction | **Chosen** — only real option for client-side PDF parsing |
| pdf-parse | Node.js only | Full | Can't run in browser |
| mammoth.js | Yes | .docx only | Wrong format |

### Why Web Speech API?

| Option | Cost | Dependencies | Accuracy | Verdict |
|--------|------|-------------|----------|---------|
| **Web Speech API** | Free | Zero (built-in) | Decent | **Chosen** — no dependencies, no cost, acceptable for practice |
| Whisper.js | Free | 100MB model | Excellent | Too heavy for a web app |
| Deepgram/AssemblyAI | Paid | SDK + backend | Excellent | Needs server |

### Why localStorage?

| Option | Limit | Setup | Auth | Verdict |
|--------|-------|-------|------|---------|
| **localStorage** | 5MB | Zero | None | **Chosen** — 20 sessions × 5KB = 100KB, well within limits |
| IndexedDB | 50MB+ | Complex async | None | Overkill for our data size |
| Supabase/Firebase | Unlimited | Account + SDK | Required | Needs backend/auth |

### Summary

| Need | Solution | Why |
|------|----------|-----|
| No backend | Vite + React SPA | Everything runs in browser |
| Free AI | Gemini Flash free tier | No billing |
| Eye tracking | MediaPipe FaceMesh | Only option with iris landmarks |
| Resume parsing | pdfjs-dist | Only browser-side PDF extraction |
| Voice I/O | Web Speech API | Zero dependencies, built-in |
| Styling | Tailwind v4 `@theme` | Design system in 20 lines |
| Storage | localStorage | 100KB data, no backend |

---

## User Flow

### AI Mock Interview Path

```
1. Landing Page
   ├─ "AI Mock Interview"  ──▶  2. Domain & Resume
   ├─ "Book Expert"        ──▶  Expert/Peer selection → Meeting link
   └─ "View History"       ──▶  Past sessions list

2. Domain & Resume
   ├─ Select domain (dropdown, 7 options)
   ├─ Upload resume PDF (text extracted, domain scores shown)
   ├─ Select difficulty (Easy / Medium / Hard)
   ├─ Toggle practice mode (optional)
   └─ Click "Continue" ──▶ 3. Pre-Interview Briefing

3. Pre-Interview Briefing
   ├─ Interview rules (or practice mode info)
   ├─ Tips and keyboard shortcuts
   ├─ Device check (camera + mic green/red dots)
   └─ Click "Start Interview" ──▶ 4. Interview Screen

4. Interview Screen (Split Layout)
   ├─ LEFT: Webcam feed + timer + violation counters
   ├─ RIGHT: AI chat + voice input + code editor
   ├─ Answer 7 questions (or end early)
   └─ Click "Complete Interview" ──▶ 5. Feedback

5. Feedback Screen
   ├─ Overall weighted score (color-coded)
   ├─ Domain-specific skill breakdown (progress bars)
   ├─ Detailed per-skill feedback
   ├─ AI personalized advice
   ├─ Q&A review (expandable, with model answers)
   ├─ Proctoring notes (if violations occurred)
   ├─ "Download Report" (print to PDF)
   ├─ "View History"
   └─ "New Interview" ──▶ Back to landing
```

### How to Use Voice

1. Click **"Start Mic"** or press **Ctrl+M**
2. Speak your answer — real-time transcript shown
3. Click **"Stop Mic"** or press **Ctrl+M** again
4. Edit the transcribed text if needed
5. Press **Enter** or click **Send**

### How to Use Code Editor (Technical Domains Only)

1. Click **"+ Write Code"** toggle
2. Select language from dropdown
3. Write code (Tab inserts 2 spaces)
4. Click **"Send Code"** — code appears as a formatted block in chat
5. AI evaluates your code and asks follow-ups

---

## Component Reference

### App.jsx
- **Role:** Root component, state machine
- **State:** `screen`, `domainData`, `interviewResults`
- **Manages:** Screen transitions, data passing between screens, localStorage save on completion

### CandidateSelectPage.jsx
- **Role:** Landing page
- **Props:** `onStartMockInterview`, `onViewHistory`
- **UI:** 3 buttons (AI Mock, Book Expert, History), ambient gradient background

### DomainAndResume.jsx
- **Role:** Interview configuration
- **Props:** `onNext(domain, resumeText, difficulty, practiceMode)`
- **Logic:** PDF text extraction, keyword domain matching, validation
- **UI:** Domain dropdown, file upload, difficulty buttons, practice mode toggle

### PreInterviewScreen.jsx
- **Role:** Pre-interview briefing
- **Props:** `domain`, `difficulty`, `practiceMode`, `onStart`, `onBack`
- **Logic:** Camera/mic permission check
- **UI:** Rules, tips, device status, conditional practice mode info

### SplitScreen.jsx
- **Role:** Interview orchestration
- **Props:** `domain`, `resumetext`, `difficulty`, `practiceMode`, `onComplete`
- **Logic:** Timer, webcam, eye tracking, tab detection, violation counting, penalty calculation
- **Children:** `ChatInterface` (via ref)
- **UI:** Split webcam/chat layout, warning overlays, evaluating overlay

### ChatInterface.jsx (forwardRef)
- **Role:** AI conversation engine
- **Props:** `domain`, `resumeText`, `difficulty`, `onMessageCountUpdate`
- **Exposed via ref:** `evaluatePerformance()`, `sendClosingMessage()`, `getMessages()`
- **Logic:** Gemini multi-turn chat, help detection, low-effort detection, answer leak prevention, speech I/O
- **Children:** `CodeEditor` (conditional)

### CodeEditor.jsx
- **Role:** Code input panel
- **Props:** `onSubmit(formattedCode)`, `disabled`
- **UI:** Collapsible panel, language selector, textarea with Tab handling

### FeedbackScreen.jsx
- **Role:** Results display
- **Props:** `scores`, `domain`, `difficulty`, `violations`, `messages`, `qaReview`, `personalizedAdvice`, `onFinish`, `onViewHistory`
- **Logic:** Domain rubric lookup, weighted score calculation, tier classification
- **UI:** Score display, progress bars, Q&A accordion, model answers, proctoring notes, print layout

### HistoryScreen.jsx
- **Role:** Past sessions browser
- **Props:** `onBack`, `onViewSession`
- **Logic:** localStorage read, delete, clear
- **UI:** Session cards with scores, difficulty badges, timestamps

### interviewHistory.js (Utility)
- **Exports:** `saveSession()`, `getSessions()`, `deleteSession(id)`, `clearHistory()`
- **Storage key:** `"interview_history"`
- **Limit:** 20 sessions (FIFO eviction)

### domainRubrics.js (Utility)
- **Exports:** `getRubric(domain)`, `computeOverallScore(scores, rubric)`
- **Contains:** 7 domain-specific rubrics, each with 3 categories + weights
- **Fallback:** Generic rubric (Technical/Communication/Problem Solving) for unknown domains

---

## AI System

### Gemini API Configuration

```
Endpoint: v1beta/models/gemini-1.5-flash:generateContent
Temperature: 0.7 (questions), 0.2 (evaluation)
Max Tokens: 200 (questions), 1000 (evaluation)
Safety: BLOCK_ONLY_HIGH on all 4 categories
```

### System Instruction (Interviewer Persona)

The AI receives a `system_instruction` containing:
- Domain and difficulty level
- Full resume text
- Persona rules (professional, warm, conversational)
- Answer analysis instructions (detailed → new topic, vague → follow-up, wrong → probe)
- Question progression (basic → technical → advanced)
- Strict prohibitions (no answers, no hints, no teaching, no repeats)

### Multi-Turn Conversation

```
Turn 1: system_instruction + "Start the interview, greet and ask to introduce"
Turn 2: user answer → AI analyzes + asks question 2
Turn 3: user answer → AI analyzes + asks question 3
...
Turn 14+: Complete interview → separate evaluation API call
```

History is trimmed at 20 turns (keeps first 2 + last 18) to avoid token limits.

### Help Detection

Triggers on short messages (<15 words) matching patterns like:
- "can you help/tell/explain..."
- "i don't know"
- "give me the answer"
- "just tell me"

Returns a deflection message and re-asks the question.

### Low-Effort Answer Detection

Triggers on messages ≤3 words or exact matches like "yes", "no", "idk", "pass", "skip". Adds a system note to the AI prompt to push for elaboration.

### Answer Leak Prevention

Post-processes AI responses to catch:
- Responses > 500 chars (likely explaining, not asking)
- Patterns like "The answer is...", "Let me explain...", "Here's how..."

Replaces with a generic follow-up question.

### Evaluation Prompt

A separate API call at the end of the interview sends:
- Full conversation transcript
- Q&A pairs extracted from messages
- Answer engagement metrics (avg length, short answer count)
- Domain-specific rubric categories

Returns JSON with scores, per-answer ratings + feedback + model answers, and personalized advice.

---

## Proctoring System

### Violation Limits

| Violation | Threshold | Consequence |
|-----------|-----------|-------------|
| Tab switch | 3 max | Auto-terminates interview on 3rd |
| Look-away trigger | 30 consecutive error frames | Warning modal appears |
| Look-away recovery | 15 consecutive good frames | Warning dismissed |
| Score penalty | 3% per violation | Applied to all score categories |
| Max penalty | 30% total | `Math.min(violations × 3, 30)` |

### Eye Tracking Algorithm

```
1. FaceMesh extracts 478 landmarks per frame
2. Iris landmarks (468, 473) positioned relative to eye corners (33, 133, 263, 362)
3. Left ratio = (iris.x - outer.x) / (inner.x - outer.x)
4. Right ratio = (inner.x - iris.x) / (inner.x - outer.x)
5. "Looking straight" = both ratios between 0.4–0.6 AND eyes open (EAR > 0.25)
6. 30 consecutive "not looking" frames → warning
7. 15 consecutive "looking" frames → warning cleared
```

### Practice Mode

When enabled:
- Eye tracking setup is skipped (`if (!practiceMode) setupEyeTracking()`)
- Tab visibility listener is not attached (`if (practiceMode) return`)
- Webcam still shown (for realism) but not monitored
- No violations recorded, no penalties applied
- PreInterviewScreen shows different rules

---

## Scoring & Evaluation

### Domain-Specific Rubrics

| Domain | Category 1 (40%) | Category 2 (30%) | Category 3 (30%) |
|--------|------------------|-------------------|-------------------|
| AI | ML Fundamentals | Model Architecture & Tools | Data & Problem Solving |
| Web Development | Frontend Knowledge | Backend & APIs | System Design & Architecture |
| Data Science | Statistical & ML Knowledge | Data Processing & Tools | Analysis & Communication |
| Cybersecurity | Security Fundamentals | Offensive/Defensive Skills | Risk & Compliance |
| Data Analytics | Analytical Methods | Visualization & Tools | Business & Communication |
| Chartered Accountant | Accounting & Standards | Taxation & Audit | Financial Analysis |
| Sales Executive | Sales Strategy | Product & Market Knowledge | Communication & Negotiation |

### Score Calculation

```
For each rubric category:
  raw_score = Gemini evaluation (0-100)
  penalty = min(total_violations × 3, 30)
  final_score = max(0, raw_score - penalty)

overall = Σ (category_score × category_weight)
```

### Feedback Tiers

| Score Range | Label | Color |
|-------------|-------|-------|
| 85-100 | Exceptional | Green |
| 70-84 | Strong | Yellow |
| 55-69 | Developing | Orange |
| 40-54 | Needs Work | Orange-red |
| 0-39 | Requires Attention | Red |

---

## Contributing

### Code Style

- **React:** Functional components with hooks, `forwardRef` for imperative handles
- **Styling:** Tailwind utility classes only, design tokens from `index.css` `@theme`
- **State:** `useState` for UI state, `useRef` for values accessed in callbacks (avoids stale closures)
- **API calls:** Raw `fetch()`, no SDK — keeps bundle small
- **No comments** unless logic is non-obvious

### Design System Tokens (index.css)

| Token | Usage |
|-------|-------|
| `bg-surface-base` | Deepest background |
| `bg-surface-1` | Cards |
| `bg-surface-2` | Elevated elements |
| `bg-surface-3` | Hover states |
| `text-text-primary` | Main text |
| `text-text-secondary` | Labels, descriptions |
| `text-text-muted` | Hints, meta |
| `border-border-subtle` | Card borders |
| `bg-accent` | Brand accent (midpoint) |
| `glass-card` | Frosted glass card |
| `btn-gradient` | Primary CTA button |
| `btn-surface` | Secondary button |
| `gradient-text` | Gradient text fill |
| `bg-ambient` | Page background with radial gradients |
| `animate-fade-in-up` | Entrance animation |
| `animate-scale-in` | Scale entrance |
| `stagger` | Staggered children delays |

### Adding a New Domain

1. Add the domain name to the `domains` array in `DomainAndResume.jsx`
2. Add keywords to `domainKeywords` object in `DomainAndResume.jsx`
3. Add a rubric entry in `src/utils/domainRubrics.js`:
   ```js
   'Your Domain': {
     categories: [
       { key: 'category1', label: 'Display Name', description: 'What this measures', weight: 0.4 },
       { key: 'category2', label: 'Display Name', description: 'What this measures', weight: 0.3 },
       { key: 'category3', label: 'Display Name', description: 'What this measures', weight: 0.3 },
     ]
   }
   ```

### Adding Code Editor Support for a Domain

Add the domain name to the `CODE_DOMAINS` array in `CodeEditor.jsx`:
```js
export const CODE_DOMAINS = ['Web Development', 'Data Science', 'Your Domain'];
```

---

## Troubleshooting

### Camera not available
- Close other apps using camera (Zoom, Teams, etc.)
- Check browser permissions: Settings → Privacy → Camera
- Try Chrome if using another browser

### AI interviewer not responding
- Verify Gemini API key in `.env` is correct
- Check browser console (F12) for API errors (401 = bad key, 429 = rate limit)
- Ensure internet access (Gemini API, MediaPipe CDN, PDF.js worker are remote)

### Speech recognition not working
- Use Chrome or Edge (Firefox/Safari have limited Web Speech API support)
- Grant microphone permission
- Check no other tab is using the microphone

### Resume upload fails
- Only PDF files supported
- PDF must contain selectable text (scanned/image PDFs won't work)
- Try re-exporting resume as text-based PDF

### Styles look broken
- Run `npm install` to ensure Tailwind v4 is installed
- Clear browser cache (Ctrl+Shift+R)
- Requires Node.js v18+

### Eye tracking too sensitive
- Ensure good lighting on your face
- Position camera at eye level
- Sit 50-70cm from screen
- Or enable **Practice Mode** to disable proctoring entirely

### Browser Compatibility

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| AI Interview | Yes | Yes | Yes | Yes |
| Speech-to-Text | Yes | Yes | Limited | No |
| Text-to-Speech | Yes | Yes | Yes | Yes |
| Eye Tracking | Yes | Yes | Yes | Yes |
| Code Editor | Yes | Yes | Yes | Yes |

**Recommended:** Google Chrome (latest) for full feature support.

---

## Security Notes

- **API key exposure:** The Gemini API key is sent from the browser. Anyone with DevTools can see it. For production, route through a backend proxy.
- **No authentication:** Anyone with the URL can use the app. No user accounts.
- **localStorage:** Interview history is stored unencrypted in the browser. Clearing browser data deletes it.
- **Webcam feed:** Camera frames are processed locally by MediaPipe. No video is uploaded or stored anywhere.
- **Resume text:** Extracted PDF text stays in React state and is sent only to Gemini for question generation. Not stored on any server.

---

*Built with React 19, Vite 6, Tailwind CSS v4, Google Gemini 1.5 Flash, MediaPipe FaceMesh, and Web Speech API.*
