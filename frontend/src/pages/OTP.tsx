import { useState } from "react";
import Layout from "../components/Layout";
import { useNavigate } from "react-router-dom";
// import { verifyOtp, resendOtp } from "../services/otp";
import Modal from "../components/common/Modal";

export const OtpVerification = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [otp, setOtp] = useState("");

  const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      // const token = localStorage.getItem('token');
      // if (!token) throw new Error("Session expired. Please login again.");

      // await verifyOtp({ otp, token: JSON.parse(token) });
      navigate("/elections");
    } catch (error) {
      setError("Invalid OTP. Please try again.");
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      // const token = localStorage.getItem('token');
      // if (!token) throw new Error("Session expired. Please login again.");
      // await resendOtp({ token: JSON.parse(token) });
      // setError("New OTP sent successfully!");
      // setShowModal(true);
    } catch (error) {
      setError("Failed to resend OTP. Please try again.");
      setShowModal(true);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <Layout showHeader={false} showFooter={false}>
      <div className="min-h-screen w-full flex gap-8 flex-col items-center justify-center bg-gradient-to-b from-[#28003e] via-[#400057] to-[#5b006b] p-4">
        {showModal && (
          <Modal
            title="Notification"
            description={error}
            onClose={() => setShowModal(false)}
            onConfirm={() => setShowModal(false)}
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
          VOTING MANAGEMENT SYSTEM
        </h1>

        <form
          onSubmit={handleVerify}
          className="flex flex-col items-center gap-4 w-[400px] max-w-full p-10 h-max border-rounded bg-[rgb(175,170,188)] border-2 border-solid border-[#e55b9011] rounded-lg"
        >
          <h1
            className="text-2xl text-[#28003e] font-bold"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            OTP VERIFICATION
          </h1>

          <div className="flex flex-col gap-2 w-full">
            <label
              htmlFor="otp"
              className="text-[#28003e]"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Enter 6-digit OTP
            </label>
            <input
              id="otp"
              name="otp"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              type="text"
              inputMode="numeric"
              className="w-full h-10 bg-[rgb(167,157,176)] hover:bg-[rgb(155,145,163)] p-2 rounded focus:outline-none text-[rgb(109,32,97)] text-center text-xl font-mono"
              style={{ caretColor: "rgb(21,21,21)" }}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className={`w-full bg-gradient-to-r from-[#400057] via-[rgb(66,25,84)] to-[rgb(109,32,97)] text-[rgb(200,200,200)] mt-4 py-2 px-4 rounded-lg transition duration-300 ${
              loading || otp.length !== 6
                ? "opacity-50 cursor-default"
                : "hover:scale-105 cursor-pointer"
            }`}
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="text-[#28003e] hover:text-[#400057] underline transition duration-300"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              {resendLoading ? "Sending..." : "Resend OTP"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default OtpVerification;
