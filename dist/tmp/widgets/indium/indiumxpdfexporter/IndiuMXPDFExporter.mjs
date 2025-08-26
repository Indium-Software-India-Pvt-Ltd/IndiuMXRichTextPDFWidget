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
        return createElement(Fragment, null);
    const buttonClassName = props.buttonClass || 'btn btn-primary';
    const buttonText = props.buttonCaption?.value || 'Export to PDF';
    return (createElement("button", { className: buttonClassName, disabled: busy, onClick: generateDocument }, busy ? "Generating..." : buttonText));
}

export { IndiuMXPDFExporter };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSW5kaXVNWFBERkV4cG9ydGVyLm1qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL0luZGl1TVhQREZFeHBvcnRlci50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3JlYXRlRWxlbWVudCwgRnJhZ21lbnQsIHVzZUNhbGxiYWNrLCB1c2VTdGF0ZSB9IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IHsgSW5kaXVNWFBERkV4cG9ydGVyQ29udGFpbmVyUHJvcHMgfSBmcm9tIFwiLi4vdHlwaW5ncy9JbmRpdU1YUERGRXhwb3J0ZXJQcm9wc1wiO1xuXG5leHBvcnQgZnVuY3Rpb24gSW5kaXVNWFBERkV4cG9ydGVyKHByb3BzOiBJbmRpdU1YUERGRXhwb3J0ZXJDb250YWluZXJQcm9wcyk6IEpTWC5FbGVtZW50IHtcbiAgICBjb25zdCBbYnVzeSwgc2V0QnVzeV0gPSB1c2VTdGF0ZShmYWxzZSk7XG5cbiAgICBjb25zdCBzYW5pdGl6ZUhUTUwgPSAoaHRtbDogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICAgICAgY29uc3QgdGVtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICB0ZW1wLmlubmVySFRNTCA9IGh0bWw7XG4gICAgICAgIGNvbnN0IGRhbmdlcm91c0VsZW1lbnRzID0gdGVtcC5xdWVyeVNlbGVjdG9yQWxsKCdzY3JpcHQsIHN0eWxlW2RhdGEtcmVtb3ZlXSwgaWZyYW1lLCBvYmplY3QsIGVtYmVkLCBmb3JtJyk7XG4gICAgICAgIGRhbmdlcm91c0VsZW1lbnRzLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xuICAgICAgICBjb25zdCBhbGxFbGVtZW50cyA9IHRlbXAucXVlcnlTZWxlY3RvckFsbCgnKicpO1xuICAgICAgICBhbGxFbGVtZW50cy5mb3JFYWNoKGVsID0+IHtcbiAgICAgICAgICAgIEFycmF5LmZyb20oZWwuYXR0cmlidXRlcykuZm9yRWFjaChhdHRyID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoYXR0ci5uYW1lLnN0YXJ0c1dpdGgoJ29uJykgfHwgKGF0dHIubmFtZSA9PT0gJ2hyZWYnICYmIGF0dHIudmFsdWUuc3RhcnRzV2l0aCgnamF2YXNjcmlwdDonKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKGF0dHIubmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGVtcC5pbm5lckhUTUw7XG4gICAgfTtcblxuICAgIGNvbnN0IGNhcHR1cmVDb21wdXRlZFN0eWxlcyA9IChlbGVtZW50OiBIVE1MRWxlbWVudCk6IHN0cmluZyA9PiB7XG4gICAgICAgIGNvbnN0IGFsbEVsZW1lbnRzID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCcqJyk7XG4gICAgICAgIGNvbnN0IHN0eWxlUnVsZXM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIFxuICAgICAgICAvLyBDYXB0dXJlIGNvbXB1dGVkIHN0eWxlcyBmb3IgZWFjaCBlbGVtZW50XG4gICAgICAgIGFsbEVsZW1lbnRzLmZvckVhY2goKGVsLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY29tcHV0ZWQgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShlbCk7XG4gICAgICAgICAgICBjb25zdCBjbGFzc05hbWUgPSBgY2FwdHVyZWQtc3R5bGUtJHtpbmRleH1gO1xuICAgICAgICAgICAgKGVsIGFzIEhUTUxFbGVtZW50KS5jbGFzc0xpc3QuYWRkKGNsYXNzTmFtZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEV4dHJhY3QgaW1wb3J0YW50IHN0eWxlIHByb3BlcnRpZXNcbiAgICAgICAgICAgIGNvbnN0IGltcG9ydGFudFByb3BzID0gW1xuICAgICAgICAgICAgICAgICdkaXNwbGF5JywgJ3Bvc2l0aW9uJywgJ3dpZHRoJywgJ2hlaWdodCcsICdtYXJnaW4nLCAncGFkZGluZycsXG4gICAgICAgICAgICAgICAgJ2JvcmRlcicsICdiYWNrZ3JvdW5kJywgJ2NvbG9yJywgJ2ZvbnQtZmFtaWx5JywgJ2ZvbnQtc2l6ZScsXG4gICAgICAgICAgICAgICAgJ2ZvbnQtd2VpZ2h0JywgJ3RleHQtYWxpZ24nLCAnbGluZS1oZWlnaHQnLCAnZmxvYXQnLCAnY2xlYXInLFxuICAgICAgICAgICAgICAgICdmbGV4JywgJ2ZsZXgtZGlyZWN0aW9uJywgJ2p1c3RpZnktY29udGVudCcsICdhbGlnbi1pdGVtcycsXG4gICAgICAgICAgICAgICAgJ2dyaWQtdGVtcGxhdGUtY29sdW1ucycsICdncmlkLXRlbXBsYXRlLXJvd3MnLCAnZ2FwJ1xuICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3Qgc3R5bGVzID0gaW1wb3J0YW50UHJvcHNcbiAgICAgICAgICAgICAgICAubWFwKHByb3AgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGNvbXB1dGVkLmdldFByb3BlcnR5VmFsdWUocHJvcCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZSAmJiB2YWx1ZSAhPT0gJ25vbmUnICYmIHZhbHVlICE9PSAnbm9ybWFsJyAmJiB2YWx1ZSAhPT0gJ2F1dG8nIFxuICAgICAgICAgICAgICAgICAgICAgICAgPyBgJHtwcm9wfTogJHt2YWx1ZX07YCBcbiAgICAgICAgICAgICAgICAgICAgICAgIDogJyc7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgICAgICAgICAgICAgLmpvaW4oJyAnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHN0eWxlcykge1xuICAgICAgICAgICAgICAgIHN0eWxlUnVsZXMucHVzaChgLiR7Y2xhc3NOYW1lfSB7ICR7c3R5bGVzfSB9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHN0eWxlUnVsZXMuam9pbignXFxuJyk7XG4gICAgfTtcblxuICAgIGNvbnN0IGdlbmVyYXRlRG9jdW1lbnQgPSB1c2VDYWxsYmFjayhhc3luYyAoKSA9PiB7XG4gICAgICAgIGlmIChidXN5KSByZXR1cm47XG4gICAgICAgIHNldEJ1c3kodHJ1ZSk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldENsYXNzID0gcHJvcHMudGFyZ2V0Q2xhc3MgfHwgJ214LXBhZ2UnO1xuICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihgLiR7dGFyZ2V0Q2xhc3N9YCkgYXMgSFRNTEVsZW1lbnQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBFbGVtZW50IHdpdGggY2xhc3MgLiR7dGFyZ2V0Q2xhc3N9IG5vdCBmb3VuZGApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDbG9uZSB0aGUgdGFyZ2V0XG4gICAgICAgICAgICBjb25zdCBjbG9uZSA9IHRhcmdldC5jbG9uZU5vZGUodHJ1ZSkgYXMgSFRNTEVsZW1lbnQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEdldCBvcmlnaW5hbCBkaW1lbnNpb25zXG4gICAgICAgICAgICBjb25zdCByZWN0ID0gdGFyZ2V0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgY29uc3QgY29tcHV0ZWRTdHlsZSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRhcmdldCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFwcGx5IHJpY2ggdGV4dCBtYXBwaW5nc1xuICAgICAgICAgICAgY29uc3QgbWFwcGluZ3MgPSBbXG4gICAgICAgICAgICAgICAgeyBzZWxlY3RvcjogcHJvcHMucmljaFNlbGVjdG9yMSB8fCAnJywgaHRtbDogcHJvcHMucmljaEh0bWwxPy52YWx1ZSB8fCAnJyB9LFxuICAgICAgICAgICAgICAgIHsgc2VsZWN0b3I6IHByb3BzLnJpY2hTZWxlY3RvcjIgfHwgJycsIGh0bWw6IHByb3BzLnJpY2hIdG1sMj8udmFsdWUgfHwgJycgfSxcbiAgICAgICAgICAgICAgICB7IHNlbGVjdG9yOiBwcm9wcy5yaWNoU2VsZWN0b3IzIHx8ICcnLCBodG1sOiBwcm9wcy5yaWNoSHRtbDM/LnZhbHVlIHx8ICcnIH1cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIG1hcHBpbmdzLmZvckVhY2gobWFwID0+IHtcbiAgICAgICAgICAgICAgICBpZiAobWFwLnNlbGVjdG9yICYmIG1hcC5odG1sKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVsZW1lbnRzID0gY2xvbmUucXVlcnlTZWxlY3RvckFsbChtYXAuc2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjbGVhbkhUTUwgPSBzYW5pdGl6ZUhUTUwobWFwLmh0bWwpO1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50cy5mb3JFYWNoKGVsID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIChlbCBhcyBIVE1MRWxlbWVudCkuaW5uZXJIVE1MID0gY2xlYW5IVE1MO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gQ2FwdHVyZSBjb21wdXRlZCBzdHlsZXNcbiAgICAgICAgICAgIGNvbnN0IGNhcHR1cmVkU3R5bGVzID0gY2FwdHVyZUNvbXB1dGVkU3R5bGVzKGNsb25lKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2xlYW4gdXAgdW53YW50ZWQgZWxlbWVudHNcbiAgICAgICAgICAgIGNsb25lLnF1ZXJ5U2VsZWN0b3JBbGwoJ2J1dHRvbjpub3QoLmtlZXAtaW4tcGRmKSwgLm14LWRhdGF2aWV3LWNvbnRyb2xzLCAucGFnaW5nLXN0YXR1cywgLm14LWdyaWQtcGFnaW5nYmFyJykuZm9yRWFjaChlbCA9PiB7XG4gICAgICAgICAgICAgICAgZWwucmVtb3ZlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2V0IGFsbCBzdHlsZXNoZWV0cyBmcm9tIHRoZSBwYWdlXG4gICAgICAgICAgICBjb25zdCBzdHlsZVNoZWV0cyA9IEFycmF5LmZyb20oZG9jdW1lbnQuc3R5bGVTaGVldHMpO1xuICAgICAgICAgICAgbGV0IGV4aXN0aW5nU3R5bGVzID0gJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHN0eWxlU2hlZXRzLmZvckVhY2goc2hlZXQgPT4ge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJ1bGVzID0gQXJyYXkuZnJvbShzaGVldC5jc3NSdWxlcyB8fCBzaGVldC5ydWxlcyB8fCBbXSk7XG4gICAgICAgICAgICAgICAgICAgIHJ1bGVzLmZvckVhY2gocnVsZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGaWx0ZXIgb3V0IHByaW50LXNwZWNpZmljIHJ1bGVzIHRoYXQgbWlnaHQgYnJlYWsgbGF5b3V0XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocnVsZSBpbnN0YW5jZW9mIENTU1N0eWxlUnVsZSAmJiAhcnVsZS5zZWxlY3RvclRleHQ/LmluY2x1ZGVzKCdAbWVkaWEgcHJpbnQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4aXN0aW5nU3R5bGVzICs9IHJ1bGUuY3NzVGV4dCArICdcXG4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENyb3NzLW9yaWdpbiBzdHlsZXNoZWV0cyB3aWxsIHRocm93XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIEJ1aWxkIHRoZSBIVE1MIGRvY3VtZW50XG4gICAgICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHByb3BzLmZpbGVOYW1lPy52YWx1ZSB8fCAnZG9jdW1lbnQnO1xuICAgICAgICAgICAgY29uc3QgcGFnZU1hcmdpbiA9IHByb3BzLnBhZ2VNYXJnaW4gfHwgJzEwbW0nO1xuICAgICAgICAgICAgY29uc3QgZmlsZU9wdGlvbiA9IHByb3BzLmZpbGVPcHRpb24gfHwgJ2Rvd25sb2FkJztcblxuICAgICAgICAgICAgY29uc3QgaHRtbERvY3VtZW50ID0gYDwhRE9DVFlQRSBodG1sPlxuPGh0bWwgbGFuZz1cImVuXCI+XG48aGVhZD5cbiAgICA8bWV0YSBjaGFyc2V0PVwiVVRGLThcIj5cbiAgICA8bWV0YSBuYW1lPVwidmlld3BvcnRcIiBjb250ZW50PVwid2lkdGg9JHtyZWN0LndpZHRofVwiPlxuICAgIDx0aXRsZT4ke2ZpbGVOYW1lfTwvdGl0bGU+XG4gICAgPHN0eWxlPlxuICAgICAgICAvKiBSZXNldCBhbmQgYmFzZSBzdHlsZXMgKi9cbiAgICAgICAgKiB7XG4gICAgICAgICAgICBtYXJnaW46IDA7XG4gICAgICAgICAgICBwYWRkaW5nOiAwO1xuICAgICAgICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgQHBhZ2Uge1xuICAgICAgICAgICAgc2l6ZTogJHtyZWN0LndpZHRoID4gcmVjdC5oZWlnaHQgPyAnQTQgbGFuZHNjYXBlJyA6ICdBNCBwb3J0cmFpdCd9O1xuICAgICAgICAgICAgbWFyZ2luOiAke3BhZ2VNYXJnaW59O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBib2R5IHtcbiAgICAgICAgICAgIG1hcmdpbjogMDtcbiAgICAgICAgICAgIHBhZGRpbmc6IDA7XG4gICAgICAgICAgICB3aWR0aDogJHtyZWN0LndpZHRofXB4O1xuICAgICAgICAgICAgbWluLWhlaWdodDogJHtyZWN0LmhlaWdodH1weDtcbiAgICAgICAgICAgIGZvbnQtZmFtaWx5OiAke2NvbXB1dGVkU3R5bGUuZm9udEZhbWlseSB8fCAnLWFwcGxlLXN5c3RlbSwgQmxpbmtNYWNTeXN0ZW1Gb250LCBcIlNlZ29lIFVJXCIsIEFyaWFsLCBzYW5zLXNlcmlmJ307XG4gICAgICAgICAgICBmb250LXNpemU6ICR7Y29tcHV0ZWRTdHlsZS5mb250U2l6ZSB8fCAnMTRweCd9O1xuICAgICAgICAgICAgbGluZS1oZWlnaHQ6ICR7Y29tcHV0ZWRTdHlsZS5saW5lSGVpZ2h0IHx8ICcxLjUnfTtcbiAgICAgICAgICAgIGNvbG9yOiAke2NvbXB1dGVkU3R5bGUuY29sb3IgfHwgJyMwMDAwMDAnfTtcbiAgICAgICAgICAgIGJhY2tncm91bmQ6ICR7Y29tcHV0ZWRTdHlsZS5iYWNrZ3JvdW5kQ29sb3IgfHwgJyNmZmZmZmYnfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLyogUHJlc2VydmUgb3JpZ2luYWwgc3R5bGVzICovXG4gICAgICAgICR7ZXhpc3RpbmdTdHlsZXN9XG4gICAgICAgIFxuICAgICAgICAvKiBDYXB0dXJlZCBjb21wdXRlZCBzdHlsZXMgKi9cbiAgICAgICAgJHtjYXB0dXJlZFN0eWxlc31cbiAgICAgICAgXG4gICAgICAgIC8qIFRhYmxlIGZpeGVzIGZvciBwcmludCAqL1xuICAgICAgICB0YWJsZSB7XG4gICAgICAgICAgICB3aWR0aDogMTAwJSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgYm9yZGVyLWNvbGxhcHNlOiBjb2xsYXBzZSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgcGFnZS1icmVhay1pbnNpZGU6IGF1dG8gIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhlYWQge1xuICAgICAgICAgICAgZGlzcGxheTogdGFibGUtaGVhZGVyLWdyb3VwICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRib2R5IHtcbiAgICAgICAgICAgIGRpc3BsYXk6IHRhYmxlLXJvdy1ncm91cCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0ciB7XG4gICAgICAgICAgICBwYWdlLWJyZWFrLWluc2lkZTogYXZvaWQgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGgsIHRkIHtcbiAgICAgICAgICAgIHBhZGRpbmc6IDZweCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgYm9yZGVyOiAxcHggc29saWQgI2RkZCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvKiBQcmVzZXJ2ZSBmbGV4Ym94IGFuZCBncmlkIGxheW91dHMgKi9cbiAgICAgICAgLmQtZmxleCwgLmZsZXgsIFtzdHlsZSo9XCJkaXNwbGF5OiBmbGV4XCJdIHtcbiAgICAgICAgICAgIGRpc3BsYXk6IGZsZXggIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLmQtZ3JpZCwgLmdyaWQsIFtzdHlsZSo9XCJkaXNwbGF5OiBncmlkXCJdIHtcbiAgICAgICAgICAgIGRpc3BsYXk6IGdyaWQgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLyogSGFuZGxlIGltYWdlcyAqL1xuICAgICAgICBpbWcge1xuICAgICAgICAgICAgbWF4LXdpZHRoOiAxMDAlICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBoZWlnaHQ6IGF1dG8gIWltcG9ydGFudDtcbiAgICAgICAgICAgIHBhZ2UtYnJlYWstaW5zaWRlOiBhdm9pZCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvKiBIaWRlIGVsZW1lbnRzIHRoYXQgc2hvdWxkbid0IHByaW50ICovXG4gICAgICAgIC5uby1wcmludCxcbiAgICAgICAgYnV0dG9uOm5vdCgucHJpbnQtYnV0dG9uKSxcbiAgICAgICAgaW5wdXRbdHlwZT1cImJ1dHRvblwiXSxcbiAgICAgICAgaW5wdXRbdHlwZT1cInN1Ym1pdFwiXSxcbiAgICAgICAgLm14LWJ1dHRvbjpub3QoLnByaW50LWJ1dHRvbiksXG4gICAgICAgIC5idG46bm90KC5wcmludC1idXR0b24pIHtcbiAgICAgICAgICAgIGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLyogTWVuZGl4LXNwZWNpZmljIHByZXNlcnZhdGlvbnMgKi9cbiAgICAgICAgLm14LWxheW91dGdyaWQtcm93IHtcbiAgICAgICAgICAgIGRpc3BsYXk6IGZsZXggIWltcG9ydGFudDtcbiAgICAgICAgICAgIGZsZXgtd3JhcDogd3JhcCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAubXgtbGF5b3V0Z3JpZC1jb2wge1xuICAgICAgICAgICAgZmxleDogMCAwIGF1dG8gIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLyogRml4IGZvciBuZXN0ZWQgY29udGVudCAqL1xuICAgICAgICAubXgtY29udGFpbmVyLFxuICAgICAgICAubXgtc2Nyb2xsY29udGFpbmVyLXdyYXBwZXIge1xuICAgICAgICAgICAgd2lkdGg6IDEwMCUgIWltcG9ydGFudDtcbiAgICAgICAgICAgIG92ZXJmbG93OiB2aXNpYmxlICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIEBtZWRpYSBwcmludCB7XG4gICAgICAgICAgICBib2R5IHtcbiAgICAgICAgICAgICAgICB3aWR0aDogMTAwJSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgICAgIG1hcmdpbjogMCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgICAgIHBhZGRpbmc6ICR7cGFnZU1hcmdpbn0gIWltcG9ydGFudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgKiB7XG4gICAgICAgICAgICAgICAgb3ZlcmZsb3c6IHZpc2libGUgIWltcG9ydGFudDtcbiAgICAgICAgICAgICAgICBtYXgtaGVpZ2h0OiBub25lICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICA8L3N0eWxlPlxuPC9oZWFkPlxuPGJvZHk+XG4gICAgPGRpdiBjbGFzcz1cInBkZi1jb250ZW50LXdyYXBwZXJcIiBzdHlsZT1cIndpZHRoOiAke3JlY3Qud2lkdGh9cHg7XCI+XG4gICAgICAgICR7Y2xvbmUuaW5uZXJIVE1MfVxuICAgIDwvZGl2PlxuPC9ib2R5PlxuPC9odG1sPmA7XG5cbiAgICAgICAgICAgIC8vIENvbnZlcnQgdG8gYmFzZTY0XG4gICAgICAgICAgICBjb25zdCBiYXNlNjQgPSBidG9hKHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChodG1sRG9jdW1lbnQpKSk7XG4gICAgICAgICAgICBjb25zdCBjbGVhbkZpbGVOYW1lID0gZmlsZU5hbWUucmVwbGFjZSgvW1xcLzoqP1wiPD58XSsvZywgJ18nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHByb3BzLnBkZk5hbWVBdHRyPy5zZXRWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHByb3BzLnBkZk5hbWVBdHRyLnNldFZhbHVlKGNsZWFuRmlsZU5hbWUgKyAnLnBkZicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocHJvcHMuYmFzZTY0QXR0cj8uc2V0VmFsdWUpIHtcbiAgICAgICAgICAgICAgICBwcm9wcy5iYXNlNjRBdHRyLnNldFZhbHVlKGJhc2U2NCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEhhbmRsZSBvdXRwdXRcbiAgICAgICAgICAgIGlmIChmaWxlT3B0aW9uID09PSAnYmFzZTY0Jykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdEb2N1bWVudCBzdG9yZWQgYXMgYmFzZTY0Jyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGZpbGVPcHRpb24gPT09ICdwcmV2aWV3Jykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByaW50V2luZG93ID0gd2luZG93Lm9wZW4oJycsICdfYmxhbmsnLCBgd2lkdGg9JHtNYXRoLm1pbihyZWN0LndpZHRoICsgMTAwLCAxMjAwKX0saGVpZ2h0PTgwMGApO1xuICAgICAgICAgICAgICAgIGlmIChwcmludFdpbmRvdykge1xuICAgICAgICAgICAgICAgICAgICBwcmludFdpbmRvdy5kb2N1bWVudC5vcGVuKCk7XG4gICAgICAgICAgICAgICAgICAgIHByaW50V2luZG93LmRvY3VtZW50LndyaXRlKGh0bWxEb2N1bWVudCk7XG4gICAgICAgICAgICAgICAgICAgIHByaW50V2luZG93LmRvY3VtZW50LmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIHByaW50V2luZG93Lm9ubG9hZCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gcHJpbnRXaW5kb3cucHJpbnQoKSwgMjUwKTtcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFByaW50IHVzaW5nIGlmcmFtZVxuICAgICAgICAgICAgICAgIGNvbnN0IHByaW50RnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpZnJhbWUnKTtcbiAgICAgICAgICAgICAgICBwcmludEZyYW1lLnN0eWxlLmNzc1RleHQgPSAncG9zaXRpb246YWJzb2x1dGU7d2lkdGg6MDtoZWlnaHQ6MDtib3JkZXI6MDtsZWZ0Oi05OTk5cHgnO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQocHJpbnRGcmFtZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgZnJhbWVEb2MgPSBwcmludEZyYW1lLmNvbnRlbnREb2N1bWVudCB8fCBwcmludEZyYW1lLmNvbnRlbnRXaW5kb3c/LmRvY3VtZW50O1xuICAgICAgICAgICAgICAgIGlmIChmcmFtZURvYykge1xuICAgICAgICAgICAgICAgICAgICBmcmFtZURvYy5vcGVuKCk7XG4gICAgICAgICAgICAgICAgICAgIGZyYW1lRG9jLndyaXRlKGh0bWxEb2N1bWVudCk7XG4gICAgICAgICAgICAgICAgICAgIGZyYW1lRG9jLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW50RnJhbWUuY29udGVudFdpbmRvdz8uZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW50RnJhbWUuY29udGVudFdpbmRvdz8ucHJpbnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkb2N1bWVudC5ib2R5LmNvbnRhaW5zKHByaW50RnJhbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQocHJpbnRGcmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgMTAwMCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDI1MCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocHJvcHMub25BZnRlckdlbmVyYXRlPy5jYW5FeGVjdXRlICYmIHByb3BzLm9uQWZ0ZXJHZW5lcmF0ZT8uZXhlY3V0ZSkge1xuICAgICAgICAgICAgICAgIHByb3BzLm9uQWZ0ZXJHZW5lcmF0ZS5leGVjdXRlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1BERiBnZW5lcmF0aW9uIGVycm9yOicsIGVycm9yKTtcbiAgICAgICAgICAgIGFsZXJ0KCdGYWlsZWQgdG8gZ2VuZXJhdGUgUERGLiBQbGVhc2UgdXNlIEN0cmwrUCAob3IgQ21kK1Agb24gTWFjKSB0byBwcmludCBtYW51YWxseS4nKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHNldEJ1c3koZmFsc2UpO1xuICAgICAgICB9XG4gICAgfSwgW2J1c3ksIHByb3BzXSk7XG5cbiAgICBpZiAocHJvcHMuaGlkZUJ1dHRvbiA9PT0gdHJ1ZSkgcmV0dXJuIDxGcmFnbWVudCAvPjtcblxuICAgIGNvbnN0IGJ1dHRvbkNsYXNzTmFtZSA9IHByb3BzLmJ1dHRvbkNsYXNzIHx8ICdidG4gYnRuLXByaW1hcnknO1xuICAgIGNvbnN0IGJ1dHRvblRleHQgPSBwcm9wcy5idXR0b25DYXB0aW9uPy52YWx1ZSB8fCAnRXhwb3J0IHRvIFBERic7XG5cbiAgICByZXR1cm4gKFxuICAgICAgICA8YnV0dG9uIGNsYXNzTmFtZT17YnV0dG9uQ2xhc3NOYW1lfSBkaXNhYmxlZD17YnVzeX0gb25DbGljaz17Z2VuZXJhdGVEb2N1bWVudH0+XG4gICAgICAgICAgICB7YnVzeSA/IFwiR2VuZXJhdGluZy4uLlwiIDogYnV0dG9uVGV4dH1cbiAgICAgICAgPC9idXR0b24+XG4gICAgKTtcbn0iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFHTSxTQUFVLGtCQUFrQixDQUFDLEtBQXVDLEVBQUE7SUFDdEUsTUFBTSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7QUFFeEMsSUFBQSxNQUFNLFlBQVksR0FBRyxDQUFDLElBQVksS0FBWTtRQUMxQyxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzNDLFFBQUEsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7UUFDdEIsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMseURBQXlELENBQUMsQ0FBQztBQUMzRyxRQUFBLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLE1BQU0s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
