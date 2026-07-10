import { Link } from "react-router-dom";

const conversations: { id: string; title: string }[] = [];

const ConversationList = () => {
  return (
    <div className="page page--conversation-list">
      <h1>Conversations</h1>
      <div className="conversation-list">
        {conversations.length === 0 ? (
          <div className="conversation-list__empty">No conversations yet.</div>
        ) : (
          conversations.map((conversation) => (
            <Link
              key={conversation.id}
              to={`/chat/${conversation.id}`}
              className="conversation-list__item"
            >
              {conversation.title}
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;
