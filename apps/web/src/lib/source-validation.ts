import sharp from "sharp";
import { PDFDocument } from "pdf-lib";

export async function inspectSource(bytes: Uint8Array, mime: string): Promise<{ pages: number }> {
  if (!bytes.length || bytes.length > 25 * 1024 * 1024) throw new Error("Datei leer oder größer als 25 MB.");
  const head = Buffer.from(bytes.subarray(0, 16));
  if (mime === "application/pdf") {
    if (!head.toString("ascii").startsWith("%PDF-")) throw new Error("Keine gültige PDF-Dateisignatur.");
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    const pages = pdf.getPageCount();
    if (pages < 1 || pages > 10) throw new Error("Ein Import unterstützt 1 bis 10 PDF-Seiten eines Rezepts.");
    return { pages };
  }
  const formats: Record<string, string> = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };
  if (!formats[mime]) throw new Error("KI-Abschrift unterstützt JPEG, PNG, WebP oder PDF. HEIC bitte als JPEG exportieren.");
  const metadata = await sharp(bytes, { limitInputPixels: 20_000_000, animated: false }).metadata();
  if (metadata.format !== formats[mime] || !metadata.width || !metadata.height || (metadata.pages ?? 1) > 1 || metadata.width * metadata.height > 20_000_000) throw new Error("Bildformat, Bildfläche oder Seitenzahl wird nicht unterstützt.");
  return { pages: 1 };
}
export async function analysisImage(bytes: Uint8Array): Promise<Buffer> {
  // Separate work copy: orientation applied; EXIF/GPS stripped; original bytes stay in SQLite.
  return sharp(bytes, { limitInputPixels: 20_000_000, animated: false }).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).png().toBuffer();
}
