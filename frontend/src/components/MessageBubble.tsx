type MessageBubbleProps = {
  author: string;
  content: string;
  isOwn?: boolean;
};

const MessageBubble = ({ author, content, isOwn = false }: MessageBubbleProps) => {
  return (
    <div className={`message-bubble ${isOwn ? "message-bubble--own" : ""}`}>
      <div className="message-bubble__author">{author}</div>
      <div className="message-bubble__content">{content}</div>
    </div>
  );
};

export default MessageBubble;
