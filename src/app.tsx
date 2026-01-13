import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/protected-route";
import EmailInbox from "./pages/inbox";
import Login from "./pages/login";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/inbox"
        element={
          <ProtectedRoute>
            <EmailInbox />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/inbox" replace />} />
    </Routes>
  );
}

export default App;
