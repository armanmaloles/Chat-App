import { Routes, Route, Navigate } from "react-router-dom";
import ChatLayout from "./layouts/ChatLayout";
import ChatRoom from "./pages/ChatRoom";
import NotFound from "./pages/NotFound";
import Landing from "./pages/Landing";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<ChatLayout />}>
        <Route index element={<Navigate to="/app/conversations" replace />} />
        <Route path="conversations" element={<div />} />
        <Route path="favorites" element={<div />} />
        <Route path="groups" element={<div />} />
        <Route path="notifications" element={<div />} />
        <Route path="chat/:id" element={<ChatRoom />} />
        <Route path="settings" element={<div />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;