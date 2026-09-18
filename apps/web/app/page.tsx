import { FOUNDATION_LABEL, getTraderHealth, echartsSmoko } from "@/lib/foundation";
import { FadeIn } from "./fade-in";

export const dynamic = "force-dynamic";

export default async function Home(): Promise<React.JSX.Element> {
  const trader = await getTraderHealth();
  const smoke = echartsSmoko();

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <FadeIn>
      <section
        style={{
          maxWidth: 640,
          width: "100%",
          border: "1px solid #2a3348",
          borderRadius: 12,
          padding: 24,
          background: "#101623",
        }}
      >
        <p
          style={{
            display: "inline-block",
            fontSize: 12,
            padding: "2px 10px",
            borderRadius: 999,
            background: "#1a2030",
            border: "1px solid #2a3348",
            color: "#e6e9f0",
          }}
        >
          {FOUNDATION_LABEL}
        </p>
        <h1 style={{ fontSize: 28, margin: "12px 0 4px" }}>Deriv Trader</h1>
        <p style={{ color: "#8a93a6", margin: 0 }}>
          Foundation shell. No trading statistics, strategy performance, or broker
          connection are fabricated here.
        </p>
        <dl style={{ marginTop: 16, display: "grid", gap: 8, fontSize: 14 }}>
          <div>
            <dt style={{ color: "#8a93a6" }}>Web build</dt>
            <dd style={{ margin: 0 }}>OK — foundation route rendered</dd>
          </div>
          <div>
            <dt style={{ color: "#8a93a6" }}>Trader Worker health</dt>
            <dd style={{ margin: 0 }}>
              {trader.reachable
                ? `reachable (${trader.status ?? "unknown"} / ${trader.environment ?? "unknown"} / v${trader.version ?? "?"})`
                : "not reachable locally (start apps/trader to see live status)"}
            </dd>
          </div>
          <div>
            <dt style={{ color: "#8a93a6" }}>Chart foundation smoke</dt>
            <dd style={{ margin: 0 }}>echarts loaded ({smoke})</dd>
          </div>
        </dl>
      </section>
      </FadeIn>
    </main>
  );
}
