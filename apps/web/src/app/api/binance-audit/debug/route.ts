import { NextResponse } from "next/server";
import crypto from "crypto";

function sign(qs: string) {
  return crypto.createHmac("sha256", process.env.BINANCE_API_SECRET ?? "").update(qs).digest("hex");
}

export async function GET() {
  const apiKey = process.env.BINANCE_API_KEY ?? "";

  const fundTs = Date.now();
  const fundBody = `timestamp=${fundTs}&asset=USDT`;
  const fundRes = await fetch("https://api.binance.com/sapi/v1/asset/get-funding-asset", {
    method: "POST",
    headers: { "X-MBX-APIKEY": apiKey, "Content-Type": "application/x-www-form-urlencoded" },
    body: `${fundBody}&signature=${sign(fundBody)}`,
    cache: "no-store",
  });
  const fundRaw = await fundRes.text();

  const spotTs = Date.now();
  const spotQs = `timestamp=${spotTs}`;
  const spotRes = await fetch(`https://api.binance.com/api/v3/account?${spotQs}&signature=${sign(spotQs)}`, {
    headers: { "X-MBX-APIKEY": apiKey },
    cache: "no-store",
  });
  const spotData = await spotRes.json() as { balances?: { asset: string; free: string; locked: string }[] };
  const spotUsdt = spotData.balances?.find((b) => b.asset === "USDT");

  async function fetchGet(path: string) {
    const ts = Date.now();
    const qs = `timestamp=${ts}`;
    const res = await fetch(`https://api.binance.com${path}?${qs}&signature=${sign(qs)}`, {
      headers: { "X-MBX-APIKEY": apiKey }, cache: "no-store",
    });
    const raw = await res.text();
    try { return { status: res.status, body: JSON.parse(raw) }; }
    catch { return { status: res.status, body: raw.slice(0, 300) }; }
  }

  async function fetchPost(path: string, extra = "") {
    const ts = Date.now();
    const body = `timestamp=${ts}${extra}`;
    const res = await fetch(`https://api.binance.com${path}`, {
      method: "POST",
      headers: { "X-MBX-APIKEY": apiKey, "Content-Type": "application/x-www-form-urlencoded" },
      body: `${body}&signature=${sign(body)}`,
      cache: "no-store",
    });
    const raw = await res.text();
    try { return { status: res.status, body: JSON.parse(raw) }; }
    catch { return { status: res.status, body: raw.slice(0, 300) }; }
  }

  const [getUserAsset, earnFlex, earnLocked, legacyFlex, legacyFixed] = await Promise.all([
    fetchPost("/sapi/v3/asset/getUserAsset", "&asset=USDT"),
    fetchGet("/sapi/v1/simple-earn/flexible/position"),
    fetchGet("/sapi/v1/simple-earn/locked/position"),
    fetchGet("/sapi/v1/lending/daily/token/position&asset=USDT"),
    fetchGet("/sapi/v1/lending/project/position/list&asset=USDT&status=HOLDING"),
  ]);

  return NextResponse.json({
    get_funding_asset:    { status: fundRes.status, body: (() => { try { return JSON.parse(fundRaw); } catch { return fundRaw; } })() },
    get_user_asset_usdt:  getUserAsset,
    simple_earn_flexible: earnFlex,
    simple_earn_locked:   earnLocked,
    legacy_flexible:      legacyFlex,
    legacy_fixed:         legacyFixed,
    spot:                 { status: spotRes.status, usdt: spotUsdt ?? null },
  });
}
