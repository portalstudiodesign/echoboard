"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db/client";
import { board, organization, postStatuses } from "@/db/schema";
import { addComment, createPost, deletePost, getPost, isStaff, setPostStatus, toggleVote } from "@/features/feedback/service";
import { fieldErrors, formValues, type FormState } from "@/lib/forms";
import { getSession } from "@/lib/session";

const postSchema = z.object({
  title: z.string().trim().min(3, "Give your idea a short title").max(120, "Keep the title under 120 characters"),
  body: z.string().trim().max(5000, "Keep the details under 5,000 characters").default(""),
});

const commentSchema = z.object({
  body: z.string().trim().min(1, "Write a comment first").max(3000, "Keep comments under 3,000 characters"),
});

async function requireViewer(returnTo: string) {
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  return session.user;
}

/** Loads the post and checks the viewer belongs to the organization that owns it. */
async function requireStaffForPost(postId: string) {
  const session = await getSession();
  const found = await getPost(db, postId);
  if (!found || !session || !(await isStaff(db, found.board.organizationId, session.user.id))) {
    throw new Error("Only the team behind this board can do that.");
  }
  return found;
}

export async function submitPost(orgSlug: string, boardId: string, _: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer(`/b/${orgSlug}`);
  const values = formValues(formData);
  const parsed = postSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  // The board must really belong to the organization in the URL.
  const [target] = await db
    .select({ id: board.id })
    .from(board)
    .innerJoin(organization, eq(board.organizationId, organization.id))
    .where(and(eq(board.id, boardId), eq(organization.slug, orgSlug)))
    .limit(1);
  if (!target) return { error: "This board no longer exists.", values };

  const created = await createPost(db, { boardId: target.id, authorId: viewer.id, ...parsed.data });
  revalidatePath(`/b/${orgSlug}`);
  redirect(`/b/${orgSlug}/p/${created.id}`);
}

export type VoteResult = { voted: boolean; voteCount: number } | { error: string };

export async function vote(orgSlug: string, postId: string, returnTo: string): Promise<VoteResult> {
  const viewer = await requireViewer(returnTo);
  if (!(await getPost(db, postId))) return { error: "This post was removed." };
  const result = await toggleVote(db, { postId, userId: viewer.id });
  revalidatePath(`/b/${orgSlug}`, "layout");
  return result;
}

export async function submitComment(orgSlug: string, postId: string, _: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer(`/b/${orgSlug}/p/${postId}`);
  const values = formValues(formData);
  const parsed = commentSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  if (!(await getPost(db, postId))) return { error: "This post was removed.", values };

  await addComment(db, { postId, authorId: viewer.id, body: parsed.data.body });
  revalidatePath(`/b/${orgSlug}`, "layout");
  return { success: "Comment posted." };
}

export async function changeStatus(orgSlug: string, postId: string, status: string): Promise<FormState> {
  const parsed = z.enum(postStatuses).safeParse(status);
  if (!parsed.success) return { error: "Unknown status." };
  await requireStaffForPost(postId);
  await setPostStatus(db, postId, parsed.data);
  revalidatePath(`/b/${orgSlug}`, "layout");
  return {};
}

export async function removePost(orgSlug: string, postId: string): Promise<void> {
  await requireStaffForPost(postId);
  await deletePost(db, postId);
  revalidatePath(`/b/${orgSlug}`, "layout");
  redirect(`/b/${orgSlug}`);
}
