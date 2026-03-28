export type SupportedFileType = "pdf" | "docx" | "xlsx" | "txt";

export function getFileType(file: File): SupportedFileType | null {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const typeMap: Record<string, SupportedFileType> = {
        pdf: "pdf",
        docx: "docx",
        doc: "docx",
        xlsx: "xlsx",
        xls: "xlsx",
        txt: "txt",
        csv: "txt",
    };
    return typeMap[ext ?? ""] ?? null;
}

export async function extractTextFromFile(file: File): Promise<string> {
    const type = getFileType(file);
    if (!type) throw new Error("Unsupported file type");

    switch (type) {
        case "txt":
            return extractFromTxt(file);
        case "pdf":
            return extractFromPdf(file);
        case "docx":
            return extractFromDocx(file);
        case "xlsx":
            return extractFromXlsx(file);
    }
}

async function extractFromTxt(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

async function extractFromPdf(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjsLib = await import("pdfjs-dist");

    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const textParts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
            .map((item: any) => item.str)
            .join(" ");
        textParts.push(pageText);
    }

    return textParts.join("\n\n");
}

async function extractFromDocx(file: File): Promise<string> {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
}

async function extractFromXlsx(file: File): Promise<string> {
    const XLSX = await import("xlsx");
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    const textParts: string[] = [];

    workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        if (csv.trim()) {
            textParts.push(`Sheet: ${sheetName}\n${csv}`);
        }
    });

    return textParts.join("\n\n");
}

export function truncateContext(text: string, maxChars = 8000): string {
    if (text.length <= maxChars) return text;
    return text.slice(0, maxChars) + "\n\n[Document truncated for length...]";
}