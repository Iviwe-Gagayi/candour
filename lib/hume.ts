export interface HumeEmotion {
    name: string;
    score: number;
}

export interface ExpressionLog {
    timestamp: number;
    type: "face" | "voice";
    topEmotions: HumeEmotion[];
    actionableLabel: string;
}

let offscreenCanvas: HTMLCanvasElement | null = null;
let offscreenCtx: CanvasRenderingContext2D | null = null;

export function connectHume(
    onMessage: (log: ExpressionLog) => void,
    onError: (err: any) => void
): WebSocket {
    const apiKey = process.env.NEXT_PUBLIC_HUME_API_KEY;
    if (!apiKey) throw new Error("Missing NEXT_PUBLIC_HUME_API_KEY");

    const socket = new WebSocket(`wss://api.hume.ai/v0/stream/models?apiKey=${apiKey}`);

    socket.onmessage = (event) => {
        try {
            const response = JSON.parse(event.data);

            // 🕵️ X-RAY: See exactly what Hume is returning!
            console.log("🧠 Hume API Response:", response);

            if (response.error || response.type === "error") {
                console.error("🚨 Hume API Error:", response);
                return;
            }

            if (response.warning || response.type === "warning") {
                console.warn("⚠️ Hume Warning (e.g., no face detected):", response.warning || response.message);
                return;
            }

            const models = response.models || response;

            const applyCalibration = (emotions: HumeEmotion[]) => {
                if (!emotions || !Array.isArray(emotions)) return [];
                return emotions.map(e => ({
                    ...e,
                    score: ["Boredom", "Tiredness", "Sadness"].includes(e.name) ? e.score * 0.5 : e.score
                })).sort((a, b) => b.score - a.score).slice(0, 3);
            };

            // Handle Face Data
            const facePredictions = models.face?.predictions;
            if (facePredictions && facePredictions.length > 0) {
                // Bulletproof chaining just in case Hume's structure varies
                const rawEmotions = facePredictions[0]?.emotions || [];
                if (rawEmotions.length > 0) {
                    const calibratedFace = applyCalibration(rawEmotions);
                    onMessage({
                        timestamp: Date.now(),
                        type: "face",
                        topEmotions: calibratedFace,
                        actionableLabel: generateFaceLabel(calibratedFace)
                    });
                }
            }

            // Handle Voice (Prosody) Data
            const prosodyPredictions = models.prosody?.predictions;
            if (prosodyPredictions && prosodyPredictions.length > 0) {
                const rawVoiceEmotions = prosodyPredictions[0]?.emotions || [];
                if (rawVoiceEmotions.length > 0) {
                    const calibratedVoice = applyCalibration(rawVoiceEmotions);
                    onMessage({
                        timestamp: Date.now(),
                        type: "voice",
                        topEmotions: calibratedVoice,
                        actionableLabel: generateVoiceLabel(calibratedVoice)
                    });
                }
            }
        } catch (err) {
            console.error("❌ Error parsing Hume message:", err);
        }
    };

    socket.onerror = (error) => {
        console.error("❌ Hume WebSocket Error:", error);
        onError(error);
    };

    return socket;
}

export function sendFrameToHume(videoElement: HTMLVideoElement, socket: WebSocket) {
    if (socket.readyState !== WebSocket.OPEN) return;

    // Sometimes readyState is finicky. Let's just make sure the video has width.
    if (!videoElement.videoWidth || !videoElement.videoHeight) {
        console.warn("⏳ Video element not ready yet...");
        return;
    }

    if (!offscreenCanvas) {
        offscreenCanvas = document.createElement("canvas");
        offscreenCtx = offscreenCanvas.getContext("2d");
    }

    offscreenCanvas.width = 320;
    offscreenCanvas.height = 240;

    if (offscreenCtx) {
        offscreenCtx.drawImage(videoElement, 0, 0, 320, 240);
        const base64Data = offscreenCanvas.toDataURL("image/jpeg", 0.7).split(",")[1];

        if (base64Data.length > 100) {
            console.log("📸 Sending Face Frame to Hume...");
            socket.send(JSON.stringify({
                data: base64Data,
                models: { face: {} }
            }));
        }
    }
}

export function startAudioCapture(stream: MediaStream, socket: WebSocket) {
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
        console.warn("🔇 No audio tracks found in stream!");
        return { stop: () => { } };
    }

    // 🔥 THE FIX: Isolate the microphone into an AUDIO-ONLY stream
    const audioStream = new MediaStream([audioTracks[0]]);

    let mimeType = 'audio/webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
    }

    let interval: NodeJS.Timeout;

    const recordChunk = () => {
        if (socket.readyState !== WebSocket.OPEN) return;

        // Use the new audioStream here instead of the mixed video stream
        const recorder = new MediaRecorder(audioStream, { mimeType });

        recorder.ondataavailable = async (e) => {
            if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) {
                const reader = new FileReader();
                reader.readAsDataURL(e.data);
                reader.onloadend = () => {
                    const base64Audio = (reader.result as string).split(",")[1];
                    console.log("🎤 Sending Audio Chunk to Hume...");
                    socket.send(JSON.stringify({
                        data: base64Audio,
                        models: { prosody: {} }
                    }));
                };
            }
        };

        recorder.start();

        setTimeout(() => {
            if (recorder.state === "recording") recorder.stop();
        }, 2500);
    };

    recordChunk();
    interval = setInterval(recordChunk, 3000);

    return {
        stop: () => {
            clearInterval(interval);
        }
    };
}

function generateFaceLabel(emotions: HumeEmotion[]): string {
    if (!emotions || emotions.length === 0) return "Analyzing face...";
    const primary = emotions[0].name;
    const insights: Record<string, string> = {
        Concentration: "You look highly focused.",
        Confusion: "You appear unsure—do you need them to repeat?",
        Doubt: "Your expression shows skepticism.",
        Amusement: "You are giving off a warm, friendly vibe.",
        Awkwardness: "You seem slightly uncomfortable.",
        Anxiety: "You appear tense. Try dropping your shoulders.",
        Interest: "You look engaged and actively listening.",
        Contemplation: "You look like you are thinking deeply.",
        Boredom: "You appear disengaged. Try making more eye contact.",
    };
    const label = primary.endsWith("ment") || primary.endsWith("ness")
        ? `You're conveying ${primary.toLowerCase()}.`
        : `You look ${primary.toLowerCase()}.`;
    return insights[primary] ?? label;
}

function generateVoiceLabel(emotions: HumeEmotion[]): string {
    if (!emotions || emotions.length === 0) return "Analyzing voice...";
    const primary = emotions[0].name;
    const insights: Record<string, string> = {
        Confidence: "You sound highly confident.",
        Hesitation: "Your voice sounds uncertain. Take your time.",
        Anxiety: "Your voice sounds shaky. Deep breath.",
        Enthusiasm: "You sound genuinely excited!",
        Frustration: "You sound slightly tense or frustrated.",
        Boredom: "Your tone is very flat. Try adding some vocal variety.",
        Calmness: "You sound steady and composed."
    };
    const label = primary.endsWith("ment") || primary.endsWith("ness")
        ? `You're conveying ${primary.toLowerCase()}.`
        : `You sound ${primary.toLowerCase()}.`;
    return insights[primary] ?? label;
}