import { LogOut } from "lucide-react";
import { useState } from "react";
import Modal from "../common/Modal";
import { useNavigate, Link } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="bg-gradient-to-r from-[#400057] via-[rgb(66,25,84)] to-[rgb(109,32,97)] w-full h-[96px] py-4 px-20">
      {showModal && (
        <Modal
          title="Logout"
          description="Are you sure you want to logout?"
          onClose={() => setShowModal(false)}
          onConfirm={() => {
            localStorage.removeItem("token");
            setShowModal(false);
            navigate("/login");
          }}
        />
      )}
      <nav className="rounded-full w-{1000px} max-w-full px-2 py-1 bg-[rgb(175,170,188)]">
        <div className="flex justify-between items-center">
          <Link
            className="flex items-center justify-center hover:!text-[rgb(175,170,188)] text-2xl font-semibold !text-[#400057] hover:bg-gradient-to-r from-[#28003e] to-[#400057]
 h-12 px-6 rounded-full transition-color duration-300 cursor-pointer"
            to="elections"
          >
            Distributed Voting System
          </Link>
          <div className="flex items-center gap-2 text-lg">
            {/* <h1 className='text-xl'>Contents</h1> */}
            <div className="flex items-center gap-2">
              <Link
                to="/elections"
                className="flex items-center justify-center !text-[rgb(109,32,97)] hover:bg-gradient-to-r from-[rgb(66,25,84)] to-[rgb(109,32,97)] h-8 px-4 rounded-full hover:!text-[rgb(175,170,188)] transition-color duration-300 text-base"
              >
                Current Elections
              </Link>
              <Link
                to="/elections?tab=past"
                className="flex items-center justify-center !text-[rgb(109,32,97)] hover:bg-gradient-to-r from-[rgb(66,25,84)] to-[rgb(109,32,97)] h-8 px-4 rounded-full hover:!text-[rgb(175,170,188)] transition-color duration-300 text-base"
              >
                Past Elections
              </Link>
              <Link
                to="/create-election"
                className="flex items-center justify-center !text-[rgb(109,32,97)] hover:bg-gradient-to-r from-[rgb(66,25,84)] to-[rgb(109,32,97)] h-8 px-4 rounded-full hover:!text-[rgb(175,170,188)] transition-color duration-300 text-base"
              >
                Create Election
              </Link>
            </div>
            <div
              className="flex items-center justify-center gap-1 text-[rgb(109,32,97)] hover:bg-gradient-to-r from-[rgb(84,25,83)] to-[rgb(109,32,97)] rounded-full h-12 w-12 hover:text-[rgb(175,170,188)] font-semibold cursor-pointer"
              onClick={() => {
                setShowModal(true);
              }}
            >
              {/* <p>Logout</p> */}
              <LogOut className="h-6 w-6" />
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Header;
