import React from "react";
import { useParams } from "react-router-dom";
import api from "../utils/api";

const Vote = () => {
  const { electionId } = useParams();
  return <div>Vote page for election {electionId} (placeholder)</div>;
};

export default Vote;
