import { useState } from "react";
import Layout from "../components/Layout";
import { useNavigate } from "react-router-dom";
import { signin } from "../services/login";
import Modal from "../components/common/Modal";
interface Credentials {
  email: string;
  password: string;
}

export const Login = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [creds, setCreds] = useState<Credentials>({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleSignin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await signin({
        email: creds.email,
        password: creds.password,
      });
      // Debug: log the response to check its structure
      console.log("Login response:", response);
      // Store the token as a JSON string
      localStorage.setItem("token", JSON.stringify(response)); // adjust as needed
      // Directly go to elections page (skip OTP)
      navigate("/elections");
    } catch (error) {
      setError("Authentication failed. Please check your credentials.");
      setLoading(false); // Stop loading here on error
      return; // Important: Don't continue past this point on error
    }

    setLoading(false);
  };

  return (
    <Layout showHeader={false} showFooter={false}>
      <div className="min-h-screen w-full flex gap-8 flex-col items-center justify-center bg-gradient-to-b from-[#28003e] via-[#400057] to-[#5b006b] p-4">
        {showModal && (
          <Modal
            title="Error"
            description={error}
            onClose={() => setShowModal(false)}
            onConfirm={() => {
              setShowModal(false);
            }}
          />
        )}

        <style>
          {`@import url('https://fonts.googleapis.com/css2?family=Mulish:wght@200;400;600;800&display=swap');
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&family=Mulish:ital,wght@0,200..1000;1,200..1000&family=Spinnaker&display=swap');
          @import url('https://fonts.googleapis.com/css2?family=Calistoga&family=Gabarito:wght@400..900&family=Montserrat:ital,wght@0,100..900;1,100..900&family=Mulish:ital,wght@0,200..1000;1,200..1000&family=Spinnaker&display=swap');
          
          `}
        </style>
        <h1
          className="text-4xl text-center font-bold bg-clip-text text-transparent bg-[#a59abc]"
          style={{
            fontFamily: "Gabarito, sans-serif",
            WebkitTextStroke: "1px rgb(175,170,188)",
          }}
        >
          {/* Voting Managment System */}
          VOTING MANAGEMENT SYSTEM
        </h1>
        <form
          onSubmit={handleSignin}
          className="flex flex-col items-center gap-4 w-[400px] max-w-full p-10 h-max border-rounded bg-[rgb(175,170,188)] border-2 border-solid border-[#e55b9011] rounded-lg"
        >
          <h1
            className="text-2xl text-[#28003e] font-bold"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            LOGIN
          </h1>
          <div className="flex flex-col gap-2 w-full">
            <label
              htmlFor="email"
              className="text-[#28003e]"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              value={creds.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setCreds({ ...creds, email: e.target.value });
              }}
              type="email"
              className="w-full h-10 bg-[rgb(167,157,176)] hover:bg-[rgb(155,145,163)] p-2 rounded focus:outline-none text-[rgb(109,32,97)]"
              style={{ caretColor: "rgb(21,21,21)" }}
            />
          </div>
          <div className="flex flex-col gap-2 w-full">
            <label
              htmlFor="password"
              className="text-[#28003e]"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                value={creds.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setCreds({ ...creds, password: e.target.value });
                }}
                className="p-2 rounded border w-full pr-20" // increased pr for text button
                type={showPassword ? "text" : "password"}
                required
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-gray-700 font-semibold px-2 py-1 bg-white bg-opacity-70 rounded focus:outline-none border border-gray-300 hover:bg-opacity-100 transition"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{ minWidth: '48px' }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-gradient-to-r from-[#400057] via-[rgb(66,25,84)] to-[rgb(109,32,97)] text-[rgb(200,200,200)] mt-8 py-2 px-4 rounded-lg transition duration-300 ${
              loading
                ? "opacity-50 cursor-default"
                : "hover:scale-105 cursor-pointer"
            }`}
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            {loading ? "Signing In..." : "Sign in"}
          </button>
          <div className="mt-2 text-sm">
            Don't have an account? <button type="button" className="text-purple-900 underline" onClick={() => navigate("/register")}>Register</button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default Login;
