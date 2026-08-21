import { db } from "./db";

export type Settings = {
  commission_rate: number;
  hold_days: number;
  min_payout_huf: number;
};

export async function getSettings(): Promise<Settings> {
  const { data } = await db().from("settings").select("commission_rate,hold_days,min_payout_huf").eq("id", 1).single();
  return {
    commission_rate: Number(data?.commission_rate ?? 30),
    hold_days: Number(data?.hold_days ?? 30),
    min_payout_huf: Number(data?.min_payout_huf ?? 20000),
  };
}
