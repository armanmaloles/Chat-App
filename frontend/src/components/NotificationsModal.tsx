import { useEffect, useRef } from "react";

type Props = {
  onClose: () => void;
};

const NotificationsModal = ({ onClose }: Props) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div className="notifications-modal" ref={ref} role="dialog" aria-label="Notifications">
      <div className="notifications-modal__header">
        <strong>Notifications</strong>
      </div>
      <div className="notifications-modal__list">
        <div className="notifications-modal__empty">You're all caught up.</div>
      </div>
      <div className="notifications-modal__footer">
        <button className="btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default NotificationsModal;
