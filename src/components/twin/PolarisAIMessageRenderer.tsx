import React from "react";
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Flame,
  Thermometer,
  Zap,
  Fuel,
  Droplets,
  ShieldCheck,
  Compass,
  Building2,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";

interface MessageRendererProps {
  content: string;
}

export function PolarisAIMessageRenderer({ content }: MessageRendererProps) {
  // Check if this is an official MoES report
  const isMoesReport =
    content.includes("GOVERNMENT OF INDIA") ||
    content.includes("MINISTRY OF EARTH SCIENCES") ||
    content.includes("Official Station Operations");

  const lines = content.split("\n");
  const renderedElements: React.ReactNode[] = [];

  let currentList: string[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  const flushList = () => {
    if (currentList.length > 0) {
      renderedElements.push(
        <div key={`list-${renderedElements.length}`} className="my-2.5 space-y-1.5">
          {currentList.map((item, idx) => {
            // Check if bullet has **Label:** Value pattern
            const match = item.match(/^\s*[*•-]?\s*\*\*([^*]+)\*\*:?\s*(.*)$/);
            if (match) {
              const label = match[1].trim();
              const val = match[2].trim();
              return (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-slate-50/90 px-3.5 py-2 text-xs transition-colors hover:bg-slate-100/80 hover:border-blue-300"
                >
                  <span className="font-semibold text-slate-800 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                    {label}
                  </span>
                  <span className="font-mono text-slate-900 font-bold text-[11px] sm:text-xs">
                    {parseInlineBold(val)}
                  </span>
                </div>
              );
            }

            // Normal bullet item
            return (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                <div className="flex-1">{parseInlineBold(item.replace(/^[*•-]\s*/, ""))}</div>
              </div>
            );
          })}
        </div>
      );
      currentList = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Code block toggle
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        renderedElements.push(
          <pre
            key={`code-${renderedElements.length}`}
            className="my-3 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-3.5 font-mono text-[11px] text-slate-800 shadow-xs"
          >
            <code>{codeBuffer.join("\n")}</code>
          </pre>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    // Empty lines
    if (!line) {
      flushList();
      continue;
    }

    // Horizontal Rules
    if (line === "---" || line === "***") {
      flushList();
      renderedElements.push(
        <div key={`hr-${renderedElements.length}`} className="my-3.5 h-[1px] bg-slate-200" />
      );
      continue;
    }

    // Headings
    if (line.startsWith("###")) {
      flushList();
      const headingText = line.replace(/^###\s*/, "").replace(/\*\*/g, "");
      renderedElements.push(
        <div
          key={`h3-${renderedElements.length}`}
          className="mt-4 mb-2 flex items-center gap-2 border-b border-slate-200 pb-1.5"
        >
          <div className="grid h-5 w-5 place-items-center rounded bg-blue-100 text-blue-700 text-xs">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <h4 className="text-xs sm:text-sm font-bold tracking-wide text-slate-900 uppercase">
            {headingText}
          </h4>
        </div>
      );
      continue;
    }

    if (line.startsWith("##") || line.startsWith("#")) {
      flushList();
      const headingText = line.replace(/^#+\s*/, "").replace(/\*\*/g, "");
      renderedElements.push(
        <div key={`h2-${renderedElements.length}`} className="mt-4 mb-2">
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-wide border-l-4 border-blue-600 pl-2.5">
            {headingText}
          </h3>
        </div>
      );
      continue;
    }

    // Bullet or list items
    if (line.startsWith("* ") || line.startsWith("- ") || line.startsWith("• ")) {
      currentList.push(line.substring(2));
      continue;
    }

    // Numbered lists e.g., "1. [Step 1]: ..."
    const numMatch = line.match(/^(\d+)\.\s*(.*)$/);
    if (numMatch) {
      flushList();
      const num = numMatch[1];
      const text = numMatch[2];
      renderedElements.push(
        <div
          key={`num-${renderedElements.length}`}
          className="my-1.5 flex items-start gap-2.5 rounded-lg border border-slate-200/80 bg-white p-2.5 text-xs shadow-sm"
        >
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-100 font-mono text-[10px] font-bold text-blue-700 border border-blue-200">
            {num}
          </span>
          <div className="flex-1 text-slate-800 leading-relaxed font-normal">
            {parseInlineBold(text)}
          </div>
        </div>
      );
      continue;
    }

    // Plain paragraph
    flushList();
    renderedElements.push(
      <p key={`p-${renderedElements.length}`} className="text-xs text-slate-700 leading-relaxed my-1.5">
        {parseInlineBold(line)}
      </p>
    );
  }

  flushList();

  return (
    <div className="space-y-1 text-slate-800">
      {/* If this is an Official MoES Report, wrap in decorative Government letterhead card */}
      {isMoesReport && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50/50 p-3.5 shadow-sm">
          <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏛️</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-800">
                  Government of India · Ministry of Earth Sciences
                </p>
                <p className="text-xs font-bold text-slate-900">
                  National Centre for Polar and Ocean Research (NCPOR), Goa
                </p>
              </div>
            </div>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-mono text-[9px] font-bold text-amber-900 border border-amber-300 shadow-sm">
              OFFICIAL DISPATCH
            </span>
          </div>
        </div>
      )}

      {renderedElements}
    </div>
  );
}

// Helper to cleanly replace **bold** with <strong> elements
function parseInlineBold(text: string): React.ReactNode {
  if (!text.includes("**")) return text;

  const parts: React.ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.substring(lastIdx, match.index));
    }
    parts.push(
      <strong key={`bold-${match.index}`} className="font-bold text-slate-950">
        {match[1]}
      </strong>
    );
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < text.length) {
    parts.push(text.substring(lastIdx));
  }

  return <>{parts}</>;
}
