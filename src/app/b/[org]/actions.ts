"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { board, organization, postStatuses } from "@/db/schema";
import { deliverAll, mergedEmails, statusChangedEmails } from "@/features/feedback/notifications";
import {
  addComment,
  createPost,
  deletePost,
  findOrganizationBySlug,
  getPost,
  isStaff,
  listVoterEmails,
  MergeError,
  mergePost,
  searchMergeTargets,
  setPostStatus,
  toggleVote,
} from "@/features/feedback/service";
import { appUrl } from "@/lib/auth";
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

/** Loads the post and checks it belongs to the organization in the URL and the viewer is on its team. */
async function requireStaffForPost(orgSlug: string, postId: string) {
  const [session, organization, found] = await Promise.all([getSession(), findOrganizationBySlug(db, orgSlug), getPost(db, postId)]);
  if (
    !session ||
    !organization ||
    !found ||
    found.board.organizationId !== organization.id ||
    !(await isStaff(db, organization.id, session.user.id))
  ) {
    throw new Error("Only the team behind this board can do that.");
  }
  return { post: found, organization, userId: session.user.id };
}

const postUrl = (orgSlug: string, postId: string) => `${appUrl}/b/${orgSlug}/p/${postId}`;

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
  const target = await getPost(db, postId);
  if (!target) return { error: "This post was removed." };
  if (target.mergedInto?.id) return { error: "This idea was merged — vote on the linked one instead." };
  const result = await toggleVote(db, { postId, userId: viewer.id });
  revalidatePath(`/b/${orgSlug}`, "layout");
  return result;
}

export async function submitComment(orgSlug: string, postId: string, _: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer(`/b/${orgSlug}/p/${postId}`);
  const values = formValues(formData);
  const parsed = commentSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const target = await getPost(db, postId);
  if (!target) return { error: "This post was removed.", values };
  if (target.mergedInto?.id) return { error: "This idea was merged — join the conversation on the linked one.", values };

  await addComment(db, { postId, authorId: viewer.id, body: parsed.data.body });
  revalidatePath(`/b/${orgSlug}`, "layout");
  return { success: "Comment posted." };
}

export async function changeStatus(orgSlug: string, postId: string, status: string): Promise<FormState> {
  const parsed = z.enum(postStatuses).safeParse(status);
  if (!parsed.success) return { error: "Unknown status." };
  const { post, organization, userId } = await requireStaffForPost(orgSlug, postId);
  if (post.mergedInto?.id) return { error: "Merged posts keep their status." };

  const changed = await setPostStatus(db, postId, parsed.data);
  // "Open" is the starting state — moving back to it isn't news worth an email.
  if (changed && parsed.data !== "open") {
    after(async () => {
      const voters = await listVoterEmails(db, postId, userId);
      await deliverAll(
        statusChangedEmails(voters, {
          orgName: organization.name,
          postTitle: post.title,
          status: parsed.data,
          url: postUrl(orgSlug, postId),
        }),
      );
    });
  }
  revalidatePath(`/b/${orgSlug}`, "layout");
  return {};
}

export type MergeTarget = { id: string; title: string; voteCount: number; boardName: string };

export async function findMergeTargets(orgSlug: string, postId: string, search: string): Promise<MergeTarget[]> {
  const { organization } = await requireStaffForPost(orgSlug, postId);
  return searchMergeTargets(db, { organizationId: organization.id, excludePostId: postId, search: search.slice(0, 100) });
}

export async function mergeInto(orgSlug: string, duplicateId: string, targetId: string): Promise<FormState> {
  const { post: duplicate, organization } = await requireStaffForPost(orgSlug, duplicateId);
  const target = await getPost(db, targetId);
  if (!target) return { error: "That post no longer exists." };

  let movedVoters: Awaited<ReturnType<typeof mergePost>>;
  try {
    movedVoters = await mergePost(db, { duplicateId, targetId });
  } catch (error) {
    if (error instanceof MergeError) return { error: error.message };
    throw error;
  }

  after(() =>
    deliverAll(
      mergedEmails(movedVoters, {
        orgName: organization.name,
        duplicateTitle: duplicate.title,
        targetTitle: target.title,
        url: postUrl(orgSlug, targetId),
      }),
    ),
  );
  revalidatePath(`/b/${orgSlug}`, "layout");
  redirect(`/b/${orgSlug}/p/${targetId}`);
}

export async function removePost(orgSlug: string, postId: string): Promise<void> {
  await requireStaffForPost(orgSlug, postId);
  await deletePost(db, postId);
  revalidatePath(`/b/${orgSlug}`, "layout");
  redirect(`/b/${orgSlug}`);
}
