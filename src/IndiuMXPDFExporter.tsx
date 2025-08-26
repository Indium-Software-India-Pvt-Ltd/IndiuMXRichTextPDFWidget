import { createElement, Fragment, useCallback, useMemo, useRef, useState } from "react";
import html2pdf from "html2pdf.js";
import DOMPurify from "dompurify";
import { IndiuMXPDFExporterContainerProps } from "../typings/IndiuMXPDFExporterProps";

import "./ui/IndiuMXPDFExporter.css";

export function IndiuMXPDFExporter(props: IndiuMXPDFExporterContainerProps): JSX.Element {
  const [busy, setBusy] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const mappings = useMemo(() => {
    const list: Array<{ selector: string; html?: string }> = [];
    if (props.richSelector1 && props.richHtml1?.value) list.push({ selector: props.richSelector1, html: props.richHtml1.value });
    if (props.richSelector2 && props.richHtml2?.value) list.push({ selector: props.richSelector2, html: props.richHtml2.value });
    if (props.richSelector3 && props.richHtml3?.value) list.push({ selector: props.richSelector3, html: props.richHtml3.value });
    return list;
  }, [props.richSelector1, props.richHtml1?.value, props.richSelector2, props.richHtml2?.value, props.richSelector3, props.richHtml3?.value]);

  const doExport = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const target = document.querySelector(`.${props.targetClass}`) as HTMLElement | null;
      if (!target) throw new Error(`PdfExporterPlus: no element with class .${props.targetClass} found on the page.`);

      // Clone node to avoid mutating live UI
      const clone = target.cloneNode(true) as HTMLElement;

      // Strip iframes inside clone (they won't render and can taint canvas)
      clone.querySelectorAll("iframe").forEach(ifr => ifr.replaceWith(document.createElement("div")));

      // Inline Rich Text HTML where mapped
      for (const map of mappings) {
        if (!map.selector || !map.html) continue;
        const nodes = clone.querySelectorAll(map.selector);
        const clean = DOMPurify.sanitize(map.html, { USE_PROFILES: { html: true } });
        nodes.forEach(n => {
          (n as HTMLElement).innerHTML = clean;
        });
      }

      // Prepare an offscreen container to render clone for PDF
      const host = document.createElement("div");
      host.style.position = "fixed";
      host.style.left = "-99999px";
      host.style.top = "0";
      host.style.width = target.offsetWidth + "px"; // keep widths stable
      host.appendChild(clone);
      document.body.appendChild(host);

      const filename = (props.fileName?.value ?? "export").replace(/[\/:*?"<>|]+/g, "_");

      // Normalize options to match html2pdf.js typings
      const marginNumber = (() => {
        const raw = props.pageMargin ?? "10"; // allow "10mm" or "10"
        const n = parseFloat(String(raw));
        return Number.isFinite(n) ? n : 10;
      })();

      const scaleNumber = (() => {
        // Mendix decimals come in as Big.js; coerce to number
        const raw = (props.scale as unknown) as number | string | undefined;
        const n = typeof raw === "string" ? parseFloat(raw) : Number(raw);
        return Number.isFinite(n) && n > 0 ? n : 1;
      })();

      // html2pdf options
      // Use html2pdf to create the PDF and also access the Blob for Base64/preview
      const opt = {
        margin: marginNumber, // number per html2pdf.js Options
        filename: filename,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: {
          scale: scaleNumber,
          useCORS: true,
          allowTaint: false,
          logging: false
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
      } as any; // cast to relax strict typing vs. library defs

      // Build the pdf instance so we can branch behavior
      const worker = html2pdf().from(clone).set(opt).toPdf();
      const blob: Blob = await worker.output("blob");

      // Set attribute values if configured
      if (props.pdfNameAttr && props.pdfNameAttr.setValue) {
        props.pdfNameAttr.setValue(filename);
      }

      // Option handling mirroring the marketplace widget
      const option = (props.fileOption ?? "download") as any;
      if (option === "base64") {
        const base64 = await new Promise<string>((resolve, reject) => {
          const fr = new FileReader();
          fr.onerror = () => reject(fr.error);
          fr.onload = () => {
            // fr.result is a data URL like "data:application/pdf;base64,...." → store only the base64 payload
            const result = String(fr.result ?? "");
            const commaIdx = result.indexOf(",");
            resolve(commaIdx >= 0 ? result.substring(commaIdx + 1) : result);
          };
          fr.readAsDataURL(blob);
        });
        if (props.base64Attr && props.base64Attr.setValue) {
          props.base64Attr.setValue(base64);
        }
      } else if (option === "preview") {
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener,noreferrer");
        // do not revoke immediately—let the new tab load; revoke on unload automatically
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } else {
        // Default: Download File
        const dl = document.createElement("a");
        const url = URL.createObjectURL(blob);
        dl.href = url;
        dl.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
        document.body.appendChild(dl);
        dl.click();
        document.body.removeChild(dl);
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }

      // Clean up
      document.body.removeChild(host);

      if (props.onAfterGenerate?.canExecute) props.onAfterGenerate.execute();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [busy, mappings, props.targetClass, props.fileName?.value, props.pageMargin, props.scale, props.onAfterGenerate]);

  if (props.hideButton) return <Fragment />;
  return (
    <button ref={btnRef} className={props.buttonClass ?? "btn btn-primary"} disabled={busy} onClick={doExport}>
      {busy ? "Generating…" : props.buttonCaption?.value ?? "Download PDF"}
    </button>
  );
}
