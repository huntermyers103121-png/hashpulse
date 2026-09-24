"use client";

import { useEffect, useMemo, useState } from "react";

function fmt(n, d = 2) {
  if (n == null || Number.isNaN(n)) return "—";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: d });
}

export default function Page() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [th, setTh] = useState("200");
  const [kwh, setKwh] = useState("0.05");
  const [jth, setJth] = useState("17");

  async function load() {
    try {
      const r = await fetch("/api/live", { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "live feed failed");
      setData(j);
      setErr("");
    } catch (e) {
      setErr(e.message);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const econ = useMemo(() => {
    if (!data) return null;
    const ths = Number(th) || 0;
    const ph = ths / 1000;
    const gross = ph * data.hashpriceUsdPhDay;
    const watts = ths * (Number(jth) || 0);
    const power = (watts / 1000) * 24 * (Number(kwh) || 0);
    return { gross, power, net: gross - power, ph };
  }, [data, th, kwh, jth]);

  return (
    <div className="wrap">
      <div className="top">
        <div>
          <div className="brand">HashPulse</div>
          <h1>Live Bitcoin mining metrics</h1>
          <p className="sub">
            Real network hashprice, difficulty, and pool shares from mempool.space.
            This is not a miner and it does not pay Bitcoin for a download.
          </p>
        </div>
        <div className="live">
          <span className="dot" />
          {data ? `LIVE · ${new Date(data.updatedAt).toLocaleTimeString()}` : "connecting…"}
        </div>
      </div>

      {err && <div className="err">Feed error: {err}</div>}

      {data && (
        <>
          <div className="grid">
            <div className="card">
              <div className="k">USD hashprice</div>
              <div className="v">${fmt(data.hashpriceUsdPhDay, 2)}</div>
              <div className="s">per PH/s / day · gross revenue</div>
            </div>
            <div className="card">
              <div className="k">BTC hashprice</div>
              <div className="v">{data.hashpriceBtcPhDay.toFixed(7)}</div>
              <div className="s">BTC per PH/s / day</div>
            </div>
            <div className="card">
              <div className="k">BTC price</div>
              <div className="v">${fmt(data.priceUsd, 0)}</div>
              <div className="s">block {fmt(data.height, 0)}</div>
            </div>
            <div className="card">
              <div className="k">Network hashrate</div>
              <div className="v">{fmt(data.hashrateEH, 1)} EH/s</div>
              <div className="s">difficulty {fmt(data.difficulty / 1e12, 2)} T</div>
            </div>
          </div>

          <div className="row">
            <div className="card">
              <div className="k">Pool share · last 7 days</div>
              <div className="s" style={{ marginBottom: 10 }}>
                Top 3 control {(data.top3Share * 100).toFixed(1)}% of attributed blocks
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Pool</th>
                    <th>Blocks</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pools.map((p) => (
                    <tr key={p.name}>
                      <td>{p.name}</td>
                      <td>{p.blocks}</td>
                      <td>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <div className="bar" style={{ flex: 1 }}>
                            <span style={{ width: `${Math.min(100, p.share * 100)}%` }} />
                          </div>
                          {(p.share * 100).toFixed(1)}%
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="k">Difficulty epoch</div>
                <div className="v">{fmt(data.progressPercent, 1)}%</div>
                <div className="s">
                  {fmt(data.remainingBlocks, 0)} blocks left · next change{" "}
                  {data.difficultyChange >= 0 ? "+" : ""}
                  {fmt(data.difficultyChange, 2)}%
                </div>
              </div>
              <div className="card">
                <div className="k">Machine estimator</div>
                <div className="s">Gross hashprice minus power. Pool fee not included.</div>
                <div className="calc" style={{ marginTop: 12 }}>
                  <label className="k">
                    TH/s
                    <input value={th} onChange={(e) => setTh(e.target.value)} />
                  </label>
                  <label className="k">
                    J/TH
                    <input value={jth} onChange={(e) => setJth(e.target.value)} />
                  </label>
                  <label className="k">
                    $/kWh
                    <input value={kwh} onChange={(e) => setKwh(e.target.value)} />
                  </label>
                </div>
                {econ && (
                  <div className="grid" style={{ marginTop: 12, marginBottom: 0 }}>
                    <div>
                      <div className="k">Gross / day</div>
                      <div className="v" style={{ fontSize: 20 }}>${fmt(econ.gross, 2)}</div>
                    </div>
                    <div>
                      <div className="k">Power / day</div>
                      <div className="v" style={{ fontSize: 20 }}>${fmt(econ.power, 2)}</div>
                    </div>
                    <div>
                      <div className="k">Net / day</div>
                      <div className="v" style={{ fontSize: 20, color: econ.net >= 0 ? "var(--good)" : "var(--bad)" }}>
                        ${fmt(econ.net, 2)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card warn" style={{ marginTop: 12 }}>
            <div className="k">Not a cloud miner</div>
            <div className="flags">
              <div className="flag"><b>No bonus, no PayPal screenshot, no “tap to mine.”</b> HashPulse only reads public chain stats.</div>
              <div className="flag"><b>A phone cannot earn this hashprice.</b> A 200 TH/s ASIC is ~0.2 PH. An app tile is ~0 PH of SHA-256.</div>
              <div className="flag"><b>Hashprice is revenue, not profit.</b> Subtract power, hosting, pool fee, and depreciation.</div>
              <div className="flag"><b>Subsidy {data.subsidy} BTC</b> + ~{fmt(data.feeBtcPerBlock, 3)} BTC fees / block. Fees are currently a small slice.</div>
            </div>
          </div>
        </>
      )}

      <div className="foot">
        Data: mempool.space REST API. Hashprice = (144 × block reward × BTC USD) ÷ network PH/s.
        Refresh every 30s via /api/live. Educational dashboard only — not financial advice and not an investment product.
      </div>
    </div>
  );
}
