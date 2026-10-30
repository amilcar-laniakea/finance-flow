import crypto from "crypto";

function sign(queryString: string): string {
  return crypto
    .createHmac("sha256", process.env.BINANCE_API_SECRET ?? "")
    .update(queryString)
    .digest("hex");
}

export async function getBinanceUsdtBalances(): Promise<{
  spot: number;
  funding: number;
  error?: string;        // fatal: spot failed
  fundingNote?: string;  // non-fatal: funding not accessible
}> {
  const apiKey = process.env.BINANCE_API_KEY;
  if (!apiKey || !process.env.BINANCE_API_SECRET) {
    return { spot: 0, funding: 0, error: "BINANCE_API_KEY o BINANCE_API_SECRET no configurados" };
  }

  try {
    // Spot wallet
    const spotTs = Date.now();
    const spotQs = `timestamp=${spotTs}`;
    const spotRes = await fetch(
      `https://api.binance.com/api/v3/account?${spotQs}&signature=${sign(spotQs)}`,
      { headers: { "X-MBX-APIKEY": apiKey }, cache: "no-store" }
    );
    const spotData = await spotRes.json() as { balances?: { asset: string; free: string; locked: string }[]; msg?: string };
    if (!spotRes.ok || !spotData.balances) {
      return { spot: 0, funding: 0, error: spotData.msg ?? `Spot API error ${spotRes.status}` };
    }
    const spotUsdt = spotData.balances.find((b) => b.asset === "USDT");
    const spot = parseFloat(spotUsdt?.free ?? "0") + parseFloat(spotUsdt?.locked ?? "0");

    // Funding wallet — POST /sapi/v1/asset/get-funding-asset (requires only "Enable Reading")
    const fundTs = Date.now();
    const fundBody = `timestamp=${fundTs}&asset=USDT`;
    const fundRes = await fetch(
      "https://api.binance.com/sapi/v1/asset/get-funding-asset",
      {
        method: "POST",
        headers: { "X-MBX-APIKEY": apiKey, "Content-Type": "application/x-www-form-urlencoded" },
        body: `${fundBody}&signature=${sign(fundBody)}`,
        cache: "no-store",
      }
    );
    // BINANCE_FUNDING_OVERRIDE_USDT: manual fallback when the API is unavailable for this account type
    const fundingOverride = parseFloat(process.env.BINANCE_FUNDING_OVERRIDE_USDT ?? "0");

    let funding = 0;
    let fundingNote: string | undefined;
    if (fundRes.ok) {
      const fundData = await fundRes.json() as Array<{ asset: string; free: string; locked: string; freeze?: string }> | { code?: number; msg?: string };
      if (Array.isArray(fundData)) {
        const fundUsdt = fundData.find((b) => b.asset === "USDT");
        funding =
          parseFloat(fundUsdt?.free ?? "0") +
          parseFloat(fundUsdt?.locked ?? "0") +
          parseFloat(fundUsdt?.freeze ?? "0");
      } else {
        funding = fundingOverride;
        fundingNote = fundingOverride > 0 ? `Funding vía override (${fundingOverride} USDT)` : (fundData.msg ?? "Funding wallet no disponible");
      }
    } else {
      // API blocked for this account — use manual override if set
      funding = fundingOverride;
      if (fundingOverride > 0) {
        fundingNote = `Funding vía override manual (${fundingOverride} USDT)`;
      } else {
        fundingNote = `Funding wallet inaccesible vía API — configura BINANCE_FUNDING_OVERRIDE_USDT`;
      }
    }

    return { spot, funding, fundingNote };
  } catch (err) {
    return { spot: 0, funding: 0, error: String(err) };
  }
}
