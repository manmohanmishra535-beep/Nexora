export type ProfileImage = {
  url: string;
  publicId?: string;
};

export type Author = {
  _id: string;
  username: string;
  displayName: string;
  profileImage: ProfileImage;
  bio?: string;
  isMe?: boolean;
};

export type PostImage = {
  url: string;
  publicId?: string;
};

export type Post = {
  _id: string;
  content: string;
  images: PostImage[];
  author: Author | null;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  createdAt: string;
  editedAt: string | null;
  repostOf: Post | null;
  likedByMe: boolean;
  repostedByMe: boolean;
  bookmarkedByMe: boolean;
};

export type User = {
  _id: string;
  username: string;
  email?: string;
  displayName: string;
  profileImage: ProfileImage;
  bio: string;
  createdAt: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing: boolean;
  isMe: boolean;
};

export type Comment = {
  _id: string;
  content: string;
  createdAt: string;
  author: Author | null;
  post?: {
    _id: string;
    content: string;
    images: PostImage[];
    author: Author | null;
  } | null;
};

export type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "repost"
  | "message";

export type Notification = {
  _id: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  actor: Author | null;
  post: {
    _id: string;
    content: string;
    images: PostImage[];
  } | null;
};

export type Conversation = {
  _id: string;
  participants: Author[];
  lastMessage: {
    _id: string;
    text: string;
    createdAt: string;
    sender: string;
  } | null;
  updatedAt: string;
};

export type Message = {
  _id: string;
  text: string;
  createdAt: string;
  readAt: string | null;
  sender: Author | null;
};

export type Page<T> = {
  items: T[];
  nextCursor: string | null;
};

export type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    fields?: Record<string, string>;
  };
};
