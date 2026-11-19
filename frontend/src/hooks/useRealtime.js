import { useContext } from "react";
import { RealtimeContext } from "../context/RealtimeContext.js";

export function useRealtime() {
  return useContext(RealtimeContext);
}
