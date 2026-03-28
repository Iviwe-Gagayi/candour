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
        const response = JSON.parse(event.data);

        const models = response.models || response;

        // reducing the weight of Boredom/Tiredness by 40%
        const applyCalibration = (emotions: HumeEmotion[]) => {
            return emotions.map(e => ({
                ...e,
                score: ["Boredom", "Tiredness", "Sadness"].includes(e.name) ? e.score * 0.5 : e.score
            })).sort((a, b) => b.score - a.score).slice(0, 3);
        };

        // Handle Face Data
        const facePredictions = models.face?.predictions;
        if (facePredictions && facePredictions.length > 0) {
            const topFace = facePredictions[0].emotions
                .sort((a: HumeEmotion, b: HumeEmotion) => b.score - a.score)
                .slice(0, 3);

            onMessage({
                timestamp: Date.now(),
                type: "face",
                topEmotions: topFace,
                actionableLabel: generateFaceLabel(topFace)
            });
        }

        // Handle Voice (Prosody) Data
        const prosodyPredictions = models.prosody?.predictions;
        if (prosodyPredictions && prosodyPredictions.length > 0) {
            const topVoice = prosodyPredictions[0].emotions
                .sort((a: HumeEmotion, b: HumeEmotion) => b.score - a.score)
                .slice(0, 3);

            onMessage({
                timestamp: Date.now(),
                type: "voice",
                topEmotions: topVoice,
                actionableLabel: generateVoiceLabel(topVoice)
            });
        }
    };

    socket.onerror = (error) => {
        console.error("Hume WebSocket Error:", error);
        onError(error);
    };

    return socket;
}

export function sendFrameToHume(videoElement: HTMLVideoElement, socket: WebSocket) {
    if (socket.readyState !== WebSocket.OPEN) return;

    if (!offscreenCanvas) {
        offscreenCanvas = document.createElement("canvas");
        offscreenCtx = offscreenCanvas.getContext("2d");
    }

    offscreenCanvas.width = 320;
    offscreenCanvas.height = 240;

    if (offscreenCtx) {
        offscreenCtx.drawImage(videoElement, 0, 0, 320, 240);
        const base64Data = offscreenCanvas.toDataURL("image/jpeg", 0.7).split(",")[1];

        socket.send(JSON.stringify({
            data: base64Data,
            models: { face: {} }
        }));
    }
}

// Capturing audio chunks and send to Hume's Prosody model
export function startAudioCapture(stream: MediaStream, socket: WebSocket) {
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return { stop: () => { } };

    const audioStream = new MediaStream(audioTracks);

    let mimeType = 'audio/webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
    }

    const recordAndSend = () => {
        if (socket.readyState !== WebSocket.OPEN) return;

        const recorder = new MediaRecorder(audioStream, { mimeType });

        recorder.ondataavailable = async (e) => {
            if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) {
                const reader = new FileReader();
                reader.readAsDataURL(e.data);
                reader.onloadend = () => {
                    const base64Audio = (reader.result as string).split(",")[1];
                    socket.send(JSON.stringify({
                        data: base64Audio,
                        models: { prosody: {} }
                    }));
                };
            }
        };

        recorder.start();

        // Stop recording after 2 seconds to finalize the file and give it a valid header
        setTimeout(() => {
            if (recorder.state === "recording") recorder.stop();
        }, 2000);
    };

    // Fire immediately, then repeat every 3 seconds
    recordAndSend();
    const interval = setInterval(recordAndSend, 3000);

    // Return a simple stop function to clean up the interval later
    return { stop: () => clearInterval(interval) };
}

function generateFaceLabel(emotions: HumeEmotion[]): string {
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

//Mapping vocal tones to actionable feedback
function generateVoiceLabel(emotions: HumeEmotion[]): string {
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