// Define the branch interface
export interface Branch {
  id: string
  name: string
  location: string
  manager: string
  contactNumber: string
  email: string
  status: "active" | "inactive"
  createdAt: string
}

// Sample branch data
export const branches: Branch[] = [
  {
    id: "branch-1",
    name: "Accra Main Branch",
    location: "Independence Avenue, Accra",
    manager: "Kofi Mensah",
    contactNumber: "0302123456",
    email: "accra.main@example.com",
    status: "active",
    createdAt: "2023-01-15T08:30:00.000Z",
  },
  {
    id: "branch-2",
    name: "Kumasi City Branch",
    location: "Adum, Kumasi",
    manager: "Akua Owusu",
    contactNumber: "0322987654",
    email: "kumasi.city@example.com",
    status: "active",
    createdAt: "2023-02-20T09:15:00.000Z",
  },
  {
    id: "branch-3",
    name: "Takoradi Harbor Branch",
    location: "Harbor Area, Takoradi",
    manager: "Kwame Asante",
    contactNumber: "0312456789",
    email: "takoradi.harbor@example.com",
    status: "active",
    createdAt: "2023-03-10T10:00:00.000Z",
  },
  {
    id: "branch-4",
    name: "Tamale Central Branch",
    location: "Central Tamale",
    manager: "Fatima Ibrahim",
    contactNumber: "0372345678",
    email: "tamale.central@example.com",
    status: "active",
    createdAt: "2023-04-05T08:45:00.000Z",
  },
  {
    id: "branch-5",
    name: "Cape Coast Castle Branch",
    location: "Near Castle, Cape Coast",
    manager: "John Eshun",
    contactNumber: "0332567890",
    email: "capecoast.castle@example.com",
    status: "active",
    createdAt: "2023-05-12T11:30:00.000Z",
  },
]

// Function to get all branches
export const getAllBranches = (): Branch[] => {
  return branches
}

// Function to get a branch by ID
export const getBranchById = (id: string): Branch | undefined => {
  return branches.find((branch) => branch.id === id)
}

// Function to get branches by status
export const getBranchesByStatus = (status: "active" | "inactive"): Branch[] => {
  return branches.filter((branch) => branch.status === status)
}
