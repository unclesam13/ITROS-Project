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
          <div key={section.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : section.id)}
              className="flex w-full items-center justify-between px-5 py-4 text-left font-medium text-slate-800 hover:bg-slate-50"
            >
              <span>{section.title}</span>
              <span className="text-slate-400">{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && (
              <div className="border-t border-slate-100 px-5 py-4 text-sm leading-relaxed text-slate-600">
                {section.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
