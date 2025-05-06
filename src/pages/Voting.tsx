import React, { useState } from "react";
import Layout from "../components/Layout";
import { candidates } from "../constants/voting";

interface Candidate {
  id: number;
  name: string;
  photo: string;
  shortDesc: string;
  longDesc: string;
}

const Voting = () => {
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null
  );

  const handleSelectCanditate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
  };

  const handleVote = () => {};

  return (
    <Layout showFooter={false} showSidebar={false}>
      <div className="bg-zinc-950 h-full w-full">
        <style>
          {`@import url('https://fonts.googleapis.com/css2?family=Mulish:wght@200;400;600;800&display=swap');
          
          `}
        </style>
        <section
          className={`${
            selectedCandidate ? "h-3/5" : "h-full"
          } w-full bg-gradient-to-r from-[#400057] via-[rgb(66,25,84)] to-[rgb(109,32,97)] p-5 flex flex-wrap items-start justify-center gap-4 overflow-y-auto`}
        >
          {candidates.map((candidate: Candidate) => (
            <div
              className="h-max flex gap-4 items-center justify-center bg-[#a6bb9446] p-2 rounded border-2 border-solid border-[#50135c46] hover:scale-105 transition duration-200 cursor-pointer"
              onClick={() => {
                handleSelectCanditate(candidate);
              }}
            >
              <img
                src={candidate.photo}
                className="w-24 h-24 rounded object-cover"
              />
              <div className="flex flex-col gap-2">
                <p
                  className="text-2xl font-semibold bg-clip-text text-stroke"
                  style={{
                    fontFamily: "Gabarito, sans-serif",
                    // WebkitTextStroke: "0.8px rgb(175,170,188)",
                  }}
                >
                  {candidate.name}
                </p>
                <p
                  className="text-[#a59abc] font-semibold"
                  style={{ fontFamily: "Mulish, sans-serif" }}
                >
                  {candidate.shortDesc}
                </p>
              </div>
            </div>
          ))}
        </section>
        {selectedCandidate && (
          <section className="bg-zinc-900 w-full h-2/5 flex border-t-2 border-solid border-zinc-800">
            <div
              className="h-full flex gap-4 items-center justify-center bg-zinc-900 p-8 "
              onClick={() => {
                handleSelectCanditate(selectedCandidate);
              }}
            >
              <img
                src={selectedCandidate.photo}
                className="w-48 h-48 rounded object-cover"
              />
              <div className="flex flex-col gap-2">
                <p className="text-2xl font-semibold">
                  {selectedCandidate.name}
                </p>
                <p>{selectedCandidate.longDesc}</p>
              </div>
            </div>
            <div className="w-full h-full flex items-center justify-center ">
              <button
                className="p-4 bg-zinc-800 border border-solid border-zinc-700 rounded hover:scale-105 transition duration-300 cursor-pointer"
                onClick={handleVote}
              >
                Vote for them
              </button>
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
};

export default Voting;
