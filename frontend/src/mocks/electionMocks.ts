import { Election, ElectionListItem } from "../types/election";

export const mockElections: ElectionListItem[] = [
  {
    id: "1",
    title: "Class President Election",
    description: "Vote for your class president for the 2025-2026 academic year",
    end_date: "2025-06-15T23:59:59Z",
    hasVoted: false,
    status: "active"
  },
  {
    id: "2",
    title: "Student Council Election",
    description: "Select representatives for the student council",
    end_date: "2025-05-30T23:59:59Z",
    hasVoted: true,
    status: "active"
  },
  {
    id: "3",
    title: "School Mascot Selection",
    description: "Choose our new school mascot",
    end_date: "2025-04-15T23:59:59Z",
    hasVoted: true,
    status: "completed"
  }
];

export const mockElectionDetails: Record<string, Election> = {
  "1": {
    id: "1",
    title: "Class President Election",
    description: "Vote for your class president for the 2025-2026 academic year",
    start_date: "2025-05-01T00:00:00Z",
    end_date: "2025-06-15T23:59:59Z",
    created_by: "admin@example.com",
    eligible_voters: ["@student.edu", "alice@example.com"],
    status: "active",
    candidates: [
      {
        id: "c1",
        name: "Alice Johnson",
        party: "Progress Party",
        description: "Working for student progress and better facilities"
      },
      {
        id: "c2",
        name: "Bob Smith",
        party: "Excellence Union",
        description: "Striving for academic excellence"
      }
    ]
  },
  "2": {
    id: "2",
    title: "Student Council Election",
    description: "Select representatives for the student council",
    start_date: "2025-05-01T00:00:00Z",
    end_date: "2025-05-30T23:59:59Z",
    created_by: "admin@example.com",
    eligible_voters: ["@student.edu"],
    status: "active",
    candidates: [
      {
        id: "c3",
        name: "Carol Davis",
        party: "Student Voice",
        description: "Representing student concerns and needs"
      },
      {
        id: "c4",
        name: "David Wilson",
        party: "Future Leaders",
        description: "Preparing students for leadership roles"
      }
    ]
  },
  "3": {
    id: "3",
    title: "School Mascot Selection",
    description: "Choose our new school mascot",
    start_date: "2025-04-01T00:00:00Z",
    end_date: "2025-04-15T23:59:59Z",
    created_by: "admin@example.com",
    eligible_voters: ["@student.edu", "@faculty.edu"],
    status: "completed",
    candidates: [
      {
        id: "c5",
        name: "Lions",
        description: "Strong and brave"
      },
      {
        id: "c6",
        name: "Eagles",
        description: "Soaring high with vision"
      },
      {
        id: "c7",
        name: "Wolves",
        description: "Teamwork and loyalty"
      }
    ]
  }
};