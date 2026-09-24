export const dynamic = "force-dynamic";
export const revalidate = 0;

const BASE = "https://mempool.space/api";

async function j(path) {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

export async function GET() {
  try {
    const [prices, height, da, hr, pools, fees] = await Promise.all([
      j("/v1/prices"),
      j("/blocks/tip/height"),
      j("/v1/difficulty-adjustment"),
      j("/v1/mining/hashrate/3d"),
      j("/v1/mining/pools/1w"),
      j("/v1/mining/reward-stats/144").catch(() => null),
    ]);

    const usd = Number(prices.USD || 0);
    const difficulty = Number(hr.currentDifficulty || da.difficulty || 0);
    const hashrateHs = Number(hr.currentHashrate || 0);
    const hashrateEH = hashrateHs / 1e18;
    const subsidy = 3.125;
    const feeBtc =
      fees && fees.totalReward && fees.totalFee
        ? Number(fees.totalFee) / 1e8 / 144
        : 0.02;
    const reward = subsidy + feeBtc;
    const hashpriceUsdPhDay =
      hashrateHs > 0 ? (144 * reward * usd) / (hashrateHs / 1e15) : 0;
    const hashpriceBtcPhDay = usd > 0 ? hashpriceUsdPhDay / usd : 0;

    const poolList = (pools.pools || []).slice(0, 12).map((p) => ({
      name: p.name,
      blocks: p.blockCount,
      share: pools.blockCount ? p.blockCount / pools.blockCount : 0,
      link: p.link,
    }));
    const top3 = poolList.slice(0, 3).reduce((a, p) => a + p.share, 0);

    return Response.json({
      ok: true,
      updatedAt: new Date().toISOString(),
      priceUsd: usd,
      height,
      subsidy,
      feeBtcPerBlock: feeBtc,
      rewardBtc: reward,
      difficulty,
      hashrateEH,
      progressPercent: da.progressPercent,
      remainingBlocks: da.remainingBlocks,
      estimatedRetargetDate: da.estimatedRetargetDate,
      difficultyChange: da.difficultyChange,
      hashpriceUsdPhDay,
      hashpriceBtcPhDay,
      pools: poolList,
      poolBlocksWeek: pools.blockCount,
      top3Share: top3,
      source: "mempool.space",
    });
  } catch (err) {
    return Response.json({ ok: false, error: String(err.message || err) }, { status: 502 });
  }
}
