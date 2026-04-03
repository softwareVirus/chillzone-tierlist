import { TierlistBoard } from "@/components/TierlistBoard";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      <TierlistBoard />
    </div>
  );
}
