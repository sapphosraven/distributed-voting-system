import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { createElection, CreateElectionRequest } from '../services/elections';
import Modal from '../components/common/Modal';

interface Candidate {
  name: string;
  description: string;
  party: string;
}

export const CreateElection = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState({ title: '', description: '' });
  
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    eligibilityType: 'email' | 'domain';
    eligible_emails: string;
    eligible_domains: string;
    candidates: Candidate[];
  }>({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    eligibilityType: 'domain',
    eligible_emails: '',
    eligible_domains: '',
    candidates: [{ name: '', description: '', party: '' }],
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCandidateChange = (index: number, field: keyof Candidate, value: string) => {
    setFormData((prev) => {
      const newCandidates = [...prev.candidates];
      newCandidates[index] = { ...newCandidates[index], [field]: value };
      return { ...prev, candidates: newCandidates };
    });
  };

  const addCandidate = () => {
    setFormData((prev) => ({
      ...prev,
      candidates: [...prev.candidates, { name: '', description: '', party: '' }],
    }));
  };

  const removeCandidate = (index: number) => {
    setFormData((prev) => {
      const newCandidates = prev.candidates.filter((_, i) => i !== index);
      return { ...prev, candidates: newCandidates };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: CreateElectionRequest = {
        title: formData.title,
        description: formData.description,
        start_date: formData.start_date,
        end_date: formData.end_date,
        candidates: formData.candidates,
      };

      // Add either emails or domains based on selection
      if (formData.eligibilityType === 'email') {
        payload.eligible_emails = formData.eligible_emails.split(',').map(email => email.trim());
      } else {
        payload.eligible_domains = formData.eligible_domains.split(',').map(domain => domain.trim());
      }

      const result = await createElection(payload);
      
      setModalMessage({
        title: 'Success!',
        description: `Election "${result.title}" created successfully.`,
      });
      setShowModal(true);
      
      // After closing the modal, navigate to elections list
      setTimeout(() => {
        navigate('/elections');
      }, 2000);
    } catch (error) {
      console.error('Failed to create election:', error);
      setModalMessage({
        title: 'Error',
        description: `Failed to create election: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 bg-gradient-to-b from-[#28003e] via-[#400057] to-[#5b006b] min-h-screen">
        <div className="max-w-3xl mx-auto bg-zinc-800 rounded-lg p-8">
          <h1 className="text-3xl font-bold mb-6">Create New Election</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Election Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 bg-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={3}
                className="w-full px-3 py-2 bg-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Start Date</label>
                <input
                  type="datetime-local"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 bg-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">End Date</label>
                <input
                  type="datetime-local"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 bg-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Voter Eligibility</label>
              <div className="flex space-x-4 mb-2">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="eligibilityType"
                    value="domain"
                    checked={formData.eligibilityType === 'domain'}
                    onChange={() => setFormData(prev => ({ ...prev, eligibilityType: 'domain' }))}
                    className="mr-2"
                  />
                  By Domain
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="eligibilityType"
                    value="email"
                    checked={formData.eligibilityType === 'email'}
                    onChange={() => setFormData(prev => ({ ...prev, eligibilityType: 'email' }))}
                    className="mr-2"
                  />
                  By Email
                </label>
              </div>
              
              {formData.eligibilityType === 'domain' ? (
                <div>
                  <label className="block text-sm font-medium mb-2">Eligible Domains (comma-separated)</label>
                  <input
                    type="text"
                    name="eligible_domains"
                    value={formData.eligible_domains}
                    onChange={handleInputChange}
                    placeholder="example.com, company.org"
                    className="w-full px-3 py-2 bg-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-2">Eligible Emails (comma-separated)</label>
                  <input
                    type="text"
                    name="eligible_emails"
                    value={formData.eligible_emails}
                    onChange={handleInputChange}
                    placeholder="user1@example.com, user2@example.com"
                    className="w-full px-3 py-2 bg-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Candidates</h3>
                <button
                  type="button"
                  onClick={addCandidate}
                  className="py-1 px-3 bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
                >
                  Add Candidate
                </button>
              </div>
              
              {formData.candidates.map((candidate, index) => (
                <div key={index} className="bg-zinc-700 p-4 rounded-md mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Candidate {index + 1}</h4>
                    {formData.candidates.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCandidate(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                    <div>
                      <label className="block text-sm font-medium mb-1">Name</label>
                      <input
                        type="text"
                        value={candidate.name}
                        onChange={(e) => handleCandidateChange(index, 'name', e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Party</label>
                      <input
                        type="text"
                        value={candidate.party}
                        onChange={(e) => handleCandidateChange(index, 'party', e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <input
                      type="text"
                      value={candidate.description}
                      onChange={(e) => handleCandidateChange(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2 px-4 bg-gradient-to-r from-[#400057] via-[rgb(66,25,84)] to-[rgb(109,32,97)] rounded-md ${
                  loading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-105 transition duration-300'
                }`}
              >
                {loading ? 'Creating...' : 'Create Election'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {showModal && (
        <Modal
          title={modalMessage.title}
          message={modalMessage.description}
          onClose={() => setShowModal(false)}
        />
      )}
    </Layout>
  );
};