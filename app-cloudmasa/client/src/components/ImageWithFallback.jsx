// src/components/ImageWithFallback.jsx
import React from 'react';

const ImageWithFallback = ({ src, alt }) => {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={(e) => {
        console.error("Image failed:", e.target.src);
        e.target.src = "/fallback.png"; // 👈 fallback image
      }}
      className="max-w-full h-auto transition-opacity duration-300"
    />
  );
};

export default ImageWithFallback;
