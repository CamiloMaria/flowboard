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

// Composite types for API responses
export interface ListWithCards extends List {
  cards: Card[];
}

export interface BoardWithLists extends Board {
  lists: ListWithCards[];
}

// WS event payloads (per D-13: events carry full updated entity)
export interface CardMovePayload {
  cardId: string;
  fromListId: string;
  toListId: string;
  newPosition: number;
  card: Card; // full updated card entity
}

export interface CardCreatePayload {
  card: Card;
}

export interface CardUpdatePayload {
  card: Card;
}

export interface CardDeletePayload {
  cardId: string;
  listId: string;
}

export interface ListCreatePayload {
  list: List;
}

export interface ListUpdatePayload {
  list: List;
}

export interface ListDeletePayload {
  listId: string;
}
