import { useLeaderboard } from "@/hooks/use-gamification";
import { useUser } from "@/hooks/use-auth";
import { Trophy, Medal, Crown, Flame, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-slate-400" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center">#{rank}</span>;
}

function getLevelTitle(level: number) {
  if (level >= 20) return "Elite";
  if (level >= 15) return "Advanced";
  if (level >= 10) return "Intermediate";
  if (level >= 5) return "Dedicated";
  return "Beginner";
}

function getLevelColor(level: number) {
  if (level >= 20) return "bg-yellow-500/20 text-yellow-600 border-yellow-500/30";
  if (level >= 10) return "bg-purple-500/20 text-purple-600 border-purple-500/30";
  if (level >= 5) return "bg-blue-500/20 text-blue-600 border-blue-500/30";
  return "bg-primary/20 text-primary border-primary/30";
}

export default function Leaderboard() {
  const { data: board, isLoading } = useLeaderboard();
  const { data: me } = useUser();

  const myRank = board?.findIndex((u: any) => u.id === me?.id) ?? -1;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          Leaderboard
        </h1>
        <p className="text-muted-foreground text-sm">Top athletes ranked by total XP earned</p>
      </div>

      {/* Your rank */}
      {myRank >= 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Star className="w-4 h-4" />
                Your Rank: #{myRank + 1}
              </div>
              <div className="text-sm text-muted-foreground">{me?.xp?.toLocaleString()} XP • Level {me?.level}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top 3 Podium */}
      {!isLoading && board && board.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {/* 2nd */}
          <div className="flex flex-col items-center gap-2 pt-6">
            <Avatar className="w-12 h-12 border-2 border-slate-400">
              <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-600 font-bold">
                {board[1].name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <div className="text-xs font-bold truncate max-w-[80px]">{board[1].name.split(" ")[0]}</div>
              <div className="text-xs text-muted-foreground">{board[1].xp?.toLocaleString()} XP</div>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-t-xl h-16 flex items-center justify-center">
              <Medal className="w-6 h-6 text-slate-400" />
            </div>
          </div>
          {/* 1st */}
          <div className="flex flex-col items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            <Avatar className="w-14 h-14 border-2 border-yellow-500">
              <AvatarFallback className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 font-bold text-lg">
                {board[0].name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <div className="text-sm font-bold truncate max-w-[80px]">{board[0].name.split(" ")[0]}</div>
              <div className="text-xs text-muted-foreground">{board[0].xp?.toLocaleString()} XP</div>
            </div>
            <div className="w-full bg-yellow-400 rounded-t-xl h-24 flex items-center justify-center">
              <Crown className="w-7 h-7 text-yellow-800" />
            </div>
          </div>
          {/* 3rd */}
          <div className="flex flex-col items-center gap-2 pt-10">
            <Avatar className="w-12 h-12 border-2 border-amber-600">
              <AvatarFallback className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 font-bold">
                {board[2].name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <div className="text-xs font-bold truncate max-w-[80px]">{board[2].name.split(" ")[0]}</div>
              <div className="text-xs text-muted-foreground">{board[2].xp?.toLocaleString()} XP</div>
            </div>
            <div className="w-full bg-amber-300 dark:bg-amber-700 rounded-t-xl h-10 flex items-center justify-center">
              <Medal className="w-5 h-5 text-amber-800" />
            </div>
          </div>
        </div>
      )}

      {/* Full List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">All Rankings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-1 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : (board?.length || 0) === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No athletes yet. Be the first!</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {board?.map((entry: any, idx: number) => {
                const isMe = entry.id === me?.id;
                const xpIntoLevel = (entry.xp || 0) % 500;
                const xpPct = Math.min((xpIntoLevel / 500) * 100, 100);

                return (
                  <div
                    key={entry.id}
                    data-testid={`leaderboard-row-${entry.id}`}
                    className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${isMe ? "bg-primary/5" : "hover:bg-muted/30"}`}
                  >
                    <div className="w-6 flex items-center justify-center shrink-0">
                      <RankBadge rank={idx + 1} />
                    </div>
                    <Avatar className={`w-9 h-9 shrink-0 border-2 ${isMe ? "border-primary" : "border-transparent"}`}>
                      <AvatarFallback className={`font-bold text-sm ${isMe ? "bg-primary/10 text-primary" : "bg-muted"}`}>
                        {entry.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold text-sm truncate ${isMe ? "text-primary" : ""}`}>
                          {entry.name}{isMe ? " (You)" : ""}
                        </span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 shrink-0 ${getLevelColor(entry.level || 1)}`}>
                          Lv.{entry.level || 1} {getLevelTitle(entry.level || 1)}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full" style={{ width: `${xpPct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums shrink-0">{(entry.xp || 0).toLocaleString()} XP</span>
                      </div>
                    </div>
                    {idx < 3 && <Flame className={`w-4 h-4 shrink-0 ${idx === 0 ? "text-yellow-500" : idx === 1 ? "text-slate-400" : "text-amber-600"}`} />}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
