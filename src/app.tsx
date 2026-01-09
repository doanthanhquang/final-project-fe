import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/protected-route";
import EmailInbox from "./pages/dashboard";
import Login from "./pages/login";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <EmailInbox />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
