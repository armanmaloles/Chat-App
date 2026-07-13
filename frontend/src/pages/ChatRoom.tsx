import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import ChatWindow from "../components/ChatWindow";
import { getConversation } from "../api";

const ChatRoom = () => {
  const { id } = useParams();
  const [title, setTitle] = useState<string>("");
  const [subtitle, setSubtitle] = useState<string>("");
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
          isGroup?: boolean;
          creator?: { id?: string; name?: string | null };
          members?: Array<{ user?: { id?: string; name?: string | null; email?: string | null } }>;
        };

        if (conversation.isGroup) {
          const groupName = conversation.name || "Group chat";
          const memberNames = conversation.members
            ?.map((member) => member.user)
            .filter((userInfo): userInfo is { id: string; name?: string | null; email?: string | null } => Boolean(userInfo && userInfo.id !== user.id))
            .map((member) => member.name || member.email || "Unknown")
            .join(", ");

          setTitle(groupName);
          setSubtitle(memberNames ? `Members: ${memberNames}` : "Group chat");
        } else {
          const otherUser = conversation.members?.find(
            (member) => member.user?.id && member.user.id !== user.id,
          )?.user;

          const name =
            otherUser?.name ||
            otherUser?.email ||
            conversation.creator?.name ||
            conversation.name ||
            "Unknown";

          setTitle(`Chat with ${name}`);
          setSubtitle("");
        }
      } catch (error) {
        console.error("Failed to load conversation", error);
      }
    };

    void loadConversation();
  }, [getToken, id, user?.id]);

  return (
    <div className="page page--chat-room">
      <header className="chat-room__header">
        <h1>{title || (id ? `Conversation ${id}` : "Unknown")}</h1>
        {subtitle && <p>{subtitle}</p>}
      </header>
      <ChatWindow conversationId={id} />
    </div>
  );
};

export default ChatRoom;
