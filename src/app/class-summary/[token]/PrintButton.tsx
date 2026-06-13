'use client'

// "Download PDF" via the browser's native print-to-PDF (no server infra,
// includes the screenshots). Hidden when printing.

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
    >
      ⬇️ Download PDF
    </button>
  )
}
