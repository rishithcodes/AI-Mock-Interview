import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import { getRubric } from "../../../utils/domainRubrics";
import CodeEditor, { CODE_DOMAINS } from "./CodeEditor";

const DIFFICULTY_PROMPTS = {
  easy: 'Ask basic conceptual questions. Accept brief answers. Be encouraging and supportive. When they answer well, say something like "Good answer" or "Nice".',
  medium: 'Ask practical, scenario-based questions. Expect concrete examples and reasonable depth. Briefly acknowledge their answer before moving on.',
  hard: 'Ask system design, edge cases, and deep technical questions. Challenge vague answers aggressively. Expect expert-level depth. Be concise but demanding.',
};

const MAX_HISTORY_TURNS = 20; // Cap at 20 turns (10 Q&A exchanges) to avoid token limits

const ChatInterface = forwardRef(({ domain, resumeText, difficulty = 'medium', onMessageCountUpdate }, ref) => {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const recognitionRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isListeningRef = useRef(false);
  const questionCountRef = useRef(0);

  // Use refs to avoid stale closures
  const messagesRef = useRef([]);
  const conversationHistoryRef = useRef([]); // Gemini multi-turn history

  const TOTAL_QUESTIONS = 7;
  const difficultyPrompt = DIFFICULTY_PROMPTS[difficulty] || DIFFICULTY_PROMPTS.medium;

  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

  // Keep messagesRef in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const sendClosingMessage = async () => {
    const closingText = "Thank you for your time today! That wraps up our interview. Your responses are now being evaluated — you'll see your detailed feedback shortly.";
    setMessages(prev => [...prev, { sender: "ai", text: closingText }]);
    speakMessage(closingText);
    // Small delay to let the message render before evaluation starts
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  useImperativeHandle(ref, () => ({
    evaluatePerformance,
    sendClosingMessage,
    getMessages: () => [...messagesRef.current],
  }));

  useEffect(() => {
    scrollToBottom();
    if (onMessageCountUpdate) {
      onMessageCountUpdate(messages.length);
    }
  }, [messages, onMessageCountUpdate]);

  useEffect(() => {
    getFirstQuestion();
  }, []);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Keyboard shortcuts — use refs to avoid stale closure
  const isListeningRef2 = useRef(false);
  const isSpeakingRef = useRef(false);
  useEffect(() => { isListeningRef2.current = isListening; }, [isListening]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        if (isListeningRef2.current) {
          stopListeningRef.current();
        } else if (!isSpeakingRef.current) {
          startListeningRef.current();
        }
      }
      if (e.key === 'Escape') {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += t;
          } else {
            interimTranscript += t;
          }
        }
        if (finalTranscript !== '') {
          setUserInput(prevInput => prevInput + finalTranscript + ' ');
        }
        setTranscript(interimTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        if (isListeningRef.current) {
          try {
            recognitionRef.current.start();
          } catch (error) {
            console.error('Error restarting recognition:', error);
            setIsListening(false);
          }
        }
      };
    } else {
      console.warn('Speech recognition not supported in this browser.');
    }
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Better TTS: try to pick a natural-sounding English voice
  const speakMessage = (text, onEnd) => {
    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Try to find a good English voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel'))
    ) || voices.find(v => v.lang.startsWith('en-') && !v.localService) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => {
      setIsSpeaking(false);
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      if (onEnd) onEnd();
    };
    window.speechSynthesis.speak(utterance);
  };

  // Tightened help detection
  const isAskingForHelp = (text) => {
    const lower = text.toLowerCase().trim();
    if (lower.split(/\s+/).length > 15) return false;
    const helpPatterns = [
      /^(can you|could you|please) (help|tell|explain|answer|give)/i,
      /^i (don't|dont|do not) know/i,
      /^help me/i,
      /^tell me the answer/i,
      /^give me (the )?(answer|solution|response)/i,
      /^what's the (correct |right )?answer/i,
      /^just tell me/i,
      /^i have no (idea|clue)/i,
      /^i('m| am) not sure,?\s*can you/i,
    ];
    return helpPatterns.some((pattern) => pattern.test(lower));
  };

  // Detect low-effort answers
  const isLowEffortAnswer = (text) => {
    const trimmed = text.trim();
    const wordCount = trimmed.split(/\s+/).length;
    const lowEffortExact = ['yes', 'no', 'maybe', 'idk', 'i dont know', "i don't know", 'not sure', 'pass', 'next', 'skip', 'ok', 'okay', 'sure', 'yeah', 'nah', 'nope'];
    return wordCount <= 3 || lowEffortExact.includes(trimmed.toLowerCase());
  };

  // System instruction for the Gemini multi-turn chat
  const getSystemInstruction = () => {
    return `You are an expert AI interviewer conducting a ${domain} technical interview at ${difficulty.toUpperCase()} difficulty.

DIFFICULTY BEHAVIOR: ${difficultyPrompt}

CANDIDATE'S RESUME:
${resumeText}

YOUR PERSONA:
- You are professional, warm, and conversational — like a real human interviewer.
- ALWAYS briefly acknowledge the candidate's answer before asking the next question (e.g., "That's a good point about X." or "I see." or "Interesting approach."). Never ignore what they said.
- Keep your total response to 2-3 sentences MAX: a brief reaction + your next question.

RULES:
- Ask ONE question at a time.
- If the answer is detailed and specific → acknowledge it, then move to a NEW topic from their resume.
- If the answer is vague or incomplete → say something like "Could you be more specific?" or "Can you give me a concrete example?"
- If the answer seems wrong → say "Interesting — can you walk me through your reasoning on that?"
- If the candidate gives a very short answer (1-3 words like "yes", "no", "idk") → gently push them: "I'd love to hear more about that. Could you elaborate?"
- Base questions on the resume's technologies, projects, and experiences.
- Use scenario-based questions: "How would you...", "What if...", "Can you give an example..."
- NEVER repeat a question you already asked.
- NEVER provide answers, hints, explanations, or teach the candidate anything.
- NEVER say things like "That's correct" or "The answer is..." — you are EVALUATING, not tutoring.
- NEVER ask generic questions like "tell me more" — always reference a specific technology or concept.

QUESTION PROGRESSION:
- Questions 1-3: Background and basic technical knowledge
- Questions 4-5: Specific technologies, tools, and frameworks from their resume
- Questions 6-7: Problem-solving, system design, or advanced concepts

OUTPUT FORMAT: Just your conversational response (reaction + question). No labels, no formatting, no bullet points.`;
  };

  // Trim conversation history to avoid token limits
  const trimHistory = (history) => {
    if (history.length <= MAX_HISTORY_TURNS) return history;
    // Keep first 2 (initial exchange) + last N turns
    const kept = MAX_HISTORY_TURNS - 2;
    return [...history.slice(0, 2), ...history.slice(-kept)];
  };

  // Call Gemini with multi-turn conversation history
  const callGemini = async (userText, isFirstMessage = false) => {
    const systemInstruction = getSystemInstruction();

    let contents;
    if (isFirstMessage) {
      contents = [{
        role: "user",
        parts: [{ text: "Start the interview now. Greet me warmly and ask me to briefly introduce myself. Keep it to 1-2 sentences." }]
      }];
    } else {
      conversationHistoryRef.current.push({
        role: "user",
        parts: [{ text: userText }]
      });
      // Trim to avoid token limit
      conversationHistoryRef.current = trimHistory(conversationHistoryRef.current);
      contents = [...conversationHistoryRef.current];
    }

    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 200,
          topP: 0.9,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
        ]
      })
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) throw new Error("No response from API");

    // Validate: strip if AI accidentally teaches or gives answers
    const cleaned = cleanAIResponse(aiText.trim());

    conversationHistoryRef.current.push({
      role: "model",
      parts: [{ text: cleaned }]
    });

    if (isFirstMessage) {
      conversationHistoryRef.current = [
        { role: "user", parts: [{ text: "Start the interview now. Greet me warmly and ask me to briefly introduce myself." }] },
        { role: "model", parts: [{ text: cleaned }] }
      ];
    }

    return cleaned;
  };

  // Strip AI responses that accidentally teach or provide answers
  const cleanAIResponse = (text) => {
    // If the response is way too long (>500 chars), it's probably explaining instead of asking
    if (text.length > 500) {
      // Try to extract just the question at the end
      const sentences = text.split(/(?<=[.!?])\s+/);
      const lastTwo = sentences.slice(-2).join(' ');
      if (lastTwo.includes('?')) return lastTwo;
    }

    // Remove common patterns where AI explains the answer
    const teachingPatterns = [
      /^(The (correct |right )?answer (is|would be))/i,
      /^(Actually,?\s*(the )?(answer|solution))/i,
      /^(Let me explain)/i,
      /^(Here'?s (how|what|the))/i,
    ];

    for (const pattern of teachingPatterns) {
      if (pattern.test(text)) {
        // AI is teaching — replace with a generic follow-up
        return "Interesting perspective. Let me move to the next topic. " +
          `Based on your resume, can you tell me about a specific project where you applied your ${domain} skills?`;
      }
    }

    return text;
  };

  const getFirstQuestion = async () => {
    try {
      // Pre-load voices for TTS
      window.speechSynthesis.getVoices();

      const aiMessage = await callGemini("", true);
      setMessages([{ sender: "ai", text: aiMessage }]);
      setTimeout(() => speakMessage(aiMessage, () => setIsTyping(false)), 100);
    } catch (error) {
      console.error("Error fetching initial question:", error);
      const fallbackMessage = `Welcome to your ${domain} interview! I've reviewed your resume and I'm excited to learn more about your experience. Could you start by telling me a bit about yourself and what drew you to ${domain}?`;
      setMessages([{ sender: "ai", text: fallbackMessage }]);
      conversationHistoryRef.current = [
        { role: "user", parts: [{ text: "Start the interview." }] },
        { role: "model", parts: [{ text: fallbackMessage }] }
      ];
      setTimeout(() => speakMessage(fallbackMessage, () => setIsTyping(false)), 100);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (userInput.trim() === "" || isTyping) return;

    const textToSend = userInput.trim();
    setUserInput("");
    setTranscript("");
    setIsTyping(true);

    questionCountRef.current += 1;

    const newMessages = [...messagesRef.current, { sender: "user", text: textToSend }];
    setMessages(newMessages);

    try {
      // Check for help-seeking
      if (isAskingForHelp(textToSend)) {
        const deflection = "I appreciate your honesty, but as your interviewer, I'm here to evaluate your knowledge — not provide answers. Please try your best based on what you know. Even a partial answer or your thought process is valuable. Let me rephrase — " +
          `in your experience with ${domain}, how would you approach this?`;
        conversationHistoryRef.current.push(
          { role: "user", parts: [{ text: textToSend }] },
          { role: "model", parts: [{ text: deflection }] }
        );
        setMessages(prev => [...prev, { sender: "ai", text: deflection }]);
        setIsTyping(false);
        setTimeout(() => speakMessage(deflection), 100);
        return;
      }

      // Check for low-effort answer — let AI handle it but add context to the message
      let messageToSend = textToSend;
      if (isLowEffortAnswer(textToSend)) {
        // Append a hint to the AI that this was a low-effort answer (in the user turn sent to Gemini)
        messageToSend = `${textToSend}\n\n[SYSTEM NOTE: The candidate gave a very brief/low-effort answer. Push them to elaborate with a specific follow-up. Do NOT accept this as a complete answer.]`;
      }

      const aiResponseText = await callGemini(messageToSend);

      setMessages(prev => [...prev, { sender: "ai", text: aiResponseText }]);
      setIsTyping(false);
      setTimeout(() => speakMessage(aiResponseText), 100);
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      const fallbacks = [
        `That's an interesting point. Now, what specific ${domain} technologies have you worked with most recently?`,
        `I see. Can you describe a challenging technical problem you solved in ${domain}?`,
        `Got it. How do you typically approach debugging in ${domain} projects?`,
        `Thanks for sharing. What design patterns do you find most useful in ${domain}?`,
        `Interesting. Tell me about your testing approach in ${domain} projects.`,
        `I appreciate that. How do you handle performance optimization in ${domain}?`,
        `Good to know. What's been your experience with CI/CD in ${domain}?`
      ];
      const fallback = fallbacks[questionCountRef.current % fallbacks.length];
      conversationHistoryRef.current.push(
        { role: "user", parts: [{ text: textToSend }] },
        { role: "model", parts: [{ text: fallback }] }
      );
      setMessages(prev => [...prev, { sender: "ai", text: fallback }]);
      setIsTyping(false);
      setTimeout(() => speakMessage(fallback), 100);
    }
  };

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListeningRef.current && !isSpeakingRef.current) {
      setIsListening(true);
      try { recognitionRef.current.start(); } catch { setIsListening(false); }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      setIsListening(false);
      try { recognitionRef.current.stop(); } catch {}
    }
  }, []);

  const startListeningRef = useRef(startListening);
  const stopListeningRef = useRef(stopListening);
  useEffect(() => { startListeningRef.current = startListening; }, [startListening]);
  useEffect(() => { stopListeningRef.current = stopListening; }, [stopListening]);

  const evaluatePerformance = async () => {
    const rubric = getRubric(domain);
    const defaultScores = Object.fromEntries(rubric.categories.map(c => [c.key, 50]));
    const midScores = Object.fromEntries(rubric.categories.map(c => [c.key, 60]));

    try {
      const currentMessages = messagesRef.current;

      if (currentMessages.length < 4) {
        return { scores: defaultScores, qaReview: [] };
      }

      const qaPairs = [];
      for (let i = 0; i < currentMessages.length - 1; i++) {
        if (currentMessages[i].sender === "ai" && currentMessages[i + 1]?.sender === "user") {
          qaPairs.push({ question: currentMessages[i].text, answer: currentMessages[i + 1].text });
        }
      }

      // Calculate answer engagement metrics
      const avgAnswerLength = qaPairs.reduce((sum, qa) => sum + qa.answer.split(/\s+/).length, 0) / Math.max(qaPairs.length, 1);
      const shortAnswerCount = qaPairs.filter(qa => qa.answer.split(/\s+/).length <= 5).length;

      const conversationText = currentMessages
        .map(msg => `${msg.sender === "ai" ? "Interviewer" : "Candidate"}: ${msg.text}`)
        .join("\n");

      const rubric = getRubric(domain);
      const scoreKeys = rubric.categories.map(c => c.key);
      const scoreDescriptions = rubric.categories.map(c => `- ${c.key}: ${c.description}`).join('\n');
      const scoreJson = scoreKeys.map(k => `"${k}": <number>`).join(', ');

      const evaluationPrompt = `You are evaluating a ${domain} interview at ${difficulty} difficulty.

CONVERSATION:
${conversationText}

CANDIDATE ENGAGEMENT METRICS:
- Average answer length: ${Math.round(avgAnswerLength)} words
- Short answers (5 words or less): ${shortAnswerCount} out of ${qaPairs.length}

TASK 1 — SCORES (0-100):
Rate these ${domain}-specific areas. Be STRICT and honest. Do NOT inflate scores. Very short answers = lower scores.
${scoreDescriptions}

TASK 2 — PER-ANSWER REVIEW:
For each Q&A pair:
- Rate as "strong", "adequate", or "weak"
- Give specific, actionable one-sentence feedback referencing what they said or should have said
- Write a "modelAnswer": a concise 2-3 sentence example of what a STRONG answer would look like for this question in a real ${domain} interview. Include specific technologies, examples, or frameworks.

Q&A PAIRS:
${qaPairs.map((qa, i) => `Q${i}: ${qa.question}\nA${i}: ${qa.answer}`).join('\n\n')}

TASK 3 — IMPROVEMENT ADVICE:
Write 2-3 sentences of personalized advice based on THIS specific interview. Reference actual answers they gave. What should they study or practice?

Return ONLY this JSON (no markdown, no extra text):
{
  "scores": {${scoreJson}},
  "qaReview": [{"questionIndex": 0, "rating": "strong|adequate|weak", "feedback": "...", "modelAnswer": "..."}],
  "personalizedAdvice": "..."
}`;

      const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: evaluationPrompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1000 },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
          ]
        })
      });

      if (!response.ok) throw new Error(`Evaluation API Error: ${response.status}`);

      const data = await response.json();
      let evaluationText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!evaluationText) throw new Error("No evaluation text received");

      evaluationText = evaluationText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const jsonMatch = evaluationText.match(/\{[\s\S]*\}/);
      if (jsonMatch) evaluationText = jsonMatch[0];

      const result = JSON.parse(evaluationText);

      const isValidScore = (s) => typeof s === 'number' && s >= 0 && s <= 100;
      const scores = result.scores || result;
      const hasAllScores = scoreKeys.every(k => isValidScore(scores[k]));
      if (!hasAllScores) {
        throw new Error("Invalid score structure");
      }

      const qaReview = (result.qaReview || []).map((review, idx) => ({
        ...review,
        question: qaPairs[review.questionIndex ?? idx]?.question || '',
        answer: qaPairs[review.questionIndex ?? idx]?.answer || '',
      }));

      return {
        scores,
        qaReview,
        personalizedAdvice: result.personalizedAdvice || '',
      };
    } catch (error) {
      console.error("Error evaluating performance:", error);
      return {
        scores: midScores,
        qaReview: [],
        personalizedAdvice: '',
      };
    }
  };

  const showCodeEditor = CODE_DOMAINS.includes(domain);

  const handleCodeSubmit = (formattedCode) => {
    if (isTyping) return;
    // Simulate sending code as a message
    const codeMessage = userInput.trim()
      ? `${userInput.trim()}\n\n${formattedCode}`
      : formattedCode;
    setUserInput(codeMessage);
    // Auto-submit
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} };
      setUserInput(codeMessage);
      // Trigger send via updating input then programmatically submitting
    }, 0);
    // Directly send it
    setUserInput('');
    setTranscript('');
    setIsTyping(true);
    questionCountRef.current += 1;

    const newMessages = [...messagesRef.current, { sender: "user", text: codeMessage }];
    setMessages(newMessages);

    (async () => {
      try {
        const aiResponseText = await callGemini(codeMessage);
        setMessages(prev => [...prev, { sender: "ai", text: aiResponseText }]);
        setIsTyping(false);
        setTimeout(() => speakMessage(aiResponseText), 100);
      } catch (error) {
        console.error("Error sending code:", error);
        const fallback = `Interesting code. Can you explain your approach and any trade-offs you considered?`;
        conversationHistoryRef.current.push(
          { role: "user", parts: [{ text: codeMessage }] },
          { role: "model", parts: [{ text: fallback }] }
        );
        setMessages(prev => [...prev, { sender: "ai", text: fallback }]);
        setIsTyping(false);
        setTimeout(() => speakMessage(fallback), 100);
      }
    })();
  };

  const currentQuestion = Math.min(Math.ceil(messages.length / 2), TOTAL_QUESTIONS);
  const progressPercent = Math.min((currentQuestion / TOTAL_QUESTIONS) * 100, 100);

  return (
    <div className="flex flex-col h-full bg-surface-base text-text-primary overflow-hidden">
      {/* Header */}
      <div className="bg-surface-1/80 backdrop-blur-md p-3 border-b border-border-subtle flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-lg tracking-tight">{domain}</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full border border-border-subtle ${
            difficulty === 'easy' ? 'text-green-400' : difficulty === 'hard' ? 'text-red-400' : 'text-yellow-400'
          }`}>
            {difficulty}
          </span>
        </div>
        <div className="text-sm text-text-muted flex items-center gap-3">
          <span>Q {currentQuestion}/{TOTAL_QUESTIONS}</span>
          <div className="w-20 bg-surface-2 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-accent-start to-accent-end transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-grow overflow-y-auto p-4 bg-surface-1"
        style={{ maxHeight: "calc(100% - 130px)" }}
      >
        <div className="space-y-3">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`p-4 rounded-xl animate-fade-in ${
                msg.sender === "ai"
                  ? "bg-surface-2 border border-border-subtle"
                  : "bg-accent/8 border border-accent/15"
              }`}
            >
              <div className="flex items-center mb-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center mr-2 text-xs font-bold ${
                  msg.sender === "ai"
                    ? "bg-gradient-to-br from-accent-start to-accent-end text-white"
                    : "bg-green-600 text-white"
                }`}>
                  {msg.sender === "ai" ? "AI" : "You"}
                </div>
                <span className="font-medium text-sm text-text-secondary">
                  {msg.sender === "ai" ? "AI Interviewer" : "You"}
                </span>
              </div>
              <div className="text-text-primary whitespace-pre-line text-sm leading-relaxed">
                {msg.text.split(/(```[\s\S]*?```)/g).map((part, i) => {
                  if (part.startsWith('```') && part.endsWith('```')) {
                    const lines = part.slice(3, -3).split('\n');
                    const lang = lines[0]?.trim() || '';
                    const code = (lang ? lines.slice(1) : lines).join('\n').trim();
                    return (
                      <pre key={i} className="bg-surface-base border border-border-subtle rounded-xl p-3 my-2 overflow-x-auto">
                        {lang && <div className="text-xs text-text-muted mb-1">{lang}</div>}
                        <code className="text-green-300 text-sm font-mono">{code}</code>
                      </pre>
                    );
                  }
                  return <span key={i}>{part}</span>;
                })}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="p-4 rounded-xl bg-surface-2 border border-border-subtle animate-fade-in">
              <div className="flex items-center mb-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent-start to-accent-end flex items-center justify-center mr-2">
                  <span className="text-xs font-bold text-white">AI</span>
                </div>
                <span className="font-medium text-sm text-text-secondary">AI Interviewer</span>
              </div>
              <div className="flex items-center gap-1.5 py-1">
                <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-3 bg-surface-1/80 backdrop-blur-md border-t border-border-subtle">
        {showCodeEditor && (
          <CodeEditor onSubmit={handleCodeSubmit} disabled={isTyping} />
        )}

        <form onSubmit={handleSendMessage}>
          <div className="mb-2 flex items-center gap-2">
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              disabled={isSpeaking}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 focus:outline-none disabled:opacity-50 ${
                isListening
                  ? 'bg-red-600 hover:bg-red-700 text-white ring-2 ring-red-500/30 animate-pulse'
                  : 'bg-surface-2 hover:bg-surface-3 text-text-secondary border border-border-subtle'
              }`}
            >
              {isListening ? 'Stop Mic' : 'Start Mic'}
            </button>
            <span className="text-text-muted text-xs">Ctrl+M</span>
            {transcript && (
              <span className="text-text-secondary text-xs italic ml-2 truncate">Hearing: {transcript}</span>
            )}
          </div>
          <div className="flex">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="flex-grow p-3 rounded-l-xl input-field"
              placeholder={showCodeEditor ? "Type explanation or use code editor above..." : "Type your response or use voice..."}
            />
            <button
              type="submit"
              disabled={isTyping}
              className="btn-gradient px-6 py-3 rounded-r-xl disabled:opacity-50"
            >
              Send
            </button>
          </div>
          <div className="mt-1 text-text-muted text-xs">
            Ctrl+M toggle mic &middot; Esc stop AI speech &middot; Enter to send
          </div>
        </form>
      </div>
    </div>
  );
});

export default ChatInterface;
