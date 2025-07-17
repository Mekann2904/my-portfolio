import { useEffect, useRef } from "react";
import mermaid from "mermaid";

export default function Mermaid({ chart }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = chart;
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        themeVariables: {
          primaryColor: "#18181b",
          primaryTextColor: "#f3f4f6",
          primaryBorderColor: "#6366f1",
          lineColor: "#6366f1",
          fontFamily: "sans-serif"
        }
      });
      try {
        mermaid.init(undefined, ref.current);
      } catch (e) {}
    }
  }, [chart]);
  return <div className="mermaid" ref={ref} />;
} 