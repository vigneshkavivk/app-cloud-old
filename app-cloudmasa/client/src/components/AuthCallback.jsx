import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

const AuthCallback = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get("token");
    const error = params.get("error"); // 👈 ADD THIS

    // ❌ ERROR HANDLING FIRST
    if (error) {
      if (error === "invite_not_accepted") {
        toast.error("Please accept your invitation before logging in.");
      } else if (error === "google_auth_failed") {
        toast.error("Google authentication failed.");
      } else {
        toast.error("Login failed. Please try again.");
      }

      navigate("/login", { replace: true });
      return;
    }

    // ❌ NO TOKEN
    if (!token) {
      navigate("/login");
      return;
    }

    // ✅ Decode token
    const payload = JSON.parse(atob(token.split(".")[1]));

    const user = {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      token,
    };

    // ✅ SAVE BEFORE SIDEBAR LOADS
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", token);

    // ✅ ENTER APP
    navigate("/sidebar", { replace: true });
  }, []);

  return <p>Signing you in...</p>;
};

export default AuthCallback;

