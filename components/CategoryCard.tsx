"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Category } from "@/lib/types";
import VoteNowButton from "@/components/VoteNowButton";

/** Homepage card for one voting category. */
export default function CategoryCard({
  category,
  candidateCount,
  isAuthenticated,
}: {
  category: Category;
  candidateCount: number;
  isAuthenticated: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(category.image_url) && !imageFailed;

  return (
    <VoteNowButton
      isAuthenticated={isAuthenticated}
      destination={`/vote?category=${encodeURIComponent(category.id)}`}
      className="group relative flex w-full flex-col overflow-hidden rounded-3xl border border-primary-soft bg-surface text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-xl hover:shadow-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {showImage && (
        <div className="relative aspect-[16/7] w-full bg-primary-soft">
          <Image src={category.image_url!} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" onError={() => setImageFailed(true)} />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink/30 to-transparent" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-2xl shadow-sm ring-1 ring-primary/10">
            {category.icon ?? "🏆"}
          </span>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mist text-ink-soft transition-all group-hover:bg-primary group-hover:text-white">
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
        <h3 className="mt-5 text-lg font-bold text-ink">{category.name}</h3>
        {category.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-soft">{category.description}</p>}
        <p className="mt-auto pt-5 text-xs font-bold uppercase tracking-wide text-primary">
          {candidateCount} candidate{candidateCount === 1 ? "" : "s"}
        </p>
      </div>
    </VoteNowButton>
  );
}
