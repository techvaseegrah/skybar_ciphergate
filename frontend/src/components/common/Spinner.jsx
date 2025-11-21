import React from 'react';

const Spinner = ({ size = "md" }) => {
  // Size variants
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-24 h-24"
  };

  return (
    <div className="flex justify-center items-center">
      <div className={`${sizeClasses[size]} rounded-full border-4 border-gray-200 border-t-blue-500 animate-spin`}></div>
    </div>
  );
};

export default Spinner;