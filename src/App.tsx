import { useState } from "react";
import NamePicker from "./components/NamePicker";
import Dashboard from "./pages/Dashboard";

type Identity = {
  name: string;
  color: string;
  sessionId: string;
};

function getUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // fallback for http
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}


export default function App() {
  const [identity, setIdentity] = useState<Identity | null>(() => {
    const stored = localStorage.getItem("identity");
    return stored ? (JSON.parse(stored) as Identity) : null;
  });

  const choose = (name: string, color: string) => {
    const sessionId = getUUID()
    const newIdentity = { name, color, sessionId };
    localStorage.setItem("identity", JSON.stringify(newIdentity));
    setIdentity(newIdentity);
  };

  if (!identity) {
    return <NamePicker onChoose={choose} />;
  }

  return <Dashboard identity={identity} />;
}
