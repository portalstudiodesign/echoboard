import type { Metadata } from "next";
import { appUrl } from "@/lib/auth";
import { requireMembership } from "@/lib/session";
import { WidgetBuilder } from "./widget-builder";

export const metadata: Metadata = { title: "Widget" };

export default async function WidgetPage({ params }: PageProps<"/o/[slug]/widget">) {
  const { slug } = await params;
  await requireMembership(slug);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Feedback widget</h1>
        <p className="mt-1 max-w-2xl text-muted">
          Let customers browse ideas and your roadmap without leaving your product. One script tag, no dependencies, and it
          can&apos;t clash with your site&apos;s styles.
        </p>
      </div>
      <WidgetBuilder orgSlug={slug} appUrl={appUrl} />
    </div>
  );
}
