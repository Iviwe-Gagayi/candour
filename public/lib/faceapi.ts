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
    expressions: faceapi.FaceExpressions
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

    const detection = await faceapi
        .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

    if (!detection) return null;

    return getDominantExpression(detection.expressions);
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