type MessageInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
};

const MessageInput = ({ value, onChange, onSend, disabled = false }: MessageInputProps) => {
  return (
    <div className="message-input">
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Type a message..."
        className="message-input__field"
        disabled={disabled}
      />
      <button onClick={onSend} className="message-input__button" disabled={disabled}>
        Send
      </button>
    </div>
  );
};

export default MessageInput;
