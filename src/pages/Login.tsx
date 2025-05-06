import { useState } from "react";
import Layout from "../components/Layout";
import { useNavigate } from 'react-router-dom';
import { singin } from "../services/login";
import Modal from "../components/common/Modal";
interface Credentials {
  username: string;
  password: string;
}

export const Login = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [creds, setCreds] = useState<Credentials>({
    username: "",
    password: "",
  });

  const handleSignin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // alert('Creds are: ' + JSON.stringify(creds));
    setLoading(true);
    try {
      const res = await singin(creds);
      // console.log(res);
      localStorage.setItem("token", JSON.stringify(res));
      navigate("/voting");
      // throw new Error('Forcing to catch block!');
    } catch {
      // alert('here');
      setError("Signin was unsuccesful");
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout showHeader={false} showSidebar={false} showFooter={false}>
      <div className="h-full w-full flex flex-col gap-16 items-center justify-center bg-gradient-to-b from-[#28003e] via-[#400057] to-[#5b006b] p-2 overflow-y-auto">
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
              htmlFor="username"
              className="text-[#28003e]"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              value={creds.username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setCreds({ ...creds, username: e.target.value });
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
            <input
              id="password"
              name="password"
              value={creds.password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setCreds({ ...creds, password: e.target.value });
              }}
              type="password"
              className="w-full h-10 bg-[rgb(167,157,176)] hover:bg-[rgb(155,145,163)] p-2 rounded focus:outline-none text-[rgb(109,32,97)]"
              style={{ caretColor: "rgb(21,21,21)" }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-gradient-to-r from-[#400057] via-[rgb(66,25,84)] to-[rgb(109,32,97)] mt-8 py-2 px-4 rounded-lg transition duration-300 ${
              loading
                ? "opacity-50 cursor-default"
                : "hover:scale-105 cursor-pointer"
            }`}
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            {loading ? "Signing In..." : "Sign in"}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default Login;
