export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "Acme Inc." → "acme-inc"; strips accents so "Știință" → "stiinta". */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}
