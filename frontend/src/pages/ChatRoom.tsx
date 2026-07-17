import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { removeConversationMember } from "../api";
import { useNavigate } from "react-router-dom";
import ChatWindow from "../components/ChatWindow";
import { getConversation } from "../api";

type LeaveGroupButtonProps = {
  conversationId?: string | undefined;
  onLeft?: () => void;
};

function LeaveGroupButton({ conversationId, onLeft }: LeaveGroupButtonProps) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);

  const handleLeave = async () => {
    if (!conversationId || !user?.id) return;
    const ok = window.confirm("Leave this group?");
    if (!ok) return;
    setLeaving(true);
    try {
      const token = await getToken();
      await removeConversationMember(conversationId, user.id, token);
      if (onLeft) onLeft();
    } catch (err) {
      console.error("Failed to leave group", err);
      alert("Failed to leave group");
    } finally {
      setLeaving(false);
    }
  };

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void handleLeave();
      }}
      disabled={leaving}
      title="Leave group"
      style={{
        background: "#ef4444",
        border: "1px solid rgba(0,0,0,0.12)",
        color: "white",
        padding: "6px 10px",
        borderRadius: 8,
        cursor: "pointer",
      }}
    >
      {leaving ? "Leaving…" : "Leave"}
    </button>
  );
}

const ChatRoom = () => {
  const { id } = useParams();
  const [title, setTitle] = useState<string>("");
  const [subtitle, setSubtitle] = useState<string>("");
  const [members, setMembers] = useState<Array<{ user?: { id?: string; name?: string | null; email?: string | null } }> | null>(null);
  const [showMembers, setShowMembers] = useState(false);
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
          setMembers(conversation.members || []);
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
      <header className="chat-room__header" style={{ position: "relative" }}>
        <h1>{title || (id ? `Conversation ${id}` : "Unknown")}</h1>
        
        {members && members.length > 0 && (
          <div style={{ position: "absolute", right: 12, top: 12, display: "flex", gap: 8 }}>
            <button
              onClick={() => setShowMembers((v) => !v)}
              aria-expanded={showMembers}
              title={showMembers ? "Hide members" : "Show members"}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "#e2e8f0",
                padding: "6px 10px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              {showMembers ? "Hide members" : "Show members"}
            </button>

            <LeaveGroupButton
              conversationId={id}
              onLeft={() => {
                // navigate back to groups list after leaving
                navigate("/app/groups");
              }}
            />
          </div>
        )}

        
      </header>
      <ChatWindow conversationId={id} />
    </div>
  );
};

export default ChatRoom;
