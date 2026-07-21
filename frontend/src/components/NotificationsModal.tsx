import { useEffect, useRef } from "react";

type NotificationSummary = {
  conversationId: string;
  conversationName: string;
  unreadCount: number;
  latestAt: string;
};

type NotificationsModalProps = {
  onClose: () => void;
  onConversationClick: (conversationId: string) => void;
  notifications: NotificationSummary[];
  loading: boolean;
  error: string | null;
};

const NotificationsModal = ({ onClose, onConversationClick, notifications, loading, error }: NotificationsModalProps) => {
  const ref = useRef<HTMLDivElement | null>(null);

  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  useEffect(() => {
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
    };
  }, [onClose]);

  return (
    <div className="notifications-modal" ref={ref} role="dialog" aria-label="Notifications">
      <div className="notifications-modal__header">
        <strong>Notifications</strong>
      </div>
      <div className="notifications-modal__list">
        {loading ? (
          <div className="notifications-modal__empty">
            <span className="notifications-modal__spinner" aria-hidden="true" />
            Loading notifications…
          </div>
        ) : error ? (
          <div className="notifications-modal__empty">{error}</div>
        ) : notifications.length === 0 ? (
          <div className="notifications-modal__empty">You're all caught up.</div>
        ) : (
          notifications.map((notification) => (
            <button
              type="button"
              className="notifications-modal__item"
              key={notification.conversationId}
              onClick={() => {
                onConversationClick(notification.conversationId);
                onClose();
              }}
            >
              <div className="notifications-modal__item-left">
                <span className="notifications-modal__item-title">{notification.conversationName}</span>
                <span className="notifications-modal__item-badge">
                  +{notification.unreadCount} new message{notification.unreadCount === 1 ? "" : "s"}
                </span>
              </div>
              <span className="notifications-modal__item-time">{formatRelativeTime(notification.latestAt)}</span>
            </button>
          ))
        )}
      </div>
      <div className="notifications-modal__footer">
        <button className="btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default NotificationsModal;
