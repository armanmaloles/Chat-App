import { useEffect, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import {
  addConversationMember,
  createConversation,
  getConversationMembers,
  getUserConversations,
  getUsers,
} from "../api";

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
};

type UserListProps = {
  conversationId?: string;
  showActions?: boolean;
};

const UserList = ({ conversationId, showActions = false }: UserListProps) => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [startingChatId, setStartingChatId] = useState<string | null>(null);
  const { getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
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
            }))
            .filter((userData) => userData.id !== user?.id);
          setUsers(allUsers);
        }
      } catch (error) {
        console.error("Failed to load users", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadUsers();
  }, [conversationId, getToken, user?.id]);

  const handleStartChat = async (userId: string) => {
    if (!user?.id || conversationId) return;

    setStartingChatId(userId);
    try {
      const token = await getToken();
      const existingResponse = await getUserConversations(user.id, token);
      const existingConversation = (existingResponse.data as any[]).find((entry) => {
        const conversation = entry.conversation;
        if (!conversation || conversation.isGroup) return false;

        const memberIds = (conversation.members ?? [])
          .map((member: any) => member.user?.id)
          .filter(Boolean);

        return (
          memberIds.length === 2 &&
          memberIds.includes(user.id) &&
          memberIds.includes(userId)
        );
      });

      if (existingConversation) {
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
    } finally {
      setStartingChatId(null);
    }
  };

  const title = conversationId ? "Conversation members" : "Start a chat with";

  const handleItemKeyDown = (event: KeyboardEvent<HTMLLIElement>, userId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void handleStartChat(userId);
    }
  };

  return (
    <div className="user-list">
      <h3 className="user-list__title">{title}</h3>
      {isLoading ? (
        <p className="user-list__empty">Loading users…</p>
      ) : users.length === 0 ? (
        <p className="user-list__empty">
          {conversationId ? "No members yet." : "No other users available to chat with."}
        </p>
      ) : (
        <ul className="user-list__items">
          {users.map((userItem) => (
            <li
              key={userItem.id}
              className={`user-list__item${!conversationId && showActions ? " user-list__item--clickable user-list__item--stacked" : ""}`}
              onClick={!conversationId && showActions ? () => void handleStartChat(userItem.id) : undefined}
              onKeyDown={!conversationId && showActions ? (event) => handleItemKeyDown(event, userItem.id) : undefined}
              role={!conversationId && showActions ? "button" : undefined}
              tabIndex={!conversationId && showActions ? 0 : undefined}
            >
              <div className="user-list__avatar">
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
