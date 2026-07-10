import { useState } from "react";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";

const defaultMessages = [
  { id: "m1", author: "John Doe", content: "Hello!" },
  { id: "m2", author: "Sarah Lee", content: "Hi there!" },
];

const ChatWindow = () => {
  const [messages, setMessages] = useState(defaultMessages);
  const [draft, setDraft] = useState("");

  const handleSend = () => {
    if (!draft.trim()) return;

    setMessages((current) => [
      ...current,
      {
        id: `m${current.length + 1}`,
        author: "You",
        content: draft.trim(),
      },
    ]);
    setDraft("");
  };

  return (
    <section className="chat-window">
      <div className="chat-window__messages">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            author={message.author}
            content={message.content}
            isOwn={message.author === "You"}
          />
        ))}
      </div>
      <MessageInput value={draft} onChange={setDraft} onSend={handleSend} />
    </section>
  );
};

export default ChatWindow;
