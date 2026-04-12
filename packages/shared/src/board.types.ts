export interface Board {
  id: string;
  name: string;
  description?: string;
  isDemo: boolean;
  createdById: string;
  createdAt: Date;
}

export interface List {
  id: string;
  boardId: string;
  name: string;
  position: number;
  createdAt: Date;
}

export interface Card {
  id: string;
  listId: string;
  title: string;
  descriptionText?: string;
  position: number;
  coverColor?: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}
