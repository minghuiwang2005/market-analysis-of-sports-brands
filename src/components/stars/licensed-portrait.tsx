"use client";

import Image from "next/image";
import { UserRound } from "lucide-react";
import { useState } from "react";

export function LicensedPortrait({
  src,
  alt,
  className,
  sizes,
  priority = false,
}: {
  src: string;
  alt: string;
  className: string;
  sizes: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={`${className} portrait-fallback`} role="img" aria-label={`${alt}（图片暂不可用）`}>
        <UserRound size={36} strokeWidth={1.2} aria-hidden="true" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
