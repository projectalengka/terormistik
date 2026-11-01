import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  PageBreak,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { z } from "zod";
import { jsonError, requireOwner } from "@/lib/server/guard";

export const runtime = "nodejs";

const schema = z.object({
  title: z.string().min(1).max(300),
  author: z.string().max(200).optional(),
  genre: z.string().max(80).optional(),
  source: z.string().max(80).optional(),
  synopsis: z.string().max(4000).optional(),
  chapters: z
    .array(
      z.object({
        title: z.string().max(300),
        body: z.string().max(400_000),
      })
    )
    .min(1)
    .max(200),
});

const SERIF = "Georgia";
const BODY = "Georgia";

export async function POST(req: Request) {
  const guard = await requireOwner();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Data ekspor tidak valid.", 400);

  const { title, author, genre, source, synopsis, chapters } = parsed.data;

  const children: Paragraph[] = [
    new Paragraph({ spacing: { before: 2600 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: title.toUpperCase(),
          font: SERIF,
          size: 64,
          characterSpacing: 80,
          color: "1A1A1A",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: "A83232", space: 8 } },
      children: [new TextRun({ text: " ", size: 4 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 320 },
      children: [
        new TextRun({
          text: author || "Tanpa Nama",
          font: SERIF,
          size: 26,
          italics: true,
          color: "444444",
        }),
      ],
    }),
  ];

  const meta = [genre, source].filter(Boolean).join(" · ");
  if (meta) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 160 },
        children: [
          new TextRun({
            text: meta.toUpperCase(),
            font: "Calibri",
            size: 16,
            characterSpacing: 60,
            color: "888888",
          }),
        ],
      })
    );
  }

  children.push(new Paragraph({ children: [new PageBreak()] }));

  if (synopsis && synopsis.trim()) {
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: "SINOPSIS",
            font: "Calibri",
            size: 18,
            characterSpacing: 60,
            color: "A83232",
            bold: true,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 360, line: 360 },
        alignment: AlignmentType.JUSTIFIED,
        children: [new TextRun({ text: synopsis.trim(), font: BODY, size: 22, italics: true })],
      }),
      new Paragraph({ children: [new PageBreak()] })
    );
  }

  chapters.forEach((chapter, index) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: index === 0 ? 0 : 480, after: 120 },
        children: [
          new TextRun({
            text: chapter.title.toUpperCase(),
            font: SERIF,
            size: 30,
            characterSpacing: 40,
            color: "1A1A1A",
          }),
        ],
      })
    );

    const paragraphs = chapter.body
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    for (const text of paragraphs) {
      children.push(
        new Paragraph({
          spacing: { after: 200, line: 360 },
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: 420 },
          children: [new TextRun({ text, font: BODY, size: 22, color: "1F1F1F" })],
        })
      );
    }

    if (index < chapters.length - 1) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  });

  const doc = new Document({
    creator: author || "TEROR MISTIK",
    title,
    description: "Diekspor dari TEROR MISTIK",
    styles: {
      default: {
        document: { run: { font: BODY, size: 22 } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const safeTitle = title.replace(/[^\p{L}\p{N}\s-]/gu, "").trim() || "cerita";

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(safeTitle)}.docx"; filename*=UTF-8''${encodeURIComponent(safeTitle)}.docx`,
      "Cache-Control": "no-store",
    },
  });
}
