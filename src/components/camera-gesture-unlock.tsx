"use client";

import { Camera, Check, Hand, LoaderCircle, ShieldCheck, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  advanceCameraGesture,
  INITIAL_CAMERA_GESTURE_STATE,
  type CameraGesture,
  type CameraGestureFrame,
  type CameraGestureState,
} from "@/game/camera-gestures";
import type { MessageKey } from "@/i18n/config";
import { useLocale } from "@/i18n/locale-provider";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";

const GESTURE_INSTRUCTIONS: Record<CameraGesture, MessageKey> = {
  "air-loop": "cameraGestureAirLoop",
  "air-zigzag": "cameraGestureAirZigzag",
  "open-palm": "cameraGestureOpenPalm",
  "fist-open": "cameraGestureFistOpen",
  victory: "cameraGestureVictory",
  "pinch-drag": "cameraGesturePinchDrag",
};

interface CameraRecognition {
  label?: string;
  score?: number;
  landmarks?: readonly { x: number; y: number }[];
}

export interface CameraGestureRuntime {
  recognize(video: HTMLVideoElement, timestamp: number): CameraRecognition;
  close(): void;
}

export type CameraGestureRuntimeFactory = () => Promise<CameraGestureRuntime>;

async function createCameraGestureRuntime(): Promise<CameraGestureRuntime> {
  const { FilesetResolver, GestureRecognizer } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
  const recognizer = await GestureRecognizer.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
    runningMode: "VIDEO",
    numHands: 1,
    minHandDetectionConfidence: 0.55,
    minHandPresenceConfidence: 0.55,
    minTrackingConfidence: 0.5,
  });
  return {
    recognize(video, timestamp) {
      const result = recognizer.recognizeForVideo(video, timestamp);
      const category = result.gestures[0]?.[0];
      return {
        label: category?.categoryName,
        score: category?.score,
        landmarks: result.landmarks[0],
      };
    },
    close: () => recognizer.close(),
  };
}

interface CameraGestureUnlockProps {
  gesture: CameraGesture;
  onComplete: () => void;
  onFallback: () => void;
  runtimeFactory?: CameraGestureRuntimeFactory;
}

type CameraStatus = "idle" | "loading" | "active" | "success" | "error";

function cameraErrorKey(error: unknown): MessageKey {
  if (error instanceof DOMException && error.name === "NotAllowedError") return "cameraPermissionDenied";
  if (error instanceof DOMException && error.name === "NotFoundError") return "cameraNotFound";
  return "cameraUnavailable";
}

export function CameraGestureUnlock({
  gesture,
  onComplete,
  onFallback,
  runtimeFactory = createCameraGestureRuntime,
}: CameraGestureUnlockProps) {
  const { t } = useLocale();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const runtimeRef = useRef<CameraGestureRuntime | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastInferenceRef = useRef(0);
  const gestureStateRef = useRef<CameraGestureState>(INITIAL_CAMERA_GESTURE_STATE);
  const mountedRef = useRef(true);
  const completedRef = useRef(false);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [hasHand, setHasHand] = useState(false);
  const [errorKey, setErrorKey] = useState<MessageKey>("cameraUnavailable");

  const stopResources = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    runtimeRef.current?.close();
    runtimeRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const drawFrame = useCallback((recognition: CameraRecognition, state: CameraGestureState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.clientWidth || 320;
    const height = canvas.clientHeight || 240;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, width, height);
    const landmarks = recognition.landmarks;
    if (landmarks?.length) {
      context.fillStyle = "rgba(255, 226, 130, 0.92)";
      for (const landmark of landmarks) {
        context.beginPath();
        context.arc((1 - landmark.x) * width, landmark.y * height, 3, 0, Math.PI * 2);
        context.fill();
      }
    }
    if (state.points.length > 1) {
      context.strokeStyle = "rgba(255, 115, 93, 0.92)";
      context.lineWidth = 5;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.beginPath();
      state.points.forEach((point, index) => {
        const x = (1 - point.x) * width;
        const y = point.y * height;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.stroke();
    }
  }, []);

  const startCamera = async () => {
    setStatus("loading");
    setProgress(0);
    setHasHand(false);
    gestureStateRef.current = INITIAL_CAMERA_GESTURE_STATE;
    completedRef.current = false;
    try {
      const localHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
      if (!window.isSecureContext && !localHost) throw new Error("insecure-context");
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("camera-api-unavailable");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("missing-video");
      video.srcObject = stream;
      await video.play();
      runtimeRef.current = await runtimeFactory();
      if (!mountedRef.current) {
        stopResources();
        return;
      }
      setStatus("active");
    } catch (error) {
      stopResources();
      if (!mountedRef.current) return;
      setErrorKey(cameraErrorKey(error));
      setStatus("error");
    }
  };

  useEffect(() => {
    if (status !== "active") return;
    let cancelled = false;
    function recognizeFrame() {
      const video = videoRef.current;
      const runtime = runtimeRef.current;
      if (cancelled || !video || !runtime || !mountedRef.current || completedRef.current) return;
      const now = performance.now();
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && now - lastInferenceRef.current >= 90) {
        lastInferenceRef.current = now;
        let recognition: CameraRecognition;
        try {
          recognition = runtime.recognize(video, now);
        } catch (error) {
          setErrorKey(cameraErrorKey(error));
          setStatus("error");
          stopResources();
          return;
        }
        const frame: CameraGestureFrame = { at: now, ...recognition };
        const next = advanceCameraGesture(gesture, gestureStateRef.current, frame);
        gestureStateRef.current = next;
        setHasHand(Boolean(recognition.landmarks?.length));
        setProgress(next.progress);
        drawFrame(recognition, next);
        if (next.complete) {
          completedRef.current = true;
          setStatus("success");
          stopResources();
          window.setTimeout(() => {
            if (mountedRef.current) onComplete();
          }, 550);
          return;
        }
      }
      frameRef.current = requestAnimationFrame(recognizeFrame);
    }
    frameRef.current = requestAnimationFrame(recognizeFrame);
    return () => {
      cancelled = true;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [drawFrame, gesture, onComplete, status, stopResources]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopResources();
    };
  }, [stopResources]);

  const instruction = t(GESTURE_INSTRUCTIONS[gesture]);

  return (
    <div className="camera-unlock">
      <div className={`camera-surface is-${status}`}>
        <video ref={videoRef} muted playsInline aria-hidden="true" />
        <canvas ref={canvasRef} aria-hidden="true" />
        {status === "idle" ? (
          <div className="camera-empty-state">
            <span aria-hidden="true"><Camera size={27} /></span>
            <strong>{t("cameraTitle")}</strong>
            <p>{instruction}</p>
          </div>
        ) : null}
        {status === "loading" ? (
          <div className="camera-status-panel" role="status">
            <LoaderCircle className="camera-spinner" aria-hidden="true" size={28} />
            <strong>{t("cameraLoading")}</strong>
          </div>
        ) : null}
        {status === "active" ? (
          <div className="camera-live-hint" role="status">
            <Hand aria-hidden="true" size={16} />
            <span>{hasHand ? instruction : t("cameraFindHand")}</span>
          </div>
        ) : null}
        {status === "success" ? (
          <div className="camera-status-panel is-success" role="status">
            <Check aria-hidden="true" size={30} />
            <strong>{t("cameraSuccess")}</strong>
          </div>
        ) : null}
        {status === "error" ? (
          <div className="camera-status-panel is-error" role="alert">
            <TriangleAlert aria-hidden="true" size={25} />
            <strong>{t(errorKey)}</strong>
          </div>
        ) : null}
        <div
          className="camera-progress"
          role="progressbar"
          aria-label={t("cameraProgress", { progress: Math.round(progress * 100) })}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <i style={{ width: `${Math.max(4, progress * 100)}%` }} />
        </div>
      </div>

      <div className="camera-actions">
        {status === "idle" || status === "error" ? (
          <button type="button" className="camera-enable" onClick={startCamera}>
            <Camera aria-hidden="true" size={16} /> {status === "error" ? t("cameraTryAgain") : t("cameraEnable")}
          </button>
        ) : null}
        {status !== "success" ? (
          <button type="button" className="camera-fallback" onClick={onFallback}>{t("cameraUseTouch")}</button>
        ) : null}
      </div>
      <small className="camera-privacy"><ShieldCheck aria-hidden="true" size={14} /> {t("cameraPrivacy")}</small>
    </div>
  );
}
