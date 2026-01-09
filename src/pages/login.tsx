import { useForm } from "react-hook-form";
import { useNavigate, Navigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { LoginForm, type LoginFormData } from "@/components/login-form";
import type { CredentialResponse } from "@react-oauth/google";
import { useGoogleLogin } from "@react-oauth/google";
import { jwtDecode, type JwtPayload } from "jwt-decode";
import type { AxiosError } from "axios";
import type { GoogleUserInfo } from "@/services/api";

interface ServerErrorResponse {
  message?: string;
  errors?: {
    email?: string[];
    password?: string[];
    [key: string]: string[] | undefined;
  };
}

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login, loginWithGoogle, isAuthenticated, initializing } = useAuth();
  const form = useForm<LoginFormData>();
  const { setError } = form;

  // New: Use useGoogleLogin with auth-code flow (MUST be at top level)
  const googleLogin = useGoogleLogin({
    flow: "auth-code",
    scope: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.modify",
    ].join(" "),
    onSuccess: async (codeResponse) => {
      try {
        setSubmitting(true);
        setLoginError("");
        setServerErrors([]);

        // Backend will exchange code for tokens and get user info
        const userInfo: GoogleUserInfo = {
          name: "", // Backend will get from tokens
          email: "", // Backend will get from tokens
          sub: "", // Backend will get from tokens
          picture: undefined,
        };

        const result = await loginWithGoogle(
          "", // No credential needed when using code
          userInfo,
          codeResponse.code // Send authorization code
        );

        setLoginSuccess(true);

        // Check if email provider was connected
        if (result.emailProviderConnected) {
          console.log("✅ Gmail connected during sign-in!");
        }

        setTimeout(() => {
          setLoginSuccess(false);
          navigate("/dashboard");
        }, 1500);
      } catch (e) {
        setLoginSuccess(false);
        const error = e as AxiosError<ServerErrorResponse>;
        const errorData = error.response?.data;
        const msg =
          errorData?.message || "Google Sign-In failed. Please try again.";
        setLoginError(msg);

        if (error.response?.status === 422) {
          setLoginError("Invalid Google credentials. Please try again.");
        } else if (error.response?.status === 500) {
          setLoginError(
            "Server error during Google Sign-In. Please try again later."
          );
        }
      } finally {
        setSubmitting(false);
      }
    },
    onError: (error) => {
      console.error("Google login error:", error);
      setLoginError("Google Sign-In failed. Please try again.");
    },
  });

  // Redirect to dashboard if already authenticated
  if (!initializing && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (data: LoginFormData) => {
    try {
      setSubmitting(true);
      setLoginError("");
      setServerErrors([]);
      await login({ email: data.email, password: data.password });
      setLoginSuccess(true);
      setTimeout(() => setLoginSuccess(false), 2000);
      navigate("/dashboard");
    } catch (e) {
      setLoginSuccess(false);
      const error = e as AxiosError<ServerErrorResponse>;
      const errorData = error.response?.data;
      const msg =
        errorData?.message || "Login failed. Please check your credentials.";
      setLoginError(msg);
      // collect server validation errors if present
      const errs: string[] = [];
      if (errorData?.errors && typeof errorData.errors === "object") {
        Object.values(errorData.errors).forEach((arr) => {
          if (Array.isArray(arr)) errs.push(...arr);
        });
        if (
          Array.isArray(errorData.errors.email) &&
          errorData.errors.email[0]
        ) {
          setError("email", {
            type: "server",
            message: errorData.errors.email[0],
          });
        }
        if (
          Array.isArray(errorData.errors.password) &&
          errorData.errors.password[0]
        ) {
          setError("password", {
            type: "server",
            message: errorData.errors.password[0],
          });
        }
      }

      setServerErrors(errs);
    } finally {
      setSubmitting(false);
    }
  };

  // Fallback: Old method using credential (ID token only)
  const handleGoogleSuccess = async (
    credentialResponse: CredentialResponse
  ) => {
    try {
      setSubmitting(true);
      setLoginError("");
      setServerErrors([]);

      // Decode the JWT credential to get user info
      const decoded = jwtDecode<JwtPayload & GoogleUserInfo>(
        credentialResponse.credential || ""
      );

      const userInfo: GoogleUserInfo = {
        name: decoded.name || "",
        email: decoded.email || "",
        sub: decoded.sub || "",
        picture: decoded.picture,
      };

      if (credentialResponse.credential) {
        await loginWithGoogle(credentialResponse.credential, userInfo);
      }

      setLoginSuccess(true);

      setTimeout(() => {
        setLoginSuccess(false);
        navigate("/dashboard");
      }, 1500);
    } catch (e) {
      setLoginSuccess(false);
      const error = e as AxiosError<ServerErrorResponse>;
      const errorData = error.response?.data;
      const msg =
        errorData?.message || "Google Sign-In failed. Please try again.";
      setLoginError(msg);

      if (error.response?.status === 422) {
        setLoginError("Invalid Google credentials. Please try again.");
      } else if (error.response?.status === 500) {
        setLoginError(
          "Server error during Google Sign-In. Please try again later."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleError = () => {
    setLoginError("Google Sign-In failed. Please try again.");
  };

  return (
    <LoginForm
      form={form}
      showPassword={showPassword}
      onTogglePassword={() => setShowPassword(!showPassword)}
      onSubmit={onSubmit}
      onGoogleSuccess={handleGoogleSuccess}
      onGoogleError={handleGoogleError}
      onGoogleLoginClick={googleLogin} // New: Pass the auth-code login function
      submitting={submitting}
      loginError={loginError}
      loginSuccess={loginSuccess}
      serverErrors={serverErrors}
    />
  );
};

export default Login;
