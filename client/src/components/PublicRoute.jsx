import { Navigate } from "react-router-dom";

const PublicRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");

  // If already logged in, redirect to home
  if (token && user) {
    return <Navigate to="/home" replace />;
  }

  return children;
};

export default PublicRoute;

