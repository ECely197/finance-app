import { useState, useLayoutEffect } from 'react';

interface RippleType {
  x: number;
  y: number;
  size: number;
  id: number;
}

export const Ripple = () => {
  const [ripples, setRipples] = useState<RippleType[]>([]);

  useLayoutEffect(() => {
    let bounce: ReturnType<typeof setTimeout>;
    if (ripples.length > 0) {
      bounce = setTimeout(() => {
        setRipples([]);
      }, 600); // 600ms corresponds to --duration-macro / our ripple animation
    }
    return () => clearTimeout(bounce);
  }, [ripples]);

  const addRipple = (event: React.MouseEvent<HTMLDivElement>) => {
    const rippleContainer = event.currentTarget.getBoundingClientRect();
    const size = Math.max(rippleContainer.width, rippleContainer.height) * 1.5;
    const x = event.clientX - rippleContainer.left - size / 2;
    const y = event.clientY - rippleContainer.top - size / 2;
    
    // Limits the amount of concurrent ripples so we don't spam the DOM
    setRipples(prev => [
      ...prev.slice(-3),
      { x, y, size, id: Date.now() }
    ]);
  };

  return (
    <div 
      className="absolute inset-0 overflow-hidden pointer-events-auto rounded-inherit z-0" 
      onClick={addRipple}
    >
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute bg-white/30 rounded-full animate-ripple pointer-events-none"
          style={{
            top: ripple.y,
            left: ripple.x,
            width: ripple.size,
            height: ripple.size,
          }}
        />
      ))}
    </div>
  );
};
