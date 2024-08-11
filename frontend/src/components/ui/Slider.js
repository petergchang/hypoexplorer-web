import React from 'react';

const Slider = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <input
      type="range"
      ref={ref}
      className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${className}`}
      {...props}
    />
  );
});

Slider.displayName = "Slider";

export { Slider };
