import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import {
  getConversation,
  getUsers,
  addConversationMember,
  removeConversationMember,
  updateConversationMemberSettings,
} from "../lib/api";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import ChatWindow from "../components/ChatWindow";

type LeaveGroupButtonProps = {
  conversationId?: string | undefined;
  onLeft?: () => void;
  navigate?: NavigateFunction;
};

function LeaveGroupButton({
  conversationId,
  onLeft,
  navigate: navigateProp,
}: LeaveGroupButtonProps) {
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
      const response = await removeConversationMember(
        conversationId,
        user.id,
        token,
      );
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
        errorMessage =
          axiosError.response?.data?.error || "Failed to leave group";
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
      className="chat-room__leave-button"
    >
      {leaving ? "Leaving…" : "Leave"}
    </button>
  );
}

type ConversationMember = {
  user?: { id?: string; name?: string | null; email?: string | null };
  notificationsEnabled?: boolean;
};

const ChatRoom = () => {
  const { id } = useParams();
  const [title, setTitle] = useState<string>("");
  const [subtitle, setSubtitle] = useState<string>("");
  const [members, setMembers] = useState<ConversationMember[] | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [closeButtonHovered, setCloseButtonHovered] = useState(false);
  const [isGroup, setIsGroup] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<
    Array<{ id: string; name: string; email?: string | null }>
  >([]);
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
          members?: ConversationMember[];
        };

        if (conversation.isGroup) {
          const groupName = conversation.name || "Group chat";
          const memberNames = conversation.members
            ?.map((member) => member.user)
            .filter(
              (
                userInfo,
              ): userInfo is {
                id: string;
                name?: string | null;
                email?: string | null;
              } => Boolean(userInfo && userInfo.id !== user.id),
            )
            .map((member) => member.name || member.email || "Unknown")
            .join(", ");

          setTitle(groupName);
          setSubtitle(memberNames ? `Members: ${memberNames}` : "Group chat");
          setMembers(conversation.members || []);

          const currentMember = conversation.members?.find(
            (member) => member.user?.id === user.id,
          );
          setNotificationsEnabled(
            currentMember?.notificationsEnabled ?? true,
          );

          setIsGroup(true);
        } else {
          setIsGroup(false);
          setMembers(conversation.members || []);

          const otherUser = conversation.members?.find(
            (member) => member.user?.id && member.user.id !== user.id,
          )?.user;

          const currentMember = conversation.members?.find(
            (member) => member.user?.id === user.id,
          );

          setNotificationsEnabled(
            currentMember?.notificationsEnabled ?? true,
          );

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
      if (!showSettings || !id || !user?.id || !isGroup) return;

      try {
        setUsersLoading(true);
        const token = await getToken();
        const response = await getUsers(token);
        const currentMemberIds = new Set(
          members
            ?.map((member) => member.user?.id)
            .filter((id): id is string => Boolean(id)) ?? [],
        );

        const users = (
          response.data as Array<{
            id: string;
            name?: string | null;
            email?: string | null;
          }>
        )
          .filter(
            (userData) =>
              userData.id !== user.id && !currentMemberIds.has(userData.id),
          )
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
  }, [showSettings, getToken, id, isGroup, members, user?.id]);

  const handleToggleConversationNotifications = async () => {
    if (!id || !user?.id) return;

    setNotificationError(null);
    setNotificationLoading(true);

    try {
      const token = await getToken();
      const response = await updateConversationMemberSettings(
        id,
        user.id,
        { notificationsEnabled: !notificationsEnabled },
        token,
      );

      const enabled = response.data.notificationsEnabled;
      setNotificationsEnabled(enabled);
      setMembers((current) =>
        current?.map((member) =>
          member.user?.id === user.id
            ? { ...member, notificationsEnabled: enabled }
            : member,
        ) ?? current,
      );
    } catch (error) {
      console.error("Failed to update conversation notification settings", error);
      setNotificationError("Unable to save notification settings. Please try again.");
    } finally {
      setNotificationLoading(false);
    }
  };

  const filteredMembers = members?.filter((member) => {
    const userInfo = member.user;
    if (!userInfo) return false;
    const query = searchMembers.trim().toLowerCase();
    if (!query) return true;

    const name = userInfo.name?.toLowerCase() ?? "";
    const email = userInfo.email?.toLowerCase() ?? "";

    return name.includes(query) || email.includes(query);
  });

  const filteredAvailableUsers = availableUsers.filter(
    (available) =>
      available.name.toLowerCase().includes(searchMembers.toLowerCase()) ||
      (available.email?.toLowerCase().includes(searchMembers.toLowerCase()) ??
        false),
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
        setAvailableUsers((prev) =>
          prev.filter((userData) => userData.id !== userId),
        );
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
      <header className="chat-room__header">
        <div className="chat-room__title-group">
          <h1>{title || (id ? `Conversation ${id}` : "Unknown")}</h1>
          {subtitle && <p className="chat-room__subtitle">{subtitle}</p>}
        </div>

        <button
          type="button"
          className="chat-room__settings-button"
          onClick={() => setShowSettings(true)}
          aria-expanded={showSettings}
          aria-label="Conversation settings"
          title="Conversation settings"
        >
          <span>⚙️</span>
        </button>
      </header>

      {showSettings && members && members.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Conversation settings"
          onClick={() => setShowSettings(false)}
          className="chat-room__settings-modal"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="chat-room__settings-panel"
          >
            <div className="chat-room__settings-panel-header">
              <div>
                <h2 className="chat-room__section-title">Conversation settings</h2>
                {isGroup ? (
                  <p className="chat-room__section-description">
                    {members.length} member{members.length === 1 ? "" : "s"}
                  </p>
                ) : (
                  <p className="chat-room__section-description">Private conversation</p>
                )}
              </div>
              <button
                type="button"
                className={`chat-room__settings-close ${closeButtonHovered ? "chat-room__settings-close--hover" : ""}`}
                onClick={() => setShowSettings(false)}
                onMouseEnter={() => setCloseButtonHovered(true)}
                onMouseLeave={() => setCloseButtonHovered(false)}
              >
                Close
              </button>
            </div>

            <section className="chat-room__settings-section">
              <div className="chat-room__settings-row">
                <div>
                  <div className="chat-room__section-title">Conversation notifications</div>
                  <p className="chat-room__section-description">
                    Notification is currently {notificationsEnabled ? "on" : "off"} for this conversation.
                  </p>
                </div>
                <button
                  type="button"
                  className={`conversation-notifications-toggle ${notificationsEnabled ? "conversation-notifications-toggle--on" : "conversation-notifications-toggle--off"}`}
                  onClick={handleToggleConversationNotifications}
                  disabled={notificationLoading}
                  aria-pressed={notificationsEnabled}
                >
                  <span className="conversation-notifications-toggle__segment conversation-notifications-toggle__segment--off">Off</span>
                  <span className="conversation-notifications-toggle__segment conversation-notifications-toggle__segment--on">On</span>
                </button>
              </div>

              {notificationError && (
                <div className="chat-room__error-text">{notificationError}</div>
              )}
            </section>

            {isGroup && (
              <section className="chat-room__settings-section">
                <div className="chat-room__section-row">
                  <div>
                    <div className="chat-room__section-title">Members</div>
                    <p className="chat-room__section-description">
                      Manage the members in this group conversation.
                    </p>
                  </div>
                  <input
                    type="text"
                    value={searchMembers}
                    onChange={(e) => setSearchMembers(e.target.value)}
                    placeholder="Search members by name or email"
                    className="chat-room__search-input"
                  />
                </div>

                <ul className="chat-room__members-list">
                  {filteredMembers?.length ? (
                    filteredMembers.map((member) => {
                      const userInfo = member.user;
                      if (!userInfo?.id) return null;
                      const isCurrentUser = userInfo.id === user?.id;
                      return (
                        <li key={userInfo.id} className="chat-room__member-item">
                          <div>
                            <div className="chat-room__member-name">
                              {userInfo.name || userInfo.email || "Unknown"}
                              {isCurrentUser ? " (You)" : ""}
                            </div>
                            {userInfo.email && (
                              <div className="chat-room__member-email">{userInfo.email}</div>
                            )}
                          </div>
                        </li>
                      );
                    })
                  ) : (
                    <li className="chat-room__empty-state">No members match your search.</li>
                  )}
                </ul>
              </section>
            )}

            {isGroup && (
              <section className="chat-room__settings-section">
                <div className="chat-room__section-row">
                  <div>
                    <div className="chat-room__section-title">Add members</div>
                    <p className="chat-room__section-description">
                      Invite more people into the conversation.
                    </p>
                  </div>
                </div>

                {usersLoading ? (
                  <p className="chat-room__section-description">Loading available users…</p>
                ) : filteredAvailableUsers.length === 0 ? (
                  <p className="chat-room__section-description">No additional users are available to add.</p>
                ) : (
                  <ul className="chat-room__members-list">
                    {filteredAvailableUsers.map((available) => (
                      <li key={available.id} className="chat-room__member-item">
                        <div>
                          <div className="chat-room__member-name">{available.name}</div>
                          {available.email && (
                            <div className="chat-room__member-email">{available.email}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="chat-room__add-button"
                          onClick={() => void handleAddMember(available.id)}
                          disabled={addingUserId === available.id}
                          style={{ backgroundColor: addingUserId === available.id ? "#94a3b8" : "#3b82f6" }}
                        >
                          {addingUserId === available.id ? "Adding…" : "Add"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {isGroup && (
              <div className="chat-room__action-footer">
                <LeaveGroupButton
                  conversationId={id}
                  onLeft={() => {
                    setMembers((current) =>
                      current?.filter((member) => member.user?.id !== user?.id) ?? null,
                    );
                    setShowSettings(false);
                  }}
                />
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
