import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import {
  addConversationMember,
  createConversation,
  getConversationMembers,
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
    if (!user?.id || !conversationId === false) return;

    setStartingChatId(userId);
    try {
      const token = await getToken();
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

  const title = conversationId ? "Conversation members" : "Start a new chat";

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
            <li key={userItem.id} className="user-list__item">
              <span>{userItem.name}</span>
              {!conversationId && showActions && (
                <button
                  type="button"
                  className="user-list__button"
                  disabled={startingChatId === userItem.id}
                  onClick={() => handleStartChat(userItem.id)}
                >
                  {startingChatId === userItem.id ? "Starting…" : "Start chat"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UserList;
