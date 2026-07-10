import { useParams } from "react-router-dom";
import ChatWindow from "../components/ChatWindow";

const ChatRoom = () => {
  const { id } = useParams();

  return (
    <div className="page page--chat-room">
      <header className="chat-room__header">
        <h1>Chat with {id ? `Conversation ${id}` : "Unknown"}</h1>
      </header>
      <ChatWindow />
    </div>
  );
};

export default ChatRoom;
