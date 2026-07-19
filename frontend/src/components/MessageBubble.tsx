type MessageAttachment = {
  kind: "image" | "video" | "document";
  mimeType: string;
  fileName: string;
  fileSize: number;
  dataUrl: string;
  extension: string;
};

type MessageBubbleProps = {
  author: string;
  content: string;
  attachments?: MessageAttachment[];
  createdAt?: string;
  isOwn?: boolean;
  deleted?: boolean;
  deletedByName?: string;
  onDelete?: () => void;
  isSystemMessage?: boolean;
};

const MessageBubble = ({ author, content, attachments, createdAt, isOwn = false, deleted = false, deletedByName, onDelete, isSystemMessage = false }: MessageBubbleProps) => {
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
    <div className={`message-bubble ${isOwn ? "message-bubble--own" : ""} ${isSystemMessage ? "message-bubble--system" : ""}`}>
      {!isSystemMessage && (
        <div className="message-bubble__author">
          <span>{author}</span>
          {createdAt && <span className="message-bubble__time">{formatBubbleTime(createdAt)}</span>}
          {isOwn && onDelete && (
            <button
              type="button"
              aria-label="Delete message"
              title="Delete message"
              onClick={onDelete}
              className="message-bubble__delete"
            >
              🗑
            </button>
          )}
        </div>
      )}
      <div className="message-bubble__content">
        {deleted ? (
          <div style={{ fontStyle: "italic", color: "#94a3b8" }}>
            {deletedByName ? `Message deleted by ${deletedByName}` : "Message deleted"}
          </div>
        ) : (
          content ? <div>{content}</div> : null
        )}
        {attachments && attachments.length > 0 && !deleted ? (
          <div style={{ marginTop: content ? "0.5rem" : 0, display: "grid", gap: "0.75rem" }}>
            {attachments.map((attachment, index) => (
              <div key={`${attachment.fileName}-${index}`}>
                {attachment.kind === "image" ? (
                  <img src={attachment.dataUrl} alt={attachment.fileName} style={{ maxWidth: "100%", borderRadius: "0.75rem", display: "block" }} />
                ) : attachment.kind === "video" ? (
                  <video src={attachment.dataUrl} controls style={{ maxWidth: "100%", borderRadius: "0.75rem", display: "block" }} />
                ) : (
                  <a
                    href={attachment.dataUrl}
                    download={attachment.fileName}
                    style={{
                      display: "inline-flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                      padding: "0.75rem",
                      borderRadius: "0.75rem",
                      background: "rgba(255,255,255,0.04)",
                      color: "inherit",
                      textDecoration: "none",
                      maxWidth: "100%",
                    }}
                  >
                    <strong>{attachment.fileName}</strong>
                    <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>{attachment.extension.toUpperCase()} • {(attachment.fileSize / 1024).toFixed(1)} KB</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default MessageBubble;
