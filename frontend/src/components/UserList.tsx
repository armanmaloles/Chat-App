import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import {
  addConversationMember,
  createConversation,
  getConversationMembers,
  getUserConversations,
  getUsers,
} from "../lib/api";

type MemberEntry = {
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
};

type UserItem = {
  id: string;
  name: string;
  email?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
};

type UserConversationEntry = {
  conversation?: {
    id: string;
    isGroup?: boolean;
    members?: Array<{
      user?: {
        id?: string;
      };
    }>;
  };
};

type UserListProps = {
  conversationId?: string;
  showActions?: boolean;
};

const REFRESH_INTERVAL_MS = 10000; // Reduced from 30000 to 10 seconds

const UserList = ({ conversationId, showActions = false }: UserListProps) => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const loadingTimerRef = useRef<number | null>(null);
  const { getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    const loadUsers = async () => {
      if (loadingTimerRef.current) {
        window.clearTimeout(loadingTimerRef.current);
      }

      setIsLoading(true);
      const startTime = Date.now();

      try {
        const token = await getToken();
        if (conversationId) {
          const response = await getConversationMembers(conversationId, token);
          const members = (response.data as MemberEntry[]).map((entry) => ({
            id: entry.user?.id ?? "",
            name: entry.user?.name || entry.user?.email || "Unknown user",
          }));
          setUsers(members.filter((member) => member.id));
        } else {
          const response = await getUsers(token);
          const allUsers = (response.data as UserItem[])
            .map((userData) => ({
              id: userData.id,
              name: userData.name || userData.id,
              email: userData.email,
              imageUrl: userData.imageUrl,
              isActive: Boolean(userData.isActive),
            }))
            .filter((userData) => userData.id !== user?.id);
          setUsers(allUsers);
        }
      } catch (error) {
        console.error("Failed to load users", error);
      } finally {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(500 - elapsed, 0);
        loadingTimerRef.current = window.setTimeout(() => {
          setIsLoading(false);
          loadingTimerRef.current = null;
        }, remaining);
      }
    };

    void loadUsers();
    const intervalId = window.setInterval(() => void loadUsers(), REFRESH_INTERVAL_MS);

    // Listen for visibility changes to refresh immediately when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadUsers();
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      if (loadingTimerRef.current) {
        window.clearTimeout(loadingTimerRef.current);
      }
    };
  }, [conversationId, getToken, user?.id]);

  const handleStartChat = async (userId: string) => {
    if (!user?.id || conversationId) return;

    try {
      const token = await getToken();
      const existingResponse = await getUserConversations(user.id, token);
      const existingConversation = (existingResponse.data as UserConversationEntry[]).find((entry) => {
        const conversation = entry.conversation;
        if (!conversation || conversation.isGroup) return false;

        const memberIds = (conversation.members ?? [])
          .map((member) => member.user?.id)
          .filter(Boolean);

        return (
          memberIds.length === 2 &&
          memberIds.includes(user.id) &&
          memberIds.includes(userId)
        );
      });

      if (existingConversation?.conversation?.id) {
        navigate(`/app/chat/${existingConversation.conversation.id}`);
        return;
      }

      const response = await createConversation(
        {
          createdBy: user.id,
          isGroup: false,
        },
        token,
      );

      const conversationId = response.data.id;
      await addConversationMember(conversationId, user.id, token);
      await addConversationMember(conversationId, userId, token);
      navigate(`/app/chat/${conversationId}`);
    } catch (error) {
      console.error("Failed to start chat", error);
    }
  };

  const title = conversationId ? "Conversation members" : "Start a chat with";

  const handleItemKeyDown = (event: KeyboardEvent<HTMLLIElement>, userId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void handleStartChat(userId);
    }
  };

  const filteredUsers = users.filter((userItem) =>
    userItem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (userItem.email && userItem.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="user-list">
      <div className="user-list__header">
        <h3 className="user-list__title">{title}</h3>
        {!conversationId && (
          <span className="user-list__refresh-note">
            Refreshes every {REFRESH_INTERVAL_MS / 1000} seconds
          </span>
        )}
      </div>
      {!conversationId && (
        <input
          type="text"
          placeholder="Search users by name or email"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="user-list__search"
        />
      )}
      {isLoading ? (
        <p className="user-list__empty">
          Loading users…
          <span className="user-list__spinner" />
        </p>
      ) : filteredUsers.length === 0 ? (
        <p className="user-list__empty">
          {conversationId ? "No members yet." : searchQuery ? "No users found." : "No other users available to chat with."}
        </p>
      ) : (
        <ul className="user-list__items">
          {filteredUsers.map((userItem) => (
            <li
              key={userItem.id}
              className={`user-list__item${!conversationId && showActions ? " user-list__item--clickable user-list__item--stacked" : ""}`}
              onClick={!conversationId && showActions ? () => void handleStartChat(userItem.id) : undefined}
              onKeyDown={!conversationId && showActions ? (event) => handleItemKeyDown(event, userItem.id) : undefined}
              role={!conversationId && showActions ? "button" : undefined}
              tabIndex={!conversationId && showActions ? 0 : undefined}
            >
              <div className={`user-list__avatar${userItem.isActive ? " user-list__avatar--active" : ""}`}>
                {userItem.imageUrl ? (
                  <img src={userItem.imageUrl} alt={userItem.name || "User avatar"} />
                ) : (
                  <span>{userItem.name?.[0] || "U"}</span>
                )}
              </div>
              <div className="user-list__info user-list__info--stacked">
                <span className="user-list__name user-list__name--stacked">{userItem.name}</span>
                {conversationId && userItem.email && (
                  <span className="user-list__email">{userItem.email}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UserList;
