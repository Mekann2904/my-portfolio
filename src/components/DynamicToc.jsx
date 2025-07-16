import { useState } from "react";

export default function DynamicToc({ headings, pathname }) {
  const [maxDepth, setMaxDepth] = useState(6);
  const steps = [1, 2, 3, 4, 5, 6];

  return (
    <div>
      <div className="flex gap-1.5 mb-4">
        {steps.map((step) => {
          const isActive = step <= maxDepth;
          return (
            <button
              key={step}
              onClick={() => setMaxDepth(step)}
              className={`
                px-3 h-7 flex items-center justify-center rounded-full border text-xs font-medium transition-all duration-150
                ${isActive
                  ? "bg-dark-900 border-blue-900 text-blue-100"
                  : "bg-dark-900 border-gray-700 text-gray-500 hover:border-blue-500 hover:text-blue-300"
                }
              `}
              style={{ minWidth: "2rem" }}
              aria-label={`最大見出しレベルをH${step}に設定`}
            >
              H{step}
            </button>
          );
        })}
      </div>
      <ul className="space-y-2">
        {headings
          .filter((h) => h.depth >= 1 && h.depth <= maxDepth)
          .map((heading) => (
            <li key={heading.slug}>
              <a
                href={`${pathname}#${heading.slug}`}
                className="text-gray-300 hover:text-white transition-colors text-sm block"
                style={{ paddingLeft: `${(heading.depth - 1) * 1}rem` }}
              >
                {heading.text}
              </a>
            </li>
          ))}
      </ul>
    </div>
  );
} 