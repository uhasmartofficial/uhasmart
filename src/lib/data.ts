import {
  Utensils,
  Shirt,
  Laptop,
  Sparkles,
  BookOpen,
  Printer,
  Camera,
  Layers,
  Home,
  ShoppingBasket,
  Scissors,
  LucideIcon,
} from "lucide-react";

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
}

export interface CampusLocation {
  id: string;
  name: string;
}

export const campusLocations: CampusLocation[] = [
  { id: "ho-central", name: "Ho Central / Main Market" },
  { id: "bankoe", name: "Bankoe" },
  { id: "heve", name: "Heve" },
  { id: "dome", name: "Dome" },
  { id: "ahoe", name: "Ahoe" },
  { id: "fiave", name: "Fiave" },
  { id: "kpodzi", name: "Kpodzi" },
  { id: "htu-poly", name: "HTU / Poly Area" },
  { id: "barracks-airport", name: "Barracks / Airport Area" },
  { id: "sokode", name: "Sokode / Main Campus Area" },
  { id: "trafalgar", name: "Trafalgar / Ho Teaching Hospital" },
  { id: "dave", name: "Dave Campus & Surroundings" },
  { id: "lokoe", name: "Lokoe" },
  { id: "adaklu", name: "Adaklu / Border Hostels" },
  { id: "taviefe-anyirawase", name: "Taviefe / Anyirawase Road" },
  { id: "ho-wide", name: "Across Ho (Delivery Available)" },
];

export const categories: Category[] = [
  {
    id: "hostels",
    name: "Hostels & Accommodations",
    description: "Student hostels, homestays, self-contain rooms & shared apartments",
    icon: Home,
  },
  {
    id: "food",
    name: "Food & Drinks",
    description: "Campus meals, snacks, smoothies, chops & fast food",
    icon: Utensils,
  },
  {
    id: "groceries",
    name: "Groceries & Essentials",
    description: "Provisions, toiletries, bottled water, snacks & daily dorm needs",
    icon: ShoppingBasket,
  },
  {
    id: "salons-barbers",
    name: "Salons & Barbers",
    description: "Hair styling, braiding, dreadlocks, fades, barbering & wig revamping",
    icon: Scissors,
  },
  {
    id: "fashion",
    name: "Fashion & Wears",
    description: "Clothing, thrift shoes, sneakers, watches, bags & accessories",
    icon: Shirt,
  },
  {
    id: "electronics",
    name: "Tech & Gadgets",
    description: "Laptops, smartphones, chargers, power banks & device repairs",
    icon: Laptop,
  },
  {
    id: "beauty",
    name: "Beauty & Grooming",
    description: "Skincare, cosmetics, perfumes, makeup & personal care",
    icon: Sparkles,
  },
  {
    id: "academic-services",
    name: "Academic & Books",
    description: "Textbooks, medical notes, lab coats, dissection kits & tutoring",
    icon: BookOpen,
  },
  {
    id: "printing",
    name: "Printing & Design",
    description: "Photocopying, project binding, flyers, banner design & stationery",
    icon: Printer,
  },
  {
    id: "photography",
    name: "Photography & Media",
    description: "Event coverage, portrait sessions, graduation shoots & editing",
    icon: Camera,
  },
  {
    id: "other",
    name: "Other Services",
    description: "Room décor, laundry, errands & artisan services in Ho",
    icon: Layers,
  },
];

export function getCategoryIcon(categoryId: string): LucideIcon {
  const cat = categories.find((c) => c.id === categoryId);
  return cat ? cat.icon : Layers;
}
