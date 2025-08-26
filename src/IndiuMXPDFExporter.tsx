import { createElement, Fragment, useCallback, useState } from "react";
import { IndiuMXPDFExporterContainerProps } from "../typings/IndiuMXPDFExporterProps";

export function IndiuMXPDFExporter(props: IndiuMXPDFExporterContainerProps): JSX.Element {
    const [busy, setBusy] = useState(false);

    const sanitizeHTML = (html: string): string => {
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

    const captureComputedStyles = (element: HTMLElement): string => {
        const allElements = element.querySelectorAll('*');
        const styleRules: string[] = [];
        
        // Capture computed styles for each element
        allElements.forEach((el, index) => {
            const computed = window.getComputedStyle(el);
            const className = `captured-style-${index}`;
            (el as HTMLElement).classList.add(className);
            
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
        if (busy) return;
        setBusy(true);

        try {
            const targetClass = props.targetClass || 'mx-page';
            const target = document.querySelector(`.${targetClass}`) as HTMLElement;
            
            if (!target) {
                throw new Error(`Element with class .${targetClass} not found`);
            }

            // Clone the target
            const clone = target.cloneNode(true) as HTMLElement;
            
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
                        (el as HTMLElement).innerHTML = cleanHTML;
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
                } catch (e) {
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
            } else if (fileOption === 'preview') {
                const printWindow = window.open('', '_blank', `width=${Math.min(rect.width + 100, 1200)},height=800`);
                if (printWindow) {
                    printWindow.document.open();
                    printWindow.document.write(htmlDocument);
                    printWindow.document.close();
                    printWindow.onload = () => {
                        setTimeout(() => printWindow.print(), 250);
                    };
                }
            } else {
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

        } catch (error) {
            console.error('PDF generation error:', error);
            alert('Failed to generate PDF. Please use Ctrl+P (or Cmd+P on Mac) to print manually.');
        } finally {
            setBusy(false);
        }
    }, [busy, props]);

    if (props.hideButton === true) return <Fragment />;

    const buttonClassName = props.buttonClass || 'btn btn-primary';
    const buttonText = props.buttonCaption?.value || 'Export to PDF';

    return (
        <button className={buttonClassName} disabled={busy} onClick={generateDocument}>
            {busy ? "Generating..." : buttonText}
        </button>
    );
}