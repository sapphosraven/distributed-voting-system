import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import Modal from "../components/common/Modal";
import { createElection } from "../services/elections";

// Component to create a new election (multi-step form)
const CreateElection = () => {
  const navigate = useNavigate();
  
  // Form state
  const [step, setStep] = useState(1);
  const [election, setElection] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    eligible_voters: [""],
    candidates: [{ name: "", photo: "", party: "", description: "" }]
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState({ title: "", description: "" });
  
  // Step 1: Basic Details
  const handleBasicDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setElection(prev => ({ ...prev, [name]: value }));
  };
  
  // Step 2: Voter Eligibility
  const handleVoterEmailChange = (index: number, value: string) => {
    const updatedVoters = [...election.eligible_voters];
    updatedVoters[index] = value;
    setElection(prev => ({ ...prev, eligible_voters: updatedVoters }));
  };
  
  const addVoterEmail = () => {
    setElection(prev => ({
      ...prev,
      eligible_voters: [...prev.eligible_voters, ""]
    }));
  };
  
  const removeVoterEmail = (index: number) => {
    const updatedVoters = [...election.eligible_voters];
    updatedVoters.splice(index, 1);
    setElection(prev => ({ ...prev, eligible_voters: updatedVoters }));
  };
  
  // Step 3: Candidates
  const handleCandidateChange = (index: number, field: string, value: string) => {
    const updatedCandidates = [...election.candidates];
    updatedCandidates[index] = { 
      ...updatedCandidates[index], 
      [field]: value 
    };
    setElection(prev => ({ ...prev, candidates: updatedCandidates }));
  };
  
  const addCandidate = () => {
    setElection(prev => ({
      ...prev,
      candidates: [...prev.candidates, { name: "", photo: "", party: "", description: "" }]
    }));
  };
  
  const removeCandidate = (index: number) => {
    const updatedCandidates = [...election.candidates];
    updatedCandidates.splice(index, 1);
    setElection(prev => ({ ...prev, candidates: updatedCandidates }));
  };
  
  // Form validation
  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!election.title || !election.description || !election.start_date || !election.end_date) {
        setModalMessage({
          title: "Missing Information",
          description: "Please fill in all the required fields."
        });
        setShowModal(true);
        return false;
      }
      
      const startDate = new Date(election.start_date);
      const endDate = new Date(election.end_date);
      
      if (endDate <= startDate) {
        setModalMessage({
          title: "Invalid Date Range",
          description: "End date must be after the start date."
        });
        setShowModal(true);
        return false;
      }
    }
    else if (step === 2) {
      if (election.eligible_voters.some(email => !email)) {
        setModalMessage({
          title: "Invalid Voters",
          description: "Please ensure all voter entries are complete."
        });
        setShowModal(true);
        return false;
      }
    }
    else if (step === 3) {
      if (election.candidates.length === 0) {
        setModalMessage({
          title: "No Candidates",
          description: "Please add at least one candidate."
        });
        setShowModal(true);
        return false;
      }
      
      if (election.candidates.some(c => !c.name)) {
        setModalMessage({
          title: "Incomplete Candidates",
          description: "All candidates must have at least a name."
        });
        setShowModal(true);
        return false;
      }
    }
    
    return true;
  };
  
  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };
  
  const handleBack = () => {
    setStep(step - 1);
  };
  
  // Form submission
  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    
    setLoading(true);
    try {
      // Generate ID for the new election
      const newId = String(Date.now());
      
      // Create the new election
      const newElection = {
        ...election,
        id: newId,
        status: 'active',
        created_by: "alice@example.com" // Current user
      };
      
      // Add to mock data
      mockElectionDetails[newId] = newElection;
      mockElections.push({
        id: newId,
        title: election.title,
        description: election.description,
        end_date: election.end_date,
        hasVoted: false,
        status: 'active'
      });
      
      setModalMessage({
        title: "Success!",
        description: "Your election has been created successfully."
      });
      setShowModal(true);
    } catch (error) {
      setModalMessage({
        title: "Creation Failed",
        description: "There was a problem creating your election. Please try again."
      });
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-purple-800">Create New Election</h1>
        
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                  step === i ? 'bg-purple-900 text-white' : 
                  step > i ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {step > i ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : i}
                </div>
                {i < 4 && (
                  <div className={`flex-1 h-1 mx-2 ${step > i ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className={step >= 1 ? 'text-purple-900 font-medium' : 'text-gray-500'}>Basic Details</span>
            <span className={step >= 2 ? 'text-purple-900 font-medium' : 'text-gray-500'}>Voter Eligibility</span>
            <span className={step >= 3 ? 'text-purple-900 font-medium' : 'text-gray-500'}>Candidates</span>
            <span className={step >= 4 ? 'text-purple-900 font-medium' : 'text-gray-500'}>Review</span>
          </div>
        </div>
        
        {/* Step 1: Basic Details */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-purple-900">Basic Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block mb-1 font-medium">Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="title"
                  value={election.title}
                  onChange={handleBasicDetailsChange}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g. Class President Election"
                  required
                />
              </div>
              
              <div>
                <label className="block mb-1 font-medium">Description <span className="text-red-500">*</span></label>
                <textarea
                  name="description"
                  value={election.description}
                  onChange={handleBasicDetailsChange}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Provide details about this election"
                  rows={4}
                  required
                ></textarea>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-medium">Start Date <span className="text-red-500">*</span></label>
                  <input
                    type="datetime-local"
                    name="start_date"
                    value={election.start_date}
                    onChange={handleBasicDetailsChange}
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block mb-1 font-medium">End Date <span className="text-red-500">*</span></label>
                  <input
                    type="datetime-local"
                    name="end_date"
                    value={election.end_date}
                    onChange={handleBasicDetailsChange}
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Step 2: Voter Eligibility */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-purple-900">Voter Eligibility</h2>
            <p className="mb-4 text-gray-600">
              Specify email addresses or domains (e.g., @example.com) of voters eligible to participate in this election.
            </p>
            
            {election.eligible_voters.map((voter, index) => (
              <div key={index} className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={voter}
                  onChange={(e) => handleVoterEmailChange(index, e.target.value)}
                  className="flex-grow p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Email or domain (e.g., @example.com)"
                />
                <button 
                  type="button"
                  onClick={() => removeVoterEmail(index)}
                  className="px-3 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
                  disabled={election.eligible_voters.length <= 1}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
            
            <button
              type="button"
              onClick={addVoterEmail}
              className="mt-2 flex items-center text-purple-900 hover:text-purple-900"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Another Voter/Domain
            </button>
          </div>
        )}
        
        {/* Step 3: Candidates */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-purple-900">Candidates</h2>
            <p className="mb-4 text-gray-600">
              Add all the candidates for this election. Each candidate must have at least a name.
            </p>
            
            {election.candidates.map((candidate, index) => (
              <div key={index} className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium">Candidate {index + 1}</h3>
                  <button 
                    type="button"
                    onClick={() => removeCandidate(index)}
                    className="text-red-600 hover:text-red-800"
                    disabled={election.candidates.length <= 1}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-sm font-medium">Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={candidate.name}
                      onChange={(e) => handleCandidateChange(index, 'name', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Candidate name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-1 text-sm font-medium">Party</label>
                    <input
                      type="text"
                      value={candidate.party || ''}
                      onChange={(e) => handleCandidateChange(index, 'party', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Political party (optional)"
                    />
                  </div>
                </div>
                
                <div className="mt-3">
                  <label className="block mb-1 text-sm font-medium">Photo URL</label>
                  <input
                    type="text"
                    value={candidate.photo || ''}
                    onChange={(e) => handleCandidateChange(index, 'photo', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Link to candidate photo (optional)"
                  />
                </div>
                
                <div className="mt-3">
                  <label className="block mb-1 text-sm font-medium">Description</label>
                  <textarea
                    value={candidate.description || ''}
                    onChange={(e) => handleCandidateChange(index, 'description', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Brief description (optional)"
                    rows={2}
                  ></textarea>
                </div>
              </div>
            ))}
            
            <button
              type="button"
              onClick={addCandidate}
              className="mt-2 flex items-center text-purple-900 hover:text-purple-900"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Another Candidate
            </button>
          </div>
        )}
        
        {/* Step 4: Review */}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-purple-900">Review Your Election</h2>
            
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h3 className="font-medium text-lg mb-2">Basic Details</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                <dt className="text-gray-600">Title:</dt>
                <dd>{election.title}</dd>
                
                <dt className="text-gray-600">Description:</dt>
                <dd>{election.description}</dd>
                
                <dt className="text-gray-600">Start Date:</dt>
                <dd>{new Date(election.start_date).toLocaleString()}</dd>
                
                <dt className="text-gray-600">End Date:</dt>
                <dd>{new Date(election.end_date).toLocaleString()}</dd>
              </dl>
            </div>
            
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h3 className="font-medium text-lg mb-2">Voter Eligibility</h3>
              <ul className="list-disc list-inside">
                {election.eligible_voters.map((voter, index) => (
                  <li key={index}>{voter}</li>
                ))}
              </ul>
            </div>
            
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h3 className="font-medium text-lg mb-2">Candidates ({election.candidates.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {election.candidates.map((candidate, index) => (
                  <div key={index} className="border rounded p-3">
                    <h4 className="font-medium">{candidate.name}</h4>
                    {candidate.party && <p className="text-sm text-gray-600">{candidate.party}</p>}
                    {candidate.description && <p className="mt-1 text-sm">{candidate.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Navigation buttons */}
        <div className="mt-8 flex justify-between">
          {step > 1 ? (
            <button 
              type="button"
              onClick={handleBack}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md font-medium"
            >
              Back
            </button>
          ) : (
            <button 
              type="button"
              onClick={() => navigate('/elections')}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md font-medium"
            >
              Cancel
            </button>
          )}
          
          {step < 4 ? (
            <button 
              type="button"
              onClick={handleNext}
              className="px-6 py-2 bg-purple-900 hover:bg-purple-800 text-white rounded-md font-medium"
            >
              Next
            </button>
          ) : (
            <button 
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-purple-900 hover:bg-purple-800 text-white rounded-md font-medium flex items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : "Create Election"}
            </button>
          )}
        </div>
      </div>
      
      {showModal && (
        <Modal
          title={modalMessage.title}
          description={modalMessage.description}
          onClose={() => {
            setShowModal(false);
            if (modalMessage.title === "Success!") {
              navigate('/elections');
            }
          }}
        />
      )}
    </Layout>
  );
};

export default CreateElection;