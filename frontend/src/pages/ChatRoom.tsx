import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import ChatWindow from "../components/ChatWindow";
import { getConversation } from "../api";

const ChatRoom = () => {
  const { id } = useParams();
  const [otherName, setOtherName] = useState<string>("");
  const { getToken } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    const loadConversation = async () => {
      if (!id || !user?.id) return;

      try {
        const token = await getToken();
        const response = await getConversation(id, token);
        const conversation = response.data as {
          name?: string | null;
          creator?: { id?: string; name?: string | null };
          members?: Array<{ user?: { id?: string; name?: string | null; email?: string | null } }>;
        };

        const otherUser = conversation.members?.find(
          (member) => member.user?.id && member.user.id !== user.id,
        )?.user;

        const name =
          otherUser?.name ||
          otherUser?.email ||
          conversation.creator?.name ||
          conversation.name ||
          "Unknown";

        setOtherName(name);
      } catch (error) {
        console.error("Failed to load conversation", error);
      }
    };

    void loadConversation();
  }, [getToken, id, user?.id]);

  return (
    <div className="page page--chat-room">
      <header className="chat-room__header">
        <h1>Chat with {otherName || (id ? `Conversation ${id}` : "Unknown")}</h1>
      </header>
      <ChatWindow conversationId={id} />
    </div>
  );
};

export default ChatRoom;
