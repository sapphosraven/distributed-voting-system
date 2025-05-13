import React from "react";
import { useParams } from "react-router-dom";

const Results = () => {
  const { electionId } = useParams();
  return <div>Results for election {electionId} (placeholder)</div>;
};

export default Results;
