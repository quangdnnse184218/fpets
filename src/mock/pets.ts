export interface Pet {
  id: string;
  name: string;
  species: 'dog' | 'cat';
  breed: string;
  weight: number;
  size: 'small' | 'large';
  ageGroup: 'puppy_kitten' | 'adult' | 'senior';
  ageLabel: string;
  gender: 'Đực' | 'Cái';
  birthdate?: string;
  allergies: string[];
  preferences: string[];
  notes?: string;
  avatarColor: string;
  receivedBoxesCount: number;
}

export const INITIAL_PETS: Pet[] = [
  {
    id: "pet-bo",
    name: "Bơ",
    species: "dog",
    breed: "Golden Retriever",
    weight: 18.5,
    size: "large",
    ageGroup: "adult",
    ageLabel: "2 tuổi (Trưởng thành)",
    gender: "Đực",
    birthdate: "2024-04-12",
    allergies: ["Thịt gà", "Bắp / Ngô"],
    preferences: ["Gặm xương giòn", "Đồ chơi dây thừng kéo co", "Thịt cừu sấy"],
    notes: "Bé rất mê gặm đồ vật khi ở nhà một mình, cần đồ chơi dai bền.",
    avatarColor: "#FDECC4",
    receivedBoxesCount: 1
  },
  {
    id: "pet-miu",
    name: "Miu",
    species: "cat",
    breed: "Mèo Anh Lông Ngắn",
    weight: 4.2,
    size: "small",
    ageGroup: "puppy_kitten",
    ageLabel: "8 tháng (Mèo con)",
    gender: "Cái",
    birthdate: "2025-10-05",
    allergies: ["Không có"],
    preferences: ["Cỏ bạc hà Catnip", "Pate cá hồi", "Cần câu lông vũ"],
    notes: "Bé hơi nhát với âm thanh lớn, thích đồ chơi mềm mại.",
    avatarColor: "#E1EDE8",
    receivedBoxesCount: 2
  }
];
