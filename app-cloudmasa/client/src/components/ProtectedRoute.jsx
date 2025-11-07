// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");

  // If no token → redirect to login page
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Otherwise → render the protected page
  return children;
};

export default ProtectedRoute;
