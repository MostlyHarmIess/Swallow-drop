import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type Props = {
  onChoose: (name: string, color: string) => void;
};

function getRandomColor() {
  const colors = ["#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6"];
  return colors[Math.floor(Math.random() * colors.length)];
}

export default function NamePicker({ onChoose }: Props) {
  const [name, setName] = useState("");

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onChoose(trimmed, getRandomColor());
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-100 p-6">
      <Card className="w-full max-w-sm bg-slate-900 border border-slate-800 shadow-2xl shadow-slate-950/50">
        <CardHeader>
          <CardTitle className="text-center text-2xl text-white">Who are you?</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-white">
          <Input
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
          />
          <Button onClick={handleSubmit} className="w-full bg-sky-500 text-slate-950 hover:bg-sky-400">
            Go
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
