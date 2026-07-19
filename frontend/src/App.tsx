import { Routes, Route, Navigate } from "react-router-dom";
import ChatLayout from "./layouts/ChatLayout";
import ChatRoom from "./pages/ChatRoom";
import NotFound from "./pages/NotFound";
import Landing from "./pages/Landing";
import ServerConnectionError from "./components/ServerConnectionError";
import { useServerConnection } from "./context/useServerConnection";

function App() {
  const { isServerReachable, checkConnection } = useServerConnection();

  if (isServerReachable === null) {
    return (
      <div className="app-loading">
        <div className="app-loading__spinner"></div>
        <p>Checking connection...</p>
      </div>
    );
  }

  if (!isServerReachable) {
    return <ServerConnectionError onRetry={checkConnection} />;
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<ChatLayout />}>
        <Route index element={<Navigate to="/app/conversations" replace />} />
        <Route path="conversations" element={<></>} />
        <Route path="groups" element={<div />} />
        <Route path="groups/:id" element={<ChatRoom />} />
        <Route path="notifications" element={<div />} />
        <Route path="chat/:id" element={<ChatRoom />} />
        <Route path="settings" element={<div />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;