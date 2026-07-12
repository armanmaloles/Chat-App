type MessageBubbleProps = {
  author: string;
  content: string;
  createdAt?: string;
  isOwn?: boolean;
};

const MessageBubble = ({ author, content, createdAt, isOwn = false }: MessageBubbleProps) => {
  const formatBubbleTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const now = new Date();
    const isSameDay =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    if (!isSameDay) {
      const dateLabel = date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return `${dateLabel} ${time}`;
    }

    return time;
  };

  return (
    <div className={`message-bubble ${isOwn ? "message-bubble--own" : ""}`}>
      <div className="message-bubble__author">
        <span>{author}</span>
        {createdAt && <span className="message-bubble__time">{formatBubbleTime(createdAt)}</span>}
      </div>
      <div className="message-bubble__content">{content}</div>
    </div>
  );
};

export default MessageBubble;
