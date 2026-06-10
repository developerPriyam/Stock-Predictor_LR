import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function downloadCSV(rows, filename = "data.csv") {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadPredictionPDF({ ticker, quote, prediction, analytics }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFillColor(5, 5, 5);
  doc.rect(0, 0, 595, 842, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("StockVision AI · Prediction Report", 40, 60);

  doc.setFontSize(11);
  doc.setTextColor(180, 180, 180);
  doc.text(`Ticker: ${ticker}`, 40, 90);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 108);

  if (quote) {
    autoTable(doc, {
      startY: 130,
      head: [["Quote", ""]],
      body: [
        ["Company", quote.name || ticker],
        ["Exchange", quote.exchange || "—"],
        ["Current Price", `${(quote.price ?? 0).toFixed(2)} ${quote.currency}`],
        ["Day Change", `${(quote.change ?? 0).toFixed(2)} (${(quote.change_percent ?? 0).toFixed(2)}%)`],
        ["52W High", `${(quote.fifty_two_week_high ?? 0).toFixed(2)}`],
        ["52W Low", `${(quote.fifty_two_week_low ?? 0).toFixed(2)}`],
        ["Market Cap", String(quote.market_cap ?? "—")],
      ],
      theme: "grid",
      styles: { fillColor: [10, 10, 10], textColor: [220, 220, 220], lineColor: [40, 40, 40], fontSize: 9 },
      headStyles: { fillColor: [0, 122, 255], textColor: [255, 255, 255] },
    });
  }

  if (prediction) {
    autoTable(doc, {
      head: [["AI Forecast", ""]],
      body: [
        ["Predicted Price", `${(prediction.predicted_price ?? 0).toFixed(2)}`],
        ["Expected Move", `${(prediction.predicted_change_percent ?? 0).toFixed(2)}%`],
        ["Trend", prediction.trend],
        ["Recommendation", prediction.recommendation],
        ["Confidence", `${Math.round((prediction.confidence || 0) * 100)}%`],
        ["Directional Accuracy", `${Math.round((prediction.direction_accuracy || 0) * 100)}%`],
        ["Model", prediction.model],
      ],
      theme: "grid",
      styles: { fillColor: [10, 10, 10], textColor: [220, 220, 220], lineColor: [40, 40, 40], fontSize: 9 },
      headStyles: { fillColor: [0, 122, 255], textColor: [255, 255, 255] },
    });
  }

  if (analytics) {
    autoTable(doc, {
      head: [["Analytics", ""]],
      body: [
        ["Trend Strength", (analytics.trend_strength * 100).toFixed(1) + "%"],
        ["Volatility (annual)", (analytics.volatility_pct ?? 0).toFixed(2) + "%"],
        ["Momentum (14d)", (analytics.momentum_pct ?? 0).toFixed(2) + "%"],
        ["Risk Level", analytics.risk_level],
        ["Max Drawdown", "-" + (analytics.max_drawdown_pct ?? 0).toFixed(2) + "%"],
        ["Support", (analytics.support ?? 0).toFixed(2)],
        ["Resistance", (analytics.resistance ?? 0).toFixed(2)],
      ],
      theme: "grid",
      styles: { fillColor: [10, 10, 10], textColor: [220, 220, 220], lineColor: [40, 40, 40], fontSize: 9 },
      headStyles: { fillColor: [0, 122, 255], textColor: [255, 255, 255] },
    });
  }

  doc.setTextColor(120, 120, 120);
  doc.setFontSize(8);
  doc.text("Not financial advice. For educational use only. Data sourced from Yahoo Finance.", 40, 820);

  doc.save(`${ticker}_StockVision_Report.pdf`);
}
