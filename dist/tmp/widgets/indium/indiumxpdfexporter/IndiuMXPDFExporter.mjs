import { useState, useCallback, createElement, Fragment } from 'react';

function IndiuMXPDFExporter(props) {
    const [busy, setBusy] = useState(false);
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
    const generateDocument = useCallback(async () => {
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
        return createElement(Fragment, null);
    const buttonClassName = props.buttonClass || 'btn btn-primary';
    const buttonText = props.buttonCaption?.value || 'Export to PDF';
    return (createElement("button", { className: buttonClassName, disabled: busy, onClick: generateDocument }, busy ? "Generating..." : buttonText));
}

export { IndiuMXPDFExporter };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSW5kaXVNWFBERkV4cG9ydGVyLm1qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL0luZGl1TVhQREZFeHBvcnRlci50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3JlYXRlRWxlbWVudCwgRnJhZ21lbnQsIHVzZUNhbGxiYWNrLCB1c2VTdGF0ZSB9IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IHsgSW5kaXVNWFBERkV4cG9ydGVyQ29udGFpbmVyUHJvcHMgfSBmcm9tIFwiLi4vdHlwaW5ncy9JbmRpdU1YUERGRXhwb3J0ZXJQcm9wc1wiO1xuXG5leHBvcnQgZnVuY3Rpb24gSW5kaXVNWFBERkV4cG9ydGVyKHByb3BzOiBJbmRpdU1YUERGRXhwb3J0ZXJDb250YWluZXJQcm9wcyk6IEpTWC5FbGVtZW50IHtcbiAgICBjb25zdCBbYnVzeSwgc2V0QnVzeV0gPSB1c2VTdGF0ZShmYWxzZSk7XG5cbiAgICBjb25zdCBzYW5pdGl6ZUhUTUwgPSAoaHRtbDogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICAgICAgY29uc3QgdGVtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICB0ZW1wLmlubmVySFRNTCA9IGh0bWw7XG4gICAgICAgIGNvbnN0IGRhbmdlcm91c0VsZW1lbnRzID0gdGVtcC5xdWVyeVNlbGVjdG9yQWxsKCdzY3JpcHQsIHN0eWxlW2RhdGEtcmVtb3ZlXSwgaWZyYW1lLCBvYmplY3QsIGVtYmVkLCBmb3JtJyk7XG4gICAgICAgIGRhbmdlcm91c0VsZW1lbnRzLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xuICAgICAgICBjb25zdCBhbGxFbGVtZW50cyA9IHRlbXAucXVlcnlTZWxlY3RvckFsbCgnKicpO1xuICAgICAgICBhbGxFbGVtZW50cy5mb3JFYWNoKGVsID0+IHtcbiAgICAgICAgICAgIEFycmF5LmZyb20oZWwuYXR0cmlidXRlcykuZm9yRWFjaChhdHRyID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoYXR0ci5uYW1lLnN0YXJ0c1dpdGgoJ29uJykgfHwgKGF0dHIubmFtZSA9PT0gJ2hyZWYnICYmIGF0dHIudmFsdWUuc3RhcnRzV2l0aCgnamF2YXNjcmlwdDonKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKGF0dHIubmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGVtcC5pbm5lckhUTUw7XG4gICAgfTtcblxuICAgIC8vIFJlcGxhY2UgTWVuZGl4IFJpY2ggVGV4dCAoUXVpbGwpIHdpZGdldHMgd2l0aCBwbGFpbiBIVE1MIGJsb2NrcyBmb3IgcHJpbnRpbmdcbiAgICBjb25zdCBub3JtYWxpemVNZW5kaXhSaWNoVGV4dCA9IChyb290OiBIVE1MRWxlbWVudCkgPT4ge1xuICAgICAgICAvLyBNZW5kaXggUmljaCBUZXh0IGNvbnRhaW5lcnMgdHlwaWNhbGx5IHVzZSBgLndpZGdldC1yaWNoLXRleHRgXG4gICAgICAgIGNvbnN0IGNvbnRhaW5lcnMgPSBBcnJheS5mcm9tKFxuICAgICAgICAgICAgcm9vdC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PihcIi53aWRnZXQtcmljaC10ZXh0XCIpXG4gICAgICAgICk7XG5cbiAgICAgICAgY29udGFpbmVycy5mb3JFYWNoKGNvbnRhaW5lciA9PiB7XG4gICAgICAgICAgICAvLyBUaGUgYWN0dWFsIGZvcm1hdHRlZCBIVE1MIGxpdmVzIGluc2lkZSBgLnFsLWVkaXRvcmBcbiAgICAgICAgICAgIGNvbnN0IGVkaXRvciA9XG4gICAgICAgICAgICAgICAgY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3I8SFRNTEVsZW1lbnQ+KFwiLnFsLWVkaXRvclwiKSB8fFxuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PignW2NvbnRlbnRlZGl0YWJsZT1cInRydWVcIl0nKTtcblxuICAgICAgICAgICAgaWYgKCFlZGl0b3IpIHJldHVybjtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIGEgY2xlYW4sIHByaW50LWZyaWVuZGx5IHJlcGxhY2VtZW50XG4gICAgICAgICAgICBjb25zdCByZXBsYWNlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgICAgICByZXBsYWNlbWVudC5jbGFzc05hbWUgPSBcIm14LXJpY2h0ZXh0LXByaW50XCI7XG4gICAgICAgICAgICByZXBsYWNlbWVudC5pbm5lckhUTUwgPSBlZGl0b3IuaW5uZXJIVE1MOyAvLyBwcmVzZXJ2ZSBmb3JtYXR0ZWQgSFRNTFxuXG4gICAgICAgICAgICAvLyBTd2FwIGVudGlyZSB3aWRnZXQgZm9yIHRoZSBwcmludC1mcmllbmRseSB2ZXJzaW9uXG4gICAgICAgICAgICBjb250YWluZXIucGFyZW50RWxlbWVudD8ucmVwbGFjZUNoaWxkKHJlcGxhY2VtZW50LCBjb250YWluZXIpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgY29uc3QgY2FwdHVyZUNvbXB1dGVkU3R5bGVzID0gKGVsZW1lbnQ6IEhUTUxFbGVtZW50KTogc3RyaW5nID0+IHtcbiAgICAgICAgY29uc3QgYWxsRWxlbWVudHMgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJyonKTtcbiAgICAgICAgY29uc3Qgc3R5bGVSdWxlczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgXG4gICAgICAgIC8vIENhcHR1cmUgY29tcHV0ZWQgc3R5bGVzIGZvciBlYWNoIGVsZW1lbnRcbiAgICAgICAgYWxsRWxlbWVudHMuZm9yRWFjaCgoZWwsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjb21wdXRlZCA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsKTtcbiAgICAgICAgICAgIGNvbnN0IGNsYXNzTmFtZSA9IGBjYXB0dXJlZC1zdHlsZS0ke2luZGV4fWA7XG4gICAgICAgICAgICAoZWwgYXMgSFRNTEVsZW1lbnQpLmNsYXNzTGlzdC5hZGQoY2xhc3NOYW1lKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRXh0cmFjdCBpbXBvcnRhbnQgc3R5bGUgcHJvcGVydGllc1xuICAgICAgICAgICAgY29uc3QgaW1wb3J0YW50UHJvcHMgPSBbXG4gICAgICAgICAgICAgICAgJ2Rpc3BsYXknLCAncG9zaXRpb24nLCAnd2lkdGgnLCAnaGVpZ2h0JywgJ21hcmdpbicsICdwYWRkaW5nJyxcbiAgICAgICAgICAgICAgICAnYm9yZGVyJywgJ2JhY2tncm91bmQnLCAnY29sb3InLCAnZm9udC1mYW1pbHknLCAnZm9udC1zaXplJyxcbiAgICAgICAgICAgICAgICAnZm9udC13ZWlnaHQnLCAndGV4dC1hbGlnbicsICdsaW5lLWhlaWdodCcsICdmbG9hdCcsICdjbGVhcicsXG4gICAgICAgICAgICAgICAgJ2ZsZXgnLCAnZmxleC1kaXJlY3Rpb24nLCAnanVzdGlmeS1jb250ZW50JywgJ2FsaWduLWl0ZW1zJyxcbiAgICAgICAgICAgICAgICAnZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zJywgJ2dyaWQtdGVtcGxhdGUtcm93cycsICdnYXAnXG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBzdHlsZXMgPSBpbXBvcnRhbnRQcm9wc1xuICAgICAgICAgICAgICAgIC5tYXAocHJvcCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gY29tcHV0ZWQuZ2V0UHJvcGVydHlWYWx1ZShwcm9wKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlICYmIHZhbHVlICE9PSAnbm9uZScgJiYgdmFsdWUgIT09ICdub3JtYWwnICYmIHZhbHVlICE9PSAnYXV0bycgXG4gICAgICAgICAgICAgICAgICAgICAgICA/IGAke3Byb3B9OiAke3ZhbHVlfTtgIFxuICAgICAgICAgICAgICAgICAgICAgICAgOiAnJztcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAgICAgICAgICAgICAuam9pbignICcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc3R5bGVzKSB7XG4gICAgICAgICAgICAgICAgc3R5bGVSdWxlcy5wdXNoKGAuJHtjbGFzc05hbWV9IHsgJHtzdHlsZXN9IH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gc3R5bGVSdWxlcy5qb2luKCdcXG4nKTtcbiAgICB9O1xuXG4gICAgY29uc3QgZ2VuZXJhdGVEb2N1bWVudCA9IHVzZUNhbGxiYWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgaWYgKGJ1c3kpIHJldHVybjtcbiAgICAgICAgc2V0QnVzeSh0cnVlKTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgdGFyZ2V0Q2xhc3MgPSBwcm9wcy50YXJnZXRDbGFzcyB8fCAnbXgtcGFnZSc7XG4gICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGAuJHt0YXJnZXRDbGFzc31gKSBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCF0YXJnZXQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEVsZW1lbnQgd2l0aCBjbGFzcyAuJHt0YXJnZXRDbGFzc30gbm90IGZvdW5kYCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENsb25lIHRoZSB0YXJnZXRcbiAgICAgICAgICAgIGNvbnN0IGNsb25lID0gdGFyZ2V0LmNsb25lTm9kZSh0cnVlKSBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgICAgIC8vIEZsYXR0ZW4gTWVuZGl4IFJpY2ggVGV4dCB3aWRnZXRzIHRvIHByaW50YWJsZSBIVE1MXG4gICAgICAgICAgICBub3JtYWxpemVNZW5kaXhSaWNoVGV4dChjbG9uZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEdldCBvcmlnaW5hbCBkaW1lbnNpb25zXG4gICAgICAgICAgICBjb25zdCByZWN0ID0gdGFyZ2V0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgY29uc3QgY29tcHV0ZWRTdHlsZSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRhcmdldCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFwcGx5IHJpY2ggdGV4dCBtYXBwaW5nc1xuICAgICAgICAgICAgY29uc3QgbWFwcGluZ3MgPSBbXG4gICAgICAgICAgICAgICAgeyBzZWxlY3RvcjogcHJvcHMucmljaFNlbGVjdG9yMSB8fCAnJywgaHRtbDogcHJvcHMucmljaEh0bWwxPy52YWx1ZSB8fCAnJyB9LFxuICAgICAgICAgICAgICAgIHsgc2VsZWN0b3I6IHByb3BzLnJpY2hTZWxlY3RvcjIgfHwgJycsIGh0bWw6IHByb3BzLnJpY2hIdG1sMj8udmFsdWUgfHwgJycgfSxcbiAgICAgICAgICAgICAgICB7IHNlbGVjdG9yOiBwcm9wcy5yaWNoU2VsZWN0b3IzIHx8ICcnLCBodG1sOiBwcm9wcy5yaWNoSHRtbDM/LnZhbHVlIHx8ICcnIH1cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIG1hcHBpbmdzLmZvckVhY2gobWFwID0+IHtcbiAgICAgICAgICAgICAgICBpZiAobWFwLnNlbGVjdG9yICYmIG1hcC5odG1sKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVsZW1lbnRzID0gY2xvbmUucXVlcnlTZWxlY3RvckFsbChtYXAuc2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjbGVhbkhUTUwgPSBzYW5pdGl6ZUhUTUwobWFwLmh0bWwpO1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50cy5mb3JFYWNoKGVsID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIChlbCBhcyBIVE1MRWxlbWVudCkuaW5uZXJIVE1MID0gY2xlYW5IVE1MO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gQ2FwdHVyZSBjb21wdXRlZCBzdHlsZXNcbiAgICAgICAgICAgIGNvbnN0IGNhcHR1cmVkU3R5bGVzID0gY2FwdHVyZUNvbXB1dGVkU3R5bGVzKGNsb25lKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2xlYW4gdXAgdW53YW50ZWQgZWxlbWVudHNcbiAgICAgICAgICAgIGNsb25lLnF1ZXJ5U2VsZWN0b3JBbGwoJ2J1dHRvbjpub3QoLmtlZXAtaW4tcGRmKSwgLm14LWRhdGF2aWV3LWNvbnRyb2xzLCAucGFnaW5nLXN0YXR1cywgLm14LWdyaWQtcGFnaW5nYmFyJykuZm9yRWFjaChlbCA9PiB7XG4gICAgICAgICAgICAgICAgZWwucmVtb3ZlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2V0IGFsbCBzdHlsZXNoZWV0cyBmcm9tIHRoZSBwYWdlXG4gICAgICAgICAgICBjb25zdCBzdHlsZVNoZWV0cyA9IEFycmF5LmZyb20oZG9jdW1lbnQuc3R5bGVTaGVldHMpO1xuICAgICAgICAgICAgbGV0IGV4aXN0aW5nU3R5bGVzID0gJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHN0eWxlU2hlZXRzLmZvckVhY2goc2hlZXQgPT4ge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJ1bGVzID0gQXJyYXkuZnJvbShzaGVldC5jc3NSdWxlcyB8fCBzaGVldC5ydWxlcyB8fCBbXSk7XG4gICAgICAgICAgICAgICAgICAgIHJ1bGVzLmZvckVhY2gocnVsZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGaWx0ZXIgb3V0IHByaW50LXNwZWNpZmljIHJ1bGVzIHRoYXQgbWlnaHQgYnJlYWsgbGF5b3V0XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocnVsZSBpbnN0YW5jZW9mIENTU1N0eWxlUnVsZSAmJiAhcnVsZS5zZWxlY3RvclRleHQ/LmluY2x1ZGVzKCdAbWVkaWEgcHJpbnQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4aXN0aW5nU3R5bGVzICs9IHJ1bGUuY3NzVGV4dCArICdcXG4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENyb3NzLW9yaWdpbiBzdHlsZXNoZWV0cyB3aWxsIHRocm93XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIEJ1aWxkIHRoZSBIVE1MIGRvY3VtZW50XG4gICAgICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHByb3BzLmZpbGVOYW1lPy52YWx1ZSB8fCAnZG9jdW1lbnQnO1xuICAgICAgICAgICAgY29uc3QgcGFnZU1hcmdpbiA9IHByb3BzLnBhZ2VNYXJnaW4gfHwgJzEwbW0nO1xuICAgICAgICAgICAgY29uc3QgZmlsZU9wdGlvbiA9IHByb3BzLmZpbGVPcHRpb24gfHwgJ2Rvd25sb2FkJztcblxuICAgICAgICAgICAgY29uc3QgaHRtbERvY3VtZW50ID0gYDwhRE9DVFlQRSBodG1sPlxuPGh0bWwgbGFuZz1cImVuXCI+XG48aGVhZD5cbiAgICA8bWV0YSBjaGFyc2V0PVwiVVRGLThcIj5cbiAgICA8bWV0YSBuYW1lPVwidmlld3BvcnRcIiBjb250ZW50PVwid2lkdGg9JHtyZWN0LndpZHRofVwiPlxuICAgIDx0aXRsZT4ke2ZpbGVOYW1lfTwvdGl0bGU+XG4gICAgPHN0eWxlPlxuICAgICAgICAvKiBSZXNldCBhbmQgYmFzZSBzdHlsZXMgKi9cbiAgICAgICAgKiB7XG4gICAgICAgICAgICBtYXJnaW46IDA7XG4gICAgICAgICAgICBwYWRkaW5nOiAwO1xuICAgICAgICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgQHBhZ2Uge1xuICAgICAgICAgICAgc2l6ZTogJHtyZWN0LndpZHRoID4gcmVjdC5oZWlnaHQgPyAnQTQgbGFuZHNjYXBlJyA6ICdBNCBwb3J0cmFpdCd9O1xuICAgICAgICAgICAgbWFyZ2luOiAke3BhZ2VNYXJnaW59O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBib2R5IHtcbiAgICAgICAgICAgIG1hcmdpbjogMDtcbiAgICAgICAgICAgIHBhZGRpbmc6IDA7XG4gICAgICAgICAgICB3aWR0aDogJHtyZWN0LndpZHRofXB4O1xuICAgICAgICAgICAgbWluLWhlaWdodDogJHtyZWN0LmhlaWdodH1weDtcbiAgICAgICAgICAgIGZvbnQtZmFtaWx5OiAke2NvbXB1dGVkU3R5bGUuZm9udEZhbWlseSB8fCAnLWFwcGxlLXN5c3RlbSwgQmxpbmtNYWNTeXN0ZW1Gb250LCBcIlNlZ29lIFVJXCIsIEFyaWFsLCBzYW5zLXNlcmlmJ307XG4gICAgICAgICAgICBmb250LXNpemU6ICR7Y29tcHV0ZWRTdHlsZS5mb250U2l6ZSB8fCAnMTRweCd9O1xuICAgICAgICAgICAgbGluZS1oZWlnaHQ6ICR7Y29tcHV0ZWRTdHlsZS5saW5lSGVpZ2h0IHx8ICcxLjUnfTtcbiAgICAgICAgICAgIGNvbG9yOiAke2NvbXB1dGVkU3R5bGUuY29sb3IgfHwgJyMwMDAwMDAnfTtcbiAgICAgICAgICAgIGJhY2tncm91bmQ6ICR7Y29tcHV0ZWRTdHlsZS5iYWNrZ3JvdW5kQ29sb3IgfHwgJyNmZmZmZmYnfTtcbiAgICAgICAgICAgIC13ZWJraXQtcHJpbnQtY29sb3ItYWRqdXN0OiBleGFjdDtcbiAgICAgICAgICAgIHByaW50LWNvbG9yLWFkanVzdDogZXhhY3Q7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8qIFByZXNlcnZlIG9yaWdpbmFsIHN0eWxlcyAqL1xuICAgICAgICAke2V4aXN0aW5nU3R5bGVzfVxuICAgICAgICBcbiAgICAgICAgLyogQ2FwdHVyZWQgY29tcHV0ZWQgc3R5bGVzICovXG4gICAgICAgICR7Y2FwdHVyZWRTdHlsZXN9XG4gICAgICAgIFxuICAgICAgICAvKiBUYWJsZSBmaXhlcyBmb3IgcHJpbnQgKi9cbiAgICAgICAgdGFibGUge1xuICAgICAgICAgICAgd2lkdGg6IDEwMCUgIWltcG9ydGFudDtcbiAgICAgICAgICAgIGJvcmRlci1jb2xsYXBzZTogY29sbGFwc2UgIWltcG9ydGFudDtcbiAgICAgICAgICAgIHBhZ2UtYnJlYWstaW5zaWRlOiBhdXRvICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoZWFkIHtcbiAgICAgICAgICAgIGRpc3BsYXk6IHRhYmxlLWhlYWRlci1ncm91cCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0Ym9keSB7XG4gICAgICAgICAgICBkaXNwbGF5OiB0YWJsZS1yb3ctZ3JvdXAgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdHIge1xuICAgICAgICAgICAgcGFnZS1icmVhay1pbnNpZGU6IGF2b2lkICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoLCB0ZCB7XG4gICAgICAgICAgICBwYWRkaW5nOiA2cHggIWltcG9ydGFudDtcbiAgICAgICAgICAgIGJvcmRlcjogMXB4IHNvbGlkICNkZGQgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLyogUHJlc2VydmUgZmxleGJveCBhbmQgZ3JpZCBsYXlvdXRzICovXG4gICAgICAgIC5kLWZsZXgsIC5mbGV4LCBbc3R5bGUqPVwiZGlzcGxheTogZmxleFwiXSB7XG4gICAgICAgICAgICBkaXNwbGF5OiBmbGV4ICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC5kLWdyaWQsIC5ncmlkLCBbc3R5bGUqPVwiZGlzcGxheTogZ3JpZFwiXSB7XG4gICAgICAgICAgICBkaXNwbGF5OiBncmlkICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8qIEhhbmRsZSBpbWFnZXMgKi9cbiAgICAgICAgaW1nIHtcbiAgICAgICAgICAgIG1heC13aWR0aDogMTAwJSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgaGVpZ2h0OiBhdXRvICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBwYWdlLWJyZWFrLWluc2lkZTogYXZvaWQgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIC8qIFByaW50LWZyaWVuZGx5IHJpY2ggdGV4dCBmcm9tIE1lbmRpeCAoY29udGVudCBleHRyYWN0ZWQgZnJvbSAucWwtZWRpdG9yKSAqL1xuICAgICAgICAubXgtcmljaHRleHQtcHJpbnQge1xuICAgICAgICAgICAgd2hpdGUtc3BhY2U6IG5vcm1hbDtcbiAgICAgICAgICAgIG92ZXJmbG93OiB2aXNpYmxlICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICB3b3JkLWJyZWFrOiBicmVhay13b3JkO1xuICAgICAgICB9XG5cbiAgICAgICAgLyogSWYgYW55IFF1aWxsIGJpdHMgc2xpcCB0aHJvdWdoLCBtYWtlIHRoZW0gcHJpbnRhYmxlICovXG4gICAgICAgIC5xbC1jb250YWluZXIsIC5xbC1lZGl0b3Ige1xuICAgICAgICAgICAgaGVpZ2h0OiBhdXRvICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBvdmVyZmxvdzogdmlzaWJsZSAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIC5xbC10b29sYmFyIHtcbiAgICAgICAgICAgIGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDsgLyogaGlkZSB0b29sYmFycyBpbiBwcmludCAqL1xuICAgICAgICB9XG4vKiBIaWRlIGVsZW1lbnRzIHRoYXQgc2hvdWxkbid0IHByaW50ICovXG4gICAgICAgIC5uby1wcmludCxcbiAgICAgICAgYnV0dG9uOm5vdCgucHJpbnQtYnV0dG9uKSxcbiAgICAgICAgaW5wdXRbdHlwZT1cImJ1dHRvblwiXSxcbiAgICAgICAgaW5wdXRbdHlwZT1cInN1Ym1pdFwiXSxcbiAgICAgICAgLm14LWJ1dHRvbjpub3QoLnByaW50LWJ1dHRvbiksXG4gICAgICAgIC5idG46bm90KC5wcmludC1idXR0b24pIHtcbiAgICAgICAgICAgIGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLyogTWVuZGl4LXNwZWNpZmljIHByZXNlcnZhdGlvbnMgKi9cbiAgICAgICAgLm14LWxheW91dGdyaWQtcm93IHtcbiAgICAgICAgICAgIGRpc3BsYXk6IGZsZXggIWltcG9ydGFudDtcbiAgICAgICAgICAgIGZsZXgtd3JhcDogd3JhcCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAubXgtbGF5b3V0Z3JpZC1jb2wge1xuICAgICAgICAgICAgZmxleDogMCAwIGF1dG8gIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLyogRml4IGZvciBuZXN0ZWQgY29udGVudCAqL1xuICAgICAgICAubXgtY29udGFpbmVyLFxuICAgICAgICAubXgtc2Nyb2xsY29udGFpbmVyLXdyYXBwZXIge1xuICAgICAgICAgICAgd2lkdGg6IDEwMCUgIWltcG9ydGFudDtcbiAgICAgICAgICAgIG92ZXJmbG93OiB2aXNpYmxlICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIEBtZWRpYSBwcmludCB7XG4gICAgICAgICAgICBib2R5IHtcbiAgICAgICAgICAgICAgICB3aWR0aDogMTAwJSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgICAgIG1hcmdpbjogMCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgICAgIHBhZGRpbmc6ICR7cGFnZU1hcmdpbn0gIWltcG9ydGFudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgKiB7XG4gICAgICAgICAgICAgICAgb3ZlcmZsb3c6IHZpc2libGUgIWltcG9ydGFudDtcbiAgICAgICAgICAgICAgICBtYXgtaGVpZ2h0OiBub25lICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICA8L3N0eWxlPlxuPC9oZWFkPlxuPGJvZHk+XG4gICAgPGRpdiBjbGFzcz1cInBkZi1jb250ZW50LXdyYXBwZXJcIiBzdHlsZT1cIndpZHRoOiAke3JlY3Qud2lkdGh9cHg7XCI+XG4gICAgICAgICR7Y2xvbmUuaW5uZXJIVE1MfVxuICAgIDwvZGl2PlxuPC9ib2R5PlxuPC9odG1sPmA7XG5cbiAgICAgICAgICAgIC8vIENvbnZlcnQgdG8gYmFzZTY0XG4gICAgICAgICAgICAvLyBUaGUgYnRvYSBmdW5jdGlvbiBmYWlscyBvbiBub24tQVNDSUkgY2hhcmFjdGVycy4gVGhlIGB1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoc3RyKSlgIHRyaWNrIGlzIGEgY29tbW9uXG4gICAgICAgICAgICAvLyBidXQgZGVwcmVjYXRlZCB3b3JrYXJvdW5kLiBBIG1vcmUgcm9idXN0IG1ldGhvZCBpcyB0byB1c2UgVGV4dEVuY29kZXIgdG8gY29ycmVjdGx5IGhhbmRsZSBVbmljb2RlLlxuICAgICAgICAgICAgLy8gVG8gYXZvaWQgXCJNYXhpbXVtIGNhbGwgc3RhY2sgc2l6ZSBleGNlZWRlZFwiIGVycm9ycyB3aXRoIGxhcmdlIGRvY3VtZW50cywgd2UgcHJvY2VzcyB0aGUgYnl0ZXMgaW4gY2h1bmtzLlxuICAgICAgICAgICAgY29uc3QgdG9CYXNlNjRJbkNodW5rcyA9ICh1OGE6IFVpbnQ4QXJyYXkpOiBzdHJpbmcgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IENIVU5LX1NJWkUgPSA4MTkyO1xuICAgICAgICAgICAgICAgIGxldCBiaW5TdHJpbmcgPSBcIlwiO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdThhLmxlbmd0aDsgaSArPSBDSFVOS19TSVpFKSB7XG4gICAgICAgICAgICAgICAgICAgIGJpblN0cmluZyArPSBTdHJpbmcuZnJvbUNvZGVQb2ludCguLi51OGEuc3ViYXJyYXkoaSwgaSArIENIVU5LX1NJWkUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGJ0b2EoYmluU3RyaW5nKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb25zdCBiYXNlNjQgPSB0b0Jhc2U2NEluQ2h1bmtzKG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZShodG1sRG9jdW1lbnQpKTtcbiAgICAgICAgICAgIGNvbnN0IGNsZWFuRmlsZU5hbWUgPSBmaWxlTmFtZS5yZXBsYWNlKC9bXFwvOio/XCI8PnxdKy9nLCAnXycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocHJvcHMucGRmTmFtZUF0dHI/LnNldFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgcHJvcHMucGRmTmFtZUF0dHIuc2V0VmFsdWUoY2xlYW5GaWxlTmFtZSArICcucGRmJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChwcm9wcy5iYXNlNjRBdHRyPy5zZXRWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHByb3BzLmJhc2U2NEF0dHIuc2V0VmFsdWUoYmFzZTY0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSGFuZGxlIG91dHB1dFxuICAgICAgICAgICAgaWYgKGZpbGVPcHRpb24gPT09ICdiYXNlNjQnKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0RvY3VtZW50IHN0b3JlZCBhcyBiYXNlNjQnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZmlsZU9wdGlvbiA9PT0gJ3ByZXZpZXcnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJpbnRXaW5kb3cgPSB3aW5kb3cub3BlbignJywgJ19ibGFuaycsIGB3aWR0aD0ke01hdGgubWluKHJlY3Qud2lkdGggKyAxMDAsIDEyMDApfSxoZWlnaHQ9ODAwYCk7XG4gICAgICAgICAgICAgICAgaWYgKHByaW50V2luZG93KSB7XG4gICAgICAgICAgICAgICAgICAgIHByaW50V2luZG93LmRvY3VtZW50Lm9wZW4oKTtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRXaW5kb3cuZG9jdW1lbnQud3JpdGUoaHRtbERvY3VtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRXaW5kb3cuZG9jdW1lbnQuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRXaW5kb3cub25sb2FkID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBwcmludFdpbmRvdy5wcmludCgpLCAyNTApO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gUHJpbnQgdXNpbmcgaWZyYW1lXG4gICAgICAgICAgICAgICAgY29uc3QgcHJpbnRGcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lmcmFtZScpO1xuICAgICAgICAgICAgICAgIHByaW50RnJhbWUuc3R5bGUuY3NzVGV4dCA9ICdwb3NpdGlvbjphYnNvbHV0ZTt3aWR0aDowO2hlaWdodDowO2JvcmRlcjowO2xlZnQ6LTk5OTlweCc7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChwcmludEZyYW1lKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBmcmFtZURvYyA9IHByaW50RnJhbWUuY29udGVudERvY3VtZW50IHx8IHByaW50RnJhbWUuY29udGVudFdpbmRvdz8uZG9jdW1lbnQ7XG4gICAgICAgICAgICAgICAgaWYgKGZyYW1lRG9jKSB7XG4gICAgICAgICAgICAgICAgICAgIGZyYW1lRG9jLm9wZW4oKTtcbiAgICAgICAgICAgICAgICAgICAgZnJhbWVEb2Mud3JpdGUoaHRtbERvY3VtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgZnJhbWVEb2MuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRGcmFtZS5jb250ZW50V2luZG93Py5mb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRGcmFtZS5jb250ZW50V2luZG93Py5wcmludCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRvY3VtZW50LmJvZHkuY29udGFpbnMocHJpbnRGcmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChwcmludEZyYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCAxMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMjUwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChwcm9wcy5vbkNoYW5nZT8uY2FuRXhlY3V0ZSAmJiBwcm9wcy5vbkNoYW5nZT8uZXhlY3V0ZSkge1xuICAgICAgICAgICAgICAgIHByb3BzLm9uQ2hhbmdlLmV4ZWN1dGUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignUERGIGdlbmVyYXRpb24gZXJyb3I6JywgZXJyb3IpO1xuICAgICAgICAgICAgYWxlcnQoJ0ZhaWxlZCB0byBnZW5lcmF0ZSBQREYuIFBsZWFzZSB1c2UgQ3RybCtQIChvciBDbWQrUCBvbiBNYWMpIHRvIHByaW50IG1hbnVhbGx5LicpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgc2V0QnVzeShmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9LCBbYnVzeSwgcHJvcHNdKTtcblxuICAgIGlmIChwcm9wcy5oaWRlQnV0dG9uID09PSB0cnVlKSByZXR1cm4gPEZyYWdtZW50IC8+O1xuXG4gICAgY29uc3QgYnV0dG9uQ2xhc3NOYW1lID0gcHJvcHMuYnV0dG9uQ2xhc3MgfHwgJ2J0biBidG4tcHJpbWFyeSc7XG4gICAgY29uc3QgYnV0dG9uVGV4dCA9IHByb3BzLmJ1dHRvbkNhcHRpb24/LnZhbHVlIHx8ICdFeHBvcnQgdG8gUERGJztcblxuICAgIHJldHVybiAoXG4gICAgICAgIDxidXR0b24gY2xhc3NOYW1lPXtidXR0b25DbGFzc05hbWV9IGRpc2FibGVkPXtidXN5fSBvbkNsaWNrPXtnZW5lcmF0ZURvY3VtZW50fT5cbiAgICAgICAgICAgIHtidXN5ID8gXCJHZW5lcmF0aW5nLi4uXCIgOiBidXR0b25UZXh0fVxuICAgICAgICA8L2J1dHRvbj5cbiAgICApO1xufSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUdNLFNBQVUsa0JBQWtCLENBQUMsS0FBdUMsRUFBQTtJQUN0RSxNQUFNLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUV4QyxJQUFBLE1BQU0sWUFBWSxHQUFHLENBQUMsSUFBWSxLQUFZO1FBQzFDLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDM0MsUUFBQSxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztRQUN0QixNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyx5REFBeUQsQ0FBQyxDQUFDO0FBQzNHLFFBQUEsaUJBQWlCLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUM3QyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDL0MsUUFBQSxXQUFXLENBQUMsT0FBTyxDQUFDLEVB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
