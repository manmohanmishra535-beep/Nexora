"use client";

import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { io, type Socket } from "socket.io-client";

import { useToast } from "@/components/ui/Toast";
import { SOCKET_URL } from "@/lib/api";
import { patchPost } from "@/lib/cache";
import type { Notification } from "@/lib/types";

const SocketContext = createContext<Socket | null>(null);

const notificationCopy = (notification: Notification) => {
  const name = notification.actor?.displayName || "Someone";

  switch (notification.type) {
    case "like":
      return `${name} liked your post`;
    case "repost":
      return `${name} reposted your post`;
    case "comment":
      return `${name} replied to your post`;
    case "follow":
      return `${name} followed you`;
    case "message":
      return `${name} sent you a message`;
    default:
      return `${name} interacted with you`;
  }
};

export function SocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn, getToken } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const pathname = usePathname();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    const instance = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      auth: (callback) => {
        getToken()
          .then((token) => callback({ token: token || "" }))
          .catch(() => callback({ token: "" }));
      },
    });

    instance.on("notification:new", (notification: Notification) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });

      if (pathname !== "/notifications") {
        toast(notificationCopy(notification));
      }
    });

    instance.on(
      "message:new",
      ({ conversationId }: { conversationId: string }) => {
        queryClient.invalidateQueries({
          queryKey: ["messages", conversationId],
        });
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }
    );

    instance.on(
      "post:counts",
      (counts: {
        postId?: string;
        likeCount?: number;
        commentCount?: number;
      }) => {
        if (!counts?.postId) {
          return;
        }

        patchPost(queryClient, counts.postId, (post) => ({
          ...post,
          likeCount: counts.likeCount ?? post.likeCount,
          commentCount: counts.commentCount ?? post.commentCount,
        }));
      }
    );

    instance.on("follow:new", () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
    });

    // After a reconnect, catch up on anything missed while offline.
    instance.on("connect", () => {
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    });

    // Socket.IO is an external system; the instance must be exposed through
    // context so children can subscribe to it after the connection is created.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(instance);

    return () => {
      instance.disconnect();
      setSocket(null);
    };
  }, [isSignedIn, getToken, queryClient, toast, pathname]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
