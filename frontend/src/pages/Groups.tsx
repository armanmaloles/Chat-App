import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Link, useLocation } from "react-router-dom";
import {
  getUserConversations,
  getUsers,
  createConversation,
  addConversationMember,
} from "../lib/api";
  
type ConversationItem = {
  conversation: {
    id: string;
    name?: string | null;
    isGroup?: boolean;
    members?: Array<{ user?: { id?: string; name?: string | null } }>;
    messages?: Array<{
      content: string;
      createdAt?: string;
      sender?: { id?: string; name?: string | null };
    }>;
  };
};

type AvailableUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  imageUrl?: string | null;
};

const formatRelativeTime = (dateString?: string) => {
  if (!dateString) return "";

  const date = new Date(dateString);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

const Groups = () => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const location = useLocation();

  const [groups, setGroups] = useState<ConversationItem[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [name, setName] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [activeGroupId, setActiveGroupId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("chatApp:activeGroupId");
    } catch {
      return null;
    }
  });
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [convCollapsed, setConvCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("chatApp:conversationListCollapsed") === "1";
    } catch {
      return false;
    }
  });
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: "",
    visible: false,
  });

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      try {
        const token = await getToken();
        const res = await getUserConversations(user.id, token);
        const groupsOnly = (res.data as ConversationItem[])
          .filter((c) => c.conversation.isGroup)
          .sort((a, b) => {
            const aTime = a.conversation.messages?.[0]?.createdAt;
            const bTime = b.conversation.messages?.[0]?.createdAt;
            if (!aTime && !bTime) return 0;
            if (!aTime) return 1;
            if (!bTime) return -1;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
          });
        setGroups(groupsOnly);

        const usersRes = await getUsers(token);
        const users = (usersRes.data as AvailableUser[]).filter(
          (u) => u.id !== user.id,
        );
        setAvailableUsers(users);
      } catch (err) {
        console.error(err);
      }
    };

    void load();

    const handleConversationUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{
        conversationId: string;
        content: string;
        senderId: string;
        senderName: string;
        createdAt: string;
      }>;

      setGroups((current) => {
        const updated: ConversationItem[] = [];
        let updatedEntry: ConversationItem | null = null;

        current.forEach((entry) => {
          if (entry.conversation.id !== customEvent.detail.conversationId) {
            updated.push(entry);
            return;
          }

          updatedEntry = {
            ...entry,
            conversation: {
              ...entry.conversation,
              messages: [
                {
                  content: customEvent.detail.content,
                  createdAt: customEvent.detail.createdAt,
                  sender: {
                    id: customEvent.detail.senderId,
                    name: customEvent.detail.senderName,
                  },
                },
                ...(entry.conversation.messages || []),
              ],
            },
          };
        });

        if (updatedEntry) {
          return [updatedEntry, ...updated];
        }

        return current;
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void load();
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key?.startsWith("chatApp:conversation:read:")) {
        // trigger re-render so unread state updates
        setGroups((g) => [...g]);
      }
    };

    const intervalId = window.setInterval(() => void load(), 5000);

    window.addEventListener(
      "conversationUpdated",
      handleConversationUpdate as EventListener,
    );
    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(
        "conversationUpdated",
        handleConversationUpdate as EventListener,
      );
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [getToken, user?.id]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ activeGroupId: string | null }>;
      try {
        setActiveGroupId(customEvent.detail.activeGroupId ?? null);
      } catch {
        // ignore
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "chatApp:activeGroupId") {
        try {
          setActiveGroupId(event.newValue);
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener("activeGroupChanged", handler as EventListener);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("activeGroupChanged", handler as EventListener);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const toggle = (id: string) => {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  };


  const closeForm = () => {
    setShowForm(false);
    setName("");
    setSelected({});
  };

  const handleCreate = async () => {
    if (!user?.id) return;
    const memberIds = Object.keys(selected).filter((k) => selected[k]);
    if (memberIds.length === 0) {
      alert("Select at least one member to create a group.");
      return;
    }
    setIsCreating(true);
    try {
      const token = await getToken();
      const convRes = await createConversation(
        { name: name || null, isGroup: true, createdBy: user.id },
        token,
      );
      const convId = convRes.data.id;
      // add current user and selected members
      await addConversationMember(convId, user.id, token);
      for (const id of memberIds) {
        await addConversationMember(convId, id, token);
      }

      const newGroup: ConversationItem = {
        conversation: {
          id: convId,
          name: name || null,
          isGroup: true,
          members: [
            { user: { id: user.id, name: user.firstName } },
            ...availableUsers
              .filter((u) => selected[u.id])
              .map((u) => ({ user: { id: u.id, name: u.name } })),
          ],
        },
      };

      setGroups((prev) => [newGroup, ...prev]);

      // Show toast message
      setToast({ message: "Group created successfully!", visible: true });
      setTimeout(() => setToast({ message: "", visible: false }), 3000);

      // Reset form
      closeForm();
    } catch (err) {
      console.error(err);
      alert("Failed to create group");
    } finally {
      setIsCreating(false);
    }
  };

  const filteredAvailableUsers = availableUsers.filter(
    (u) => u.name?.toLowerCase().includes(memberSearch.toLowerCase()) ?? false,
  );

  const filteredGroups = groups.filter((g) =>
    g.conversation.name
      ? g.conversation.name.toLowerCase().includes(groupSearch.toLowerCase())
      : "group chat".includes(groupSearch.toLowerCase()),
  );

  const headerStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    gap: 12,
    marginBottom: 20,
    maxWidth: 840,
  } as const;

  const leftColumnStyle = {
    display: "flex",
    flexDirection: "row",
    gap: 0,
    alignItems: "center",
  } as const;

  const rightColumnStyle = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    width: "100%",
  } as const;

  return (
    <div className={`page page--groups${convCollapsed ? " page--groups--collapsed" : ""}`}>
      <div className="page--groups__header" style={headerStyle}>
        <div className="page--groups__left" style={leftColumnStyle}>
          <button
            className="conversation-list__toggle"
            onClick={() => {
              const next = !convCollapsed;
              setConvCollapsed(next);
              window.dispatchEvent(new Event("toggleConversationList"));
            }}
            aria-expanded={!convCollapsed}
            aria-label={convCollapsed ? "Expand" : "Collapse"}
            title={convCollapsed ? "Expand" : "Collapse"}
          > 
            {convCollapsed ? "›" : "‹"}
          </button>
        </div>

        <div className="page--groups__right" style={rightColumnStyle}>
          <h1 style={{ margin: 0 }}>Groups</h1>
          <button
            aria-label="Create group"
            className="button create-group"
            onClick={() => setShowForm(true)}
          >
            {convCollapsed ? "+" : "Create group"}
          </button>
        </div>
      </div>

      {toast.visible && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            padding: 12,
            borderRadius: 8,
            background: "#10b981",
            color: "white",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            zIndex: 1000,
          }}
        >
          {toast.message}
        </div>
      )}

      <div style={{ marginBottom: 6, maxWidth: 840 }}>
        <input
          placeholder="Search groups by name"
          value={groupSearch}
          onChange={(e) => setGroupSearch(e.target.value)}
          style={{
            width: "98%",
            padding: "10px 2px",
            marginTop: 0,
            marginLeft: "10px",
            borderRadius: 8,
            border: "1px solid #1f2937",
            background: "#0f172a",
            color: "#e2e8f0",
          }}
        />
        <div
          className="page--groups__label"
          style={{
            color: "#bbc5d1",
            fontSize: "0.95rem",
            margin: "10px 0 8px 10px",
            fontWeight: 600,
          }}
        >
          Your groups
        </div>

        {showForm && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(2, 6, 23, 0.72)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              zIndex: 1100,
            }}
            onClick={closeForm}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Create group"
              style={{
                width: "min(540px, 100%)",
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                padding: 32,
                boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
                display: "flex",
                flexDirection: "column",
                gap: 24,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#f8fafc" }}>
                  Create a new group
                </h2>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "0.9rem", fontWeight: 600, color: "#e2e8f0" }}>
                    Group name (optional)
                  </label>
                  <input
                    placeholder="e.g., Team Project"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(15, 23, 42, 0.6)",
                      color: "#e2e8f0",
                      fontSize: "0.95rem",
                      transition: "all 200ms ease",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "rgba(37, 99, 235, 0.5)";
                      e.currentTarget.style.background = "rgba(15, 23, 42, 1)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                      e.currentTarget.style.background = "rgba(15, 23, 42, 0.6)";
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: "0.9rem", fontWeight: 600, color: "#e2e8f0" }}>
                    Add members
                  </label>
                  <input
                    placeholder="Search by name..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(15, 23, 42, 0.6)",
                      color: "#e2e8f0",
                      fontSize: "0.95rem",
                      transition: "all 200ms ease",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "rgba(37, 99, 235, 0.5)";
                      e.currentTarget.style.background = "rgba(15, 23, 42, 1)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                      e.currentTarget.style.background = "rgba(15, 23, 42, 0.6)";
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  maxHeight: 260,
                  overflowY: "auto",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(15, 23, 42, 0.4)",
                }}
              >
                {filteredAvailableUsers.length === 0 ? (
                  <div style={{ padding: "24px 16px", textAlign: "center", color: "#94a3b8" }}>
                    {memberSearch ? "No users found." : "No users available."}
                  </div>
                ) : (
                  filteredAvailableUsers.map((u) => {
                    const isSelected = !!selected[u.id];
                    const initials = (u.name || "U")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);
                    return (
                      <label
                        key={u.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 16px",
                          cursor: "pointer",
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          transition: "all 150ms ease",
                          background: isSelected ? "rgba(37, 99, 235, 0.1)" : "transparent",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isSelected
                            ? "rgba(37, 99, 235, 0.1)"
                            : "transparent";
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggle(u.id)}
                          style={{
                            width: 18,
                            height: 18,
                            cursor: "pointer",
                            accentColor: "#2563eb",
                            flexShrink: 0,
                          }}
                        />
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: u.imageUrl
                              ? "transparent"
                              : isSelected
                                ? "linear-gradient(135deg, #2563eb, #1d4ed8)"
                                : "linear-gradient(135deg, #334155, #1e293b)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            color: isSelected ? "#e0e7ff" : "#cbd5e1",
                            backgroundImage: u.imageUrl ? `url("${u.imageUrl}")` : undefined,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            flexShrink: 0,
                          }}
                        >
                          {!u.imageUrl && initials}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
                          <span
                            style={{
                              color: "#e2e8f0",
                              fontSize: "0.95rem",
                              fontWeight: isSelected ? 600 : 500,
                            }}
                          >
                            {u.name || "Unknown"}
                          </span>
                          {u.email && (
                            <span
                              style={{
                                color: "#94a3b8",
                                fontSize: "0.85rem",
                              }}
                            >
                              {u.email}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  justifyContent: "flex-end",
                }}
              >
                <button
                  className="button"
                  onClick={closeForm}
                  style={{
                    background: "transparent",
                    color: "#cbd5e1",
                    border: "1px solid rgba(255,255,255,0.2)",
                    fontWeight: 600,
                    padding: "11px 24px",
                    borderRadius: 10,
                    cursor: "pointer",
                    transition: "all 200ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                  }}
                >
                  Cancel
                </button>
                <button
                  className="button"
                  onClick={handleCreate}
                  disabled={isCreating}
                  style={{
                    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: 600,
                    padding: "11px 28px",
                    borderRadius: 10,
                    cursor: isCreating ? "not-allowed" : "pointer",
                    transition: "all 200ms ease",
                    opacity: isCreating ? 0.7 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isCreating) {
                      e.currentTarget.style.boxShadow = "0 8px 16px rgba(37, 99, 235, 0.3)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {isCreating ? "Creating…" : "Create group"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        className="conversation-list__scroll-wrapper page--groups__group-list-wrapper"
        style={{ maxWidth: 840 }}
      >
        <div className="conversation-list conversation-list--scroll group-conversation-list" style={{ marginTop: "5px" }}>
          {filteredGroups.length === 0 ? (
            <div className="conversation-list__empty">No groups yet.</div>
          ) : (
            filteredGroups.map((g) => {
              const currentUserId = user?.id;
              const title = g.conversation.name || "Group chat";
              const lastMessage = g.conversation.messages?.[0];
              const senderName =
                lastMessage?.sender?.id === currentUserId
                  ? "You"
                  : lastMessage?.sender?.name || "Unknown";
              const getAttachmentPreview = (content: string, senderName: string) => {
                if (!content) return `${senderName}:`;

                try {
                  const parsed = JSON.parse(content);
                  if (parsed && typeof parsed === "object") {
                    if (parsed.deleted) {
                      return "Message deleted";
                    }

                    if (Array.isArray(parsed.attachments) ? parsed.attachments.length > 0 : parsed.attachment) {
                      if (senderName === "You") {
                        return `You sent an attachment`;
                      }
                      return `${senderName} sent an attachment`;
                    }
                    if (typeof parsed.text === "string" && parsed.text.trim()) {
                      return `${senderName}: ${parsed.text}`;
                    }
                  }
                } catch {
                  // Fall back to raw content
                }

                return `${senderName}: ${content}`;
              };

              const subtitle = lastMessage
                ? getAttachmentPreview(lastMessage.content, senderName)
                : `${(g.conversation.members ?? []).length} members`;
              const time = formatRelativeTime(lastMessage?.createdAt);
              const isActive =
                location.pathname === `/app/groups/${g.conversation.id}` ||
                activeGroupId === g.conversation.id;
              const lastReadAt = localStorage.getItem(
                `chatApp:conversation:read:${g.conversation.id}`,
              )
                ? new Date(
                    localStorage.getItem(
                      `chatApp:conversation:read:${g.conversation.id}`,
                    ) as string,
                  )
                : null;
              const isUnread = Boolean(
                lastMessage &&
                !isActive &&
                (!lastReadAt ||
                  (lastMessage.createdAt &&
                    new Date(lastMessage.createdAt) > lastReadAt)),
              );

              return (
                <div key={g.conversation.id}>
                  <Link
                    to={`/app/groups/${g.conversation.id}`}
                    className={`conversation-list__item${isActive ? " conversation-list__item--active" : ""}`}
                    style={{ position: "relative" }}
                    onClick={() => {
                      setActiveGroupId(g.conversation.id);
                      try {
                        localStorage.setItem("chatApp:activeGroupId", g.conversation.id);
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    <div className="conversation-list__avatar">
                      <span>{title.slice(0, 1).toUpperCase()}</span>
                      {lastMessage && isUnread ? (
                        <span className="conversation-list__badge conversation-list__badge--avatar" />
                      ) : null}
                    </div>
                    <div className="conversation-list__details">
                      <div className="conversation-list__name">{title}</div>
                      <div
                        className={`conversation-list__subtitle${isUnread ? " conversation-list__subtitle--unread" : ""}`}
                      >
                        {subtitle}
                      </div>
                    </div>
                    <div
                      className="conversation-list__meta"
                      style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", gap: 6 }}
                    >
                      {time && <span className="conversation-list__time">{time}</span>}
                      {lastMessage && isUnread ? (
                        <span className="conversation-list__badge conversation-list__badge--meta" />
                      ) : null}
                    </div>
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Groups;