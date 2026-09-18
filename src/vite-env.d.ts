/// <reference types="vite/client" />

declare module "virtual:characters" {
  export const characters: Array<{
    id: string;
    folder: string;
    updatedAt: string;
    name?: string;
  }>;
}
