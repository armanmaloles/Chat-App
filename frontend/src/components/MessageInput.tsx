type MessageInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
};

const MessageInput = ({ value, onChange, onSend }: MessageInputProps) => {
  return (
    <div className="message-input">
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Type a message..."
        className="message-input__field"
      />
      <button onClick={onSend} className="message-input__button">
        Send
      </button>
    </div>
  );
};

export default MessageInput;
