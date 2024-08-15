import React from 'react';

const Slider = React.forwardRef(({ className, onChange, ...props }, ref) => {
  const handleChange = (e) => {
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <input
      type="range"
      ref={ref}
      className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${className}`}
      onChange={handleChange}
      {...props}
    />
  );
});

Slider.displayName = "Slider";

export { Slider };