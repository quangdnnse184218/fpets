import React from "react";

export interface LegalSection {
  title: string;
  items: string[];
}

// Khung chung cho các trang văn bản pháp lý (Điều khoản, Bảo mật)
export default function LegalPage({ title, updated, intro, sections }: { title: string; updated: string; intro: string; sections: LegalSection[] }) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-pine-950 font-display">{title}</h1>
        <p className="text-xs text-bark-500">Cập nhật: {updated}</p>
        <p className="text-sm text-bark-700 leading-relaxed">{intro}</p>
      </header>
      {sections.map((section, i) => (
        <section key={section.title} className="space-y-2">
          <h2 className="text-base font-bold text-pine-950">
            {i + 1}. {section.title}
          </h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-bark-700 leading-relaxed">
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
