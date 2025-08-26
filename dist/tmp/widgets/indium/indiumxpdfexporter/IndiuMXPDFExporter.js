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
                const base64 = btoa(unescape(encodeURIComponent(htmlDocument)));
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
                if (props.onAfterGenerate?.canExecute && props.onAfterGenerate?.execute) {
                    props.onAfterGenerate.execute();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSW5kaXVNWFBERkV4cG9ydGVyLmpzIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvSW5kaXVNWFBERkV4cG9ydGVyLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjcmVhdGVFbGVtZW50LCBGcmFnbWVudCwgdXNlQ2FsbGJhY2ssIHVzZVN0YXRlIH0gZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgeyBJbmRpdU1YUERGRXhwb3J0ZXJDb250YWluZXJQcm9wcyB9IGZyb20gXCIuLi90eXBpbmdzL0luZGl1TVhQREZFeHBvcnRlclByb3BzXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBJbmRpdU1YUERGRXhwb3J0ZXIocHJvcHM6IEluZGl1TVhQREZFeHBvcnRlckNvbnRhaW5lclByb3BzKTogSlNYLkVsZW1lbnQge1xuICAgIGNvbnN0IFtidXN5LCBzZXRCdXN5XSA9IHVzZVN0YXRlKGZhbHNlKTtcblxuICAgIGNvbnN0IHNhbml0aXplSFRNTCA9IChodG1sOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgICAgICBjb25zdCB0ZW1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIHRlbXAuaW5uZXJIVE1MID0gaHRtbDtcbiAgICAgICAgY29uc3QgZGFuZ2Vyb3VzRWxlbWVudHMgPSB0ZW1wLnF1ZXJ5U2VsZWN0b3JBbGwoJ3NjcmlwdCwgc3R5bGVbZGF0YS1yZW1vdmVdLCBpZnJhbWUsIG9iamVjdCwgZW1iZWQsIGZvcm0nKTtcbiAgICAgICAgZGFuZ2Vyb3VzRWxlbWVudHMuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XG4gICAgICAgIGNvbnN0IGFsbEVsZW1lbnRzID0gdGVtcC5xdWVyeVNlbGVjdG9yQWxsKCcqJyk7XG4gICAgICAgIGFsbEVsZW1lbnRzLmZvckVhY2goZWwgPT4ge1xuICAgICAgICAgICAgQXJyYXkuZnJvbShlbC5hdHRyaWJ1dGVzKS5mb3JFYWNoKGF0dHIgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChhdHRyLm5hbWUuc3RhcnRzV2l0aCgnb24nKSB8fCAoYXR0ci5uYW1lID09PSAnaHJlZicgJiYgYXR0ci52YWx1ZS5zdGFydHNXaXRoKCdqYXZhc2NyaXB0OicpKSkge1xuICAgICAgICAgICAgICAgICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoYXR0ci5uYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0ZW1wLmlubmVySFRNTDtcbiAgICB9O1xuXG4gICAgY29uc3QgY2FwdHVyZUNvbXB1dGVkU3R5bGVzID0gKGVsZW1lbnQ6IEhUTUxFbGVtZW50KTogc3RyaW5nID0+IHtcbiAgICAgICAgY29uc3QgYWxsRWxlbWVudHMgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJyonKTtcbiAgICAgICAgY29uc3Qgc3R5bGVSdWxlczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgXG4gICAgICAgIC8vIENhcHR1cmUgY29tcHV0ZWQgc3R5bGVzIGZvciBlYWNoIGVsZW1lbnRcbiAgICAgICAgYWxsRWxlbWVudHMuZm9yRWFjaCgoZWwsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjb21wdXRlZCA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsKTtcbiAgICAgICAgICAgIGNvbnN0IGNsYXNzTmFtZSA9IGBjYXB0dXJlZC1zdHlsZS0ke2luZGV4fWA7XG4gICAgICAgICAgICAoZWwgYXMgSFRNTEVsZW1lbnQpLmNsYXNzTGlzdC5hZGQoY2xhc3NOYW1lKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRXh0cmFjdCBpbXBvcnRhbnQgc3R5bGUgcHJvcGVydGllc1xuICAgICAgICAgICAgY29uc3QgaW1wb3J0YW50UHJvcHMgPSBbXG4gICAgICAgICAgICAgICAgJ2Rpc3BsYXknLCAncG9zaXRpb24nLCAnd2lkdGgnLCAnaGVpZ2h0JywgJ21hcmdpbicsICdwYWRkaW5nJyxcbiAgICAgICAgICAgICAgICAnYm9yZGVyJywgJ2JhY2tncm91bmQnLCAnY29sb3InLCAnZm9udC1mYW1pbHknLCAnZm9udC1zaXplJyxcbiAgICAgICAgICAgICAgICAnZm9udC13ZWlnaHQnLCAndGV4dC1hbGlnbicsICdsaW5lLWhlaWdodCcsICdmbG9hdCcsICdjbGVhcicsXG4gICAgICAgICAgICAgICAgJ2ZsZXgnLCAnZmxleC1kaXJlY3Rpb24nLCAnanVzdGlmeS1jb250ZW50JywgJ2FsaWduLWl0ZW1zJyxcbiAgICAgICAgICAgICAgICAnZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zJywgJ2dyaWQtdGVtcGxhdGUtcm93cycsICdnYXAnXG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBzdHlsZXMgPSBpbXBvcnRhbnRQcm9wc1xuICAgICAgICAgICAgICAgIC5tYXAocHJvcCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gY29tcHV0ZWQuZ2V0UHJvcGVydHlWYWx1ZShwcm9wKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlICYmIHZhbHVlICE9PSAnbm9uZScgJiYgdmFsdWUgIT09ICdub3JtYWwnICYmIHZhbHVlICE9PSAnYXV0bycgXG4gICAgICAgICAgICAgICAgICAgICAgICA/IGAke3Byb3B9OiAke3ZhbHVlfTtgIFxuICAgICAgICAgICAgICAgICAgICAgICAgOiAnJztcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAgICAgICAgICAgICAuam9pbignICcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc3R5bGVzKSB7XG4gICAgICAgICAgICAgICAgc3R5bGVSdWxlcy5wdXNoKGAuJHtjbGFzc05hbWV9IHsgJHtzdHlsZXN9IH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gc3R5bGVSdWxlcy5qb2luKCdcXG4nKTtcbiAgICB9O1xuXG4gICAgY29uc3QgZ2VuZXJhdGVEb2N1bWVudCA9IHVzZUNhbGxiYWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgaWYgKGJ1c3kpIHJldHVybjtcbiAgICAgICAgc2V0QnVzeSh0cnVlKTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgdGFyZ2V0Q2xhc3MgPSBwcm9wcy50YXJnZXRDbGFzcyB8fCAnbXgtcGFnZSc7XG4gICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGAuJHt0YXJnZXRDbGFzc31gKSBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCF0YXJnZXQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEVsZW1lbnQgd2l0aCBjbGFzcyAuJHt0YXJnZXRDbGFzc30gbm90IGZvdW5kYCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENsb25lIHRoZSB0YXJnZXRcbiAgICAgICAgICAgIGNvbnN0IGNsb25lID0gdGFyZ2V0LmNsb25lTm9kZSh0cnVlKSBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2V0IG9yaWdpbmFsIGRpbWVuc2lvbnNcbiAgICAgICAgICAgIGNvbnN0IHJlY3QgPSB0YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICBjb25zdCBjb21wdXRlZFN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUodGFyZ2V0KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQXBwbHkgcmljaCB0ZXh0IG1hcHBpbmdzXG4gICAgICAgICAgICBjb25zdCBtYXBwaW5ncyA9IFtcbiAgICAgICAgICAgICAgICB7IHNlbGVjdG9yOiBwcm9wcy5yaWNoU2VsZWN0b3IxIHx8ICcnLCBodG1sOiBwcm9wcy5yaWNoSHRtbDE/LnZhbHVlIHx8ICcnIH0sXG4gICAgICAgICAgICAgICAgeyBzZWxlY3RvcjogcHJvcHMucmljaFNlbGVjdG9yMiB8fCAnJywgaHRtbDogcHJvcHMucmljaEh0bWwyPy52YWx1ZSB8fCAnJyB9LFxuICAgICAgICAgICAgICAgIHsgc2VsZWN0b3I6IHByb3BzLnJpY2hTZWxlY3RvcjMgfHwgJycsIGh0bWw6IHByb3BzLnJpY2hIdG1sMz8udmFsdWUgfHwgJycgfVxuICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgbWFwcGluZ3MuZm9yRWFjaChtYXAgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChtYXAuc2VsZWN0b3IgJiYgbWFwLmh0bWwpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZWxlbWVudHMgPSBjbG9uZS5xdWVyeVNlbGVjdG9yQWxsKG1hcC5zZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNsZWFuSFRNTCA9IHNhbml0aXplSFRNTChtYXAuaHRtbCk7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnRzLmZvckVhY2goZWwgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgKGVsIGFzIEhUTUxFbGVtZW50KS5pbm5lckhUTUwgPSBjbGVhbkhUTUw7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBDYXB0dXJlIGNvbXB1dGVkIHN0eWxlc1xuICAgICAgICAgICAgY29uc3QgY2FwdHVyZWRTdHlsZXMgPSBjYXB0dXJlQ29tcHV0ZWRTdHlsZXMoY2xvbmUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDbGVhbiB1cCB1bndhbnRlZCBlbGVtZW50c1xuICAgICAgICAgICAgY2xvbmUucXVlcnlTZWxlY3RvckFsbCgnYnV0dG9uOm5vdCgua2VlcC1pbi1wZGYpLCAubXgtZGF0YXZpZXctY29udHJvbHMsIC5wYWdpbmctc3RhdHVzLCAubXgtZ3JpZC1wYWdpbmdiYXInKS5mb3JFYWNoKGVsID0+IHtcbiAgICAgICAgICAgICAgICBlbC5yZW1vdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBHZXQgYWxsIHN0eWxlc2hlZXRzIGZyb20gdGhlIHBhZ2VcbiAgICAgICAgICAgIGNvbnN0IHN0eWxlU2hlZXRzID0gQXJyYXkuZnJvbShkb2N1bWVudC5zdHlsZVNoZWV0cyk7XG4gICAgICAgICAgICBsZXQgZXhpc3RpbmdTdHlsZXMgPSAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc3R5bGVTaGVldHMuZm9yRWFjaChzaGVldCA9PiB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcnVsZXMgPSBBcnJheS5mcm9tKHNoZWV0LmNzc1J1bGVzIHx8IHNoZWV0LnJ1bGVzIHx8IFtdKTtcbiAgICAgICAgICAgICAgICAgICAgcnVsZXMuZm9yRWFjaChydWxlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZpbHRlciBvdXQgcHJpbnQtc3BlY2lmaWMgcnVsZXMgdGhhdCBtaWdodCBicmVhayBsYXlvdXRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChydWxlIGluc3RhbmNlb2YgQ1NTU3R5bGVSdWxlICYmICFydWxlLnNlbGVjdG9yVGV4dD8uaW5jbHVkZXMoJ0BtZWRpYSBwcmludCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhpc3RpbmdTdHlsZXMgKz0gcnVsZS5jc3NUZXh0ICsgJ1xcbic7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ3Jvc3Mtb3JpZ2luIHN0eWxlc2hlZXRzIHdpbGwgdGhyb3dcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gQnVpbGQgdGhlIEhUTUwgZG9jdW1lbnRcbiAgICAgICAgICAgIGNvbnN0IGZpbGVOYW1lID0gcHJvcHMuZmlsZU5hbWU/LnZhbHVlIHx8ICdkb2N1bWVudCc7XG4gICAgICAgICAgICBjb25zdCBwYWdlTWFyZ2luID0gcHJvcHMucGFnZU1hcmdpbiB8fCAnMTBtbSc7XG4gICAgICAgICAgICBjb25zdCBmaWxlT3B0aW9uID0gcHJvcHMuZmlsZU9wdGlvbiB8fCAnZG93bmxvYWQnO1xuXG4gICAgICAgICAgICBjb25zdCBodG1sRG9jdW1lbnQgPSBgPCFET0NUWVBFIGh0bWw+XG48aHRtbCBsYW5nPVwiZW5cIj5cbjxoZWFkPlxuICAgIDxtZXRhIGNoYXJzZXQ9XCJVVEYtOFwiPlxuICAgIDxtZXRhIG5hbWU9XCJ2aWV3cG9ydFwiIGNvbnRlbnQ9XCJ3aWR0aD0ke3JlY3Qud2lkdGh9XCI+XG4gICAgPHRpdGxlPiR7ZmlsZU5hbWV9PC90aXRsZT5cbiAgICA8c3R5bGU+XG4gICAgICAgIC8qIFJlc2V0IGFuZCBiYXNlIHN0eWxlcyAqL1xuICAgICAgICAqIHtcbiAgICAgICAgICAgIG1hcmdpbjogMDtcbiAgICAgICAgICAgIHBhZGRpbmc6IDA7XG4gICAgICAgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBAcGFnZSB7XG4gICAgICAgICAgICBzaXplOiAke3JlY3Qud2lkdGggPiByZWN0LmhlaWdodCA/ICdBNCBsYW5kc2NhcGUnIDogJ0E0IHBvcnRyYWl0J307XG4gICAgICAgICAgICBtYXJnaW46ICR7cGFnZU1hcmdpbn07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGJvZHkge1xuICAgICAgICAgICAgbWFyZ2luOiAwO1xuICAgICAgICAgICAgcGFkZGluZzogMDtcbiAgICAgICAgICAgIHdpZHRoOiAke3JlY3Qud2lkdGh9cHg7XG4gICAgICAgICAgICBtaW4taGVpZ2h0OiAke3JlY3QuaGVpZ2h0fXB4O1xuICAgICAgICAgICAgZm9udC1mYW1pbHk6ICR7Y29tcHV0ZWRTdHlsZS5mb250RmFtaWx5IHx8ICctYXBwbGUtc3lzdGVtLCBCbGlua01hY1N5c3RlbUZvbnQsIFwiU2Vnb2UgVUlcIiwgQXJpYWwsIHNhbnMtc2VyaWYnfTtcbiAgICAgICAgICAgIGZvbnQtc2l6ZTogJHtjb21wdXRlZFN0eWxlLmZvbnRTaXplIHx8ICcxNHB4J307XG4gICAgICAgICAgICBsaW5lLWhlaWdodDogJHtjb21wdXRlZFN0eWxlLmxpbmVIZWlnaHQgfHwgJzEuNSd9O1xuICAgICAgICAgICAgY29sb3I6ICR7Y29tcHV0ZWRTdHlsZS5jb2xvciB8fCAnIzAwMDAwMCd9O1xuICAgICAgICAgICAgYmFja2dyb3VuZDogJHtjb21wdXRlZFN0eWxlLmJhY2tncm91bmRDb2xvciB8fCAnI2ZmZmZmZid9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvKiBQcmVzZXJ2ZSBvcmlnaW5hbCBzdHlsZXMgKi9cbiAgICAgICAgJHtleGlzdGluZ1N0eWxlc31cbiAgICAgICAgXG4gICAgICAgIC8qIENhcHR1cmVkIGNvbXB1dGVkIHN0eWxlcyAqL1xuICAgICAgICAke2NhcHR1cmVkU3R5bGVzfVxuICAgICAgICBcbiAgICAgICAgLyogVGFibGUgZml4ZXMgZm9yIHByaW50ICovXG4gICAgICAgIHRhYmxlIHtcbiAgICAgICAgICAgIHdpZHRoOiAxMDAlICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBib3JkZXItY29sbGFwc2U6IGNvbGxhcHNlICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBwYWdlLWJyZWFrLWluc2lkZTogYXV0byAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGVhZCB7XG4gICAgICAgICAgICBkaXNwbGF5OiB0YWJsZS1oZWFkZXItZ3JvdXAgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGJvZHkge1xuICAgICAgICAgICAgZGlzcGxheTogdGFibGUtcm93LWdyb3VwICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRyIHtcbiAgICAgICAgICAgIHBhZ2UtYnJlYWstaW5zaWRlOiBhdm9pZCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aCwgdGQge1xuICAgICAgICAgICAgcGFkZGluZzogNnB4ICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBib3JkZXI6IDFweCBzb2xpZCAjZGRkICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8qIFByZXNlcnZlIGZsZXhib3ggYW5kIGdyaWQgbGF5b3V0cyAqL1xuICAgICAgICAuZC1mbGV4LCAuZmxleCwgW3N0eWxlKj1cImRpc3BsYXk6IGZsZXhcIl0ge1xuICAgICAgICAgICAgZGlzcGxheTogZmxleCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAuZC1ncmlkLCAuZ3JpZCwgW3N0eWxlKj1cImRpc3BsYXk6IGdyaWRcIl0ge1xuICAgICAgICAgICAgZGlzcGxheTogZ3JpZCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvKiBIYW5kbGUgaW1hZ2VzICovXG4gICAgICAgIGltZyB7XG4gICAgICAgICAgICBtYXgtd2lkdGg6IDEwMCUgIWltcG9ydGFudDtcbiAgICAgICAgICAgIGhlaWdodDogYXV0byAhaW1wb3J0YW50O1xuICAgICAgICAgICAgcGFnZS1icmVhay1pbnNpZGU6IGF2b2lkICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8qIEhpZGUgZWxlbWVudHMgdGhhdCBzaG91bGRuJ3QgcHJpbnQgKi9cbiAgICAgICAgLm5vLXByaW50LFxuICAgICAgICBidXR0b246bm90KC5wcmludC1idXR0b24pLFxuICAgICAgICBpbnB1dFt0eXBlPVwiYnV0dG9uXCJdLFxuICAgICAgICBpbnB1dFt0eXBlPVwic3VibWl0XCJdLFxuICAgICAgICAubXgtYnV0dG9uOm5vdCgucHJpbnQtYnV0dG9uKSxcbiAgICAgICAgLmJ0bjpub3QoLnByaW50LWJ1dHRvbikge1xuICAgICAgICAgICAgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvKiBNZW5kaXgtc3BlY2lmaWMgcHJlc2VydmF0aW9ucyAqL1xuICAgICAgICAubXgtbGF5b3V0Z3JpZC1yb3cge1xuICAgICAgICAgICAgZGlzcGxheTogZmxleCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgZmxleC13cmFwOiB3cmFwICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC5teC1sYXlvdXRncmlkLWNvbCB7XG4gICAgICAgICAgICBmbGV4OiAwIDAgYXV0byAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvKiBGaXggZm9yIG5lc3RlZCBjb250ZW50ICovXG4gICAgICAgIC5teC1jb250YWluZXIsXG4gICAgICAgIC5teC1zY3JvbGxjb250YWluZXItd3JhcHBlciB7XG4gICAgICAgICAgICB3aWR0aDogMTAwJSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgb3ZlcmZsb3c6IHZpc2libGUgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgQG1lZGlhIHByaW50IHtcbiAgICAgICAgICAgIGJvZHkge1xuICAgICAgICAgICAgICAgIHdpZHRoOiAxMDAlICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICAgICAgbWFyZ2luOiAwICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICAgICAgcGFkZGluZzogJHtwYWdlTWFyZ2lufSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAqIHtcbiAgICAgICAgICAgICAgICBvdmVyZmxvdzogdmlzaWJsZSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgICAgIG1heC1oZWlnaHQ6IG5vbmUgIWltcG9ydGFudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIDwvc3R5bGU+XG48L2hlYWQ+XG48Ym9keT5cbiAgICA8ZGl2IGNsYXNzPVwicGRmLWNvbnRlbnQtd3JhcHBlclwiIHN0eWxlPVwid2lkdGg6ICR7cmVjdC53aWR0aH1weDtcIj5cbiAgICAgICAgJHtjbG9uZS5pbm5lckhUTUx9XG4gICAgPC9kaXY+XG48L2JvZHk+XG48L2h0bWw+YDtcblxuICAgICAgICAgICAgLy8gQ29udmVydCB0byBiYXNlNjRcbiAgICAgICAgICAgIGNvbnN0IGJhc2U2NCA9IGJ0b2EodW5lc2NhcGUoZW5jb2RlVVJJQ29tcG9uZW50KGh0bWxEb2N1bWVudCkpKTtcbiAgICAgICAgICAgIGNvbnN0IGNsZWFuRmlsZU5hbWUgPSBmaWxlTmFtZS5yZXBsYWNlKC9bXFwvOio/XCI8PnxdKy9nLCAnXycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocHJvcHMucGRmTmFtZUF0dHI/LnNldFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgcHJvcHMucGRmTmFtZUF0dHIuc2V0VmFsdWUoY2xlYW5GaWxlTmFtZSArICcucGRmJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChwcm9wcy5iYXNlNjRBdHRyPy5zZXRWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHByb3BzLmJhc2U2NEF0dHIuc2V0VmFsdWUoYmFzZTY0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSGFuZGxlIG91dHB1dFxuICAgICAgICAgICAgaWYgKGZpbGVPcHRpb24gPT09ICdiYXNlNjQnKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0RvY3VtZW50IHN0b3JlZCBhcyBiYXNlNjQnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZmlsZU9wdGlvbiA9PT0gJ3ByZXZpZXcnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJpbnRXaW5kb3cgPSB3aW5kb3cub3BlbignJywgJ19ibGFuaycsIGB3aWR0aD0ke01hdGgubWluKHJlY3Qud2lkdGggKyAxMDAsIDEyMDApfSxoZWlnaHQ9ODAwYCk7XG4gICAgICAgICAgICAgICAgaWYgKHByaW50V2luZG93KSB7XG4gICAgICAgICAgICAgICAgICAgIHByaW50V2luZG93LmRvY3VtZW50Lm9wZW4oKTtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRXaW5kb3cuZG9jdW1lbnQud3JpdGUoaHRtbERvY3VtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRXaW5kb3cuZG9jdW1lbnQuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRXaW5kb3cub25sb2FkID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBwcmludFdpbmRvdy5wcmludCgpLCAyNTApO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gUHJpbnQgdXNpbmcgaWZyYW1lXG4gICAgICAgICAgICAgICAgY29uc3QgcHJpbnRGcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lmcmFtZScpO1xuICAgICAgICAgICAgICAgIHByaW50RnJhbWUuc3R5bGUuY3NzVGV4dCA9ICdwb3NpdGlvbjphYnNvbHV0ZTt3aWR0aDowO2hlaWdodDowO2JvcmRlcjowO2xlZnQ6LTk5OTlweCc7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChwcmludEZyYW1lKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBmcmFtZURvYyA9IHByaW50RnJhbWUuY29udGVudERvY3VtZW50IHx8IHByaW50RnJhbWUuY29udGVudFdpbmRvdz8uZG9jdW1lbnQ7XG4gICAgICAgICAgICAgICAgaWYgKGZyYW1lRG9jKSB7XG4gICAgICAgICAgICAgICAgICAgIGZyYW1lRG9jLm9wZW4oKTtcbiAgICAgICAgICAgICAgICAgICAgZnJhbWVEb2Mud3JpdGUoaHRtbERvY3VtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgZnJhbWVEb2MuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRGcmFtZS5jb250ZW50V2luZG93Py5mb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRGcmFtZS5jb250ZW50V2luZG93Py5wcmludCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRvY3VtZW50LmJvZHkuY29udGFpbnMocHJpbnRGcmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChwcmludEZyYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCAxMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMjUwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChwcm9wcy5vbkFmdGVyR2VuZXJhdGU/LmNhbkV4ZWN1dGUgJiYgcHJvcHMub25BZnRlckdlbmVyYXRlPy5leGVjdXRlKSB7XG4gICAgICAgICAgICAgICAgcHJvcHMub25BZnRlckdlbmVyYXRlLmV4ZWN1dGUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignUERGIGdlbmVyYXRpb24gZXJyb3I6JywgZXJyb3IpO1xuICAgICAgICAgICAgYWxlcnQoJ0ZhaWxlZCB0byBnZW5lcmF0ZSBQREYuIFBsZWFzZSB1c2UgQ3RybCtQIChvciBDbWQrUCBvbiBNYWMpIHRvIHByaW50IG1hbnVhbGx5LicpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgc2V0QnVzeShmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9LCBbYnVzeSwgcHJvcHNdKTtcblxuICAgIGlmIChwcm9wcy5oaWRlQnV0dG9uID09PSB0cnVlKSByZXR1cm4gPEZyYWdtZW50IC8+O1xuXG4gICAgY29uc3QgYnV0dG9uQ2xhc3NOYW1lID0gcHJvcHMuYnV0dG9uQ2xhc3MgfHwgJ2J0biBidG4tcHJpbWFyeSc7XG4gICAgY29uc3QgYnV0dG9uVGV4dCA9IHByb3BzLmJ1dHRvbkNhcHRpb24/LnZhbHVlIHx8ICdFeHBvcnQgdG8gUERGJztcblxuICAgIHJldHVybiAoXG4gICAgICAgIDxidXR0b24gY2xhc3NOYW1lPXtidXR0b25DbGFzc05hbWV9IGRpc2FibGVkPXtidXN5fSBvbkNsaWNrPXtnZW5lcmF0ZURvY3VtZW50fT5cbiAgICAgICAgICAgIHtidXN5ID8gXCJHZW5lcmF0aW5nLi4uXCIgOiBidXR0b25UZXh0fVxuICAgICAgICA8L2J1dHRvbj5cbiAgICApO1xufSJdLCJuYW1lcyI6WyJ1c2VTdGF0ZSIsInVzZUNhbGxiYWNrIiwiY3JlYXRlRWxlbWVudCIsIkZyYWdtZW50Il0sIm1hcHBpbmdzIjoiOztJQUdNLFNBQVUsa0JBQWtCLENBQUMsS0FBdUMsRUFBQTtRQUN0RSxNQUFNLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxHQUFHQSxjQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7SUFFeEMsSUFBQSxNQUFNLFlBQVksR0FBRyxDQUFDLElBQVksS0FBWTtZQUMxQyxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzNDLFFBQUEsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7WUFDdEIsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMseURBQXlELENBQUMsQ0FBQztJQUMzRyxR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
