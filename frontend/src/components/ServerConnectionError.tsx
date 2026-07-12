const ServerConnectionError = ({ onRetry }: { onRetry: () => void }) => {
  return (
    <div className="server-connection-error">
      <div className="server-connection-error__container">
        <div className="server-connection-error__icon">⚠️</div>
        <h1 className="server-connection-error__title">Server Error</h1>
        <p className="server-connection-error__message">
          Unable to reach the server. Please check your internet connection and try again.
        </p>
        <button className="server-connection-error__button" onClick={onRetry}>
          Retry Connection
        </button>
        <p className="server-connection-error__tip">
          Make sure your internet connection is stable and the server is running.
        </p>
      </div>
    </div>
  );
};

export default ServerConnectionError;
