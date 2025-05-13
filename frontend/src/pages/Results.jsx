import React from "react";
import { useParams } from "react-router-dom";
import api from "../utils/api";

const Results = () => {
  const { electionId } = useParams();
  return <div>Results for election {electionId} (placeholder)</div>;
};

export default Results;
