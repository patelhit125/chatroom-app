"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActiveUser } from "@/lib/websocket/client";
import { motion } from "framer-motion";
import { Bot, Loader2 } from "lucide-react";
import InfiniteScroll from "react-infinite-scroll-component";

interface ActiveUsersListProps {
  users: ActiveUser[];
  onSelectUser: (user: ActiveUser) => void;
  selectedUserId: number | null;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoading: boolean;
}

export function ActiveUsersList({
  users,
  onSelectUser,
  selectedUserId,
  hasMore,
  onLoadMore,
  isLoading,
}: ActiveUsersListProps) {
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        ) : (
          <>
            <p className="text-gray-500 text-sm">No active users online</p>
            <p className="text-gray-400 text-xs mt-2">
              Users will appear here when they come online
            </p>
          </>
        )}
      </div>
    );
  }

  const scrollContainerId = "active-users-scroll";

  return (
    <div id={scrollContainerId} className="h-full overflow-y-auto">
      <InfiniteScroll
        dataLength={users.length}
        next={onLoadMore}
        hasMore={hasMore}
        loader={
          isLoading ? (
            <div className="flex justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          ) : null
        }
        scrollableTarget={scrollContainerId}
        style={{ overflow: "visible" }}
      >
        <div className="space-y-1 p-2">
          {users.map((user) => (
            <motion.button
              key={user.id}
              onClick={() => onSelectUser(user)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                selectedUserId === user.id
                  ? "bg-black text-white"
                  : "hover:bg-gray-50"
              }`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.image || undefined} />
                  <AvatarFallback>
                    {user.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {user.is_online && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
                )}
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{user.name}</p>
                  {user.is_ai && <Bot className="h-3 w-3 text-gray-400" />}
                </div>
                <p
                  className={`text-xs ${
                    selectedUserId === user.id
                      ? "text-gray-300"
                      : "text-gray-500"
                  }`}
                >
                  {user.is_online ? "Online" : "Offline"}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </InfiniteScroll>
    </div>
  );
}
