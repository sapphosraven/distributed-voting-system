import { useState } from "react";
import { Input, Button, Card, CardBody, Divider, Spacer } from "@heroui/react";
import { useNavigate } from "react-router-dom";

const FONT_FAMILY = '"Space Grotesk", "Inter", "Montserrat", "Segoe UI", Arial, sans-serif';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    console.log("[Login] Attempting login", { email });
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      console.log("[Login] API response", data);
      if (!res.ok) throw new Error(data.error || "Login failed");
      localStorage.setItem("token", data.token);
      if (data.otpRequired) {
        navigate("/verify-otp", { state: { email } });
      } else {
        navigate("/elections");
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
      console.error("[Login] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden" style={{ fontFamily: FONT_FAMILY, background: "#181825" }}>
      {/* Animated gradient + particles background */}
      <div className="absolute inset-0 -z-10 animate-gradient bg-gradient-to-br from-[#181825] via-[#400057] to-[#ff7e29] opacity-90" style={{ filter: "blur(100px)" }} />
      <div className="absolute inset-0 -z-20 pointer-events-none">
        {/* Subtle animated particles using CSS only */}
        <div className="absolute w-2 h-2 bg-[#ff7e29] rounded-full opacity-40 animate-pulse" style={{ left: '10%', top: '20%', animationDelay: '0s' }} />
        <div className="absolute w-3 h-3 bg-[#400057] rounded-full opacity-30 animate-pulse" style={{ left: '80%', top: '60%', animationDelay: '1.5s' }} />
        <div className="absolute w-1.5 h-1.5 bg-[#a259ff] rounded-full opacity-30 animate-pulse" style={{ left: '60%', top: '30%', animationDelay: '2.5s' }} />
        <div className="absolute w-2.5 h-2.5 bg-[#ff7e29] rounded-full opacity-20 animate-pulse" style={{ left: '30%', top: '80%', animationDelay: '3s' }} />
      </div>
      <Card className="w-full max-w-[420px] shadow-2xl border-none bg-[#232336]/95 backdrop-blur-md rounded-2xl px-6 py-8 sm:px-10 sm:py-12" style={{ fontFamily: FONT_FAMILY }}>
        <CardBody>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-center mb-2 tracking-tight" style={{ color: "#ff7e29", fontFamily: FONT_FAMILY, letterSpacing: 1 }}>
            Secure Voting
          </h1>
          <p className="text-center text-lg mb-8" style={{ color: "#a59abc" }}>
            Sign in to your account
          </p>
          <form onSubmit={handleLogin} className="flex flex-col gap-6">
            <Input
              isRequired
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              variant="bordered"
              classNames={{ input: "bg-[#232336] text-white placeholder:text-[#a59abc]" }}
              style={{ fontFamily: FONT_FAMILY }}
              color="primary"
              autoComplete="email"
              size="lg"
              placeholder="you@example.com"
            />
            <Input
              isRequired
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              variant="bordered"
              classNames={{ input: "bg-[#232336] text-white placeholder:text-[#a59abc]" }}
              style={{ fontFamily: FONT_FAMILY }}
              color="primary"
              autoComplete="current-password"
              size="lg"
              placeholder="••••••••"
              endContent={
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{ color: "#ff7e29", background: "none", border: "none", cursor: "pointer" }}
                >
                  {showPassword ? (
                    // Eye-off icon
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12.001C3.226 15.376 7.05 19.5 12 19.5c1.658 0 3.237-.336 4.677-.938m3.343-2.062A10.45 10.45 0 0022.066 12c-1.292-3.375-5.116-7.499-10.066-7.499-1.658 0-3.237.336-4.677.938m-.343 2.062L3.98 8.223zm0 0L2.808 9.395m0 0A10.45 10.45 0 001.934 12c1.292 3.375 5.116 7.499 10.066 7.499 1.658 0 3.237-.336 4.677-.938m.343-2.062l1.172-1.172m0 0A10.477 10.477 0 0022.066 12c-1.292-3.375-5.116-7.499-10.066-7.499-1.658 0-3.237.336-4.677.938m-.343 2.062L3.98 8.223z" />
                    </svg>
                  ) : (
                    // Eye icon
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12c0-1.25.336-2.417.938-3.423C5.226 6.624 9.05 2.5 14 2.5c1.658 0 3.237.336 4.677.938A10.45 10.45 0 0121.066 12c-1.292 3.375-5.116 7.499-10.066 7.499-1.658 0-3.237-.336-4.677-.938A10.45 10.45 0 012.25 12zm9.75 2.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" />
                    </svg>
                  )}
                </button>
              }
            />
            {error && <div className="text-red-500 text-center text-sm mt-1">{error}</div>}
            <Button
              type="submit"
              color="primary"
              className="mt-2 font-bold bg-gradient-to-r from-[#400057] via-[#5b006b] to-[#ff7e29] text-white shadow-lg hover:scale-105 transition-transform rounded-xl py-3 text-lg"
              style={{ fontFamily: FONT_FAMILY, letterSpacing: 1 }}
              isLoading={loading}
              fullWidth
            >
              {loading ? "Signing In..." : "Sign In"}
            </Button>
            <Divider className="my-2" style={{ background: "#a59abc" }} />
            <div className="text-center text-base text-[#a59abc]">
              Don&apos;t have an account?{' '}
              <span
                className="text-[#ff7e29] font-semibold cursor-pointer hover:underline"
                onClick={() => navigate("/register")}
              >
                Register
              </span>
            </div>
          </form>
        </CardBody>
      </Card>
      {/* Animated background effect */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&family=Space+Grotesk:wght@400;700&family=Inter:wght@400;700&display=swap');
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradientMove 8s ease-in-out infinite;
        }
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @media (max-width: 600px) {
          .max-w-[420px] { max-width: 98vw !important; }
          .px-6, .sm\:px-10 { padding-left: 1rem !important; padding-right: 1rem !important; }
          .py-8, .sm\:py-12 { padding-top: 1.5rem !important; padding-bottom: 1.5rem !important; }
        }
      `}</style>
    </div>
  );
};

export default Login;
