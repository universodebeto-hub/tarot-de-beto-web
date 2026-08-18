export type ServiceModality = "Videollamada" | "Llamada" | "Presencial";

export interface Service {
  id: string;
  slug: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  currency: string;
  available: boolean;
  modality: ServiceModality;
  category: string;
}

export interface Testimonial {
  id: string;
  name: string;
  text: string;
  rating: 1 | 2 | 3 | 4 | 5;
  date?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}
