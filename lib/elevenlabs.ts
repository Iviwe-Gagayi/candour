// Create a shared AudioContext outside the function so it persists
let sharedAudioContext: AudioContext | null = null;

export async function speakWithElevenLabs(
    text: string,
    voiceId?: string
): Promise<void> {
    // Fallback for "Auto" voice so the API doesn't crash
    const actualVoiceId = (voiceId && voiceId !== "auto") ? voiceId : "EXAVITQu4vr4xnSDxMaL"; // Default: Sarah

    const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId: actualVoiceId }),
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("TTS API Error:", errText);
        throw new Error("TTS request failed");
    }

    const arrayBuffer = await response.arrayBuffer();


    if (!sharedAudioContext) {
        sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }


    if (sharedAudioContext.state === "suspended") {
        await sharedAudioContext.resume();
    }

    const audioBuffer = await sharedAudioContext.decodeAudioData(arrayBuffer);
    const source = sharedAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(sharedAudioContext.destination);
    source.start();
}

export function speakWithWebSpeech(text: string, rate: number = 1): void {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}

export function stripActions(text: string): string {
    return text
        .replace(/\*[^*]+\*/g, "") // removes *action text*
        .replace(/\[[^\]]+\]/g, "") // removes [action text]
        .replace(/\([^)]+\)/g, "") // removes (action text)
        .replace(/\s+/g, " ") // clean up extra spaces
        .trim();
}

export async function speak(text: string, voiceId?: string, rate: number = 1): Promise<void> {
    const useElevenLabs = process.env.NEXT_PUBLIC_USE_ELEVENLABS === "true";
    if (useElevenLabs) {
        await speakWithElevenLabs(text, voiceId);
    } else {
        speakWithWebSpeech(text, rate);
    }
}