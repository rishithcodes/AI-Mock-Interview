# AI Mock Interview Platform - Setup Guide

Step-by-step guide to set up and run this project on a new machine.

---

## Prerequisites

Make sure you have the following installed:

| Tool | Minimum Version | Check Command |
|------|----------------|---------------|
| **Node.js** | v18.0+ | `node --version` |
| **npm** | v9.0+ | `npm --version` |
| **Git** | any | `git --version` |
| **Modern Browser** | Chrome/Edge recommended | - |

---

## Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd PCU_AI_Interview_final
```

---

## Step 2: Install Dependencies

```bash
npm install
```

This installs all required packages:
- React 19, React DOM
- Tailwind CSS v4 + Vite plugin
- MediaPipe (FaceMesh + Camera Utils) for eye tracking
- pdfjs-dist for resume PDF parsing
- Vite (dev server + build tool)
- ESLint (linting)

---

## Step 3: Set Up Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Open `.env` and add your Google Gemini API key:

```
VITE_GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### How to get a Gemini API key:

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key and paste it into your `.env` file

> **Important:** Never commit the `.env` file to git. It is already in `.gitignore`.

---

## Step 4: Run the Development Server

```bash
npm run dev
```

The app will start at:

```
http://localhost:5173/
```

Open this URL in **Google Chrome** or **Microsoft Edge** for the best experience.

---

## Step 5: Grant Browser Permissions

When you start an interview, the browser will ask for:

1. **Camera access** - Required for the webcam feed and eye tracking proctoring
2. **Microphone access** - Required for speech-to-text voice input

Click **"Allow"** for both. Without camera access, the interview screen will show an error. Without microphone, you can still type answers manually.

---

## Build for Production

To create an optimized production build:

```bash
npm run build
```

Output files will be in the `dist/` folder. To preview the production build locally:

```bash
npm run preview
```

---

## Project Structure

```
PCU_AI_Interview_final/
├── .env                    # API key (create from .env.example)
├── .env.example            # Template for environment variables
├── .gitignore
├── index.html              # Entry HTML
├── package.json
├── vite.config.js          # Vite + React + Tailwind config
├── src/
│   ├── main.jsx            # React entry point
│   ├── App.jsx             # Main app with screen navigation
│   ├── App.css             # (empty)
│   ├── index.css           # Design system: tokens, animations, utilities
│   ├── utils/
│   │   ├── interviewHistory.js   # localStorage session management
│   │   └── domainRubrics.js      # Domain-specific scoring rubrics
│   └── assets/
│       └── Components/
│           ├── CandidateSelectPage.jsx   # Landing page
│           ├── DomainAndResume.jsx       # Domain + resume upload
│           ├── PreInterviewScreen.jsx    # Briefing + device check
│           ├── SplitScreen.jsx           # Interview: webcam + chat
│           ├── FeedbackScreen.jsx        # Scores + Q&A review
│           ├── HistoryScreen.jsx         # Past sessions
│           ├── BookInterviewOptions.jsx  # Expert interview type
│           ├── MeetingPage.jsx           # External meeting link
│           └── Screen2/
│               ├── ChatInterface.jsx     # AI chat + voice + evaluation
│               └── CodeEditor.jsx        # Code input for technical domains
└── public/
    └── vite.svg
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Create optimized production build in `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint to check code quality |

---

## Troubleshooting

### "Camera not available" error
- Ensure no other app (Zoom, Teams, etc.) is using your camera
- Check browser permissions: Settings > Privacy > Camera
- Try a different browser (Chrome works best)

### AI interviewer not responding
- Verify your Gemini API key in `.env` is correct
- Check the browser console (F12) for API errors
- Ensure you have internet access (Gemini API, MediaPipe CDN, PDF.js worker are loaded remotely)

### Speech recognition not working
- Use Google Chrome or Microsoft Edge (Firefox/Safari have limited Web Speech API support)
- Ensure microphone permission is granted
- Check that no other tab is using the microphone

### Resume upload fails
- Only PDF files are supported
- The PDF must contain selectable text (scanned image PDFs won't work)
- Try a different PDF or re-export your resume as a text-based PDF

### Styles look broken
- Run `npm install` again to ensure Tailwind CSS v4 is installed
- Clear browser cache (Ctrl+Shift+R)
- Ensure you're using Node.js v18+

---

## Browser Compatibility

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| AI Interview | Yes | Yes | Yes | Yes |
| Speech-to-Text | Yes | Yes | Limited | No |
| Text-to-Speech | Yes | Yes | Yes | Yes |
| Eye Tracking | Yes | Yes | Yes | Yes |
| Code Editor | Yes | Yes | Yes | Yes |

**Recommended:** Google Chrome (latest) for full feature support.

---

## Tech Stack

- **Frontend:** React 19 + Vite 6
- **Styling:** Tailwind CSS v4 (oklch color system, glassmorphism, animations)
- **AI:** Google Gemini 1.5 Flash (multi-turn chat API)
- **Proctoring:** MediaPipe FaceMesh (eye/gaze tracking)
- **PDF Parsing:** pdfjs-dist
- **Speech:** Web Speech API (STT) + Speech Synthesis API (TTS)
- **Storage:** localStorage (interview history, up to 20 sessions)
