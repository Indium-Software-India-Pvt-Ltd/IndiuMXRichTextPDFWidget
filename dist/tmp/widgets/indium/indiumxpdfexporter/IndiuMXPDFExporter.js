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
        // Enhanced function to extract and preserve rich text content
        const extractRichTextContent = () => {
            const richTextMap = new Map();
            // Try multiple selectors to find rich text widgets
            const selectors = [
                '.mx-name-richText1 .ql-editor',
                '.widget-rich-text .ql-editor',
                '[class*="richText"] .ql-editor',
                '.ql-container .ql-editor',
                '.widget-rich-text-container .ql-editor'
            ];
            selectors.forEach(selector => {
                const editors = document.querySelectorAll(selector);
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
                            }
                            catch (e) {
                                // Not valid JSON, use original HTML
                            }
                        }
                        richTextMap.set(key, content);
                        console.log(`Found rich text content at ${selector}:`, content.substring(0, 100));
                    }
                });
            });
            // Also look for contenteditable elements
            document.querySelectorAll('[contenteditable="true"]').forEach((editor, index) => {
                if (editor && editor.innerHTML && !richTextMap.has(`contenteditable-${index}`)) {
                    richTextMap.set(`contenteditable-${index}`, editor.innerHTML);
                    console.log(`Found contenteditable content:`, editor.innerHTML.substring(0, 100));
                }
            });
            console.log(`Total rich text elements found: ${richTextMap.size}`);
            return richTextMap;
        };
        // Replace rich text widgets in the cloned element
        const replaceRichTextWidgets = (clone, richTextMap) => {
            // Find all potential rich text containers in the clone
            const containers = [
                ...Array.from(clone.querySelectorAll('.mx-name-richText1')),
                ...Array.from(clone.querySelectorAll('.widget-rich-text')),
                ...Array.from(clone.querySelectorAll('[class*="richText"]')),
                ...Array.from(clone.querySelectorAll('.form-group:has(.ql-editor)')),
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
                    const editor = container.querySelector('.ql-editor');
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
        const captureComputedStyles = (element) => {
            const allElements = element.querySelectorAll('*');
            const styleRules = [];
            allElements.forEach((el, index) => {
                const computed = window.getComputedStyle(el);
                const className = `captured-style-${index}`;
                el.classList.add(className);
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
        const generateDocument = react.useCallback(async () => {
            if (busy)
                return;
            setBusy(true);
            try {
                console.log('Starting PDF generation...');
                // Extract rich text content BEFORE cloning
                const richTextMap = extractRichTextContent();
                // Small delay to ensure all content is rendered
                await new Promise(resolve => setTimeout(resolve, 100));
                const targetClass = props.targetClass || 'mx-page';
                const target = document.querySelector(`.${targetClass}`);
                if (!target) {
                    throw new Error(`Element with class .${targetClass} not found`);
                }
                // Clone the target
                const clone = target.cloneNode(true);
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
                            el.innerHTML = cleanHTML;
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
                alert('Failed to generate PDF. Check the browser console for details.');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSW5kaXVNWFBERkV4cG9ydGVyLmpzIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvSW5kaXVNWFBERkV4cG9ydGVyLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjcmVhdGVFbGVtZW50LCBGcmFnbWVudCwgdXNlQ2FsbGJhY2ssIHVzZVN0YXRlIH0gZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgeyBJbmRpdU1YUERGRXhwb3J0ZXJDb250YWluZXJQcm9wcyB9IGZyb20gXCIuLi90eXBpbmdzL0luZGl1TVhQREZFeHBvcnRlclByb3BzXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBJbmRpdU1YUERGRXhwb3J0ZXIocHJvcHM6IEluZGl1TVhQREZFeHBvcnRlckNvbnRhaW5lclByb3BzKTogSlNYLkVsZW1lbnQge1xuICAgIGNvbnN0IFtidXN5LCBzZXRCdXN5XSA9IHVzZVN0YXRlKGZhbHNlKTtcblxuICAgIGNvbnN0IHNhbml0aXplSFRNTCA9IChodG1sOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgICAgICBjb25zdCB0ZW1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIHRlbXAuaW5uZXJIVE1MID0gaHRtbDtcbiAgICAgICAgY29uc3QgZGFuZ2Vyb3VzRWxlbWVudHMgPSB0ZW1wLnF1ZXJ5U2VsZWN0b3JBbGwoJ3NjcmlwdCwgc3R5bGVbZGF0YS1yZW1vdmVdLCBpZnJhbWUsIG9iamVjdCwgZW1iZWQsIGZvcm0nKTtcbiAgICAgICAgZGFuZ2Vyb3VzRWxlbWVudHMuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XG4gICAgICAgIGNvbnN0IGFsbEVsZW1lbnRzID0gdGVtcC5xdWVyeVNlbGVjdG9yQWxsKCcqJyk7XG4gICAgICAgIGFsbEVsZW1lbnRzLmZvckVhY2goZWwgPT4ge1xuICAgICAgICAgICAgQXJyYXkuZnJvbShlbC5hdHRyaWJ1dGVzKS5mb3JFYWNoKGF0dHIgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChhdHRyLm5hbWUuc3RhcnRzV2l0aCgnb24nKSB8fCAoYXR0ci5uYW1lID09PSAnaHJlZicgJiYgYXR0ci52YWx1ZS5zdGFydHNXaXRoKCdqYXZhc2NyaXB0OicpKSkge1xuICAgICAgICAgICAgICAgICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoYXR0ci5uYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0ZW1wLmlubmVySFRNTDtcbiAgICB9O1xuXG4gICAgLy8gRW5oYW5jZWQgZnVuY3Rpb24gdG8gZXh0cmFjdCBhbmQgcHJlc2VydmUgcmljaCB0ZXh0IGNvbnRlbnRcbiAgICBjb25zdCBleHRyYWN0UmljaFRleHRDb250ZW50ID0gKCk6IE1hcDxzdHJpbmcsIHN0cmluZz4gPT4ge1xuICAgICAgICBjb25zdCByaWNoVGV4dE1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBUcnkgbXVsdGlwbGUgc2VsZWN0b3JzIHRvIGZpbmQgcmljaCB0ZXh0IHdpZGdldHNcbiAgICAgICAgY29uc3Qgc2VsZWN0b3JzID0gW1xuICAgICAgICAgICAgJy5teC1uYW1lLXJpY2hUZXh0MSAucWwtZWRpdG9yJyxcbiAgICAgICAgICAgICcud2lkZ2V0LXJpY2gtdGV4dCAucWwtZWRpdG9yJyxcbiAgICAgICAgICAgICdbY2xhc3MqPVwicmljaFRleHRcIl0gLnFsLWVkaXRvcicsXG4gICAgICAgICAgICAnLnFsLWNvbnRhaW5lciAucWwtZWRpdG9yJyxcbiAgICAgICAgICAgICcud2lkZ2V0LXJpY2gtdGV4dC1jb250YWluZXIgLnFsLWVkaXRvcidcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIHNlbGVjdG9ycy5mb3JFYWNoKHNlbGVjdG9yID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGVkaXRvcnMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PihzZWxlY3Rvcik7XG4gICAgICAgICAgICBlZGl0b3JzLmZvckVhY2goKGVkaXRvciwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZWRpdG9yICYmIGVkaXRvci5pbm5lckhUTUwpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qga2V5ID0gYCR7c2VsZWN0b3J9LSR7aW5kZXh9YDtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGNvbnRlbnQgPSBlZGl0b3IuaW5uZXJIVE1MO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQWxzbyB0cnkgdG8gZ2V0IHRleHQgY29udGVudCBpZiBpbm5lckhUTUwgbG9va3MgbGlrZSBwbGFpbiB0ZXh0XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRleHRDb250ZW50ID0gZWRpdG9yLnRleHRDb250ZW50IHx8IGVkaXRvci5pbm5lclRleHQgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiBjb250ZW50IGlzIEpTT04gYW5kIGZvcm1hdCBpdFxuICAgICAgICAgICAgICAgICAgICBpZiAodGV4dENvbnRlbnQudHJpbSgpLnN0YXJ0c1dpdGgoJ3snKSAmJiB0ZXh0Q29udGVudC50cmltKCkuZW5kc1dpdGgoJ30nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHRleHRDb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50ID0gYDxkaXYgY2xhc3M9XCJqc29uLWZvcm1hdHRlZFwiPjxwcmU+JHtKU09OLnN0cmluZ2lmeShwYXJzZWQsIG51bGwsIDIpfTwvcHJlPjwvZGl2PmA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm90IHZhbGlkIEpTT04sIHVzZSBvcmlnaW5hbCBIVE1MXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJpY2hUZXh0TWFwLnNldChrZXksIGNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgRm91bmQgcmljaCB0ZXh0IGNvbnRlbnQgYXQgJHtzZWxlY3Rvcn06YCwgY29udGVudC5zdWJzdHJpbmcoMCwgMTAwKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQWxzbyBsb29rIGZvciBjb250ZW50ZWRpdGFibGUgZWxlbWVudHNcbiAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oJ1tjb250ZW50ZWRpdGFibGU9XCJ0cnVlXCJdJykuZm9yRWFjaCgoZWRpdG9yLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgaWYgKGVkaXRvciAmJiBlZGl0b3IuaW5uZXJIVE1MICYmICFyaWNoVGV4dE1hcC5oYXMoYGNvbnRlbnRlZGl0YWJsZS0ke2luZGV4fWApKSB7XG4gICAgICAgICAgICAgICAgcmljaFRleHRNYXAuc2V0KGBjb250ZW50ZWRpdGFibGUtJHtpbmRleH1gLCBlZGl0b3IuaW5uZXJIVE1MKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgRm91bmQgY29udGVudGVkaXRhYmxlIGNvbnRlbnQ6YCwgZWRpdG9yLmlubmVySFRNTC5zdWJzdHJpbmcoMCwgMTAwKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc29sZS5sb2coYFRvdGFsIHJpY2ggdGV4dCBlbGVtZW50cyBmb3VuZDogJHtyaWNoVGV4dE1hcC5zaXplfWApO1xuICAgICAgICByZXR1cm4gcmljaFRleHRNYXA7XG4gICAgfTtcblxuICAgIC8vIFJlcGxhY2UgcmljaCB0ZXh0IHdpZGdldHMgaW4gdGhlIGNsb25lZCBlbGVtZW50XG4gICAgY29uc3QgcmVwbGFjZVJpY2hUZXh0V2lkZ2V0cyA9IChjbG9uZTogSFRNTEVsZW1lbnQsIHJpY2hUZXh0TWFwOiBNYXA8c3RyaW5nLCBzdHJpbmc+KSA9PiB7XG4gICAgICAgIC8vIEZpbmQgYWxsIHBvdGVudGlhbCByaWNoIHRleHQgY29udGFpbmVycyBpbiB0aGUgY2xvbmVcbiAgICAgICAgY29uc3QgY29udGFpbmVycyA9IFtcbiAgICAgICAgICAgIC4uLkFycmF5LmZyb20oY2xvbmUucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oJy5teC1uYW1lLXJpY2hUZXh0MScpKSxcbiAgICAgICAgICAgIC4uLkFycmF5LmZyb20oY2xvbmUucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oJy53aWRnZXQtcmljaC10ZXh0JykpLFxuICAgICAgICAgICAgLi4uQXJyYXkuZnJvbShjbG9uZS5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PignW2NsYXNzKj1cInJpY2hUZXh0XCJdJykpLFxuICAgICAgICAgICAgLi4uQXJyYXkuZnJvbShjbG9uZS5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PignLmZvcm0tZ3JvdXA6aGFzKC5xbC1lZGl0b3IpJykpLFxuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgbGV0IHJlcGxhY2VtZW50Q291bnQgPSAwO1xuICAgICAgICBcbiAgICAgICAgY29udGFpbmVycy5mb3JFYWNoKGNvbnRhaW5lciA9PiB7XG4gICAgICAgICAgICAvLyBUcnkgdG8gZmluZCBhbnkgcmljaCB0ZXh0IGNvbnRlbnQgZm9yIHRoaXMgY29udGFpbmVyXG4gICAgICAgICAgICBsZXQgY29udGVudEZvdW5kID0gZmFsc2U7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZpcnN0LCBjaGVjayBpZiB3ZSBoYXZlIGNvbnRlbnQgZnJvbSB0aGUgZXh0cmFjdGlvblxuICAgICAgICAgICAgZm9yIChjb25zdCBbIGNvbnRlbnRdIG9mIHJpY2hUZXh0TWFwLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgICAgIGlmICghY29udGVudEZvdW5kICYmIGNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGEgcmVwbGFjZW1lbnQgZGl2IHdpdGggdGhlIGNvbnRlbnRcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVwbGFjZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICAgICAgcmVwbGFjZW1lbnQuY2xhc3NOYW1lID0gJ214LXJpY2h0ZXh0LXByaW50ZWQnO1xuICAgICAgICAgICAgICAgICAgICByZXBsYWNlbWVudC5pbm5lckhUTUwgPSBgXG5cbiAgICAgICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlcGxhY2UgdGhlIGVudGlyZSBjb250YWluZXJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRhaW5lci5wYXJlbnRFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXIucGFyZW50RWxlbWVudC5yZXBsYWNlQ2hpbGQocmVwbGFjZW1lbnQsIGNvbnRhaW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50Rm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVwbGFjZW1lbnRDb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFJlcGxhY2VkIGNvbnRhaW5lciAke3JlcGxhY2VtZW50Q291bnR9IHdpdGggcmljaCB0ZXh0IGNvbnRlbnRgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJZiBubyBjb250ZW50IHdhcyBmb3VuZCBpbiB0aGUgbWFwLCB0cnkgdG8gZXh0cmFjdCBkaXJlY3RseSBmcm9tIHRoZSBjbG9uZVxuICAgICAgICAgICAgaWYgKCFjb250ZW50Rm91bmQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBlZGl0b3IgPSBjb250YWluZXIucXVlcnlTZWxlY3RvcjxIVE1MRWxlbWVudD4oJy5xbC1lZGl0b3InKTtcbiAgICAgICAgICAgICAgICBpZiAoZWRpdG9yICYmIGVkaXRvci5pbm5lckhUTUwpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVwbGFjZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICAgICAgcmVwbGFjZW1lbnQuY2xhc3NOYW1lID0gJ214LXJpY2h0ZXh0LXByaW50ZWQnO1xuICAgICAgICAgICAgICAgICAgICByZXBsYWNlbWVudC5pbm5lckhUTUwgPSBgXG5cbiAgICAgICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb250YWluZXIucGFyZW50RWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyLnBhcmVudEVsZW1lbnQucmVwbGFjZUNoaWxkKHJlcGxhY2VtZW50LCBjb250YWluZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVwbGFjZW1lbnRDb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFJlcGxhY2VkIGNvbnRhaW5lciAke3JlcGxhY2VtZW50Q291bnR9IHdpdGggZGlyZWN0bHkgZXh0cmFjdGVkIGNvbnRlbnRgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgYW55IHJlbWFpbmluZyBRdWlsbCBVSSBlbGVtZW50c1xuICAgICAgICBjbG9uZS5xdWVyeVNlbGVjdG9yQWxsKCcucWwtdG9vbGJhciwgLnFsLXRvb2x0aXAsIC53aWRnZXQtcmljaC10ZXh0LXRvb2xiYXIsIC53aWRnZXQtcmljaC10ZXh0LWZvb3RlcicpLmZvckVhY2goZWwgPT4ge1xuICAgICAgICAgICAgZWwucmVtb3ZlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc29sZS5sb2coYFRvdGFsIGNvbnRhaW5lcnMgcmVwbGFjZWQ6ICR7cmVwbGFjZW1lbnRDb3VudH1gKTtcbiAgICAgICAgXG4gICAgICAgIC8vIElmIG5vIHJlcGxhY2VtZW50cyB3ZXJlIG1hZGUsIGluamVjdCB0aGUgY29udGVudCBhdCB0aGUgZW5kXG4gICAgICAgIGlmIChyZXBsYWNlbWVudENvdW50ID09PSAwICYmIHJpY2hUZXh0TWFwLnNpemUgPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBmYWxsYmFja0NvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgZmFsbGJhY2tDb250YWluZXIuY2xhc3NOYW1lID0gJ3JpY2gtdGV4dC1mYWxsYmFjayc7XG4gIFxuICAgICAgICBcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2xvbmUuYXBwZW5kQ2hpbGQoZmFsbGJhY2tDb250YWluZXIpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0FkZGVkIHJpY2ggdGV4dCBjb250ZW50IGFzIGZhbGxiYWNrIGF0IHRoZSBlbmQgb2YgZG9jdW1lbnQnKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBjYXB0dXJlQ29tcHV0ZWRTdHlsZXMgPSAoZWxlbWVudDogSFRNTEVsZW1lbnQpOiBzdHJpbmcgPT4ge1xuICAgICAgICBjb25zdCBhbGxFbGVtZW50cyA9IGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnKicpO1xuICAgICAgICBjb25zdCBzdHlsZVJ1bGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBcbiAgICAgICAgYWxsRWxlbWVudHMuZm9yRWFjaCgoZWwsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjb21wdXRlZCA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsKTtcbiAgICAgICAgICAgIGNvbnN0IGNsYXNzTmFtZSA9IGBjYXB0dXJlZC1zdHlsZS0ke2luZGV4fWA7XG4gICAgICAgICAgICAoZWwgYXMgSFRNTEVsZW1lbnQpLmNsYXNzTGlzdC5hZGQoY2xhc3NOYW1lKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgaW1wb3J0YW50UHJvcHMgPSBbXG4gICAgICAgICAgICAgICAgJ2Rpc3BsYXknLCAncG9zaXRpb24nLCAnd2lkdGgnLCAnaGVpZ2h0JywgJ21hcmdpbicsICdwYWRkaW5nJyxcbiAgICAgICAgICAgICAgICAnYm9yZGVyJywgJ2JhY2tncm91bmQnLCAnY29sb3InLCAnZm9udC1mYW1pbHknLCAnZm9udC1zaXplJyxcbiAgICAgICAgICAgICAgICAnZm9udC13ZWlnaHQnLCAndGV4dC1hbGlnbicsICdsaW5lLWhlaWdodCcsICdmbG9hdCcsICdjbGVhcicsXG4gICAgICAgICAgICAgICAgJ2ZsZXgnLCAnZmxleC1kaXJlY3Rpb24nLCAnanVzdGlmeS1jb250ZW50JywgJ2FsaWduLWl0ZW1zJyxcbiAgICAgICAgICAgICAgICAnZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zJywgJ2dyaWQtdGVtcGxhdGUtcm93cycsICdnYXAnLFxuICAgICAgICAgICAgICAgICd3aGl0ZS1zcGFjZScsICd3b3JkLWJyZWFrJywgJ3dvcmQtd3JhcCcsICdvdmVyZmxvdy13cmFwJ1xuICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3Qgc3R5bGVzID0gaW1wb3J0YW50UHJvcHNcbiAgICAgICAgICAgICAgICAubWFwKHByb3AgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGNvbXB1dGVkLmdldFByb3BlcnR5VmFsdWUocHJvcCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZSAmJiB2YWx1ZSAhPT0gJ25vbmUnICYmIHZhbHVlICE9PSAnbm9ybWFsJyAmJiB2YWx1ZSAhPT0gJ2F1dG8nIFxuICAgICAgICAgICAgICAgICAgICAgICAgPyBgJHtwcm9wfTogJHt2YWx1ZX07YCBcbiAgICAgICAgICAgICAgICAgICAgICAgIDogJyc7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgICAgICAgICAgICAgLmpvaW4oJyAnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHN0eWxlcykge1xuICAgICAgICAgICAgICAgIHN0eWxlUnVsZXMucHVzaChgLiR7Y2xhc3NOYW1lfSB7ICR7c3R5bGVzfSB9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHN0eWxlUnVsZXMuam9pbignXFxuJyk7XG4gICAgfTtcblxuICAgIGNvbnN0IGdlbmVyYXRlRG9jdW1lbnQgPSB1c2VDYWxsYmFjayhhc3luYyAoKSA9PiB7XG4gICAgICAgIGlmIChidXN5KSByZXR1cm47XG4gICAgICAgIHNldEJ1c3kodHJ1ZSk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTdGFydGluZyBQREYgZ2VuZXJhdGlvbi4uLicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBFeHRyYWN0IHJpY2ggdGV4dCBjb250ZW50IEJFRk9SRSBjbG9uaW5nXG4gICAgICAgICAgICBjb25zdCByaWNoVGV4dE1hcCA9IGV4dHJhY3RSaWNoVGV4dENvbnRlbnQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU21hbGwgZGVsYXkgdG8gZW5zdXJlIGFsbCBjb250ZW50IGlzIHJlbmRlcmVkXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwKSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldENsYXNzID0gcHJvcHMudGFyZ2V0Q2xhc3MgfHwgJ214LXBhZ2UnO1xuICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihgLiR7dGFyZ2V0Q2xhc3N9YCkgYXMgSFRNTEVsZW1lbnQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBFbGVtZW50IHdpdGggY2xhc3MgLiR7dGFyZ2V0Q2xhc3N9IG5vdCBmb3VuZGApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDbG9uZSB0aGUgdGFyZ2V0XG4gICAgICAgICAgICBjb25zdCBjbG9uZSA9IHRhcmdldC5jbG9uZU5vZGUodHJ1ZSkgYXMgSFRNTEVsZW1lbnQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlcGxhY2UgcmljaCB0ZXh0IHdpZGdldHMgd2l0aCBleHRyYWN0ZWQgY29udGVudFxuICAgICAgICAgICAgcmVwbGFjZVJpY2hUZXh0V2lkZ2V0cyhjbG9uZSwgcmljaFRleHRNYXApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBHZXQgb3JpZ2luYWwgZGltZW5zaW9uc1xuICAgICAgICAgICAgY29uc3QgcmVjdCA9IHRhcmdldC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgICAgIGNvbnN0IGNvbXB1dGVkU3R5bGUgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSh0YXJnZXQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBcHBseSBhZGRpdGlvbmFsIHJpY2ggdGV4dCBtYXBwaW5ncyBmcm9tIHByb3BzIGlmIHByb3ZpZGVkXG4gICAgICAgICAgICBjb25zdCBtYXBwaW5ncyA9IFtcbiAgICAgICAgICAgICAgICB7IHNlbGVjdG9yOiBwcm9wcy5yaWNoU2VsZWN0b3IxIHx8ICcnLCBodG1sOiBwcm9wcy5yaWNoSHRtbDE/LnZhbHVlIHx8ICcnIH0sXG4gICAgICAgICAgICAgICAgeyBzZWxlY3RvcjogcHJvcHMucmljaFNlbGVjdG9yMiB8fCAnJywgaHRtbDogcHJvcHMucmljaEh0bWwyPy52YWx1ZSB8fCAnJyB9LFxuICAgICAgICAgICAgICAgIHsgc2VsZWN0b3I6IHByb3BzLnJpY2hTZWxlY3RvcjMgfHwgJycsIGh0bWw6IHByb3BzLnJpY2hIdG1sMz8udmFsdWUgfHwgJycgfVxuICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgbWFwcGluZ3MuZm9yRWFjaChtYXAgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChtYXAuc2VsZWN0b3IgJiYgbWFwLmh0bWwpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZWxlbWVudHMgPSBjbG9uZS5xdWVyeVNlbGVjdG9yQWxsKG1hcC5zZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNsZWFuSFRNTCA9IHNhbml0aXplSFRNTChtYXAuaHRtbCk7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnRzLmZvckVhY2goZWwgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgKGVsIGFzIEhUTUxFbGVtZW50KS5pbm5lckhUTUwgPSBjbGVhbkhUTUw7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBDYXB0dXJlIGNvbXB1dGVkIHN0eWxlc1xuICAgICAgICAgICAgY29uc3QgY2FwdHVyZWRTdHlsZXMgPSBjYXB0dXJlQ29tcHV0ZWRTdHlsZXMoY2xvbmUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDbGVhbiB1cCB1bndhbnRlZCBlbGVtZW50c1xuICAgICAgICAgICAgY2xvbmUucXVlcnlTZWxlY3RvckFsbCgnYnV0dG9uOm5vdCgua2VlcC1pbi1wZGYpLCAucGFnaW5nLXN0YXR1cywgLm14LWdyaWQtcGFnaW5nYmFyJykuZm9yRWFjaChlbCA9PiB7XG4gICAgICAgICAgICAgICAgZWwucmVtb3ZlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2V0IGFsbCBzdHlsZXNoZWV0cyBmcm9tIHRoZSBwYWdlXG4gICAgICAgICAgICBjb25zdCBzdHlsZVNoZWV0cyA9IEFycmF5LmZyb20oZG9jdW1lbnQuc3R5bGVTaGVldHMpO1xuICAgICAgICAgICAgbGV0IGV4aXN0aW5nU3R5bGVzID0gJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHN0eWxlU2hlZXRzLmZvckVhY2goc2hlZXQgPT4ge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJ1bGVzID0gQXJyYXkuZnJvbShzaGVldC5jc3NSdWxlcyB8fCBzaGVldC5ydWxlcyB8fCBbXSk7XG4gICAgICAgICAgICAgICAgICAgIHJ1bGVzLmZvckVhY2gocnVsZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocnVsZSBpbnN0YW5jZW9mIENTU1N0eWxlUnVsZSAmJiAhcnVsZS5zZWxlY3RvclRleHQ/LmluY2x1ZGVzKCdAbWVkaWEgcHJpbnQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4aXN0aW5nU3R5bGVzICs9IHJ1bGUuY3NzVGV4dCArICdcXG4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENyb3NzLW9yaWdpbiBzdHlsZXNoZWV0cyB3aWxsIHRocm93XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIEJ1aWxkIHRoZSBIVE1MIGRvY3VtZW50XG4gICAgICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHByb3BzLmZpbGVOYW1lPy52YWx1ZSB8fCAnZG9jdW1lbnQnO1xuICAgICAgICAgICAgY29uc3QgcGFnZU1hcmdpbiA9IHByb3BzLnBhZ2VNYXJnaW4gfHwgJzEwbW0nO1xuICAgICAgICAgICAgY29uc3QgZmlsZU9wdGlvbiA9IHByb3BzLmZpbGVPcHRpb24gfHwgJ2Rvd25sb2FkJztcblxuICAgICAgICAgICAgY29uc3QgaHRtbERvY3VtZW50ID0gYDwhRE9DVFlQRSBodG1sPlxuPGh0bWwgbGFuZz1cImVuXCI+XG48aGVhZD5cbiAgICA8bWV0YSBjaGFyc2V0PVwiVVRGLThcIj5cbiAgICA8bWV0YSBuYW1lPVwidmlld3BvcnRcIiBjb250ZW50PVwid2lkdGg9JHtyZWN0LndpZHRofVwiPlxuICAgIDx0aXRsZT4ke2ZpbGVOYW1lfTwvdGl0bGU+XG4gICAgPHN0eWxlPlxuICAgICAgICAvKiBSZXNldCBhbmQgYmFzZSBzdHlsZXMgKi9cbiAgICAgICAgKiB7XG4gICAgICAgICAgICBtYXJnaW46IDA7XG4gICAgICAgICAgICBwYWRkaW5nOiAwO1xuICAgICAgICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgQHBhZ2Uge1xuICAgICAgICAgICAgc2l6ZTogJHtyZWN0LndpZHRoID4gcmVjdC5oZWlnaHQgPyAnQTQgbGFuZHNjYXBlJyA6ICdBNCBwb3J0cmFpdCd9O1xuICAgICAgICAgICAgbWFyZ2luOiAke3BhZ2VNYXJnaW59O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBib2R5IHtcbiAgICAgICAgICAgIG1hcmdpbjogMDtcbiAgICAgICAgICAgIHBhZGRpbmc6IDA7XG4gICAgICAgICAgICB3aWR0aDogJHtyZWN0LndpZHRofXB4O1xuICAgICAgICAgICAgbWluLWhlaWdodDogJHtyZWN0LmhlaWdodH1weDtcbiAgICAgICAgICAgIGZvbnQtZmFtaWx5OiAke2NvbXB1dGVkU3R5bGUuZm9udEZhbWlseSB8fCAnLWFwcGxlLXN5c3RlbSwgQmxpbmtNYWNTeXN0ZW1Gb250LCBcIlNlZ29lIFVJXCIsIEFyaWFsLCBzYW5zLXNlcmlmJ307XG4gICAgICAgICAgICBmb250LXNpemU6ICR7Y29tcHV0ZWRTdHlsZS5mb250U2l6ZSB8fCAnMTRweCd9O1xuICAgICAgICAgICAgbGluZS1oZWlnaHQ6ICR7Y29tcHV0ZWRTdHlsZS5saW5lSGVpZ2h0IHx8ICcxLjUnfTtcbiAgICAgICAgICAgIGNvbG9yOiAke2NvbXB1dGVkU3R5bGUuY29sb3IgfHwgJyMwMDAwMDAnfTtcbiAgICAgICAgICAgIGJhY2tncm91bmQ6ICR7Y29tcHV0ZWRTdHlsZS5iYWNrZ3JvdW5kQ29sb3IgfHwgJyNmZmZmZmYnfTtcbiAgICAgICAgICAgIC13ZWJraXQtcHJpbnQtY29sb3ItYWRqdXN0OiBleGFjdDtcbiAgICAgICAgICAgIHByaW50LWNvbG9yLWFkanVzdDogZXhhY3Q7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8qIFByZXNlcnZlIG9yaWdpbmFsIHN0eWxlcyAqL1xuICAgICAgICAke2V4aXN0aW5nU3R5bGVzfVxuICAgICAgICBcbiAgICAgICAgLyogQ2FwdHVyZWQgY29tcHV0ZWQgc3R5bGVzICovXG4gICAgICAgICR7Y2FwdHVyZWRTdHlsZXN9XG4gICAgICAgIFxuICAgICAgICAvKiBSaWNoIHRleHQgcHJpbnRpbmcgc3R5bGVzICovXG4gICAgICAgIC5teC1yaWNodGV4dC1wcmludGVkIHtcbiAgICAgICAgICAgIGRpc3BsYXk6IGJsb2NrICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBtYXJnaW46IDIwcHggMCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgcGFkZGluZzogMTVweCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgYm9yZGVyOiAxcHggc29saWQgI2RkZCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgYmFja2dyb3VuZDogI2Y5ZjlmOSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgYm9yZGVyLXJhZGl1czogNHB4ICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC5yaWNoLXRleHQtbGFiZWwge1xuICAgICAgICAgICAgZm9udC13ZWlnaHQ6IGJvbGQgIWltcG9ydGFudDtcbiAgICAgICAgICAgIG1hcmdpbi1ib3R0b206IDEwcHggIWltcG9ydGFudDtcbiAgICAgICAgICAgIGNvbG9yOiAjMzMzICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC5yaWNoLXRleHQtY29udGVudCB7XG4gICAgICAgICAgICB3aGl0ZS1zcGFjZTogcHJlLXdyYXAgIWltcG9ydGFudDtcbiAgICAgICAgICAgIHdvcmQtYnJlYWs6IGJyZWFrLXdvcmQgIWltcG9ydGFudDtcbiAgICAgICAgICAgIG92ZXJmbG93LXdyYXA6IGJyZWFrLXdvcmQgIWltcG9ydGFudDtcbiAgICAgICAgICAgIGZvbnQtZmFtaWx5OiBpbmhlcml0ICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBsaW5lLWhlaWdodDogMS42ICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBjb2xvcjogIzAwMCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAuanNvbi1mb3JtYXR0ZWQge1xuICAgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogI2Y1ZjVmNSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgYm9yZGVyOiAxcHggc29saWQgI2NjYyAhaW1wb3J0YW50O1xuICAgICAgICAgICAgYm9yZGVyLXJhZGl1czogM3B4ICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBwYWRkaW5nOiAxMHB4ICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBtYXJnaW46IDEwcHggMCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAuanNvbi1mb3JtYXR0ZWQgcHJlIHtcbiAgICAgICAgICAgIHdoaXRlLXNwYWNlOiBwcmUtd3JhcCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgd29yZC1icmVhazogYnJlYWstYWxsICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBmb250LWZhbWlseTogJ0NvdXJpZXIgTmV3JywgQ291cmllciwgbW9ub3NwYWNlICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBmb250LXNpemU6IDEycHggIWltcG9ydGFudDtcbiAgICAgICAgICAgIG1hcmdpbjogMCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgY29sb3I6ICMwMDAgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLnJpY2gtdGV4dC1mYWxsYmFjayB7XG4gICAgICAgICAgICBtYXJnaW4tdG9wOiAzMHB4ICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBwYWRkaW5nOiAyMHB4ICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBib3JkZXItdG9wOiAycHggc29saWQgI2RkZCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAucmljaC10ZXh0LWZhbGxiYWNrIGgzIHtcbiAgICAgICAgICAgIG1hcmdpbi1ib3R0b206IDE1cHggIWltcG9ydGFudDtcbiAgICAgICAgICAgIGNvbG9yOiAjMzMzICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8qIEVuc3VyZSByaWNoIHRleHQgZm9ybWF0dGluZyBpcyBwcmVzZXJ2ZWQgKi9cbiAgICAgICAgLm14LXJpY2h0ZXh0LXByaW50ZWQgcCxcbiAgICAgICAgLnJpY2gtdGV4dC1jb250ZW50IHAge1xuICAgICAgICAgICAgbWFyZ2luOiAwIDAgMTBweCAwICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC5teC1yaWNodGV4dC1wcmludGVkIHVsLCAubXgtcmljaHRleHQtcHJpbnRlZCBvbCxcbiAgICAgICAgLnJpY2gtdGV4dC1jb250ZW50IHVsLCAucmljaC10ZXh0LWNvbnRlbnQgb2wge1xuICAgICAgICAgICAgbWFyZ2luOiAwIDAgMTBweCAyMHB4ICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBwYWRkaW5nLWxlZnQ6IDIwcHggIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLm14LXJpY2h0ZXh0LXByaW50ZWQgbGksXG4gICAgICAgIC5yaWNoLXRleHQtY29udGVudCBsaSB7XG4gICAgICAgICAgICBtYXJnaW46IDAgMCA1cHggMCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAubXgtcmljaHRleHQtcHJpbnRlZCBzdHJvbmcsIC5teC1yaWNodGV4dC1wcmludGVkIGIsXG4gICAgICAgIC5yaWNoLXRleHQtY29udGVudCBzdHJvbmcsIC5yaWNoLXRleHQtY29udGVudCBiIHtcbiAgICAgICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC5teC1yaWNodGV4dC1wcmludGVkIGVtLCAubXgtcmljaHRleHQtcHJpbnRlZCBpLFxuICAgICAgICAucmljaC10ZXh0LWNvbnRlbnQgZW0sIC5yaWNoLXRleHQtY29udGVudCBpIHtcbiAgICAgICAgICAgIGZvbnQtc3R5bGU6IGl0YWxpYyAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvKiBUYWJsZSBzdHlsZXMgKi9cbiAgICAgICAgdGFibGUge1xuICAgICAgICAgICAgd2lkdGg6IDEwMCUgIWltcG9ydGFudDtcbiAgICAgICAgICAgIGJvcmRlci1jb2xsYXBzZTogY29sbGFwc2UgIWltcG9ydGFudDtcbiAgICAgICAgICAgIHBhZ2UtYnJlYWstaW5zaWRlOiBhdXRvICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBtYXJnaW46IDEwcHggMCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGVhZCB7XG4gICAgICAgICAgICBkaXNwbGF5OiB0YWJsZS1oZWFkZXItZ3JvdXAgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGJvZHkge1xuICAgICAgICAgICAgZGlzcGxheTogdGFibGUtcm93LWdyb3VwICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRyIHtcbiAgICAgICAgICAgIHBhZ2UtYnJlYWstaW5zaWRlOiBhdm9pZCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aCwgdGQge1xuICAgICAgICAgICAgcGFkZGluZzogOHB4ICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBib3JkZXI6IDFweCBzb2xpZCAjZGRkICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICB0ZXh0LWFsaWduOiBsZWZ0ICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoIHtcbiAgICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6ICNmNWY1ZjUgIWltcG9ydGFudDtcbiAgICAgICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8qIEhpZGUgdW53YW50ZWQgZWxlbWVudHMgKi9cbiAgICAgICAgLm5vLXByaW50LFxuICAgICAgICBidXR0b246bm90KC5wcmludC1idXR0b24pLFxuICAgICAgICBpbnB1dFt0eXBlPVwiYnV0dG9uXCJdLFxuICAgICAgICBpbnB1dFt0eXBlPVwic3VibWl0XCJdLFxuICAgICAgICAubXgtYnV0dG9uOm5vdCgucHJpbnQtYnV0dG9uKSxcbiAgICAgICAgLmJ0bjpub3QoLnByaW50LWJ1dHRvbiksXG4gICAgICAgIC5xbC10b29sYmFyLFxuICAgICAgICAucWwtdG9vbHRpcCxcbiAgICAgICAgLnFsLXRhYmxlLW1lbnVzLWNvbnRhaW5lcixcbiAgICAgICAgLndpZGdldC1yaWNoLXRleHQtdG9vbGJhcixcbiAgICAgICAgLndpZGdldC1yaWNoLXRleHQtZm9vdGVyIHtcbiAgICAgICAgICAgIGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLyogTWVuZGl4LXNwZWNpZmljIHByZXNlcnZhdGlvbnMgKi9cbiAgICAgICAgLm14LWxheW91dGdyaWQtcm93IHtcbiAgICAgICAgICAgIGRpc3BsYXk6IGZsZXggIWltcG9ydGFudDtcbiAgICAgICAgICAgIGZsZXgtd3JhcDogd3JhcCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAubXgtbGF5b3V0Z3JpZC1jb2wge1xuICAgICAgICAgICAgZmxleDogMCAwIGF1dG8gIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLm14LWNvbnRhaW5lcixcbiAgICAgICAgLm14LXNjcm9sbGNvbnRhaW5lci13cmFwcGVyIHtcbiAgICAgICAgICAgIHdpZHRoOiAxMDAlICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBvdmVyZmxvdzogdmlzaWJsZSAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBAbWVkaWEgcHJpbnQge1xuICAgICAgICAgICAgYm9keSB7XG4gICAgICAgICAgICAgICAgd2lkdGg6IDEwMCUgIWltcG9ydGFudDtcbiAgICAgICAgICAgICAgICBtYXJnaW46IDAgIWltcG9ydGFudDtcbiAgICAgICAgICAgICAgICBwYWRkaW5nOiAke3BhZ2VNYXJnaW59ICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICoge1xuICAgICAgICAgICAgICAgIG92ZXJmbG93OiB2aXNpYmxlICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICAgICAgbWF4LWhlaWdodDogbm9uZSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAubXgtcmljaHRleHQtcHJpbnRlZCB7XG4gICAgICAgICAgICAgICAgcGFnZS1icmVhay1pbnNpZGU6IGF2b2lkICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICAgICAgYmFja2dyb3VuZDogd2hpdGUgIWltcG9ydGFudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIDwvc3R5bGU+XG48L2hlYWQ+XG48Ym9keT5cbiAgICA8ZGl2IGNsYXNzPVwicGRmLWNvbnRlbnQtd3JhcHBlclwiIHN0eWxlPVwid2lkdGg6ICR7cmVjdC53aWR0aH1weDtcIj5cbiAgICAgICAgJHtjbG9uZS5pbm5lckhUTUx9XG4gICAgPC9kaXY+XG48L2JvZHk+XG48L2h0bWw+YDtcblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0hUTUwgZG9jdW1lbnQgcHJlcGFyZWQgZm9yIFBERicpO1xuXG4gICAgICAgICAgICAvLyBDb252ZXJ0IHRvIGJhc2U2NFxuICAgICAgICAgICAgY29uc3QgdG9CYXNlNjRJbkNodW5rcyA9ICh1OGE6IFVpbnQ4QXJyYXkpOiBzdHJpbmcgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IENIVU5LX1NJWkUgPSA4MTkyO1xuICAgICAgICAgICAgICAgIGxldCBiaW5TdHJpbmcgPSBcIlwiO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdThhLmxlbmd0aDsgaSArPSBDSFVOS19TSVpFKSB7XG4gICAgICAgICAgICAgICAgICAgIGJpblN0cmluZyArPSBTdHJpbmcuZnJvbUNvZGVQb2ludCguLi51OGEuc3ViYXJyYXkoaSwgaSArIENIVU5LX1NJWkUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGJ0b2EoYmluU3RyaW5nKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb25zdCBiYXNlNjQgPSB0b0Jhc2U2NEluQ2h1bmtzKG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZShodG1sRG9jdW1lbnQpKTtcbiAgICAgICAgICAgIGNvbnN0IGNsZWFuRmlsZU5hbWUgPSBmaWxlTmFtZS5yZXBsYWNlKC9bXFwvOio/XCI8PnxdKy9nLCAnXycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocHJvcHMucGRmTmFtZUF0dHI/LnNldFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgcHJvcHMucGRmTmFtZUF0dHIuc2V0VmFsdWUoY2xlYW5GaWxlTmFtZSArICcucGRmJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChwcm9wcy5iYXNlNjRBdHRyPy5zZXRWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHByb3BzLmJhc2U2NEF0dHIuc2V0VmFsdWUoYmFzZTY0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSGFuZGxlIG91dHB1dFxuICAgICAgICAgICAgaWYgKGZpbGVPcHRpb24gPT09ICdiYXNlNjQnKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0RvY3VtZW50IHN0b3JlZCBhcyBiYXNlNjQnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZmlsZU9wdGlvbiA9PT0gJ3ByZXZpZXcnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJpbnRXaW5kb3cgPSB3aW5kb3cub3BlbignJywgJ19ibGFuaycsIGB3aWR0aD0ke01hdGgubWluKHJlY3Qud2lkdGggKyAxMDAsIDEyMDApfSxoZWlnaHQ9ODAwYCk7XG4gICAgICAgICAgICAgICAgaWYgKHByaW50V2luZG93KSB7XG4gICAgICAgICAgICAgICAgICAgIHByaW50V2luZG93LmRvY3VtZW50Lm9wZW4oKTtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRXaW5kb3cuZG9jdW1lbnQud3JpdGUoaHRtbERvY3VtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRXaW5kb3cuZG9jdW1lbnQuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRXaW5kb3cub25sb2FkID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBwcmludFdpbmRvdy5wcmludCgpLCAyNTApO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gUHJpbnQgdXNpbmcgaWZyYW1lXG4gICAgICAgICAgICAgICAgY29uc3QgcHJpbnRGcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lmcmFtZScpO1xuICAgICAgICAgICAgICAgIHByaW50RnJhbWUuc3R5bGUuY3NzVGV4dCA9ICdwb3NpdGlvbjphYnNvbHV0ZTt3aWR0aDowO2hlaWdodDowO2JvcmRlcjowO2xlZnQ6LTk5OTlweCc7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChwcmludEZyYW1lKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBmcmFtZURvYyA9IHByaW50RnJhbWUuY29udGVudERvY3VtZW50IHx8IHByaW50RnJhbWUuY29udGVudFdpbmRvdz8uZG9jdW1lbnQ7XG4gICAgICAgICAgICAgICAgaWYgKGZyYW1lRG9jKSB7XG4gICAgICAgICAgICAgICAgICAgIGZyYW1lRG9jLm9wZW4oKTtcbiAgICAgICAgICAgICAgICAgICAgZnJhbWVEb2Mud3JpdGUoaHRtbERvY3VtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgZnJhbWVEb2MuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRGcmFtZS5jb250ZW50V2luZG93Py5mb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRGcmFtZS5jb250ZW50V2luZG93Py5wcmludCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRvY3VtZW50LmJvZHkuY29udGFpbnMocHJpbnRGcmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChwcmludEZyYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCAxMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMjUwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChwcm9wcy5vbkNoYW5nZT8uY2FuRXhlY3V0ZSAmJiBwcm9wcy5vbkNoYW5nZT8uZXhlY3V0ZSkge1xuICAgICAgICAgICAgICAgIHByb3BzLm9uQ2hhbmdlLmV4ZWN1dGUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignUERGIGdlbmVyYXRpb24gZXJyb3I6JywgZXJyb3IpO1xuICAgICAgICAgICAgYWxlcnQoJ0ZhaWxlZCB0byBnZW5lcmF0ZSBQREYuIENoZWNrIHRoZSBicm93c2VyIGNvbnNvbGUgZm9yIGRldGFpbHMuJyk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICBzZXRCdXN5KGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH0sIFtidXN5LCBwcm9wc10pO1xuXG4gICAgaWYgKHByb3BzLmhpZGVCdXR0b24gPT09IHRydWUpIHJldHVybiA8RnJhZ21lbnQgLz47XG5cbiAgICBjb25zdCBidXR0b25DbGFzc05hbWUgPSBwcm9wcy5idXR0b25DbGFzcyB8fCAnYnRuIGJ0bi1wcmltYXJ5JztcbiAgICBjb25zdCBidXR0b25UZXh0ID0gcHJvcHMuYnV0dG9uQ2FwdGlvbj8udmFsdWUgfHwgJ0V4cG9ydCB0byBQREYnO1xuXG4gICAgcmV0dXJuIChcbiAgICAgICAgPGJ1dHRvbiBjbGFzc05hbWU9e2J1dHRvbkNsYXNzTmFtZX0gZGlzYWJsZWQ9e2J1c3l9IG9uQ2xpY2s9e2dlbmVyYXRlRG9jdW1lbnR9PlxuICAgICAgICAgICAge2J1c3kgPyBcIkdlbmVyYXRpbmcuLi5cIiA6IGJ1dHRvblRleHR9XG4gICAgICAgIDwvYnV0dG9uPlxuICAgICk7XG59Il0sIm5hbWVzIjpbInVzZVN0YXRlIiwidXNlQ2FsbGJhY2siLCJjcmVhdGVFbGVtZW50IiwiRnJhZ21lbnQiXSwibWFwcGluZ3MiOiI7O0lBR00sU0FBVSxrQkFBa0IsQ0FBQyxLQUF1QyxFQUFBO1FBQ3RFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUdBLGNBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUV4QyxJQUFBLE1BQU0sWUFBWSxHQUFHLENBQUMsSUFBWSxLQUFZO1lBQzFDLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDM0MsUUFBQSxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztZQUN0QixNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyx5REFBeUQsQ0FBQyxDQUFDO0lBQzNHLFFBQUEsaUJBQWlCLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztZQUM3QyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDL0MsUUFBQSxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBRztJQUNyQixZQUFBLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUc7b0JBQ3JDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLElBQUksS0FBSyxNQUFNLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRTtJQUM5RixvQkFBQSxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMs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
