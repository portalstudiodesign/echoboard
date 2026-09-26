import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/db/client";
import { findOrganizationBySlug } from "@/features/feedback/service";

/** The organization behind a public board URL, loaded once per request; 404 if unknown. */
export const getPublicOrganization = cache(async (slug: string) => {
  const found = await findOrganizationBySlug(db, slug);
  if (!found) notFound();
  return found;
});
