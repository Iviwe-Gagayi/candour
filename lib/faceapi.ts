// 1. Use a standard top-level import
import * as faceapi from "face-api.js";

export interface ExpressionLog {
    timestamp: number;
    expression: string;
    confidence: number;
}

let modelsLoaded = false;

export async function loadModels(): Promise<void> {
    if (modelsLoaded) return;

    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceExpressionNet.loadFromUri("/models"),
    ]);
    modelsLoaded = true;
}

export function getDominantExpression(
    expressions: Record<string, number>
): { expression: string; confidence: number } {
    const entries = Object.entries(expressions) as [string, number][];
    const [expression, confidence] = entries.reduce((a, b) =>
        a[1] > b[1] ? a : b
    );
    return { expression, confidence };
}

export async function detectExpression(
    videoElement: HTMLVideoElement
): Promise<{ expression: string; confidence: number } | null> {
    if (!modelsLoaded) return null;


    if (videoElement.readyState !== 4) return null;

    try {

        const options = new faceapi.TinyFaceDetectorOptions({
            scoreThreshold: 0.3,
            inputSize: 416
        });

        const detection = await faceapi
            .detectSingleFace(videoElement, options)
            .withFaceExpressions();

        if (!detection) return null;

        return getDominantExpression(detection.expressions as unknown as Record<string, number>);
    } catch (error) {
        console.error("Detection threw an error:", error);
        return null;
    }
}

export function expressionToEmoji(expression: string): string {
    const map: Record<string, string> = {
        happy: "😊",
        sad: "😔",
        angry: "😠",
        fearful: "😰",
        disgusted: "😣",
        surprised: "😲",
        neutral: "😐",
    };
    return map[expression] ?? "😐";
}

export function expressionToLabel(expression: string): string {
    const map: Record<string, string> = {
        happy: "Confident",
        sad: "Deflated",
        angry: "Tense",
        fearful: "Nervous",
        disgusted: "Uncomfortable",
        surprised: "Caught off guard",
        neutral: "Composed",
    };
    return map[expression] ?? "Composed";
}