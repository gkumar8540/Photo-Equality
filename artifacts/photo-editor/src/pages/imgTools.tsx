import React from "react";
import { useLocation } from "wouter";

export default function ImgTools() {
  const [, setLocation] = useLocation();

  const tools = [
    {
      title: "Passport",
      subtitle: "Photo Maker",
      icon: "📷",
      path: "/images/passport",
    },
    {
      title: "Remove",
      subtitle: "Background",
      icon: "✂️",
      path: "/images/remove-bg",
    },
    {
      title: "Reduce",
      subtitle: "Image KB",
      icon: "📉",
      path: "/images/reduce",
    },
    {
      title: "Increase",
      subtitle: "Image KB-MB",
      icon: "📈",
      path: "/images/increase",
    },
    
  ];

  const openTool = (path: string) => {
    setLocation(path);
  };

  return (
    <div className="min-h-screen bg-[#0c1d39] px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold sm:text-3xl">
            Images Tools
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Simple and powerful image tools
          </p>
        </div>

        {/* 2 × 2 Tools Grid */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          {tools.map((tool) => (
            <button
              key={tool.path}
              type="button"
              onClick={() => openTool(tool.path)}
              className="group flex min-h-[145px] flex-col items-center justify-center rounded-2xl border border-[#34445b] bg-[#141f30] p-5 text-center shadow-lg transition-all duration-200 hover:-translate-y-1 hover:border-[#f3ad61] hover:bg-[#18263a] active:scale-[0.98]"
            >
              {/* Icon */}
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-[#202d40] text-3xl transition group-hover:bg-[#29384d]">
                {tool.icon}
              </div>

              {/* Title */}
              <div className="text-base font-bold text-white sm:text-lg">
                {tool.title}
              </div>

              {/* Subtitle */}
              <div className="mt-1 text-sm text-gray-400">
                {tool.subtitle}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

