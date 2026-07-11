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
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
