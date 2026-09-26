"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PublicNav({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname();
  const roadmap = `/b/${orgSlug}/roadmap`;
  const links = [
    { href: `/b/${orgSlug}`, label: "Feedback", active: pathname !== roadmap },
    { href: roadmap, label: "Roadmap", active: pathname === roadmap },
  ];
  return (
    <nav className="mx-auto flex w-full max-w-3xl gap-1 px-2" aria-label="Board sections">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={link.active ? "page" : undefined}
          className={`border-b-2 px-3 pt-1 pb-2.5 text-sm transition-colors ${
            link.active ? "border-accent font-medium text-text" : "border-transparent text-muted hover:text-text"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
