import React from "react";

export default function StepIndicator({ step, count }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {Array.from({ length: count }).map((_, index) => (
        <React.Fragment key={index}>
          <div
            className={`h-2 w-2 rounded-full ${
              step >= index ? "bg-emerald-500" : "bg-gray-600"
            }`}
          ></div>
          {index < count - 1 && (
            <div
              className={`h-0.5 w-12 ${
                step > index ? "bg-emerald-500" : "bg-gray-600"
              }`}
            ></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
