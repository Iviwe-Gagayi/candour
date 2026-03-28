export async function speakWithElevenLabs(
    text: string,
    voiceId?: string
): Promise<void> {
    const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId }),
    });

    if (!response.ok) throw new Error("TTS request failed");

    const arrayBuffer = await response.arrayBuffer();
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
}

export function speakWithWebSpeech(text: string): void {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}

export async function speak(text: string, voiceId?: string): Promise<void> {
    const useElevenLabs = process.env.NEXT_PUBLIC_USE_ELEVENLABS === "true";

    if (useElevenLabs) {
        await speakWithElevenLabs(text, voiceId);
    } else {
        speakWithWebSpeech(text);
    }
}