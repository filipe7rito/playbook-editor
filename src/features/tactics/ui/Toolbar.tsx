"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    ArrowRight,
    Circle,
    Layers,
    MapPin,
    MousePointer2,
    Route,
    Square,
    Type,
} from "lucide-react";
import type { Tool } from "../engine/types";

function ToolButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Button
      variant={active ? "default" : "secondary"}
      size="sm"
      onClick={onClick}
      className="justify-start gap-2"
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </Button>
  );
}

export function Toolbar({
  tool,
  setTool,
}: {
  tool: Tool;
  setTool: (t: Tool) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold">Ferramentas</div>

      <div className="grid grid-cols-2 gap-2">
        <ToolButton active={tool === "select"} onClick={() => setTool("select")} icon={<MousePointer2 className="h-4 w-4" />} label="Selecionar" />
        <ToolButton active={tool === "text"} onClick={() => setTool("text")} icon={<Type className="h-4 w-4" />} label="Texto" />

        <ToolButton active={tool === "player"} onClick={() => setTool("player")} icon={<Circle className="h-4 w-4" />} label="Jogador" />
        <ToolButton active={tool === "opponent"} onClick={() => setTool("opponent")} icon={<Circle className="h-4 w-4" />} label="Adversário" />

        <ToolButton active={tool === "cone"} onClick={() => setTool("cone")} icon={<MapPin className="h-4 w-4" />} label="Cone" />
        <ToolButton active={tool === "ball"} onClick={() => setTool("ball")} icon={<Circle className="h-4 w-4" />} label="Bola" />

        <Separator className="col-span-2 my-1" />

        <ToolButton active={tool === "arrow"} onClick={() => setTool("arrow")} icon={<ArrowRight className="h-4 w-4" />} label="Seta" />
        <ToolButton active={tool === "path"} onClick={() => setTool("path")} icon={<Route className="h-4 w-4" />} label="Trajeto" />

        <ToolButton active={tool === "line"} onClick={() => setTool("line")} icon={<Layers className="h-4 w-4" />} label="Linha" />
        <ToolButton active={tool === "zone"} onClick={() => setTool("zone")} icon={<Square className="h-4 w-4" />} label="Zona" />
      </div>
    </div>
  );
}
