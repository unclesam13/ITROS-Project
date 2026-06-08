import { useState, type ReactNode } from "react";

export type HelpSection = {
  id: string;
  title: string;
  content: ReactNode;
};

export default function HelpAccordion({ sections }: { sections: HelpSection[] }) {
  const [openId, setOpenId] = useState<string | null>(sections[0]?.id ?? null);

  return (
    <div className="space-y-2">
      {sections.map((section) => {
        const isOpen = openId === section.id;
        return (
          <div key={section.id} className="card overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : section.id)}
              className="flex w-full items-center justify-between px-5 py-4 text-left font-medium text-slate-200 transition-colors hover:bg-surface-hover"
            >
              <span>{section.title}</span>
              <span className="text-slate-500">{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && (
              <div className="border-t border-surface-border px-5 py-4 text-sm leading-relaxed text-slate-400">
                {section.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
