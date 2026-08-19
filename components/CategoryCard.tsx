"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Category } from "@/lib/types";

/** Homepage card for one voting category. */
export default function CategoryCard({
  category,
  candidateCount,
}: {
  category: Category;
  candidateCount: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(category.image_url) && !imageFailed;

  return (
    <Link href="/vote" className="group flex flex-col overflow-hidden rounded-2xl border border-primary-soft bg-surface shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      {showImage && (
        <div className="relative aspect-[16/7] w-full bg-primary-soft">
          <Image src={category.image_url!} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" onError={() => setImageFailed(true)} />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
      <div className="flex items-start justify-between">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-2xl">
          {category.icon ?? "🏆"}
        </span>
        <ArrowRight className="h-5 w-5 text-ink-soft transition-transform group-hover:translate-x-1 group-hover:text-primary" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-ink">{category.name}</h3>
      {category.description && (
        <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
          {category.description}
        </p>
      )}
      <p className="mt-3 text-xs font-medium text-primary">
        {candidateCount} candidate{candidateCount === 1 ? "" : "s"}
      </p>
      </div>
    </Link>
  );
}
