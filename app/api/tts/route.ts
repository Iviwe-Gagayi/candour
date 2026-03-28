import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const client = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
});

//Voices to try:
// Rachel (calm, professional): 21m00Tcm4TlvDq8ikWAM
// Adam (authoritative, male): pNInz6obpgDQGcFmaJgB
// Bella (warm, friendly): EXAVITQu4vr4xnSDxMaL

const VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

export async function POST(req: NextRequest) {
    try {
        const { text, voiceId } = await req.json();

        if (!text) {
            return NextResponse.json({ error: "Missing text" }, { status: 400 });
        }

        const audio = await client.textToSpeech.convert(voiceId || VOICE_ID, {
            text,
            modelId: "eleven_turbo_v2",
            outputFormat: "mp3_44100_128",
        });

        // Convert ReadableStream to buffer
        const reader = audio.getReader();
        const chunks: Uint8Array[] = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
        }

        const buffer = Buffer.concat(chunks);

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Length": buffer.length.toString(),
            },
        });
    } catch (error) {
        console.error("ElevenLabs API error:", error);
        return NextResponse.json(
            { error: "Failed to generate speech" },
            { status: 500 }
        );
    }
}