import { useEffect, useRef, useState, useCallback } from "react";
import ChatInterface from "./Screen2/ChatInterface";
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import { getRubric } from '../../utils/domainRubrics';

const MIN_MESSAGES_FOR_COMPLETION = 14; // 7 Q&A rounds
const INTERVIEW_DURATION = 20 * 60; // 20 minutes in seconds
const MAX_TAB_SWITCHES = 3;

export default function SplitScreen({ domain, resumetext, difficulty, practiceMode = false, onComplete }) {
  const chatInterfaceRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraError, setCameraError] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [tabSwitchDetected, setTabSwitchDetected] = useState(false);
  const [lookAwayDetected, setLookAwayDetected] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(INTERVIEW_DURATION);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [lookAwayCount, setLookAwayCount] = useState(0);
  const [terminated, setTerminated] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const errorFrameCountRef = useRef(0);
  const goodFrameCountRef = useRef(0);
  const cameraInstance = useRef(null);
  const faceMeshInstance = useRef(null);
  const timerRef = useRef(null);

  // Use refs for values accessed in callbacks to avoid stale closures
  const tabSwitchCountRef = useRef(0);
  const lookAwayCountRef = useRef(0);
  const terminatedRef = useRef(false);
  const isEvaluatingRef = useRef(false);

  useEffect(() => { tabSwitchCountRef.current = tabSwitchCount; }, [tabSwitchCount]);
  useEffect(() => { lookAwayCountRef.current = lookAwayCount; }, [lookAwayCount]);
  useEffect(() => { terminatedRef.current = terminated; }, [terminated]);
  useEffect(() => { isEvaluatingRef.current = isEvaluating; }, [isEvaluating]);

  const ERROR_THRESHOLD = 30;
  const GOOD_THRESHOLD = 15;

  // Stable complete function using refs
  const completeInterview = useCallback(async () => {
    if (isEvaluatingRef.current) return;
    setIsEvaluating(true);

    try {
      clearInterval(timerRef.current);

      // Send a natural closing message before evaluating
      await chatInterfaceRef.current.sendClosingMessage();

      const { scores, qaReview, personalizedAdvice } = await chatInterfaceRef.current.evaluatePerformance();
      const messages = chatInterfaceRef.current.getMessages();

      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }

      const totalViolations = tabSwitchCountRef.current + lookAwayCountRef.current;
      const penalty = Math.min(totalViolations * 3, 30);

      // Apply penalty to all score keys dynamically
      const rubric = getRubric(domain);
      const penalizedScores = {};
      for (const cat of rubric.categories) {
        penalizedScores[cat.key] = Math.max(0, Math.round((scores[cat.key] || 0) - penalty));
      }

      if (onComplete) {
        onComplete({
          ...penalizedScores,
          messages,
          qaReview: qaReview || [],
          personalizedAdvice: personalizedAdvice || '',
          violations: {
            tabSwitches: tabSwitchCountRef.current,
            lookAways: lookAwayCountRef.current,
            penaltyApplied: penalty,
            terminated: terminatedRef.current,
          }
        });
      }
    } catch (error) {
      console.error("Error completing interview:", error);
      if (onComplete) {
        const fallbackRubric = getRubric(domain);
        const fallbackScores = Object.fromEntries(fallbackRubric.categories.map(c => [c.key, 50]));
        onComplete({
          ...fallbackScores,
          messages: [],
          qaReview: [],
          violations: {
            tabSwitches: tabSwitchCountRef.current,
            lookAways: lookAwayCountRef.current,
            penaltyApplied: 0,
            terminated: terminatedRef.current,
          }
        });
      }
    }
  }, [onComplete]);

  // Ref so timer/visibility callbacks always call latest version
  const completeInterviewRef = useRef(completeInterview);
  useEffect(() => { completeInterviewRef.current = completeInterview; }, [completeInterview]);

  // Interview timer — uses ref to avoid stale closure
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          completeInterviewRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (!stream?.active || !stream.getVideoTracks().length) {
          throw new Error("Webcam not available");
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          if (!practiceMode) setupEyeTracking();
        }
      } catch (error) {
        console.error("Error accessing webcam:", error);
        setCameraError(true);
      }
    };
    startWebcam();

    return () => {
      if (cameraInstance.current) cameraInstance.current.stop();
      if (faceMeshInstance.current) faceMeshInstance.current.close();
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const setupEyeTracking = () => {
    faceMeshInstance.current = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMeshInstance.current.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMeshInstance.current.onResults(onResults);

    if (videoRef.current) {
      cameraInstance.current = new Camera(videoRef.current, {
        onFrame: async () => {
          if (faceMeshInstance.current) {
            await faceMeshInstance.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
      });
      cameraInstance.current.start();
    }
  };

  const distance = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

  const onResults = (results) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const landmarks = results.multiFaceLandmarks[0];

      const leftIris = landmarks[468];
      const rightIris = landmarks[473];
      const leftOuter = landmarks[33];
      const leftInner = landmarks[133];
      const rightInner = landmarks[263];
      const rightOuter = landmarks[362];

      const leftRatio = (leftIris.x - leftOuter.x) / (leftInner.x - leftOuter.x);
      const rightRatio = (rightInner.x - rightIris.x) / (rightInner.x - rightOuter.x);
      const irisCentered = leftRatio > 0.4 && leftRatio < 0.6 && rightRatio > 0.4 && rightRatio < 0.6;

      const leftVertical = distance(landmarks[159], landmarks[145]);
      const leftHorizontal = distance(landmarks[33], landmarks[133]);
      const earLeft = leftVertical / leftHorizontal;
      const rightVertical = distance(landmarks[386], landmarks[374]);
      const rightHorizontal = distance(landmarks[362], landmarks[263]);
      const earRight = rightVertical / rightHorizontal;
      const eyesOpen = earLeft > 0.25 && earRight > 0.25;

      const lookingStraight = irisCentered && eyesOpen;

      if (!lookingStraight) {
        errorFrameCountRef.current++;
        goodFrameCountRef.current = 0;
      } else {
        goodFrameCountRef.current++;
        errorFrameCountRef.current = 0;
      }

      if (errorFrameCountRef.current >= ERROR_THRESHOLD) {
        if (!lookAwayDetected) {
          setLookAwayDetected(true);
          setLookAwayCount(prev => prev + 1);
        }
      } else if (goodFrameCountRef.current >= GOOD_THRESHOLD) {
        if (lookAwayDetected) {
          setLookAwayDetected(false);
        }
      }
    } else {
      errorFrameCountRef.current++;
      goodFrameCountRef.current = 0;
      if (errorFrameCountRef.current >= ERROR_THRESHOLD && !lookAwayDetected) {
        setLookAwayDetected(true);
        setLookAwayCount(prev => prev + 1);
      }
    }
  };

  // Tab visibility — uses ref for completeInterview (disabled in practice mode)
  useEffect(() => {
    if (practiceMode) return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          if (newCount >= MAX_TAB_SWITCHES) {
            setTerminated(true);
            terminatedRef.current = true;
            setTimeout(() => completeInterviewRef.current(), 500);
          }
          return newCount;
        });
        setTabSwitchDetected(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const handleMessageCountUpdate = (count) => {
    setMessageCount(count);
    if (count >= MIN_MESSAGES_FOR_COMPLETION && !interviewComplete) {
      setInterviewComplete(true);
    }
  };

  const handleEndEarly = () => {
    if (!interviewComplete) {
      const confirmed = window.confirm(
        "You haven't answered enough questions for a full evaluation. Your scores may be lower. End the interview anyway?"
      );
      if (!confirmed) return;
    }
    completeInterview();
  };

  const dismissTabSwitchWarning = () => {
    setTabSwitchDetected(false);
  };

  const dismissLookAwayWarning = () => {
    setLookAwayDetected(false);
    errorFrameCountRef.current = 0;
    goodFrameCountRef.current = 0;
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-screen bg-surface-base overflow-hidden">
      {/* Evaluating Overlay */}
      {isEvaluating && (
        <div className="absolute inset-0 bg-black/90 z-[60] flex items-center justify-center animate-fade-in">
          <div className="text-center glass-card p-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="w-3 h-3 bg-accent rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
              <span className="w-3 h-3 bg-accent rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
              <span className="w-3 h-3 bg-accent rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
            </div>
            <p className="text-text-primary text-xl font-semibold">Evaluating your performance...</p>
            <p className="text-text-muted text-sm mt-2">This may take a few seconds</p>
          </div>
        </div>
      )}

      {/* Tab Switch Warning */}
      {tabSwitchDetected && !terminated && !isEvaluating && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="glass-card p-6 max-w-md animate-scale-in">
            <div className="flex items-center mb-4 text-red-500">
              <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-xl font-bold">Tab Switch Detected</h3>
            </div>
            <p className="text-text-primary mb-2">
              You switched away from the interview tab. Please stay on this page.
            </p>
            <p className="text-red-400 text-sm mb-4">
              Warning {tabSwitchCount} of {MAX_TAB_SWITCHES}. After {MAX_TAB_SWITCHES} switches the interview is terminated.
            </p>
            <button
              onClick={dismissTabSwitchWarning}
              className="w-full btn-gradient py-2 rounded-xl"
            >
              Return to Interview
            </button>
          </div>
        </div>
      )}

      {/* Terminated Warning */}
      {terminated && !isEvaluating && (
        <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="glass-card p-8 max-w-md text-center animate-scale-in">
            <div className="text-red-500 text-6xl mb-4">!</div>
            <h3 className="text-2xl font-bold text-red-500 mb-4">Interview Terminated</h3>
            <p className="text-text-primary mb-4">
              Your interview has been ended due to repeated tab switching ({MAX_TAB_SWITCHES} violations). Your responses are being evaluated.
            </p>
          </div>
        </div>
      )}

      {/* Look Away Warning */}
      {lookAwayDetected && !terminated && !isEvaluating && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="glass-card p-6 max-w-md animate-scale-in">
            <div className="flex items-center mb-4 text-red-500">
              <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-xl font-bold">Look at the camera properly!</h3>
            </div>
            <p className="text-text-primary mb-2">
              Please face the camera directly. Looking away for extended periods is not allowed.
            </p>
            <p className="text-yellow-400 text-sm mb-4">
              Look-away violations: {lookAwayCount}. Each violation reduces your final score.
            </p>
            <button
              onClick={dismissLookAwayWarning}
              className="w-full btn-gradient py-2 rounded-xl"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col lg:flex-row flex-grow overflow-hidden">
        {/* Left Section - Webcam */}
        <div className="h-1/3 lg:h-auto lg:w-1/2 bg-black flex items-center justify-center relative">
          {cameraError ? (
            <p className="text-text-secondary text-lg text-center px-4">
              Error accessing camera. Please check your webcam settings.
            </p>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full object-cover transform scale-x-[-1] pointer-events-none"
              />
            </>
          )}
          {/* Status indicator */}
          <div className="absolute top-2 left-2 lg:top-4 lg:left-4 bg-surface-1/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-border-subtle">
            <p className="text-text-primary flex items-center text-xs lg:text-sm">
              <span className={`inline-block w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full mr-1.5 ${messageCount > 0 ? "bg-green-500 animate-pulse" : "bg-surface-3"}`} />
              {messageCount > 0 ? "Active" : "Ready"}
            </p>
          </div>

          {/* Timer */}
          <div className={`absolute top-2 right-2 lg:top-4 lg:right-4 bg-surface-1/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-border-subtle ${
            timeRemaining < 120 ? 'shadow-[0_0_12px_rgb(239_68_68/0.3)]' : ''
          }`}>
            <p className={`font-mono text-xs lg:text-sm font-bold ${timeRemaining < 120 ? 'text-red-400' : timeRemaining < 300 ? 'text-yellow-400' : 'text-text-primary'}`}>
              {formatTime(timeRemaining)}
            </p>
          </div>

          {/* Violation indicators */}
          {(tabSwitchCount > 0 || lookAwayCount > 0) && (
            <div className="absolute bottom-2 left-2 lg:bottom-4 lg:left-4 bg-red-500/10 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-red-500/20 text-xs space-y-0.5">
              {tabSwitchCount > 0 && (
                <p className="text-red-400">Tabs: {tabSwitchCount}/{MAX_TAB_SWITCHES}</p>
              )}
              {lookAwayCount > 0 && (
                <p className="text-yellow-400">Look-away: {lookAwayCount}</p>
              )}
            </div>
          )}
        </div>

        {/* Right Section - Chat Interface */}
        <div className="h-2/3 lg:h-auto lg:w-1/2 overflow-hidden">
          <ChatInterface
            ref={chatInterfaceRef}
            domain={domain}
            resumeText={resumetext}
            difficulty={difficulty}
            onMessageCountUpdate={handleMessageCountUpdate}
          />
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="p-3 lg:p-4 bg-surface-1/80 backdrop-blur-md border-t border-border-subtle flex justify-center">
        <button
          onClick={handleEndEarly}
          disabled={isEvaluating}
          className={`px-6 py-2.5 lg:py-3 rounded-xl font-bold text-white transition-all duration-300 disabled:opacity-50 ${
            interviewComplete
              ? "btn-gradient"
              : "bg-yellow-600 hover:bg-yellow-700"
          }`}
        >
          {isEvaluating
            ? "Evaluating..."
            : interviewComplete
              ? "Complete Interview"
              : "End Interview Early"
          }
        </button>
      </div>
    </div>
  );
}
