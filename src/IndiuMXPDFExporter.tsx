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

    // Enhanced function to extract and preserve rich text content
    const extractRichTextContent = (): Map<string, string> => {
        const richTextMap = new Map<string, string>();

        // Try multiple selectors to find rich text widgets
        const selectors = [
            '.mx-name-richText1 .ql-editor',
            '.widget-rich-text .ql-editor',
            '[class*="richText"] .ql-editor',
            '.ql-container .ql-editor',
            '.widget-rich-text-container .ql-editor'
        ];

        selectors.forEach(selector => {
            const editors = document.querySelectorAll<HTMLElement>(selector);
            editors.forEach((editor, index) => {
                if (editor && editor.innerHTML) {
                    const key = `${selector}-${index}`;
                    let content = editor.innerHTML;

                    // Also try to get text content if innerHTML looks like plain text
                    const textContent = editor.textContent || editor.innerText || '';

                    // Check if content is JSON and format it
                    if (textContent.trim().startsWith('{') && textContent.trim().endsWith('}')) {
                        try {
                            const parsed = JSON.parse(textContent);
                            content = `<div class="json-formatted"><pre>${JSON.stringify(parsed, null, 2)}</pre></div>`;
                        } catch (e) {
                            // Not valid JSON, use original HTML
                        }
                    }

                    richTextMap.set(key, content);
                    console.log(`Found rich text content at ${selector}:`, content.substring(0, 100));
                }
            });
        });

        // Also look for contenteditable elements
        document.querySelectorAll<HTMLElement>('[contenteditable="true"]').forEach((editor, index) => {
            if (editor && editor.innerHTML && !richTextMap.has(`contenteditable-${index}`)) {
                richTextMap.set(`contenteditable-${index}`, editor.innerHTML);
                console.log(`Found contenteditable content:`, editor.innerHTML.substring(0, 100));
            }
        });

        console.log(`Total rich text elements found: ${richTextMap.size}`);
        return richTextMap;
    };

    // Replace rich text widgets in the cloned element
    const replaceRichTextWidgets = (clone: HTMLElement, richTextMap: Map<string, string>) => {
        // Find all potential rich text containers in the clone
        const containers = [
            ...Array.from(clone.querySelectorAll<HTMLElement>('.mx-name-richText1')),
            ...Array.from(clone.querySelectorAll<HTMLElement>('.widget-rich-text')),
            ...Array.from(clone.querySelectorAll<HTMLElement>('[class*="richText"]')),
            ...Array.from(clone.querySelectorAll<HTMLElement>('.form-group:has(.ql-editor)')),
        ];

        let replacementCount = 0;

        containers.forEach(container => {
            // Try to find any rich text content for this container
            let contentFound = false;

            // First, check if we have content from the extraction
            for (const [content] of richTextMap.entries()) {
                if (!contentFound && content) {
                    // Create a replacement div with the content
                    const replacement = document.createElement('div');
                    replacement.className = 'mx-richtext-printed';
                    replacement.innerHTML = `

                    `;

                    // Replace the entire container
                    if (container.parentElement) {
                        container.parentElement.replaceChild(replacement, container);
                        contentFound = true;
                        replacementCount++;
                        console.log(`Replaced container ${replacementCount} with rich text content`);
                        break;
                    }
                }
            }

            // If no content was found in the map, try to extract directly from the clone
            if (!contentFound) {
                const editor = container.querySelector<HTMLElement>('.ql-editor');
                if (editor && editor.innerHTML) {
                    const replacement = document.createElement('div');
                    replacement.className = 'mx-richtext-printed';
                    replacement.innerHTML = `

                    `;

                    if (container.parentElement) {
                        container.parentElement.replaceChild(replacement, container);
                        replacementCount++;
                        console.log(`Replaced container ${replacementCount} with directly extracted content`);
                    }
                }
            }
        });

        // Remove any remaining Quill UI elements
        clone.querySelectorAll('.ql-toolbar, .ql-tooltip, .widget-rich-text-toolbar, .widget-rich-text-footer').forEach(el => {
            el.remove();
        });

        console.log(`Total containers replaced: ${replacementCount}`);

        // If no replacements were made, inject the content at the end
        if (replacementCount === 0 && richTextMap.size > 0) {
            const fallbackContainer = document.createElement('div');
            fallbackContainer.className = 'rich-text-fallback';



            clone.appendChild(fallbackContainer);
            console.log('Added rich text content as fallback at the end of document');
        }
    };

    const captureComputedStyles = (element: HTMLElement): string => {
        const allElements = element.querySelectorAll('*');
        const styleRules: string[] = [];

        allElements.forEach((el, index) => {
            const computed = window.getComputedStyle(el);
            const className = `captured-style-${index}`;
            (el as HTMLElement).classList.add(className);

            const importantProps = [
                'display', 'position', 'width', 'height', 'margin', 'padding',
                'border', 'background', 'color', 'font-family', 'font-size',
                'font-weight', 'text-align', 'line-height', 'float', 'clear',
                'flex', 'flex-direction', 'justify-content', 'align-items',
                'grid-template-columns', 'grid-template-rows', 'gap',
                'white-space', 'word-break', 'word-wrap', 'overflow-wrap'
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
            console.log('Starting PDF generation...');

            // Extract rich text content BEFORE cloning
            const richTextMap = extractRichTextContent();

            // Small delay to ensure all content is rendered
            await new Promise(resolve => setTimeout(resolve, 100));

            const targetClass = props.targetClass || 'mx-page';
            const target = document.querySelector(`.${targetClass}`) as HTMLElement;

            if (!target) {
                throw new Error(`Element with class .${targetClass} not found`);
            }

            // Clone the target
            const clone = target.cloneNode(true) as HTMLElement;

            // Replace rich text widgets with extracted content
            replaceRichTextWidgets(clone, richTextMap);

            // Get original dimensions
            const rect = target.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(target);

            // Apply additional rich text mappings from props if provided
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
            clone.querySelectorAll('button:not(.keep-in-pdf), .paging-status, .mx-grid-pagingbar').forEach(el => {
                el.remove();
            });

            // Get all stylesheets from the page
            const styleSheets = Array.from(document.styleSheets);
            let existingStyles = '';

            styleSheets.forEach(sheet => {
                try {
                    const rules = Array.from(sheet.cssRules || sheet.rules || []);
                    rules.forEach(rule => {
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
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        
        /* Preserve original styles */
        ${existingStyles}
        
        /* Captured computed styles */
        ${capturedStyles}
        
        /* Rich text printing styles */
        .mx-richtext-printed {
            display: block !important;
            margin: 20px 0 !important;
            padding: 15px !important;
            border: 1px solid #ddd !important;
            background: #f9f9f9 !important;
            border-radius: 4px !important;
        }
        
        .rich-text-label {
            font-weight: bold !important;
            margin-bottom: 10px !important;
            color: #333 !important;
        }
        
        .rich-text-content {
            white-space: pre-wrap !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            font-family: inherit !important;
            line-height: 1.6 !important;
            color: #000 !important;
        }
        
        .json-formatted {
            background-color: #f5f5f5 !important;
            border: 1px solid #ccc !important;
            border-radius: 3px !important;
            padding: 10px !important;
            margin: 10px 0 !important;
        }
        
        .json-formatted pre {
            white-space: pre-wrap !important;
            word-break: break-all !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 12px !important;
            margin: 0 !important;
            color: #000 !important;
        }
        
        .rich-text-fallback {
            margin-top: 30px !important;
            padding: 20px !important;
            border-top: 2px solid #ddd !important;
        }
        
        .rich-text-fallback h3 {
            margin-bottom: 15px !important;
            color: #333 !important;
        }
        
        /* Ensure rich text formatting is preserved */
        .mx-richtext-printed p,
        .rich-text-content p {
            margin: 0 0 10px 0 !important;
        }
        
        .mx-richtext-printed ul, .mx-richtext-printed ol,
        .rich-text-content ul, .rich-text-content ol {
            margin: 0 0 10px 20px !important;
            padding-left: 20px !important;
        }
        
        .mx-richtext-printed li,
        .rich-text-content li {
            margin: 0 0 5px 0 !important;
        }
        
        .mx-richtext-printed strong, .mx-richtext-printed b,
        .rich-text-content strong, .rich-text-content b {
            font-weight: bold !important;
        }
        
        .mx-richtext-printed em, .mx-richtext-printed i,
        .rich-text-content em, .rich-text-content i {
            font-style: italic !important;
        }
        
        /* Table styles */
        table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
            margin: 10px 0 !important;
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
            padding: 8px !important;
            border: 1px solid #ddd !important;
            text-align: left !important;
        }
        
        th {
            background-color: #f5f5f5 !important;
            font-weight: bold !important;
        }
        
        /* Hide unwanted elements */
        .no-print,
        button:not(.print-button),
        input[type="button"],
        input[type="submit"],
        .mx-button:not(.print-button),
        .btn:not(.print-button),
        .ql-toolbar,
        .ql-tooltip,
        .ql-table-menus-container,
        .widget-rich-text-toolbar,
        .widget-rich-text-footer {
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
            
            .mx-richtext-printed {
                page-break-inside: avoid !important;
                background: white !important;
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

            console.log('HTML document prepared for PDF');

            // Convert to base64
            const toBase64InChunks = (u8a: Uint8Array): string => {
                const binString = Array.from(u8a, (byte) => String.fromCharCode(byte)).join('');
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

            if (props.onChange?.canExecute && props.onChange?.execute) {
                props.onChange.execute();
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

        } catch (error) {
            console.error('PDF generation error:', error);
            alert('Failed to generate PDF. Check the browser console for details.');
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