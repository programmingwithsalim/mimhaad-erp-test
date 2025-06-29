import { create } from "zustand"

export interface FloatProvider {
  id: string
  name: string
}

export interface FloatType {
  id: string
  name: string
  minThreshold: number
  maxThreshold: number
  providers: FloatProvider[]
}

interface FloatTypesState {
  types: FloatType[]
  addFloatType: (type: Omit<FloatType, "providers">) => void
  addProvider: (typeId: string, provider: FloatProvider) => void
}

export const useFloatTypesStore = create<FloatTypesState>((set) => ({
  types: [
    {
      id: "momo",
      name: "Mobile Money",
      minThreshold: 5000,
      maxThreshold: 50000,
      providers: [
        { id: "mtn", name: "MTN Mobile Money" },
        { id: "vodafone", name: "Vodafone Cash" },
        { id: "airteltigo", name: "AirtelTigo Money" },
      ],
    },
    {
      id: "agency",
      name: "Agency Banking",
      minThreshold: 10000,
      maxThreshold: 100000,
      providers: [
        { id: "ecobank", name: "Ecobank" },
        { id: "gcb", name: "GCB Bank" },
        { id: "absa", name: "Absa Bank" },
        { id: "stanbic", name: "Stanbic Bank" },
        { id: "cal", name: "CAL Bank" },
      ],
    },
    {
      id: "power",
      name: "Power",
      minThreshold: 5000,
      maxThreshold: 50000,
      providers: [
        { id: "ecg", name: "Electricity Company of Ghana" },
        { id: "vra", name: "Volta River Authority" },
        { id: "nedco", name: "Northern Electricity Distribution Company" },
      ],
    },
    {
      id: "cash-in-till",
      name: "Cash in Till",
      minThreshold: 1000,
      maxThreshold: 10000,
      providers: [],
    },
    {
      id: "ezwich",
      name: "E-zwich",
      minThreshold: 3000,
      maxThreshold: 30000,
      providers: [],
    },
    {
      id: "jumia",
      name: "Jumia",
      minThreshold: 2000,
      maxThreshold: 20000,
      providers: [],
    },
  ],
  addFloatType: (type) =>
    set((state) => ({
      types: [...state.types, { ...type, providers: [] }],
    })),
  addProvider: (typeId, provider) =>
    set((state) => ({
      types: state.types.map((type) =>
        type.id === typeId ? { ...type, providers: [...type.providers, provider] } : type,
      ),
    })),
}))
