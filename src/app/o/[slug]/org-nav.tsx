"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function OrgNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const links = [
    { href: `/o/${slug}`, label: "Overview" },
    { href: `/o/${slug}/widget`, label: "Widget" },
    { href: `/o/${slug}/members`, label: "Team" },
    { href: `/o/${slug}/billing`, label: "Billing" },
  ];
  return (
    <nav className="mx-auto flex w-full max-w-5xl gap-1 px-2">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`border-b-2 px-3 pt-1 pb-2.5 text-sm transition-colors ${
              active ? "border-accent font-medium text-text" : "border-transparent text-muted hover:text-text"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
