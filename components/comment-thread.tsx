"use client";

import { FormEvent, useState } from "react";
import { Heart, MessageCircle, Reply as ReplyIcon, Send } from "lucide-react";
import type { Comment, User } from "../lib/types";

type CommentThreadProps = {
  photoId: string;
  comments?: Comment[];
  usersById?: Record<string, User | undefined>;
  likedCommentIds?: string[];
  likedReplyIds?: string[];
  onAddComment?: (photoId: string, body: string) => void;
  onToggleCommentLike?: (commentId: string) => void;
  onAddReply?: (commentId: string, body: string) => void;
  onToggleReplyLike?: (replyId: string) => void;
  compact?: boolean;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function displayUser(usersById: Record<string, User | undefined>, userId: string) {
  return usersById[userId] || {
    id: userId,
    name: "Oculi user",
    username: "@oculi",
    avatarUrl: "/avatars/placeholder.svg",
    bio: "",
    homeArea: "",
    followerCount: 0,
    followingCount: 0,
  };
}

export function CommentThread({
  photoId,
  comments = [],
  usersById = {},
  likedCommentIds = [],
  likedReplyIds = [],
  onAddComment,
  onToggleCommentLike,
  onAddReply,
  onToggleReplyLike,
  compact = false,
}: CommentThreadProps) {
  const [body, setBody] = useState("");
  const [replyTarget, setReplyTarget] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const visibleComments = compact ? comments.slice(0, 2) : comments;

  function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    onAddComment?.(photoId, trimmed);
    setBody("");
  }

  function submitReply(event: FormEvent<HTMLFormElement>, commentId: string) {
    event.preventDefault();
    const trimmed = replyBody.trim();
    if (!trimmed) return;
    onAddReply?.(commentId, trimmed);
    setReplyBody("");
    setReplyTarget(null);
  }

  return (
    <section className="space-y-3" aria-label="Comments">
      {visibleComments.length ? (
        <div className="space-y-3">
          {visibleComments.map((comment) => {
            const author = displayUser(usersById, comment.userId);
            const liked = likedCommentIds.includes(comment.id);
            return (
              <article key={comment.id} className="space-y-2">
                <div className="flex gap-2">
                  <img src={author.avatarUrl} alt="" className="mt-0.5 size-7 rounded-full bg-zinc-200 object-cover" />
                  <div className="min-w-0 flex-1 rounded-md bg-zinc-50 px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-950">{author.name}</p>
                        <p className="text-sm leading-5 text-zinc-700">{comment.body}</p>
                      </div>
                      <button
                        type="button"
                        className={cx(
                          "shrink-0 rounded-md p-1 outline-none transition focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2",
                          liked ? "text-rose-600" : "text-zinc-500 hover:text-zinc-950",
                        )}
                        aria-label={liked ? "Unlike comment" : "Like comment"}
                        onClick={() => onToggleCommentLike?.(comment.id)}
                      >
                        <Heart className={cx("size-4", liked && "fill-current")} aria-hidden="true" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs font-medium text-zinc-500">
                      <span>{comment.createdAt}</span>
                      <span>{comment.likeCount + (liked ? 1 : 0)} likes</span>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-sm outline-none hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
                        onClick={() => setReplyTarget(replyTarget === comment.id ? null : comment.id)}
                      >
                        <ReplyIcon className="size-3.5" aria-hidden="true" />
                        Reply
                      </button>
                    </div>
                  </div>
                </div>

                {comment.replies?.length ? (
                  <div className="ml-9 space-y-2 border-l border-zinc-200 pl-3">
                    {comment.replies.map((reply) => {
                      const replyAuthor = displayUser(usersById, reply.userId);
                      const replyLiked = likedReplyIds.includes(reply.id);
                      return (
                        <div key={reply.id} className="flex gap-2">
                          <img src={replyAuthor.avatarUrl} alt="" className="mt-0.5 size-6 rounded-full bg-zinc-200 object-cover" />
                          <div className="min-w-0 flex-1 rounded-md bg-white px-3 py-2 ring-1 ring-zinc-100">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-zinc-950">{replyAuthor.name}</p>
                                <p className="text-sm leading-5 text-zinc-700">{reply.body}</p>
                              </div>
                              <button
                                type="button"
                                className={cx(
                                  "shrink-0 rounded-md p-1 outline-none transition focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2",
                                  replyLiked ? "text-rose-600" : "text-zinc-500 hover:text-zinc-950",
                                )}
                                aria-label={replyLiked ? "Unlike reply" : "Like reply"}
                                onClick={() => onToggleReplyLike?.(reply.id)}
                              >
                                <Heart className={cx("size-3.5", replyLiked && "fill-current")} aria-hidden="true" />
                              </button>
                            </div>
                            <p className="mt-1 text-xs font-medium text-zinc-500">
                              {reply.createdAt} / {reply.likeCount + (replyLiked ? 1 : 0)} likes
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {replyTarget === comment.id ? (
                  <form className="ml-9 flex gap-2" onSubmit={(event) => submitReply(event, comment.id)}>
                    <label className="sr-only" htmlFor={`reply-${comment.id}`}>
                      Reply to comment
                    </label>
                    <input
                      id={`reply-${comment.id}`}
                      value={replyBody}
                      onChange={(event) => setReplyBody(event.target.value)}
                      className="min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
                      placeholder="Write a reply"
                    />
                    <button
                      type="submit"
                      className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white outline-none transition hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
                    >
                      Send
                    </button>
                  </form>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md bg-zinc-50 px-3 py-3 text-sm text-zinc-500">
          <MessageCircle className="size-4" aria-hidden="true" />
          Be the first to ask about the shot.
        </div>
      )}

      <form className="flex gap-2" onSubmit={submitComment}>
        <label className="sr-only" htmlFor={`comment-${photoId}`}>
          Add a comment
        </label>
        <input
          id={`comment-${photoId}`}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
          placeholder="Ask about timing, lens, or access"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-md bg-zinc-950 px-3 py-2 text-sm font-semibold text-white outline-none transition hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
        >
          <Send className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Post</span>
        </button>
      </form>
    </section>
  );
}
