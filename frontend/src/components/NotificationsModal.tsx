import { useEffect, useRef, useState } from "react";

type NotificationSummary = {
  conversationId: string;
  conversationName: string;
  unreadCount: number;
  latestAt: string;
  isGroup?: boolean;
  otherMemberId?: string;
  otherMemberName?: string | null;
  otherMemberImage?: string | null;
};

type NotificationsModalProps = {
  onClose: () => void;
  onRefresh: () => void;
  onConversationClick: (conversationId: string, isGroup?: boolean) => void;
  notifications: NotificationSummary[];
  loading: boolean;
  error: string | null;
};

const NotificationsModal = ({ onClose, onRefresh, onConversationClick, notifications, loading, error }: NotificationsModalProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [filter, setFilter] = useState<"all" | "chats" | "groups">("all");

  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    if (now === 0) return "Just now";
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  useEffect(() => {
    // refresh `now` periodically to keep relative times up-to-date
    const timerId = window.setInterval(() => setNow(Date.now()), 60000);

    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
      window.clearInterval(timerId);
    };
  }, [onClose]);

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "all") return true;
    if (filter === "chats") return !notification.isGroup;
    return Boolean(notification.isGroup);
  });

  return (
    <div className="notifications-modal" ref={ref} role="dialog" aria-label="Notifications">
      <div className="notifications-modal__header">
        <div className="notifications-modal__header-top">
          <strong>Notifications</strong>
          <div className="notifications-modal__header-actions">
            <button
              type="button"
              className="notifications-modal__refresh-button"
              aria-label="Refresh notifications"
              onClick={onRefresh}
            >
              ⟳
            </button>
            <button
              type="button"
              className="notifications-modal__close"
              aria-label="Close notifications"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </div>
        <div className="notifications-modal__filters" role="group" aria-label="Notification filters">
          <button
            type="button"
            className={`notifications-modal__filter${filter === "all" ? " notifications-modal__filter--active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            type="button"
            className={`notifications-modal__filter${filter === "chats" ? " notifications-modal__filter--active" : ""}`}
            onClick={() => setFilter("chats")}
          >
            Chats
          </button>
          <button
            type="button"
            className={`notifications-modal__filter${filter === "groups" ? " notifications-modal__filter--active" : ""}`}
            onClick={() => setFilter("groups")}
          >
            Groups
          </button>
        </div>
      </div>
      <div className="notifications-modal__list">
        {loading ? (
          <div className="notifications-modal__empty">
            <span className="notifications-modal__spinner" aria-hidden="true" />
            Loading notifications…
          </div>
        ) : error ? (
          <div className="notifications-modal__empty">{error}</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="notifications-modal__empty">You're all caught up.</div>
        ) : (
          filteredNotifications.map((notification) => (
            <button
              type="button"
              className="notifications-modal__item"
              key={notification.conversationId}
              onClick={() => {
                  onConversationClick(notification.conversationId, notification.isGroup);
                  onClose();
                }}
            >
              <div className="notifications-modal__item-left">
                {notification.isGroup ? (
                  <span className="notifications-modal__avatar">{notification.conversationName?.slice(0,1).toUpperCase()}</span>
                ) : (
                  notification.otherMemberImage ? (
                    <img src={notification.otherMemberImage} alt={notification.otherMemberName ?? "User"} className="notifications-modal__avatar-img" />
                  ) : (
                    <span className="notifications-modal__avatar">{(notification.otherMemberName || notification.conversationName || "?").slice(0,1).toUpperCase()}</span>
                  )
                )}
                <div style={{ minWidth: 0 }}>
                  <div className="notifications-modal__item-title">{notification.conversationName}</div>
                  <div className="notifications-modal__item-subtitle">{`+${notification.unreadCount} new message${notification.unreadCount === 1 ? "" : "s"}`}</div>
                </div>
              </div>
              <span className="notifications-modal__item-time">{formatRelativeTime(notification.latestAt)}</span>
            </button>
          ))
        )}
      </div>
      {/* footer omitted for minimal layout */}
    </div>
  );
};

export default NotificationsModal;
