"use client";

import { createContext, use } from "react";

// Opens the wallet / deposit sheet from anywhere inside LobbyScreen (header button, the game
// page's phone top bar, ...). LobbyScreen provides it: signed-in players get the sheet,
// guests the sign-in dialog. Outside the lobby it does nothing.
export const DepositContext = createContext<() => void>(() => {});

export function useOpenDeposit() {
  return use(DepositContext);
}
