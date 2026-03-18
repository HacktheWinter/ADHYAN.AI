import { Navigate } from "react-router-dom";
import { getStoredUser } from "../../utils/authStorage";

export default function ProtectedRoute({ children }) {
  const user = getStoredUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "principal") {
    return <Navigate to="/login" replace />;
  }

  return children;
}
