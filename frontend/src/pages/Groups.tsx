import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Link, useLocation } from "react-router-dom";
import {
  getUserConversations,
  getUsers,
  createConversation,
  addConversationMember,
} from "../api";

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
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });

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
        const users = (usersRes.data as AvailableUser[]).filter((u) => u.id !== user.id);
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

    window.addEventListener("conversationUpdated", handleConversationUpdate as EventListener);
    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("conversationUpdated", handleConversationUpdate as EventListener);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [getToken, user?.id]);

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
      const convRes = await createConversation({ name: name || null, isGroup: true, createdBy: user.id }, token);
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

  return (
    <div className="page page--groups">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 20, maxWidth: 840 }}>
        <h1 style={{ margin: 0 }}>Groups</h1>
        <button className="button" onClick={() => setShowForm(true)}>
          Create group
        </button>
      </div>

      {toast.visible && (
        <div style={{ position: "fixed", top: 20, right: 20, padding: 12, borderRadius: 8, background: "#10b981", color: "white", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)", zIndex: 1000 }}>
          {toast.message}
        </div>
      )}

      <div style={{ marginBottom: 20, maxWidth: 840 }}>
        <input
          placeholder="Search groups by name"
          value={groupSearch}
          onChange={(e) => setGroupSearch(e.target.value)}
          style={{ width: "100%", padding: "10px 2px", marginTop: "-10px", borderRadius: 8, border: "1px solid #1f2937", background: "#0f172a", color: "#e2e8f0" }}
        />

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
                borderRadius: 12,
                padding: 20,
                boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: "0 0 8px 0" }}>Create group</h3>
              <input
                placeholder="Group name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #1f2937", background: "#0f172a", color: "#e2e8f0", marginBottom: 8 }}
              />
              <div
                style={{
                  maxHeight: availableUsers.length > 5 ? 220 : "auto",
                  overflowY: availableUsers.length > 5 ? "auto" : "visible",
                  paddingRight: 8,
                  border: "1px solid rgba(255,255,255,0.02)",
                  borderRadius: 8,
                }}
              >
                {availableUsers.map((u) => (
                  <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px" }}>
                    <input type="checkbox" checked={!!selected[u.id]} onChange={() => toggle(u.id)} />
                    <span style={{ color: "#e2e8f0" }}>{u.name || "Unknown"}</span>
                  </label>
                ))}
              </div>
              <div style={{ marginTop: 12, display: "flex", flexDirection: "row-reverse", gap: 8 }}>
                <button className="button" onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? "Creating…" : "Create group"}
                </button>
                <button className="button" onClick={closeForm} style={{ background: "#374151", borderColor: "#4b5563" }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 840 }} className="conversation-list conversation-list--scroll">
        {groups.length === 0 ? (
          <div className="conversation-list__empty">No groups yet.</div>
        ) : (
          groups
            .filter((g) =>
              g.conversation.name
                ? g.conversation.name.toLowerCase().includes(groupSearch.toLowerCase())
                : "group chat".includes(groupSearch.toLowerCase()),
            )
            .map((g) => {
              const currentUserId = user?.id;
              const title = g.conversation.name || "Group chat";
              const lastMessage = g.conversation.messages?.[0];
              const senderName = lastMessage?.sender?.id === currentUserId ? "You" : lastMessage?.sender?.name || "Unknown";
              const subtitle = lastMessage ? `${senderName}: ${lastMessage.content}` : `${(g.conversation.members ?? []).length} members`;
              const time = formatRelativeTime(lastMessage?.createdAt);
              const isActive = location.pathname === `/app/groups/${g.conversation.id}`;
              const lastReadAt = localStorage.getItem(`chatApp:conversation:read:${g.conversation.id}`)
                ? new Date(localStorage.getItem(`chatApp:conversation:read:${g.conversation.id}`) as string)
                : null;
              const isUnread = Boolean(
                lastMessage &&
                  !isActive &&
                  (!lastReadAt || (lastMessage.createdAt && new Date(lastMessage.createdAt) > lastReadAt)),
              );

              return (
                <Link
                  key={g.conversation.id}
                  to={`/app/groups/${g.conversation.id}`}
                  className={`conversation-list__item${isActive ? " conversation-list__item--active" : ""}`}
                  style={{ marginBottom: 2 }}
                >
                  <div className="conversation-list__avatar">
                    <span>{title.slice(0, 1).toUpperCase()}</span>
                  </div>
                  <div className="conversation-list__details">
                    <div className="conversation-list__name">{title}</div>
                    <div className={`conversation-list__subtitle${isUnread ? " conversation-list__subtitle--unread" : ""}`}>{subtitle}</div>
                  </div>
                  <div className="conversation-list__meta">
                    {time && <span className="conversation-list__time">{time}</span>}
                    {lastMessage && isUnread ? <span className="conversation-list__badge" /> : null}
                  </div>
                </Link>
              );
            })
        )}
      </div>
    </div>
  );
};

export default Groups;

