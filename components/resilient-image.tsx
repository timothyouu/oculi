"use client";

import { useEffect, useState, type ImgHTMLAttributes } from "react";

const FALLBACK_IMAGE_URL = "/generated/golden-gate-overlook.png";

type ResilientImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
};

function resolveImageSrc(src: ImgHTMLAttributes<HTMLImageElement>["src"], fallbackSrc: string) {
  if (typeof src === "string" && src.includes("source.unsplash.com")) return fallbackSrc;
  return src || fallbackSrc;
}

export function ResilientImage({
  src,
  fallbackSrc = FALLBACK_IMAGE_URL,
  alt = "",
  onError,
  onLoad,
  ...props
}: ResilientImageProps) {
  const [currentSrc, setCurrentSrc] = useState(resolveImageSrc(src, fallbackSrc));

  useEffect(() => {
    setCurrentSrc(resolveImageSrc(src, fallbackSrc));
  }, [fallbackSrc, src]);

  return (
    <img
      {...props}
      src={currentSrc || fallbackSrc}
      alt={alt}
      onError={(event) => {
        onError?.(event);
        if (currentSrc !== fallbackSrc) setCurrentSrc(fallbackSrc);
      }}
      onLoad={(event) => {
        onLoad?.(event);
        if (event.currentTarget.naturalWidth === 0 && currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
    />
  );
}
