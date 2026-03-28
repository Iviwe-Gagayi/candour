import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
    try {
        const { messages, systemPrompt } = await req.json();

        if (!messages || !systemPrompt) {
            return NextResponse.json(
                { error: "Missing messages or systemPrompt" },
                { status: 400 }
            );
        }

        const response = await client.messages.create({
            model: "claude-sonnet-4-5",
            max_tokens: 1024,
            system: systemPrompt,
            messages,
        });

        const content = response.content[0];
        if (content.type !== "text") {
            return NextResponse.json(
                { error: "Unexpected response type" },
                { status: 500 }
            );
        }

        return NextResponse.json({ message: content.text });
    } catch (error) {
        console.error("Claude API error:", error);
        return NextResponse.json(
            { error: "Failed to get response from Claude" },
            { status: 500 }
        );
    }
}