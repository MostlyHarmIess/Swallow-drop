import { useState } from "react";
import NamePicker from "./components/NamePicker";
import Dashboard from "./pages/Dashboard";

type Identity = {
  name: string;
  color: string;
  sessionId: string;
};

export default function App() {
  const [identity, setIdentity] = useState<Identity | null>(() => {
    const stored = localStorage.getItem("identity");
    return stored ? (JSON.parse(stored) as Identity) : null;
  });

  const choose = (name: string, color: string) => {
    const sessionId = crypto.randomUUID();
    const newIdentity = { name, color, sessionId };
    localStorage.setItem("identity", JSON.stringify(newIdentity));
    setIdentity(newIdentity);
  };

  if (!identity) {
    return <NamePicker onChoose={choose} />;
  }

  return <Dashboard identity={identity} />;
}
