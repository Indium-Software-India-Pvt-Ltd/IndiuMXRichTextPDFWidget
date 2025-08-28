define(['exports', 'react'], (function (exports, react) { 'use strict';

    function IndiuMXPDFExporter(props) {
        const [busy, setBusy] = react.useState(false);
        const sanitizeHTML = (html) => {
            const temp = document.createElement('div');
            temp.innerHTML = html;
            const dangerousElements = temp.querySelectorAll('script, style[data-remove], iframe, object, embed, form');
            dangerousElements.forEach(el => el.remove());
            const allElements = temp.querySelectorAll('*');
            allElements.forEach(el => {
                Array.from(el.attributes).forEach(attr => {
                    if (attr.name.startsWith('on') || (attr.name === 'href' && attr.value.startsWith('javascript:'))) {
                        el.removeAttribute(attr.name);
                    }
                });
            });
            return temp.innerHTML;
        };
        // Replace Mendix Rich Text (Quill) widgets with plain HTML blocks for printing
        const normalizeMendixRichText = (root) => {
            // Mendix Rich Text containers typically use `.widget-rich-text`
            const containers = Array.from(root.querySelectorAll(".widget-rich-text"));
            containers.forEach(container => {
                // The actual formatted HTML lives inside `.ql-editor`
                const editor = container.querySelector(".ql-editor") ||
                    container.querySelector('[contenteditable="true"]');
                if (!editor)
                    return;
                // Create a clean, print-friendly replacement
                const replacement = document.createElement("div");
                replacement.className = "mx-richtext-print";
                replacement.innerHTML = editor.innerHTML; // preserve formatted HTML
                // Swap entire widget for the print-friendly version
                container.parentElement?.replaceChild(replacement, container);
            });
        };
        const captureComputedStyles = (element) => {
            const allElements = element.querySelectorAll('*');
            const styleRules = [];
            // Capture computed styles for each element
            allElements.forEach((el, index) => {
                const computed = window.getComputedStyle(el);
                const className = `captured-style-${index}`;
                el.classList.add(className);
                // Extract important style properties
                const importantProps = [
                    'display', 'position', 'width', 'height', 'margin', 'padding',
                    'border', 'background', 'color', 'font-family', 'font-size',
                    'font-weight', 'text-align', 'line-height', 'float', 'clear',
                    'flex', 'flex-direction', 'justify-content', 'align-items',
                    'grid-template-columns', 'grid-template-rows', 'gap'
                ];
                const styles = importantProps
                    .map(prop => {
                    const value = computed.getPropertyValue(prop);
                    return value && value !== 'none' && value !== 'normal' && value !== 'auto'
                        ? `${prop}: ${value};`
                        : '';
                })
                    .filter(Boolean)
                    .join(' ');
                if (styles) {
                    styleRules.push(`.${className} { ${styles} }`);
                }
            });
            return styleRules.join('\n');
        };
        const generateDocument = react.useCallback(async () => {
            if (busy)
                return;
            setBusy(true);
            try {
                const targetClass = props.targetClass || 'mx-page';
                const target = document.querySelector(`.${targetClass}`);
                if (!target) {
                    throw new Error(`Element with class .${targetClass} not found`);
                }
                // Clone the target
                const clone = target.cloneNode(true);
                // Flatten Mendix Rich Text widgets to printable HTML
                normalizeMendixRichText(clone);
                // Get original dimensions
                const rect = target.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(target);
                // Apply rich text mappings
                const mappings = [
                    { selector: props.richSelector1 || '', html: props.richHtml1?.value || '' },
                    { selector: props.richSelector2 || '', html: props.richHtml2?.value || '' },
                    { selector: props.richSelector3 || '', html: props.richHtml3?.value || '' }
                ];
                mappings.forEach(map => {
                    if (map.selector && map.html) {
                        const elements = clone.querySelectorAll(map.selector);
                        const cleanHTML = sanitizeHTML(map.html);
                        elements.forEach(el => {
                            el.innerHTML = cleanHTML;
                        });
                    }
                });
                // Capture computed styles
                const capturedStyles = captureComputedStyles(clone);
                // Clean up unwanted elements
                clone.querySelectorAll('button:not(.keep-in-pdf), .mx-dataview-controls, .paging-status, .mx-grid-pagingbar').forEach(el => {
                    el.remove();
                });
                // Get all stylesheets from the page
                const styleSheets = Array.from(document.styleSheets);
                let existingStyles = '';
                styleSheets.forEach(sheet => {
                    try {
                        const rules = Array.from(sheet.cssRules || sheet.rules || []);
                        rules.forEach(rule => {
                            // Filter out print-specific rules that might break layout
                            if (rule instanceof CSSStyleRule && !rule.selectorText?.includes('@media print')) {
                                existingStyles += rule.cssText + '\n';
                            }
                        });
                    }
                    catch (e) {
                        // Cross-origin stylesheets will throw
                    }
                });
                // Build the HTML document
                const fileName = props.fileName?.value || 'document';
                const pageMargin = props.pageMargin || '10mm';
                const fileOption = props.fileOption || 'download';
                const htmlDocument = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=${rect.width}">
    <title>${fileName}</title>
    <style>
        /* Reset and base styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        @page {
            size: ${rect.width > rect.height ? 'A4 landscape' : 'A4 portrait'};
            margin: ${pageMargin};
        }
        
        body {
            margin: 0;
            padding: 0;
            width: ${rect.width}px;
            min-height: ${rect.height}px;
            font-family: ${computedStyle.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'};
            font-size: ${computedStyle.fontSize || '14px'};
            line-height: ${computedStyle.lineHeight || '1.5'};
            color: ${computedStyle.color || '#000000'};
            background: ${computedStyle.backgroundColor || '#ffffff'};
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        
        /* Preserve original styles */
        ${existingStyles}
        
        /* Captured computed styles */
        ${capturedStyles}
        
        /* Table fixes for print */
        table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
        }
        
        thead {
            display: table-header-group !important;
        }
        
        tbody {
            display: table-row-group !important;
        }
        
        tr {
            page-break-inside: avoid !important;
        }
        
        th, td {
            padding: 6px !important;
            border: 1px solid #ddd !important;
        }
        
        /* Preserve flexbox and grid layouts */
        .d-flex, .flex, [style*="display: flex"] {
            display: flex !important;
        }
        
        .d-grid, .grid, [style*="display: grid"] {
            display: grid !important;
        }
        
        /* Handle images */
        img {
            max-width: 100% !important;
            height: auto !important;
            page-break-inside: avoid !important;
        }
        
        
        /* Print-friendly rich text from Mendix (content extracted from .ql-editor) */
        .mx-richtext-print {
            white-space: normal;
            overflow: visible !important;
            word-break: break-word;
        }

        /* If any Quill bits slip through, make them printable */
        .ql-container, .ql-editor {
            height: auto !important;
            overflow: visible !important;
        }
        .ql-toolbar {
            display: none !important; /* hide toolbars in print */
        }
/* Hide elements that shouldn't print */
        .no-print,
        button:not(.print-button),
        input[type="button"],
        input[type="submit"],
        .mx-button:not(.print-button),
        .btn:not(.print-button) {
            display: none !important;
        }
        
        /* Mendix-specific preservations */
        .mx-layoutgrid-row {
            display: flex !important;
            flex-wrap: wrap !important;
        }
        
        .mx-layoutgrid-col {
            flex: 0 0 auto !important;
        }
        
        /* Fix for nested content */
        .mx-container,
        .mx-scrollcontainer-wrapper {
            width: 100% !important;
            overflow: visible !important;
        }
        
        @media print {
            body {
                width: 100% !important;
                margin: 0 !important;
                padding: ${pageMargin} !important;
            }
            
            * {
                overflow: visible !important;
                max-height: none !important;
            }
        }
    </style>
</head>
<body>
    <div class="pdf-content-wrapper" style="width: ${rect.width}px;">
        ${clone.innerHTML}
    </div>
</body>
</html>`;
                // Convert to base64
                // The btoa function fails on non-ASCII characters. The `unescape(encodeURIComponent(str))` trick is a common
                // but deprecated workaround. A more robust method is to use TextEncoder to correctly handle Unicode.
                // To avoid "Maximum call stack size exceeded" errors with large documents, we process the bytes in chunks.
                const toBase64InChunks = (u8a) => {
                    const CHUNK_SIZE = 8192;
                    let binString = "";
                    for (let i = 0; i < u8a.length; i += CHUNK_SIZE) {
                        binString += String.fromCodePoint(...u8a.subarray(i, i + CHUNK_SIZE));
                    }
                    return btoa(binString);
                };
                const base64 = toBase64InChunks(new TextEncoder().encode(htmlDocument));
                const cleanFileName = fileName.replace(/[\/:*?"<>|]+/g, '_');
                if (props.pdfNameAttr?.setValue) {
                    props.pdfNameAttr.setValue(cleanFileName + '.pdf');
                }
                if (props.base64Attr?.setValue) {
                    props.base64Attr.setValue(base64);
                }
                // Handle output
                if (fileOption === 'base64') {
                    console.log('Document stored as base64');
                }
                else if (fileOption === 'preview') {
                    const printWindow = window.open('', '_blank', `width=${Math.min(rect.width + 100, 1200)},height=800`);
                    if (printWindow) {
                        printWindow.document.open();
                        printWindow.document.write(htmlDocument);
                        printWindow.document.close();
                        printWindow.onload = () => {
                            setTimeout(() => printWindow.print(), 250);
                        };
                    }
                }
                else {
                    // Print using iframe
                    const printFrame = document.createElement('iframe');
                    printFrame.style.cssText = 'position:absolute;width:0;height:0;border:0;left:-9999px';
                    document.body.appendChild(printFrame);
                    const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
                    if (frameDoc) {
                        frameDoc.open();
                        frameDoc.write(htmlDocument);
                        frameDoc.close();
                        setTimeout(() => {
                            printFrame.contentWindow?.focus();
                            printFrame.contentWindow?.print();
                            setTimeout(() => {
                                if (document.body.contains(printFrame)) {
                                    document.body.removeChild(printFrame);
                                }
                            }, 1000);
                        }, 250);
                    }
                }
                if (props.onChange?.canExecute && props.onChange?.execute) {
                    props.onChange.execute();
                }
            }
            catch (error) {
                console.error('PDF generation error:', error);
                alert('Failed to generate PDF. Please use Ctrl+P (or Cmd+P on Mac) to print manually.');
            }
            finally {
                setBusy(false);
            }
        }, [busy, props]);
        if (props.hideButton === true)
            return react.createElement(react.Fragment, null);
        const buttonClassName = props.buttonClass || 'btn btn-primary';
        const buttonText = props.buttonCaption?.value || 'Export to PDF';
        return (react.createElement("button", { className: buttonClassName, disabled: busy, onClick: generateDocument }, busy ? "Generating..." : buttonText));
    }

    exports.IndiuMXPDFExporter = IndiuMXPDFExporter;

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSW5kaXVNWFBERkV4cG9ydGVyLmpzIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvSW5kaXVNWFBERkV4cG9ydGVyLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjcmVhdGVFbGVtZW50LCBGcmFnbWVudCwgdXNlQ2FsbGJhY2ssIHVzZVN0YXRlIH0gZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgeyBJbmRpdU1YUERGRXhwb3J0ZXJDb250YWluZXJQcm9wcyB9IGZyb20gXCIuLi90eXBpbmdzL0luZGl1TVhQREZFeHBvcnRlclByb3BzXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBJbmRpdU1YUERGRXhwb3J0ZXIocHJvcHM6IEluZGl1TVhQREZFeHBvcnRlckNvbnRhaW5lclByb3BzKTogSlNYLkVsZW1lbnQge1xuICAgIGNvbnN0IFtidXN5LCBzZXRCdXN5XSA9IHVzZVN0YXRlKGZhbHNlKTtcblxuICAgIGNvbnN0IHNhbml0aXplSFRNTCA9IChodG1sOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgICAgICBjb25zdCB0ZW1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIHRlbXAuaW5uZXJIVE1MID0gaHRtbDtcbiAgICAgICAgY29uc3QgZGFuZ2Vyb3VzRWxlbWVudHMgPSB0ZW1wLnF1ZXJ5U2VsZWN0b3JBbGwoJ3NjcmlwdCwgc3R5bGVbZGF0YS1yZW1vdmVdLCBpZnJhbWUsIG9iamVjdCwgZW1iZWQsIGZvcm0nKTtcbiAgICAgICAgZGFuZ2Vyb3VzRWxlbWVudHMuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XG4gICAgICAgIGNvbnN0IGFsbEVsZW1lbnRzID0gdGVtcC5xdWVyeVNlbGVjdG9yQWxsKCcqJyk7XG4gICAgICAgIGFsbEVsZW1lbnRzLmZvckVhY2goZWwgPT4ge1xuICAgICAgICAgICAgQXJyYXkuZnJvbShlbC5hdHRyaWJ1dGVzKS5mb3JFYWNoKGF0dHIgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChhdHRyLm5hbWUuc3RhcnRzV2l0aCgnb24nKSB8fCAoYXR0ci5uYW1lID09PSAnaHJlZicgJiYgYXR0ci52YWx1ZS5zdGFydHNXaXRoKCdqYXZhc2NyaXB0OicpKSkge1xuICAgICAgICAgICAgICAgICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoYXR0ci5uYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0ZW1wLmlubmVySFRNTDtcbiAgICB9O1xuXG4gICAgLy8gUmVwbGFjZSBNZW5kaXggUmljaCBUZXh0IChRdWlsbCkgd2lkZ2V0cyB3aXRoIHBsYWluIEhUTUwgYmxvY2tzIGZvciBwcmludGluZ1xuICAgIGNvbnN0IG5vcm1hbGl6ZU1lbmRpeFJpY2hUZXh0ID0gKHJvb3Q6IEhUTUxFbGVtZW50KSA9PiB7XG4gICAgICAgIC8vIE1lbmRpeCBSaWNoIFRleHQgY29udGFpbmVycyB0eXBpY2FsbHkgdXNlIGAud2lkZ2V0LXJpY2gtdGV4dGBcbiAgICAgICAgY29uc3QgY29udGFpbmVycyA9IEFycmF5LmZyb20oXG4gICAgICAgICAgICByb290LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KFwiLndpZGdldC1yaWNoLXRleHRcIilcbiAgICAgICAgKTtcblxuICAgICAgICBjb250YWluZXJzLmZvckVhY2goY29udGFpbmVyID0+IHtcbiAgICAgICAgICAgIC8vIFRoZSBhY3R1YWwgZm9ybWF0dGVkIEhUTUwgbGl2ZXMgaW5zaWRlIGAucWwtZWRpdG9yYFxuICAgICAgICAgICAgY29uc3QgZWRpdG9yID1cbiAgICAgICAgICAgICAgICBjb250YWluZXIucXVlcnlTZWxlY3RvcjxIVE1MRWxlbWVudD4oXCIucWwtZWRpdG9yXCIpIHx8XG4gICAgICAgICAgICAgICAgY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3I8SFRNTEVsZW1lbnQ+KCdbY29udGVudGVkaXRhYmxlPVwidHJ1ZVwiXScpO1xuXG4gICAgICAgICAgICBpZiAoIWVkaXRvcikgcmV0dXJuO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgYSBjbGVhbiwgcHJpbnQtZnJpZW5kbHkgcmVwbGFjZW1lbnRcbiAgICAgICAgICAgIGNvbnN0IHJlcGxhY2VtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgICAgIHJlcGxhY2VtZW50LmNsYXNzTmFtZSA9IFwibXgtcmljaHRleHQtcHJpbnRcIjtcbiAgICAgICAgICAgIHJlcGxhY2VtZW50LmlubmVySFRNTCA9IGVkaXRvci5pbm5lckhUTUw7IC8vIHByZXNlcnZlIGZvcm1hdHRlZCBIVE1MXG5cbiAgICAgICAgICAgIC8vIFN3YXAgZW50aXJlIHdpZGdldCBmb3IgdGhlIHByaW50LWZyaWVuZGx5IHZlcnNpb25cbiAgICAgICAgICAgIGNvbnRhaW5lci5wYXJlbnRFbGVtZW50Py5yZXBsYWNlQ2hpbGQocmVwbGFjZW1lbnQsIGNvbnRhaW5lcik7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBjb25zdCBjYXB0dXJlQ29tcHV0ZWRTdHlsZXMgPSAoZWxlbWVudDogSFRNTEVsZW1lbnQpOiBzdHJpbmcgPT4ge1xuICAgICAgICBjb25zdCBhbGxFbGVtZW50cyA9IGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnKicpO1xuICAgICAgICBjb25zdCBzdHlsZVJ1bGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2FwdHVyZSBjb21wdXRlZCBzdHlsZXMgZm9yIGVhY2ggZWxlbWVudFxuICAgICAgICBhbGxFbGVtZW50cy5mb3JFYWNoKChlbCwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNvbXB1dGVkID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoZWwpO1xuICAgICAgICAgICAgY29uc3QgY2xhc3NOYW1lID0gYGNhcHR1cmVkLXN0eWxlLSR7aW5kZXh9YDtcbiAgICAgICAgICAgIChlbCBhcyBIVE1MRWxlbWVudCkuY2xhc3NMaXN0LmFkZChjbGFzc05hbWUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBFeHRyYWN0IGltcG9ydGFudCBzdHlsZSBwcm9wZXJ0aWVzXG4gICAgICAgICAgICBjb25zdCBpbXBvcnRhbnRQcm9wcyA9IFtcbiAgICAgICAgICAgICAgICAnZGlzcGxheScsICdwb3NpdGlvbicsICd3aWR0aCcsICdoZWlnaHQnLCAnbWFyZ2luJywgJ3BhZGRpbmcnLFxuICAgICAgICAgICAgICAgICdib3JkZXInLCAnYmFja2dyb3VuZCcsICdjb2xvcicsICdmb250LWZhbWlseScsICdmb250LXNpemUnLFxuICAgICAgICAgICAgICAgICdmb250LXdlaWdodCcsICd0ZXh0LWFsaWduJywgJ2xpbmUtaGVpZ2h0JywgJ2Zsb2F0JywgJ2NsZWFyJyxcbiAgICAgICAgICAgICAgICAnZmxleCcsICdmbGV4LWRpcmVjdGlvbicsICdqdXN0aWZ5LWNvbnRlbnQnLCAnYWxpZ24taXRlbXMnLFxuICAgICAgICAgICAgICAgICdncmlkLXRlbXBsYXRlLWNvbHVtbnMnLCAnZ3JpZC10ZW1wbGF0ZS1yb3dzJywgJ2dhcCdcbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHN0eWxlcyA9IGltcG9ydGFudFByb3BzXG4gICAgICAgICAgICAgICAgLm1hcChwcm9wID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBjb21wdXRlZC5nZXRQcm9wZXJ0eVZhbHVlKHByb3ApO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUgJiYgdmFsdWUgIT09ICdub25lJyAmJiB2YWx1ZSAhPT0gJ25vcm1hbCcgJiYgdmFsdWUgIT09ICdhdXRvJyBcbiAgICAgICAgICAgICAgICAgICAgICAgID8gYCR7cHJvcH06ICR7dmFsdWV9O2AgXG4gICAgICAgICAgICAgICAgICAgICAgICA6ICcnO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmZpbHRlcihCb29sZWFuKVxuICAgICAgICAgICAgICAgIC5qb2luKCcgJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChzdHlsZXMpIHtcbiAgICAgICAgICAgICAgICBzdHlsZVJ1bGVzLnB1c2goYC4ke2NsYXNzTmFtZX0geyAke3N0eWxlc30gfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBzdHlsZVJ1bGVzLmpvaW4oJ1xcbicpO1xuICAgIH07XG5cbiAgICBjb25zdCBnZW5lcmF0ZURvY3VtZW50ID0gdXNlQ2FsbGJhY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICBpZiAoYnVzeSkgcmV0dXJuO1xuICAgICAgICBzZXRCdXN5KHRydWUpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB0YXJnZXRDbGFzcyA9IHByb3BzLnRhcmdldENsYXNzIHx8ICdteC1wYWdlJztcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYC4ke3RhcmdldENsYXNzfWApIGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIXRhcmdldCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRWxlbWVudCB3aXRoIGNsYXNzIC4ke3RhcmdldENsYXNzfSBub3QgZm91bmRgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2xvbmUgdGhlIHRhcmdldFxuICAgICAgICAgICAgY29uc3QgY2xvbmUgPSB0YXJnZXQuY2xvbmVOb2RlKHRydWUpIGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAgICAgLy8gRmxhdHRlbiBNZW5kaXggUmljaCBUZXh0IHdpZGdldHMgdG8gcHJpbnRhYmxlIEhUTUxcbiAgICAgICAgICAgIG5vcm1hbGl6ZU1lbmRpeFJpY2hUZXh0KGNsb25lKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2V0IG9yaWdpbmFsIGRpbWVuc2lvbnNcbiAgICAgICAgICAgIGNvbnN0IHJlY3QgPSB0YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICBjb25zdCBjb21wdXRlZFN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUodGFyZ2V0KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQXBwbHkgcmljaCB0ZXh0IG1hcHBpbmdzXG4gICAgICAgICAgICBjb25zdCBtYXBwaW5ncyA9IFtcbiAgICAgICAgICAgICAgICB7IHNlbGVjdG9yOiBwcm9wcy5yaWNoU2VsZWN0b3IxIHx8ICcnLCBodG1sOiBwcm9wcy5yaWNoSHRtbDE/LnZhbHVlIHx8ICcnIH0sXG4gICAgICAgICAgICAgICAgeyBzZWxlY3RvcjogcHJvcHMucmljaFNlbGVjdG9yMiB8fCAnJywgaHRtbDogcHJvcHMucmljaEh0bWwyPy52YWx1ZSB8fCAnJyB9LFxuICAgICAgICAgICAgICAgIHsgc2VsZWN0b3I6IHByb3BzLnJpY2hTZWxlY3RvcjMgfHwgJycsIGh0bWw6IHByb3BzLnJpY2hIdG1sMz8udmFsdWUgfHwgJycgfVxuICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgbWFwcGluZ3MuZm9yRWFjaChtYXAgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChtYXAuc2VsZWN0b3IgJiYgbWFwLmh0bWwpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZWxlbWVudHMgPSBjbG9uZS5xdWVyeVNlbGVjdG9yQWxsKG1hcC5zZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNsZWFuSFRNTCA9IHNhbml0aXplSFRNTChtYXAuaHRtbCk7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnRzLmZvckVhY2goZWwgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgKGVsIGFzIEhUTUxFbGVtZW50KS5pbm5lckhUTUwgPSBjbGVhbkhUTUw7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBDYXB0dXJlIGNvbXB1dGVkIHN0eWxlc1xuICAgICAgICAgICAgY29uc3QgY2FwdHVyZWRTdHlsZXMgPSBjYXB0dXJlQ29tcHV0ZWRTdHlsZXMoY2xvbmUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDbGVhbiB1cCB1bndhbnRlZCBlbGVtZW50c1xuICAgICAgICAgICAgY2xvbmUucXVlcnlTZWxlY3RvckFsbCgnYnV0dG9uOm5vdCgua2VlcC1pbi1wZGYpLCAubXgtZGF0YXZpZXctY29udHJvbHMsIC5wYWdpbmctc3RhdHVzLCAubXgtZ3JpZC1wYWdpbmdiYXInKS5mb3JFYWNoKGVsID0+IHtcbiAgICAgICAgICAgICAgICBlbC5yZW1vdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBHZXQgYWxsIHN0eWxlc2hlZXRzIGZyb20gdGhlIHBhZ2VcbiAgICAgICAgICAgIGNvbnN0IHN0eWxlU2hlZXRzID0gQXJyYXkuZnJvbShkb2N1bWVudC5zdHlsZVNoZWV0cyk7XG4gICAgICAgICAgICBsZXQgZXhpc3RpbmdTdHlsZXMgPSAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc3R5bGVTaGVldHMuZm9yRWFjaChzaGVldCA9PiB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcnVsZXMgPSBBcnJheS5mcm9tKHNoZWV0LmNzc1J1bGVzIHx8IHNoZWV0LnJ1bGVzIHx8IFtdKTtcbiAgICAgICAgICAgICAgICAgICAgcnVsZXMuZm9yRWFjaChydWxlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZpbHRlciBvdXQgcHJpbnQtc3BlY2lmaWMgcnVsZXMgdGhhdCBtaWdodCBicmVhayBsYXlvdXRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChydWxlIGluc3RhbmNlb2YgQ1NTU3R5bGVSdWxlICYmICFydWxlLnNlbGVjdG9yVGV4dD8uaW5jbHVkZXMoJ0BtZWRpYSBwcmludCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhpc3RpbmdTdHlsZXMgKz0gcnVsZS5jc3NUZXh0ICsgJ1xcbic7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ3Jvc3Mtb3JpZ2luIHN0eWxlc2hlZXRzIHdpbGwgdGhyb3dcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gQnVpbGQgdGhlIEhUTUwgZG9jdW1lbnRcbiAgICAgICAgICAgIGNvbnN0IGZpbGVOYW1lID0gcHJvcHMuZmlsZU5hbWU/LnZhbHVlIHx8ICdkb2N1bWVudCc7XG4gICAgICAgICAgICBjb25zdCBwYWdlTWFyZ2luID0gcHJvcHMucGFnZU1hcmdpbiB8fCAnMTBtbSc7XG4gICAgICAgICAgICBjb25zdCBmaWxlT3B0aW9uID0gcHJvcHMuZmlsZU9wdGlvbiB8fCAnZG93bmxvYWQnO1xuXG4gICAgICAgICAgICBjb25zdCBodG1sRG9jdW1lbnQgPSBgPCFET0NUWVBFIGh0bWw+XG48aHRtbCBsYW5nPVwiZW5cIj5cbjxoZWFkPlxuICAgIDxtZXRhIGNoYXJzZXQ9XCJVVEYtOFwiPlxuICAgIDxtZXRhIG5hbWU9XCJ2aWV3cG9ydFwiIGNvbnRlbnQ9XCJ3aWR0aD0ke3JlY3Qud2lkdGh9XCI+XG4gICAgPHRpdGxlPiR7ZmlsZU5hbWV9PC90aXRsZT5cbiAgICA8c3R5bGU+XG4gICAgICAgIC8qIFJlc2V0IGFuZCBiYXNlIHN0eWxlcyAqL1xuICAgICAgICAqIHtcbiAgICAgICAgICAgIG1hcmdpbjogMDtcbiAgICAgICAgICAgIHBhZGRpbmc6IDA7XG4gICAgICAgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBAcGFnZSB7XG4gICAgICAgICAgICBzaXplOiAke3JlY3Qud2lkdGggPiByZWN0LmhlaWdodCA/ICdBNCBsYW5kc2NhcGUnIDogJ0E0IHBvcnRyYWl0J307XG4gICAgICAgICAgICBtYXJnaW46ICR7cGFnZU1hcmdpbn07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGJvZHkge1xuICAgICAgICAgICAgbWFyZ2luOiAwO1xuICAgICAgICAgICAgcGFkZGluZzogMDtcbiAgICAgICAgICAgIHdpZHRoOiAke3JlY3Qud2lkdGh9cHg7XG4gICAgICAgICAgICBtaW4taGVpZ2h0OiAke3JlY3QuaGVpZ2h0fXB4O1xuICAgICAgICAgICAgZm9udC1mYW1pbHk6ICR7Y29tcHV0ZWRTdHlsZS5mb250RmFtaWx5IHx8ICctYXBwbGUtc3lzdGVtLCBCbGlua01hY1N5c3RlbUZvbnQsIFwiU2Vnb2UgVUlcIiwgQXJpYWwsIHNhbnMtc2VyaWYnfTtcbiAgICAgICAgICAgIGZvbnQtc2l6ZTogJHtjb21wdXRlZFN0eWxlLmZvbnRTaXplIHx8ICcxNHB4J307XG4gICAgICAgICAgICBsaW5lLWhlaWdodDogJHtjb21wdXRlZFN0eWxlLmxpbmVIZWlnaHQgfHwgJzEuNSd9O1xuICAgICAgICAgICAgY29sb3I6ICR7Y29tcHV0ZWRTdHlsZS5jb2xvciB8fCAnIzAwMDAwMCd9O1xuICAgICAgICAgICAgYmFja2dyb3VuZDogJHtjb21wdXRlZFN0eWxlLmJhY2tncm91bmRDb2xvciB8fCAnI2ZmZmZmZid9O1xuICAgICAgICAgICAgLXdlYmtpdC1wcmludC1jb2xvci1hZGp1c3Q6IGV4YWN0O1xuICAgICAgICAgICAgcHJpbnQtY29sb3ItYWRqdXN0OiBleGFjdDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLyogUHJlc2VydmUgb3JpZ2luYWwgc3R5bGVzICovXG4gICAgICAgICR7ZXhpc3RpbmdTdHlsZXN9XG4gICAgICAgIFxuICAgICAgICAvKiBDYXB0dXJlZCBjb21wdXRlZCBzdHlsZXMgKi9cbiAgICAgICAgJHtjYXB0dXJlZFN0eWxlc31cbiAgICAgICAgXG4gICAgICAgIC8qIFRhYmxlIGZpeGVzIGZvciBwcmludCAqL1xuICAgICAgICB0YWJsZSB7XG4gICAgICAgICAgICB3aWR0aDogMTAwJSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgYm9yZGVyLWNvbGxhcHNlOiBjb2xsYXBzZSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgcGFnZS1icmVhay1pbnNpZGU6IGF1dG8gIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhlYWQge1xuICAgICAgICAgICAgZGlzcGxheTogdGFibGUtaGVhZGVyLWdyb3VwICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRib2R5IHtcbiAgICAgICAgICAgIGRpc3BsYXk6IHRhYmxlLXJvdy1ncm91cCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0ciB7XG4gICAgICAgICAgICBwYWdlLWJyZWFrLWluc2lkZTogYXZvaWQgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGgsIHRkIHtcbiAgICAgICAgICAgIHBhZGRpbmc6IDZweCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgYm9yZGVyOiAxcHggc29saWQgI2RkZCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvKiBQcmVzZXJ2ZSBmbGV4Ym94IGFuZCBncmlkIGxheW91dHMgKi9cbiAgICAgICAgLmQtZmxleCwgLmZsZXgsIFtzdHlsZSo9XCJkaXNwbGF5OiBmbGV4XCJdIHtcbiAgICAgICAgICAgIGRpc3BsYXk6IGZsZXggIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLmQtZ3JpZCwgLmdyaWQsIFtzdHlsZSo9XCJkaXNwbGF5OiBncmlkXCJdIHtcbiAgICAgICAgICAgIGRpc3BsYXk6IGdyaWQgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLyogSGFuZGxlIGltYWdlcyAqL1xuICAgICAgICBpbWcge1xuICAgICAgICAgICAgbWF4LXdpZHRoOiAxMDAlICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBoZWlnaHQ6IGF1dG8gIWltcG9ydGFudDtcbiAgICAgICAgICAgIHBhZ2UtYnJlYWstaW5zaWRlOiBhdm9pZCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgLyogUHJpbnQtZnJpZW5kbHkgcmljaCB0ZXh0IGZyb20gTWVuZGl4IChjb250ZW50IGV4dHJhY3RlZCBmcm9tIC5xbC1lZGl0b3IpICovXG4gICAgICAgIC5teC1yaWNodGV4dC1wcmludCB7XG4gICAgICAgICAgICB3aGl0ZS1zcGFjZTogbm9ybWFsO1xuICAgICAgICAgICAgb3ZlcmZsb3c6IHZpc2libGUgIWltcG9ydGFudDtcbiAgICAgICAgICAgIHdvcmQtYnJlYWs6IGJyZWFrLXdvcmQ7XG4gICAgICAgIH1cblxuICAgICAgICAvKiBJZiBhbnkgUXVpbGwgYml0cyBzbGlwIHRocm91Z2gsIG1ha2UgdGhlbSBwcmludGFibGUgKi9cbiAgICAgICAgLnFsLWNvbnRhaW5lciwgLnFsLWVkaXRvciB7XG4gICAgICAgICAgICBoZWlnaHQ6IGF1dG8gIWltcG9ydGFudDtcbiAgICAgICAgICAgIG92ZXJmbG93OiB2aXNpYmxlICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgLnFsLXRvb2xiYXIge1xuICAgICAgICAgICAgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50OyAvKiBoaWRlIHRvb2xiYXJzIGluIHByaW50ICovXG4gICAgICAgIH1cbi8qIEhpZGUgZWxlbWVudHMgdGhhdCBzaG91bGRuJ3QgcHJpbnQgKi9cbiAgICAgICAgLm5vLXByaW50LFxuICAgICAgICBidXR0b246bm90KC5wcmludC1idXR0b24pLFxuICAgICAgICBpbnB1dFt0eXBlPVwiYnV0dG9uXCJdLFxuICAgICAgICBpbnB1dFt0eXBlPVwic3VibWl0XCJdLFxuICAgICAgICAubXgtYnV0dG9uOm5vdCgucHJpbnQtYnV0dG9uKSxcbiAgICAgICAgLmJ0bjpub3QoLnByaW50LWJ1dHRvbikge1xuICAgICAgICAgICAgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvKiBNZW5kaXgtc3BlY2lmaWMgcHJlc2VydmF0aW9ucyAqL1xuICAgICAgICAubXgtbGF5b3V0Z3JpZC1yb3cge1xuICAgICAgICAgICAgZGlzcGxheTogZmxleCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgZmxleC13cmFwOiB3cmFwICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC5teC1sYXlvdXRncmlkLWNvbCB7XG4gICAgICAgICAgICBmbGV4OiAwIDAgYXV0byAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvKiBGaXggZm9yIG5lc3RlZCBjb250ZW50ICovXG4gICAgICAgIC5teC1jb250YWluZXIsXG4gICAgICAgIC5teC1zY3JvbGxjb250YWluZXItd3JhcHBlciB7XG4gICAgICAgICAgICB3aWR0aDogMTAwJSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgb3ZlcmZsb3c6IHZpc2libGUgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgQG1lZGlhIHByaW50IHtcbiAgICAgICAgICAgIGJvZHkge1xuICAgICAgICAgICAgICAgIHdpZHRoOiAxMDAlICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICAgICAgbWFyZ2luOiAwICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICAgICAgcGFkZGluZzogJHtwYWdlTWFyZ2lufSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAqIHtcbiAgICAgICAgICAgICAgICBvdmVyZmxvdzogdmlzaWJsZSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgICAgIG1heC1oZWlnaHQ6IG5vbmUgIWltcG9ydGFudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIDwvc3R5bGU+XG48L2hlYWQ+XG48Ym9keT5cbiAgICA8ZGl2IGNsYXNzPVwicGRmLWNvbnRlbnQtd3JhcHBlclwiIHN0eWxlPVwid2lkdGg6ICR7cmVjdC53aWR0aH1weDtcIj5cbiAgICAgICAgJHtjbG9uZS5pbm5lckhUTUx9XG4gICAgPC9kaXY+XG48L2JvZHk+XG48L2h0bWw+YDtcblxuICAgICAgICAgICAgLy8gQ29udmVydCB0byBiYXNlNjRcbiAgICAgICAgICAgIC8vIFRoZSBidG9hIGZ1bmN0aW9uIGZhaWxzIG9uIG5vbi1BU0NJSSBjaGFyYWN0ZXJzLiBUaGUgYHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChzdHIpKWAgdHJpY2sgaXMgYSBjb21tb25cbiAgICAgICAgICAgIC8vIGJ1dCBkZXByZWNhdGVkIHdvcmthcm91bmQuIEEgbW9yZSByb2J1c3QgbWV0aG9kIGlzIHRvIHVzZSBUZXh0RW5jb2RlciB0byBjb3JyZWN0bHkgaGFuZGxlIFVuaWNvZGUuXG4gICAgICAgICAgICAvLyBUbyBhdm9pZCBcIk1heGltdW0gY2FsbCBzdGFjayBzaXplIGV4Y2VlZGVkXCIgZXJyb3JzIHdpdGggbGFyZ2UgZG9jdW1lbnRzLCB3ZSBwcm9jZXNzIHRoZSBieXRlcyBpbiBjaHVua3MuXG4gICAgICAgICAgICBjb25zdCB0b0Jhc2U2NEluQ2h1bmtzID0gKHU4YTogVWludDhBcnJheSk6IHN0cmluZyA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgQ0hVTktfU0laRSA9IDgxOTI7XG4gICAgICAgICAgICAgICAgbGV0IGJpblN0cmluZyA9IFwiXCI7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB1OGEubGVuZ3RoOyBpICs9IENIVU5LX1NJWkUpIHtcbiAgICAgICAgICAgICAgICAgICAgYmluU3RyaW5nICs9IFN0cmluZy5mcm9tQ29kZVBvaW50KC4uLnU4YS5zdWJhcnJheShpLCBpICsgQ0hVTktfU0laRSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYnRvYShiaW5TdHJpbmcpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNvbnN0IGJhc2U2NCA9IHRvQmFzZTY0SW5DaHVua3MobmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKGh0bWxEb2N1bWVudCkpO1xuICAgICAgICAgICAgY29uc3QgY2xlYW5GaWxlTmFtZSA9IGZpbGVOYW1lLnJlcGxhY2UoL1tcXC86Kj9cIjw+fF0rL2csICdfJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChwcm9wcy5wZGZOYW1lQXR0cj8uc2V0VmFsdWUpIHtcbiAgICAgICAgICAgICAgICBwcm9wcy5wZGZOYW1lQXR0ci5zZXRWYWx1ZShjbGVhbkZpbGVOYW1lICsgJy5wZGYnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHByb3BzLmJhc2U2NEF0dHI/LnNldFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgcHJvcHMuYmFzZTY0QXR0ci5zZXRWYWx1ZShiYXNlNjQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBIYW5kbGUgb3V0cHV0XG4gICAgICAgICAgICBpZiAoZmlsZU9wdGlvbiA9PT0gJ2Jhc2U2NCcpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRG9jdW1lbnQgc3RvcmVkIGFzIGJhc2U2NCcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChmaWxlT3B0aW9uID09PSAncHJldmlldycpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcmludFdpbmRvdyA9IHdpbmRvdy5vcGVuKCcnLCAnX2JsYW5rJywgYHdpZHRoPSR7TWF0aC5taW4ocmVjdC53aWR0aCArIDEwMCwgMTIwMCl9LGhlaWdodD04MDBgKTtcbiAgICAgICAgICAgICAgICBpZiAocHJpbnRXaW5kb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRXaW5kb3cuZG9jdW1lbnQub3BlbigpO1xuICAgICAgICAgICAgICAgICAgICBwcmludFdpbmRvdy5kb2N1bWVudC53cml0ZShodG1sRG9jdW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICBwcmludFdpbmRvdy5kb2N1bWVudC5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICBwcmludFdpbmRvdy5vbmxvYWQgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHByaW50V2luZG93LnByaW50KCksIDI1MCk7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBQcmludCB1c2luZyBpZnJhbWVcbiAgICAgICAgICAgICAgICBjb25zdCBwcmludEZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaWZyYW1lJyk7XG4gICAgICAgICAgICAgICAgcHJpbnRGcmFtZS5zdHlsZS5jc3NUZXh0ID0gJ3Bvc2l0aW9uOmFic29sdXRlO3dpZHRoOjA7aGVpZ2h0OjA7Ym9yZGVyOjA7bGVmdDotOTk5OXB4JztcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHByaW50RnJhbWUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGZyYW1lRG9jID0gcHJpbnRGcmFtZS5jb250ZW50RG9jdW1lbnQgfHwgcHJpbnRGcmFtZS5jb250ZW50V2luZG93Py5kb2N1bWVudDtcbiAgICAgICAgICAgICAgICBpZiAoZnJhbWVEb2MpIHtcbiAgICAgICAgICAgICAgICAgICAgZnJhbWVEb2Mub3BlbigpO1xuICAgICAgICAgICAgICAgICAgICBmcmFtZURvYy53cml0ZShodG1sRG9jdW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICBmcmFtZURvYy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmludEZyYW1lLmNvbnRlbnRXaW5kb3c/LmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmludEZyYW1lLmNvbnRlbnRXaW5kb3c/LnByaW50KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZG9jdW1lbnQuYm9keS5jb250YWlucyhwcmludEZyYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHByaW50RnJhbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIDEwMDApO1xuICAgICAgICAgICAgICAgICAgICB9LCAyNTApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHByb3BzLm9uQ2hhbmdlPy5jYW5FeGVjdXRlICYmIHByb3BzLm9uQ2hhbmdlPy5leGVjdXRlKSB7XG4gICAgICAgICAgICAgICAgcHJvcHMub25DaGFuZ2UuZXhlY3V0ZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdQREYgZ2VuZXJhdGlvbiBlcnJvcjonLCBlcnJvcik7XG4gICAgICAgICAgICBhbGVydCgnRmFpbGVkIHRvIGdlbmVyYXRlIFBERi4gUGxlYXNlIHVzZSBDdHJsK1AgKG9yIENtZCtQIG9uIE1hYykgdG8gcHJpbnQgbWFudWFsbHkuJyk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICBzZXRCdXN5KGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH0sIFtidXN5LCBwcm9wc10pO1xuXG4gICAgaWYgKHByb3BzLmhpZGVCdXR0b24gPT09IHRydWUpIHJldHVybiA8RnJhZ21lbnQgLz47XG5cbiAgICBjb25zdCBidXR0b25DbGFzc05hbWUgPSBwcm9wcy5idXR0b25DbGFzcyB8fCAnYnRuIGJ0bi1wcmltYXJ5JztcbiAgICBjb25zdCBidXR0b25UZXh0ID0gcHJvcHMuYnV0dG9uQ2FwdGlvbj8udmFsdWUgfHwgJ0V4cG9ydCB0byBQREYnO1xuXG4gICAgcmV0dXJuIChcbiAgICAgICAgPGJ1dHRvbiBjbGFzc05hbWU9e2J1dHRvbkNsYXNzTmFtZX0gZGlzYWJsZWQ9e2J1c3l9IG9uQ2xpY2s9e2dlbmVyYXRlRG9jdW1lbnR9PlxuICAgICAgICAgICAge2J1c3kgPyBcIkdlbmVyYXRpbmcuLi5cIiA6IGJ1dHRvblRleHR9XG4gICAgICAgIDwvYnV0dG9uPlxuICAgICk7XG59Il0sIm5hbWVzIjpbInVzZVN0YXRlIiwidXNlQ2FsbGJhY2siLCJjcmVhdGVFbGVtZW50IiwiRnJhZ21lbnQiXSwibWFwcGluZ3MiOiI7O0lBR00sU0FBVSxrQkFBa0IsQ0FBQyxLQUF1QyxFQUFBO1FBQ3RFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUdBLGNBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUV4QyxJQUFBLE1BQU0sWUFBWSxHQUFHLENBQUMsSUFBWSxLQUFZO1lBQzFDLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDM0MsUUFBQSxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztZQUN0QixNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyx5REFBeUQsQ0FBQyxDQUFDO0lBQzNHLFFBQUEsaUJBQWlCLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztZQUM3QyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENB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
