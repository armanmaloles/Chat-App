import type { ChangeEvent } from "react";

type PendingAttachment = {
  kind: "image" | "video" | "document";
  mimeType: string;
  fileName: string;
  fileSize: number;
  dataUrl: string;
  extension: string;
};

type MessageInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onFileSelect?: (files: File[] | null) => void;
  pendingAttachments?: PendingAttachment[];
  onRemoveAttachment?: (index: number) => void;
  disabled?: boolean;
};

const MessageInput = ({ value, onChange, onSend, onFileSelect, pendingAttachments = [], onRemoveAttachment, disabled = false }: MessageInputProps) => {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : null;
    if (onFileSelect) {
      onFileSelect(files);
    }
    event.target.value = "";
  };

  return (
    <div className="message-input" style={{ flexDirection: "column", gap: 8, width: "100%" }}>
      <div className="message-input__controls" style={{ display: "flex", gap: 12, alignItems: "flex-end", width: "100%" }}>
        <label className="message-input__attach" aria-label="Attach a file" role="button" tabIndex={0}>
          <input
            className="message-input__file"
            type="file"
            multiple
            accept="image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            onChange={handleFileChange}
            disabled={disabled}
          />
          <span>Attach</span>
        </label>
        <div className="message-input__bubble" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, padding: 5, borderRadius: 14, background: "#0f172a", border: "1px solid #334155" }}>
          {pendingAttachments.length > 0 && (
            <div className="message-input__attachments" style={{ display: "flex", gap: 8, flexWrap: "nowrap", overflowX: "auto", alignItems: "center", width: "100%", paddingBottom: 6 }}>
              {pendingAttachments.map((attachment, index) => (
                <div key={`${attachment.fileName}-${index}`} className="message-input__attachment" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 10, background: "rgba(255,255,255,0.08)" }}>
                  {attachment.kind === "image" ? (
                    <img src={attachment.dataUrl} alt={attachment.fileName} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 8 }} />
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(255,255,255,0.12)", display: "grid", placeItems: "center", fontWeight: 700 }}>
                      {attachment.extension?.toUpperCase() || "DOC"}
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <strong style={{ fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>
                      {attachment.fileName}
                    </strong>
                    <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                      {(attachment.fileSize / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <button aria-label="Remove attachment" onClick={() => onRemoveAttachment?.(index)} style={{ marginLeft: 8, background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontSize: 16 }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder="Type a message..."
            className="message-input__field"
            disabled={disabled}
            style={{ width: "100%", border: "none", background: "transparent", outline: "none", padding: 0, color: "#e2e8f0" }}
          />
        </div>
        <button onClick={onSend} className="message-input__button" disabled={disabled}>
          Send
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
