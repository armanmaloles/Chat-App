import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { getConversation, getUsers, addConversationMember, removeConversationMember } from "../api";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import ChatWindow from "../components/ChatWindow";

type LeaveGroupButtonProps = {
  conversationId?: string | undefined;
  onLeft?: () => void;
  navigate?: NavigateFunction;
};

function LeaveGroupButton({ conversationId, onLeft, navigate: navigateProp }: LeaveGroupButtonProps) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const navigateDefault = useNavigate();
  const navigate = navigateProp || navigateDefault;
  const [leaving, setLeaving] = useState(false);

  const handleLeave = async () => {
    if (!conversationId || !user?.id) return;
    const ok = window.confirm("Leave this group?");
    if (!ok) return;
    setLeaving(true);
    try {
      const token = await getToken();
      const response = await removeConversationMember(conversationId, user.id, token);
      console.log("Successfully left group", response);
      if (onLeft) onLeft();
      // Navigate away after successful removal
      navigate("/app/groups");
    } catch (err) {
      console.error("Failed to leave group", err);
      let errorMessage = "Failed to leave group";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        errorMessage = axiosError.response?.data?.error || "Failed to leave group";
      }
      alert(errorMessage);
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
  const [closeButtonHovered, setCloseButtonHovered] = useState(false);
  const [isGroup, setIsGroup] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; email?: string | null }>>([]);
  const [searchMembers, setSearchMembers] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
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
          setIsGroup(true);
        } else {
          setIsGroup(false);
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

  useEffect(() => {
    const loadAvailableUsers = async () => {
      if (!showMembers || !id || !user?.id || !isGroup) return;

      try {
        setUsersLoading(true);
        const token = await getToken();
        const response = await getUsers(token);
        const currentMemberIds = new Set(
          members?.map((member) => member.user?.id).filter((id): id is string => Boolean(id)) ?? [],
        );

        const users = (response.data as Array<{ id: string; name?: string | null; email?: string | null }>)
          .filter((userData) => userData.id !== user.id && !currentMemberIds.has(userData.id))
          .map((userData) => ({
            id: userData.id,
            name: userData.name || userData.email || "Unknown user",
            email: userData.email,
          }));

        setAvailableUsers(users);
      } catch (error) {
        console.error("Failed to load available users", error);
      } finally {
        setUsersLoading(false);
      }
    };

    void loadAvailableUsers();
  }, [showMembers, getToken, id, isGroup, members, user?.id]);

  const filteredAvailableUsers = availableUsers.filter((available) =>
    available.name.toLowerCase().includes(searchMembers.toLowerCase()) ||
    (available.email?.toLowerCase().includes(searchMembers.toLowerCase()) ?? false),
  );

  const handleAddMember = async (userId: string) => {
    if (!id) return;

    try {
      setAddingUserId(userId);
      const token = await getToken();
      await addConversationMember(id, userId, token);
      const added = availableUsers.find((userData) => userData.id === userId);
      if (added) {
        setMembers((current) => [
          ...(current ?? []),
          { user: { id: added.id, name: added.name, email: added.email } },
        ]);
        setAvailableUsers((prev) => prev.filter((userData) => userData.id !== userId));
      }
    } catch (error) {
      console.error("Failed to add member", error);
      alert("Failed to add member");
    } finally {
      setAddingUserId(null);
    }
  };

  return (
    <div className="page page--chat-room">
      <header className="chat-room__header" style={{ position: "relative" }}>
        <h1>{title || (id ? `Conversation ${id}` : "Unknown")}</h1>
        
        {members && members.length > 0 && (
          <div style={{ position: "absolute", right: 12, top: 12, display: "flex", gap: 8 }}>
            <button
              onClick={() => setShowMembers(true)}
              aria-expanded={showMembers}
              title="View members"
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "#e2e8f0",
                padding: "6px 10px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Members
            </button>

            <LeaveGroupButton
              conversationId={id}
            />
          </div>
        )}

        
      </header>

      {showMembers && members && members.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Conversation members"
          onClick={() => setShowMembers(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(560px, 100%)",
              maxHeight: "85vh",
              overflow: "auto",
              background: "#0f1724",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
              padding: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, color: "#fff", fontSize: "1.25rem" }}>Conversation members</h2>
                <p style={{ margin: "6px 0 0", color: "#94a3b8" }}>
                  {members.length} member{members.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                onClick={() => setShowMembers(false)}
                onMouseEnter={() => setCloseButtonHovered(true)}
                onMouseLeave={() => setCloseButtonHovered(false)}
                style={{
                  background: "transparent",
                  border: closeButtonHovered ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.08)",
                  color: closeButtonHovered ? "#ef4444" : "#e2e8f0",
                  padding: "8px 12px",
                  borderRadius: 10,
                  cursor: "pointer",
                  transition: "all 150ms ease",
                }}
              >
                Close
              </button>
            </div>

            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
              {members.map((member) => {
                const userInfo = member.user;
                if (!userInfo?.id) return null;
                const isCurrentUser = userInfo.id === user?.id;
                return (
                  <li
                    key={userInfo.id}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 14,
                      padding: "14px 16px",
                    }}
                  >
                    <strong style={{ display: "block", color: "#fff", marginBottom: 4 }}>
                      {userInfo.name || userInfo.email || "Unknown"}
                      {isCurrentUser ? " (You)" : ""}
                    </strong>
                    {userInfo.email && (
                      <span style={{ color: "#cbd5e1" }}>{userInfo.email}</span>
                    )}
                  </li>
                );
              })}
            </ul>

            {isGroup && (
              <div style={{ marginTop: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <h3 style={{ margin: 0, color: "#fff", fontSize: "1rem" }}>Add member</h3>
                  </div>
                  <input
                    type="text"
                    value={searchMembers}
                    onChange={(e) => setSearchMembers(e.target.value)}
                    placeholder="Search users by name or email"
                    style={{
                      flex: "1 1 220px",
                      minWidth: 220,
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.04)",
                      color: "#e2e8f0",
                    }}
                  />
                </div>

                <div style={{ marginTop: 16 }}>
                  {usersLoading ? (
                    <p style={{ color: "#cbd5e1" }}>Loading available users…</p>
                  ) : filteredAvailableUsers.length === 0 ? (
                    <p style={{ color: "#cbd5e1" }}>
                      No additional users are available to add.
                    </p>
                  ) : (
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
                      {filteredAvailableUsers.map((available) => (
                        <li
                          key={available.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 14,
                            padding: "12px 14px",
                          }}
                        >
                          <div>
                            <div style={{ color: "#fff", fontWeight: 600 }}>{available.name}</div>
                            {available.email && (
                              <div style={{ color: "#94a3b8", marginTop: 4 }}>{available.email}</div>
                            )}
                          </div>
                          <button
                            onClick={() => void handleAddMember(available.id)}
                            disabled={addingUserId === available.id}
                            style={{
                              background: addingUserId === available.id ? "rgba(148,163,184,0.24)" : "#2563eb",
                              border: "none",
                              color: "white",
                              padding: "8px 14px",
                              borderRadius: 10,
                              cursor: addingUserId === available.id ? "default" : "pointer",
                            }}
                          >
                            {addingUserId === available.id ? "Adding…" : "Add"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ChatWindow conversationId={id} />
    </div>
  );
};

export default ChatRoom;
