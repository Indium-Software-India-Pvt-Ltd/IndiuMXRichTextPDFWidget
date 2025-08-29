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
                        <div class="rich-text-label">Rich Text Content:</div>
                        <div class="rich-text-content">${content}</div>
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
                        <div class="rich-text-label">Rich Text Content:</div>
                        <div class="rich-text-content">${editor.innerHTML}</div>
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
                fallbackContainer.innerHTML = '<h3>Rich Text Content:</h3>';
                for (const [content] of richTextMap.entries()) {
                    if (content) {
                        fallbackContainer.innerHTML += `<div class="mx-richtext-printed">${content}</div>`;
                    }
                }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSW5kaXVNWFBERkV4cG9ydGVyLmpzIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvSW5kaXVNWFBERkV4cG9ydGVyLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjcmVhdGVFbGVtZW50LCBGcmFnbWVudCwgdXNlQ2FsbGJhY2ssIHVzZVN0YXRlIH0gZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgeyBJbmRpdU1YUERGRXhwb3J0ZXJDb250YWluZXJQcm9wcyB9IGZyb20gXCIuLi90eXBpbmdzL0luZGl1TVhQREZFeHBvcnRlclByb3BzXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBJbmRpdU1YUERGRXhwb3J0ZXIocHJvcHM6IEluZGl1TVhQREZFeHBvcnRlckNvbnRhaW5lclByb3BzKTogSlNYLkVsZW1lbnQge1xuICAgIGNvbnN0IFtidXN5LCBzZXRCdXN5XSA9IHVzZVN0YXRlKGZhbHNlKTtcblxuICAgIGNvbnN0IHNhbml0aXplSFRNTCA9IChodG1sOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgICAgICBjb25zdCB0ZW1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIHRlbXAuaW5uZXJIVE1MID0gaHRtbDtcbiAgICAgICAgY29uc3QgZGFuZ2Vyb3VzRWxlbWVudHMgPSB0ZW1wLnF1ZXJ5U2VsZWN0b3JBbGwoJ3NjcmlwdCwgc3R5bGVbZGF0YS1yZW1vdmVdLCBpZnJhbWUsIG9iamVjdCwgZW1iZWQsIGZvcm0nKTtcbiAgICAgICAgZGFuZ2Vyb3VzRWxlbWVudHMuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSk7XG4gICAgICAgIGNvbnN0IGFsbEVsZW1lbnRzID0gdGVtcC5xdWVyeVNlbGVjdG9yQWxsKCcqJyk7XG4gICAgICAgIGFsbEVsZW1lbnRzLmZvckVhY2goZWwgPT4ge1xuICAgICAgICAgICAgQXJyYXkuZnJvbShlbC5hdHRyaWJ1dGVzKS5mb3JFYWNoKGF0dHIgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChhdHRyLm5hbWUuc3RhcnRzV2l0aCgnb24nKSB8fCAoYXR0ci5uYW1lID09PSAnaHJlZicgJiYgYXR0ci52YWx1ZS5zdGFydHNXaXRoKCdqYXZhc2NyaXB0OicpKSkge1xuICAgICAgICAgICAgICAgICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoYXR0ci5uYW1lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0ZW1wLmlubmVySFRNTDtcbiAgICB9O1xuXG4gICAgLy8gRW5oYW5jZWQgZnVuY3Rpb24gdG8gZXh0cmFjdCBhbmQgcHJlc2VydmUgcmljaCB0ZXh0IGNvbnRlbnRcbiAgICBjb25zdCBleHRyYWN0UmljaFRleHRDb250ZW50ID0gKCk6IE1hcDxzdHJpbmcsIHN0cmluZz4gPT4ge1xuICAgICAgICBjb25zdCByaWNoVGV4dE1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBUcnkgbXVsdGlwbGUgc2VsZWN0b3JzIHRvIGZpbmQgcmljaCB0ZXh0IHdpZGdldHNcbiAgICAgICAgY29uc3Qgc2VsZWN0b3JzID0gW1xuICAgICAgICAgICAgJy5teC1uYW1lLXJpY2hUZXh0MSAucWwtZWRpdG9yJyxcbiAgICAgICAgICAgICcud2lkZ2V0LXJpY2gtdGV4dCAucWwtZWRpdG9yJyxcbiAgICAgICAgICAgICdbY2xhc3MqPVwicmljaFRleHRcIl0gLnFsLWVkaXRvcicsXG4gICAgICAgICAgICAnLnFsLWNvbnRhaW5lciAucWwtZWRpdG9yJyxcbiAgICAgICAgICAgICcud2lkZ2V0LXJpY2gtdGV4dC1jb250YWluZXIgLnFsLWVkaXRvcidcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIHNlbGVjdG9ycy5mb3JFYWNoKHNlbGVjdG9yID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGVkaXRvcnMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PihzZWxlY3Rvcik7XG4gICAgICAgICAgICBlZGl0b3JzLmZvckVhY2goKGVkaXRvciwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZWRpdG9yICYmIGVkaXRvci5pbm5lckhUTUwpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qga2V5ID0gYCR7c2VsZWN0b3J9LSR7aW5kZXh9YDtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGNvbnRlbnQgPSBlZGl0b3IuaW5uZXJIVE1MO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQWxzbyB0cnkgdG8gZ2V0IHRleHQgY29udGVudCBpZiBpbm5lckhUTUwgbG9va3MgbGlrZSBwbGFpbiB0ZXh0XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRleHRDb250ZW50ID0gZWRpdG9yLnRleHRDb250ZW50IHx8IGVkaXRvci5pbm5lclRleHQgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiBjb250ZW50IGlzIEpTT04gYW5kIGZvcm1hdCBpdFxuICAgICAgICAgICAgICAgICAgICBpZiAodGV4dENvbnRlbnQudHJpbSgpLnN0YXJ0c1dpdGgoJ3snKSAmJiB0ZXh0Q29udGVudC50cmltKCkuZW5kc1dpdGgoJ30nKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHRleHRDb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50ID0gYDxkaXYgY2xhc3M9XCJqc29uLWZvcm1hdHRlZFwiPjxwcmU+JHtKU09OLnN0cmluZ2lmeShwYXJzZWQsIG51bGwsIDIpfTwvcHJlPjwvZGl2PmA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm90IHZhbGlkIEpTT04sIHVzZSBvcmlnaW5hbCBIVE1MXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJpY2hUZXh0TWFwLnNldChrZXksIGNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgRm91bmQgcmljaCB0ZXh0IGNvbnRlbnQgYXQgJHtzZWxlY3Rvcn06YCwgY29udGVudC5zdWJzdHJpbmcoMCwgMTAwKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQWxzbyBsb29rIGZvciBjb250ZW50ZWRpdGFibGUgZWxlbWVudHNcbiAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oJ1tjb250ZW50ZWRpdGFibGU9XCJ0cnVlXCJdJykuZm9yRWFjaCgoZWRpdG9yLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgaWYgKGVkaXRvciAmJiBlZGl0b3IuaW5uZXJIVE1MICYmICFyaWNoVGV4dE1hcC5oYXMoYGNvbnRlbnRlZGl0YWJsZS0ke2luZGV4fWApKSB7XG4gICAgICAgICAgICAgICAgcmljaFRleHRNYXAuc2V0KGBjb250ZW50ZWRpdGFibGUtJHtpbmRleH1gLCBlZGl0b3IuaW5uZXJIVE1MKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgRm91bmQgY29udGVudGVkaXRhYmxlIGNvbnRlbnQ6YCwgZWRpdG9yLmlubmVySFRNTC5zdWJzdHJpbmcoMCwgMTAwKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc29sZS5sb2coYFRvdGFsIHJpY2ggdGV4dCBlbGVtZW50cyBmb3VuZDogJHtyaWNoVGV4dE1hcC5zaXplfWApO1xuICAgICAgICByZXR1cm4gcmljaFRleHRNYXA7XG4gICAgfTtcblxuICAgIC8vIFJlcGxhY2UgcmljaCB0ZXh0IHdpZGdldHMgaW4gdGhlIGNsb25lZCBlbGVtZW50XG4gICAgY29uc3QgcmVwbGFjZVJpY2hUZXh0V2lkZ2V0cyA9IChjbG9uZTogSFRNTEVsZW1lbnQsIHJpY2hUZXh0TWFwOiBNYXA8c3RyaW5nLCBzdHJpbmc+KSA9PiB7XG4gICAgICAgIC8vIEZpbmQgYWxsIHBvdGVudGlhbCByaWNoIHRleHQgY29udGFpbmVycyBpbiB0aGUgY2xvbmVcbiAgICAgICAgY29uc3QgY29udGFpbmVycyA9IFtcbiAgICAgICAgICAgIC4uLkFycmF5LmZyb20oY2xvbmUucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oJy5teC1uYW1lLXJpY2hUZXh0MScpKSxcbiAgICAgICAgICAgIC4uLkFycmF5LmZyb20oY2xvbmUucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oJy53aWRnZXQtcmljaC10ZXh0JykpLFxuICAgICAgICAgICAgLi4uQXJyYXkuZnJvbShjbG9uZS5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PignW2NsYXNzKj1cInJpY2hUZXh0XCJdJykpLFxuICAgICAgICAgICAgLi4uQXJyYXkuZnJvbShjbG9uZS5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PignLmZvcm0tZ3JvdXA6aGFzKC5xbC1lZGl0b3IpJykpLFxuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgbGV0IHJlcGxhY2VtZW50Q291bnQgPSAwO1xuICAgICAgICBcbiAgICAgICAgY29udGFpbmVycy5mb3JFYWNoKGNvbnRhaW5lciA9PiB7XG4gICAgICAgICAgICAvLyBUcnkgdG8gZmluZCBhbnkgcmljaCB0ZXh0IGNvbnRlbnQgZm9yIHRoaXMgY29udGFpbmVyXG4gICAgICAgICAgICBsZXQgY29udGVudEZvdW5kID0gZmFsc2U7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZpcnN0LCBjaGVjayBpZiB3ZSBoYXZlIGNvbnRlbnQgZnJvbSB0aGUgZXh0cmFjdGlvblxuICAgICAgICAgICAgZm9yIChjb25zdCBbIGNvbnRlbnRdIG9mIHJpY2hUZXh0TWFwLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgICAgIGlmICghY29udGVudEZvdW5kICYmIGNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGEgcmVwbGFjZW1lbnQgZGl2IHdpdGggdGhlIGNvbnRlbnRcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVwbGFjZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICAgICAgcmVwbGFjZW1lbnQuY2xhc3NOYW1lID0gJ214LXJpY2h0ZXh0LXByaW50ZWQnO1xuICAgICAgICAgICAgICAgICAgICByZXBsYWNlbWVudC5pbm5lckhUTUwgPSBgXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicmljaC10ZXh0LWxhYmVsXCI+UmljaCBUZXh0IENvbnRlbnQ6PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicmljaC10ZXh0LWNvbnRlbnRcIj4ke2NvbnRlbnR9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBSZXBsYWNlIHRoZSBlbnRpcmUgY29udGFpbmVyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb250YWluZXIucGFyZW50RWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyLnBhcmVudEVsZW1lbnQucmVwbGFjZUNoaWxkKHJlcGxhY2VtZW50LCBjb250YWluZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudEZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcGxhY2VtZW50Q291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBSZXBsYWNlZCBjb250YWluZXIgJHtyZXBsYWNlbWVudENvdW50fSB3aXRoIHJpY2ggdGV4dCBjb250ZW50YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSWYgbm8gY29udGVudCB3YXMgZm91bmQgaW4gdGhlIG1hcCwgdHJ5IHRvIGV4dHJhY3QgZGlyZWN0bHkgZnJvbSB0aGUgY2xvbmVcbiAgICAgICAgICAgIGlmICghY29udGVudEZvdW5kKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZWRpdG9yID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3I8SFRNTEVsZW1lbnQ+KCcucWwtZWRpdG9yJyk7XG4gICAgICAgICAgICAgICAgaWYgKGVkaXRvciAmJiBlZGl0b3IuaW5uZXJIVE1MKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlcGxhY2VtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICAgICAgICAgIHJlcGxhY2VtZW50LmNsYXNzTmFtZSA9ICdteC1yaWNodGV4dC1wcmludGVkJztcbiAgICAgICAgICAgICAgICAgICAgcmVwbGFjZW1lbnQuaW5uZXJIVE1MID0gYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInJpY2gtdGV4dC1sYWJlbFwiPlJpY2ggVGV4dCBDb250ZW50OjwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInJpY2gtdGV4dC1jb250ZW50XCI+JHtlZGl0b3IuaW5uZXJIVE1MfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRhaW5lci5wYXJlbnRFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXIucGFyZW50RWxlbWVudC5yZXBsYWNlQ2hpbGQocmVwbGFjZW1lbnQsIGNvbnRhaW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXBsYWNlbWVudENvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgUmVwbGFjZWQgY29udGFpbmVyICR7cmVwbGFjZW1lbnRDb3VudH0gd2l0aCBkaXJlY3RseSBleHRyYWN0ZWQgY29udGVudGApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBhbnkgcmVtYWluaW5nIFF1aWxsIFVJIGVsZW1lbnRzXG4gICAgICAgIGNsb25lLnF1ZXJ5U2VsZWN0b3JBbGwoJy5xbC10b29sYmFyLCAucWwtdG9vbHRpcCwgLndpZGdldC1yaWNoLXRleHQtdG9vbGJhciwgLndpZGdldC1yaWNoLXRleHQtZm9vdGVyJykuZm9yRWFjaChlbCA9PiB7XG4gICAgICAgICAgICBlbC5yZW1vdmUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBjb25zb2xlLmxvZyhgVG90YWwgY29udGFpbmVycyByZXBsYWNlZDogJHtyZXBsYWNlbWVudENvdW50fWApO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgbm8gcmVwbGFjZW1lbnRzIHdlcmUgbWFkZSwgaW5qZWN0IHRoZSBjb250ZW50IGF0IHRoZSBlbmRcbiAgICAgICAgaWYgKHJlcGxhY2VtZW50Q291bnQgPT09IDAgJiYgcmljaFRleHRNYXAuc2l6ZSA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGZhbGxiYWNrQ29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICBmYWxsYmFja0NvbnRhaW5lci5jbGFzc05hbWUgPSAncmljaC10ZXh0LWZhbGxiYWNrJztcbiAgICAgICAgICAgIGZhbGxiYWNrQ29udGFpbmVyLmlubmVySFRNTCA9ICc8aDM+UmljaCBUZXh0IENvbnRlbnQ6PC9oMz4nO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtjb250ZW50XSBvZiByaWNoVGV4dE1hcC5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoY29udGVudCkge1xuICAgICAgICAgICAgICAgICAgICBmYWxsYmFja0NvbnRhaW5lci5pbm5lckhUTUwgKz0gYDxkaXYgY2xhc3M9XCJteC1yaWNodGV4dC1wcmludGVkXCI+JHtjb250ZW50fTwvZGl2PmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjbG9uZS5hcHBlbmRDaGlsZChmYWxsYmFja0NvbnRhaW5lcik7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnQWRkZWQgcmljaCB0ZXh0IGNvbnRlbnQgYXMgZmFsbGJhY2sgYXQgdGhlIGVuZCBvZiBkb2N1bWVudCcpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IGNhcHR1cmVDb21wdXRlZFN0eWxlcyA9IChlbGVtZW50OiBIVE1MRWxlbWVudCk6IHN0cmluZyA9PiB7XG4gICAgICAgIGNvbnN0IGFsbEVsZW1lbnRzID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKCcqJyk7XG4gICAgICAgIGNvbnN0IHN0eWxlUnVsZXM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIFxuICAgICAgICBhbGxFbGVtZW50cy5mb3JFYWNoKChlbCwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNvbXB1dGVkID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoZWwpO1xuICAgICAgICAgICAgY29uc3QgY2xhc3NOYW1lID0gYGNhcHR1cmVkLXN0eWxlLSR7aW5kZXh9YDtcbiAgICAgICAgICAgIChlbCBhcyBIVE1MRWxlbWVudCkuY2xhc3NMaXN0LmFkZChjbGFzc05hbWUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBpbXBvcnRhbnRQcm9wcyA9IFtcbiAgICAgICAgICAgICAgICAnZGlzcGxheScsICdwb3NpdGlvbicsICd3aWR0aCcsICdoZWlnaHQnLCAnbWFyZ2luJywgJ3BhZGRpbmcnLFxuICAgICAgICAgICAgICAgICdib3JkZXInLCAnYmFja2dyb3VuZCcsICdjb2xvcicsICdmb250LWZhbWlseScsICdmb250LXNpemUnLFxuICAgICAgICAgICAgICAgICdmb250LXdlaWdodCcsICd0ZXh0LWFsaWduJywgJ2xpbmUtaGVpZ2h0JywgJ2Zsb2F0JywgJ2NsZWFyJyxcbiAgICAgICAgICAgICAgICAnZmxleCcsICdmbGV4LWRpcmVjdGlvbicsICdqdXN0aWZ5LWNvbnRlbnQnLCAnYWxpZ24taXRlbXMnLFxuICAgICAgICAgICAgICAgICdncmlkLXRlbXBsYXRlLWNvbHVtbnMnLCAnZ3JpZC10ZW1wbGF0ZS1yb3dzJywgJ2dhcCcsXG4gICAgICAgICAgICAgICAgJ3doaXRlLXNwYWNlJywgJ3dvcmQtYnJlYWsnLCAnd29yZC13cmFwJywgJ292ZXJmbG93LXdyYXAnXG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBzdHlsZXMgPSBpbXBvcnRhbnRQcm9wc1xuICAgICAgICAgICAgICAgIC5tYXAocHJvcCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gY29tcHV0ZWQuZ2V0UHJvcGVydHlWYWx1ZShwcm9wKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlICYmIHZhbHVlICE9PSAnbm9uZScgJiYgdmFsdWUgIT09ICdub3JtYWwnICYmIHZhbHVlICE9PSAnYXV0bycgXG4gICAgICAgICAgICAgICAgICAgICAgICA/IGAke3Byb3B9OiAke3ZhbHVlfTtgIFxuICAgICAgICAgICAgICAgICAgICAgICAgOiAnJztcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAgICAgICAgICAgICAuam9pbignICcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc3R5bGVzKSB7XG4gICAgICAgICAgICAgICAgc3R5bGVSdWxlcy5wdXNoKGAuJHtjbGFzc05hbWV9IHsgJHtzdHlsZXN9IH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gc3R5bGVSdWxlcy5qb2luKCdcXG4nKTtcbiAgICB9O1xuXG4gICAgY29uc3QgZ2VuZXJhdGVEb2N1bWVudCA9IHVzZUNhbGxiYWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgaWYgKGJ1c3kpIHJldHVybjtcbiAgICAgICAgc2V0QnVzeSh0cnVlKTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1N0YXJ0aW5nIFBERiBnZW5lcmF0aW9uLi4uJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEV4dHJhY3QgcmljaCB0ZXh0IGNvbnRlbnQgQkVGT1JFIGNsb25pbmdcbiAgICAgICAgICAgIGNvbnN0IHJpY2hUZXh0TWFwID0gZXh0cmFjdFJpY2hUZXh0Q29udGVudCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTbWFsbCBkZWxheSB0byBlbnN1cmUgYWxsIGNvbnRlbnQgaXMgcmVuZGVyZWRcbiAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDApKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgdGFyZ2V0Q2xhc3MgPSBwcm9wcy50YXJnZXRDbGFzcyB8fCAnbXgtcGFnZSc7XG4gICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGAuJHt0YXJnZXRDbGFzc31gKSBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCF0YXJnZXQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEVsZW1lbnQgd2l0aCBjbGFzcyAuJHt0YXJnZXRDbGFzc30gbm90IGZvdW5kYCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENsb25lIHRoZSB0YXJnZXRcbiAgICAgICAgICAgIGNvbnN0IGNsb25lID0gdGFyZ2V0LmNsb25lTm9kZSh0cnVlKSBhcyBIVE1MRWxlbWVudDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVwbGFjZSByaWNoIHRleHQgd2lkZ2V0cyB3aXRoIGV4dHJhY3RlZCBjb250ZW50XG4gICAgICAgICAgICByZXBsYWNlUmljaFRleHRXaWRnZXRzKGNsb25lLCByaWNoVGV4dE1hcCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEdldCBvcmlnaW5hbCBkaW1lbnNpb25zXG4gICAgICAgICAgICBjb25zdCByZWN0ID0gdGFyZ2V0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgY29uc3QgY29tcHV0ZWRTdHlsZSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRhcmdldCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFwcGx5IGFkZGl0aW9uYWwgcmljaCB0ZXh0IG1hcHBpbmdzIGZyb20gcHJvcHMgaWYgcHJvdmlkZWRcbiAgICAgICAgICAgIGNvbnN0IG1hcHBpbmdzID0gW1xuICAgICAgICAgICAgICAgIHsgc2VsZWN0b3I6IHByb3BzLnJpY2hTZWxlY3RvcjEgfHwgJycsIGh0bWw6IHByb3BzLnJpY2hIdG1sMT8udmFsdWUgfHwgJycgfSxcbiAgICAgICAgICAgICAgICB7IHNlbGVjdG9yOiBwcm9wcy5yaWNoU2VsZWN0b3IyIHx8ICcnLCBodG1sOiBwcm9wcy5yaWNoSHRtbDI/LnZhbHVlIHx8ICcnIH0sXG4gICAgICAgICAgICAgICAgeyBzZWxlY3RvcjogcHJvcHMucmljaFNlbGVjdG9yMyB8fCAnJywgaHRtbDogcHJvcHMucmljaEh0bWwzPy52YWx1ZSB8fCAnJyB9XG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICBtYXBwaW5ncy5mb3JFYWNoKG1hcCA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKG1hcC5zZWxlY3RvciAmJiBtYXAuaHRtbCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbGVtZW50cyA9IGNsb25lLnF1ZXJ5U2VsZWN0b3JBbGwobWFwLnNlbGVjdG9yKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2xlYW5IVE1MID0gc2FuaXRpemVIVE1MKG1hcC5odG1sKTtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudHMuZm9yRWFjaChlbCA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAoZWwgYXMgSFRNTEVsZW1lbnQpLmlubmVySFRNTCA9IGNsZWFuSFRNTDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIENhcHR1cmUgY29tcHV0ZWQgc3R5bGVzXG4gICAgICAgICAgICBjb25zdCBjYXB0dXJlZFN0eWxlcyA9IGNhcHR1cmVDb21wdXRlZFN0eWxlcyhjbG9uZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENsZWFuIHVwIHVud2FudGVkIGVsZW1lbnRzXG4gICAgICAgICAgICBjbG9uZS5xdWVyeVNlbGVjdG9yQWxsKCdidXR0b246bm90KC5rZWVwLWluLXBkZiksIC5wYWdpbmctc3RhdHVzLCAubXgtZ3JpZC1wYWdpbmdiYXInKS5mb3JFYWNoKGVsID0+IHtcbiAgICAgICAgICAgICAgICBlbC5yZW1vdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBHZXQgYWxsIHN0eWxlc2hlZXRzIGZyb20gdGhlIHBhZ2VcbiAgICAgICAgICAgIGNvbnN0IHN0eWxlU2hlZXRzID0gQXJyYXkuZnJvbShkb2N1bWVudC5zdHlsZVNoZWV0cyk7XG4gICAgICAgICAgICBsZXQgZXhpc3RpbmdTdHlsZXMgPSAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc3R5bGVTaGVldHMuZm9yRWFjaChzaGVldCA9PiB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcnVsZXMgPSBBcnJheS5mcm9tKHNoZWV0LmNzc1J1bGVzIHx8IHNoZWV0LnJ1bGVzIHx8IFtdKTtcbiAgICAgICAgICAgICAgICAgICAgcnVsZXMuZm9yRWFjaChydWxlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChydWxlIGluc3RhbmNlb2YgQ1NTU3R5bGVSdWxlICYmICFydWxlLnNlbGVjdG9yVGV4dD8uaW5jbHVkZXMoJ0BtZWRpYSBwcmludCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhpc3RpbmdTdHlsZXMgKz0gcnVsZS5jc3NUZXh0ICsgJ1xcbic7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ3Jvc3Mtb3JpZ2luIHN0eWxlc2hlZXRzIHdpbGwgdGhyb3dcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gQnVpbGQgdGhlIEhUTUwgZG9jdW1lbnRcbiAgICAgICAgICAgIGNvbnN0IGZpbGVOYW1lID0gcHJvcHMuZmlsZU5hbWU/LnZhbHVlIHx8ICdkb2N1bWVudCc7XG4gICAgICAgICAgICBjb25zdCBwYWdlTWFyZ2luID0gcHJvcHMucGFnZU1hcmdpbiB8fCAnMTBtbSc7XG4gICAgICAgICAgICBjb25zdCBmaWxlT3B0aW9uID0gcHJvcHMuZmlsZU9wdGlvbiB8fCAnZG93bmxvYWQnO1xuXG4gICAgICAgICAgICBjb25zdCBodG1sRG9jdW1lbnQgPSBgPCFET0NUWVBFIGh0bWw+XG48aHRtbCBsYW5nPVwiZW5cIj5cbjxoZWFkPlxuICAgIDxtZXRhIGNoYXJzZXQ9XCJVVEYtOFwiPlxuICAgIDxtZXRhIG5hbWU9XCJ2aWV3cG9ydFwiIGNvbnRlbnQ9XCJ3aWR0aD0ke3JlY3Qud2lkdGh9XCI+XG4gICAgPHRpdGxlPiR7ZmlsZU5hbWV9PC90aXRsZT5cbiAgICA8c3R5bGU+XG4gICAgICAgIC8qIFJlc2V0IGFuZCBiYXNlIHN0eWxlcyAqL1xuICAgICAgICAqIHtcbiAgICAgICAgICAgIG1hcmdpbjogMDtcbiAgICAgICAgICAgIHBhZGRpbmc6IDA7XG4gICAgICAgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBAcGFnZSB7XG4gICAgICAgICAgICBzaXplOiAke3JlY3Qud2lkdGggPiByZWN0LmhlaWdodCA/ICdBNCBsYW5kc2NhcGUnIDogJ0E0IHBvcnRyYWl0J307XG4gICAgICAgICAgICBtYXJnaW46ICR7cGFnZU1hcmdpbn07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGJvZHkge1xuICAgICAgICAgICAgbWFyZ2luOiAwO1xuICAgICAgICAgICAgcGFkZGluZzogMDtcbiAgICAgICAgICAgIHdpZHRoOiAke3JlY3Qud2lkdGh9cHg7XG4gICAgICAgICAgICBtaW4taGVpZ2h0OiAke3JlY3QuaGVpZ2h0fXB4O1xuICAgICAgICAgICAgZm9udC1mYW1pbHk6ICR7Y29tcHV0ZWRTdHlsZS5mb250RmFtaWx5IHx8ICctYXBwbGUtc3lzdGVtLCBCbGlua01hY1N5c3RlbUZvbnQsIFwiU2Vnb2UgVUlcIiwgQXJpYWwsIHNhbnMtc2VyaWYnfTtcbiAgICAgICAgICAgIGZvbnQtc2l6ZTogJHtjb21wdXRlZFN0eWxlLmZvbnRTaXplIHx8ICcxNHB4J307XG4gICAgICAgICAgICBsaW5lLWhlaWdodDogJHtjb21wdXRlZFN0eWxlLmxpbmVIZWlnaHQgfHwgJzEuNSd9O1xuICAgICAgICAgICAgY29sb3I6ICR7Y29tcHV0ZWRTdHlsZS5jb2xvciB8fCAnIzAwMDAwMCd9O1xuICAgICAgICAgICAgYmFja2dyb3VuZDogJHtjb21wdXRlZFN0eWxlLmJhY2tncm91bmRDb2xvciB8fCAnI2ZmZmZmZid9O1xuICAgICAgICAgICAgLXdlYmtpdC1wcmludC1jb2xvci1hZGp1c3Q6IGV4YWN0O1xuICAgICAgICAgICAgcHJpbnQtY29sb3ItYWRqdXN0OiBleGFjdDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLyogUHJlc2VydmUgb3JpZ2luYWwgc3R5bGVzICovXG4gICAgICAgICR7ZXhpc3RpbmdTdHlsZXN9XG4gICAgICAgIFxuICAgICAgICAvKiBDYXB0dXJlZCBjb21wdXRlZCBzdHlsZXMgKi9cbiAgICAgICAgJHtjYXB0dXJlZFN0eWxlc31cbiAgICAgICAgXG4gICAgICAgIC8qIFJpY2ggdGV4dCBwcmludGluZyBzdHlsZXMgKi9cbiAgICAgICAgLm14LXJpY2h0ZXh0LXByaW50ZWQge1xuICAgICAgICAgICAgZGlzcGxheTogYmxvY2sgIWltcG9ydGFudDtcbiAgICAgICAgICAgIG1hcmdpbjogMjBweCAwICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBwYWRkaW5nOiAxNXB4ICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBib3JkZXI6IDFweCBzb2xpZCAjZGRkICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBiYWNrZ3JvdW5kOiAjZjlmOWY5ICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBib3JkZXItcmFkaXVzOiA0cHggIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLnJpY2gtdGV4dC1sYWJlbCB7XG4gICAgICAgICAgICBmb250LXdlaWdodDogYm9sZCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgbWFyZ2luLWJvdHRvbTogMTBweCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgY29sb3I6ICMzMzMgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLnJpY2gtdGV4dC1jb250ZW50IHtcbiAgICAgICAgICAgIHdoaXRlLXNwYWNlOiBwcmUtd3JhcCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgd29yZC1icmVhazogYnJlYWstd29yZCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgb3ZlcmZsb3ctd3JhcDogYnJlYWstd29yZCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgZm9udC1mYW1pbHk6IGluaGVyaXQgIWltcG9ydGFudDtcbiAgICAgICAgICAgIGxpbmUtaGVpZ2h0OiAxLjYgIWltcG9ydGFudDtcbiAgICAgICAgICAgIGNvbG9yOiAjMDAwICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC5qc29uLWZvcm1hdHRlZCB7XG4gICAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjZjVmNWY1ICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBib3JkZXI6IDFweCBzb2xpZCAjY2NjICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBib3JkZXItcmFkaXVzOiAzcHggIWltcG9ydGFudDtcbiAgICAgICAgICAgIHBhZGRpbmc6IDEwcHggIWltcG9ydGFudDtcbiAgICAgICAgICAgIG1hcmdpbjogMTBweCAwICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC5qc29uLWZvcm1hdHRlZCBwcmUge1xuICAgICAgICAgICAgd2hpdGUtc3BhY2U6IHByZS13cmFwICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICB3b3JkLWJyZWFrOiBicmVhay1hbGwgIWltcG9ydGFudDtcbiAgICAgICAgICAgIGZvbnQtZmFtaWx5OiAnQ291cmllciBOZXcnLCBDb3VyaWVyLCBtb25vc3BhY2UgIWltcG9ydGFudDtcbiAgICAgICAgICAgIGZvbnQtc2l6ZTogMTJweCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgbWFyZ2luOiAwICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBjb2xvcjogIzAwMCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAucmljaC10ZXh0LWZhbGxiYWNrIHtcbiAgICAgICAgICAgIG1hcmdpbi10b3A6IDMwcHggIWltcG9ydGFudDtcbiAgICAgICAgICAgIHBhZGRpbmc6IDIwcHggIWltcG9ydGFudDtcbiAgICAgICAgICAgIGJvcmRlci10b3A6IDJweCBzb2xpZCAjZGRkICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC5yaWNoLXRleHQtZmFsbGJhY2sgaDMge1xuICAgICAgICAgICAgbWFyZ2luLWJvdHRvbTogMTVweCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgY29sb3I6ICMzMzMgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLyogRW5zdXJlIHJpY2ggdGV4dCBmb3JtYXR0aW5nIGlzIHByZXNlcnZlZCAqL1xuICAgICAgICAubXgtcmljaHRleHQtcHJpbnRlZCBwLFxuICAgICAgICAucmljaC10ZXh0LWNvbnRlbnQgcCB7XG4gICAgICAgICAgICBtYXJnaW46IDAgMCAxMHB4IDAgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLm14LXJpY2h0ZXh0LXByaW50ZWQgdWwsIC5teC1yaWNodGV4dC1wcmludGVkIG9sLFxuICAgICAgICAucmljaC10ZXh0LWNvbnRlbnQgdWwsIC5yaWNoLXRleHQtY29udGVudCBvbCB7XG4gICAgICAgICAgICBtYXJnaW46IDAgMCAxMHB4IDIwcHggIWltcG9ydGFudDtcbiAgICAgICAgICAgIHBhZGRpbmctbGVmdDogMjBweCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAubXgtcmljaHRleHQtcHJpbnRlZCBsaSxcbiAgICAgICAgLnJpY2gtdGV4dC1jb250ZW50IGxpIHtcbiAgICAgICAgICAgIG1hcmdpbjogMCAwIDVweCAwICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC5teC1yaWNodGV4dC1wcmludGVkIHN0cm9uZywgLm14LXJpY2h0ZXh0LXByaW50ZWQgYixcbiAgICAgICAgLnJpY2gtdGV4dC1jb250ZW50IHN0cm9uZywgLnJpY2gtdGV4dC1jb250ZW50IGIge1xuICAgICAgICAgICAgZm9udC13ZWlnaHQ6IGJvbGQgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLm14LXJpY2h0ZXh0LXByaW50ZWQgZW0sIC5teC1yaWNodGV4dC1wcmludGVkIGksXG4gICAgICAgIC5yaWNoLXRleHQtY29udGVudCBlbSwgLnJpY2gtdGV4dC1jb250ZW50IGkge1xuICAgICAgICAgICAgZm9udC1zdHlsZTogaXRhbGljICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8qIFRhYmxlIHN0eWxlcyAqL1xuICAgICAgICB0YWJsZSB7XG4gICAgICAgICAgICB3aWR0aDogMTAwJSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgYm9yZGVyLWNvbGxhcHNlOiBjb2xsYXBzZSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgcGFnZS1icmVhay1pbnNpZGU6IGF1dG8gIWltcG9ydGFudDtcbiAgICAgICAgICAgIG1hcmdpbjogMTBweCAwICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoZWFkIHtcbiAgICAgICAgICAgIGRpc3BsYXk6IHRhYmxlLWhlYWRlci1ncm91cCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0Ym9keSB7XG4gICAgICAgICAgICBkaXNwbGF5OiB0YWJsZS1yb3ctZ3JvdXAgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdHIge1xuICAgICAgICAgICAgcGFnZS1icmVhay1pbnNpZGU6IGF2b2lkICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoLCB0ZCB7XG4gICAgICAgICAgICBwYWRkaW5nOiA4cHggIWltcG9ydGFudDtcbiAgICAgICAgICAgIGJvcmRlcjogMXB4IHNvbGlkICNkZGQgIWltcG9ydGFudDtcbiAgICAgICAgICAgIHRleHQtYWxpZ246IGxlZnQgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGgge1xuICAgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogI2Y1ZjVmNSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgZm9udC13ZWlnaHQ6IGJvbGQgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLyogSGlkZSB1bndhbnRlZCBlbGVtZW50cyAqL1xuICAgICAgICAubm8tcHJpbnQsXG4gICAgICAgIGJ1dHRvbjpub3QoLnByaW50LWJ1dHRvbiksXG4gICAgICAgIGlucHV0W3R5cGU9XCJidXR0b25cIl0sXG4gICAgICAgIGlucHV0W3R5cGU9XCJzdWJtaXRcIl0sXG4gICAgICAgIC5teC1idXR0b246bm90KC5wcmludC1idXR0b24pLFxuICAgICAgICAuYnRuOm5vdCgucHJpbnQtYnV0dG9uKSxcbiAgICAgICAgLnFsLXRvb2xiYXIsXG4gICAgICAgIC5xbC10b29sdGlwLFxuICAgICAgICAucWwtdGFibGUtbWVudXMtY29udGFpbmVyLFxuICAgICAgICAud2lkZ2V0LXJpY2gtdGV4dC10b29sYmFyLFxuICAgICAgICAud2lkZ2V0LXJpY2gtdGV4dC1mb290ZXIge1xuICAgICAgICAgICAgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvKiBNZW5kaXgtc3BlY2lmaWMgcHJlc2VydmF0aW9ucyAqL1xuICAgICAgICAubXgtbGF5b3V0Z3JpZC1yb3cge1xuICAgICAgICAgICAgZGlzcGxheTogZmxleCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgZmxleC13cmFwOiB3cmFwICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC5teC1sYXlvdXRncmlkLWNvbCB7XG4gICAgICAgICAgICBmbGV4OiAwIDAgYXV0byAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAubXgtY29udGFpbmVyLFxuICAgICAgICAubXgtc2Nyb2xsY29udGFpbmVyLXdyYXBwZXIge1xuICAgICAgICAgICAgd2lkdGg6IDEwMCUgIWltcG9ydGFudDtcbiAgICAgICAgICAgIG92ZXJmbG93OiB2aXNpYmxlICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIEBtZWRpYSBwcmludCB7XG4gICAgICAgICAgICBib2R5IHtcbiAgICAgICAgICAgICAgICB3aWR0aDogMTAwJSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgICAgIG1hcmdpbjogMCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgICAgIHBhZGRpbmc6ICR7cGFnZU1hcmdpbn0gIWltcG9ydGFudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgKiB7XG4gICAgICAgICAgICAgICAgb3ZlcmZsb3c6IHZpc2libGUgIWltcG9ydGFudDtcbiAgICAgICAgICAgICAgICBtYXgtaGVpZ2h0OiBub25lICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC5teC1yaWNodGV4dC1wcmludGVkIHtcbiAgICAgICAgICAgICAgICBwYWdlLWJyZWFrLWluc2lkZTogYXZvaWQgIWltcG9ydGFudDtcbiAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiB3aGl0ZSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgPC9zdHlsZT5cbjwvaGVhZD5cbjxib2R5PlxuICAgIDxkaXYgY2xhc3M9XCJwZGYtY29udGVudC13cmFwcGVyXCIgc3R5bGU9XCJ3aWR0aDogJHtyZWN0LndpZHRofXB4O1wiPlxuICAgICAgICAke2Nsb25lLmlubmVySFRNTH1cbiAgICA8L2Rpdj5cbjwvYm9keT5cbjwvaHRtbD5gO1xuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnSFRNTCBkb2N1bWVudCBwcmVwYXJlZCBmb3IgUERGJyk7XG5cbiAgICAgICAgICAgIC8vIENvbnZlcnQgdG8gYmFzZTY0XG4gICAgICAgICAgICBjb25zdCB0b0Jhc2U2NEluQ2h1bmtzID0gKHU4YTogVWludDhBcnJheSk6IHN0cmluZyA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgQ0hVTktfU0laRSA9IDgxOTI7XG4gICAgICAgICAgICAgICAgbGV0IGJpblN0cmluZyA9IFwiXCI7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB1OGEubGVuZ3RoOyBpICs9IENIVU5LX1NJWkUpIHtcbiAgICAgICAgICAgICAgICAgICAgYmluU3RyaW5nICs9IFN0cmluZy5mcm9tQ29kZVBvaW50KC4uLnU4YS5zdWJhcnJheShpLCBpICsgQ0hVTktfU0laRSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYnRvYShiaW5TdHJpbmcpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNvbnN0IGJhc2U2NCA9IHRvQmFzZTY0SW5DaHVua3MobmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKGh0bWxEb2N1bWVudCkpO1xuICAgICAgICAgICAgY29uc3QgY2xlYW5GaWxlTmFtZSA9IGZpbGVOYW1lLnJlcGxhY2UoL1tcXC86Kj9cIjw+fF0rL2csICdfJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChwcm9wcy5wZGZOYW1lQXR0cj8uc2V0VmFsdWUpIHtcbiAgICAgICAgICAgICAgICBwcm9wcy5wZGZOYW1lQXR0ci5zZXRWYWx1ZShjbGVhbkZpbGVOYW1lICsgJy5wZGYnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHByb3BzLmJhc2U2NEF0dHI/LnNldFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgcHJvcHMuYmFzZTY0QXR0ci5zZXRWYWx1ZShiYXNlNjQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBIYW5kbGUgb3V0cHV0XG4gICAgICAgICAgICBpZiAoZmlsZU9wdGlvbiA9PT0gJ2Jhc2U2NCcpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRG9jdW1lbnQgc3RvcmVkIGFzIGJhc2U2NCcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChmaWxlT3B0aW9uID09PSAncHJldmlldycpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcmludFdpbmRvdyA9IHdpbmRvdy5vcGVuKCcnLCAnX2JsYW5rJywgYHdpZHRoPSR7TWF0aC5taW4ocmVjdC53aWR0aCArIDEwMCwgMTIwMCl9LGhlaWdodD04MDBgKTtcbiAgICAgICAgICAgICAgICBpZiAocHJpbnRXaW5kb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRXaW5kb3cuZG9jdW1lbnQub3BlbigpO1xuICAgICAgICAgICAgICAgICAgICBwcmludFdpbmRvdy5kb2N1bWVudC53cml0ZShodG1sRG9jdW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICBwcmludFdpbmRvdy5kb2N1bWVudC5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICBwcmludFdpbmRvdy5vbmxvYWQgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHByaW50V2luZG93LnByaW50KCksIDI1MCk7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBQcmludCB1c2luZyBpZnJhbWVcbiAgICAgICAgICAgICAgICBjb25zdCBwcmludEZyYW1lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaWZyYW1lJyk7XG4gICAgICAgICAgICAgICAgcHJpbnRGcmFtZS5zdHlsZS5jc3NUZXh0ID0gJ3Bvc2l0aW9uOmFic29sdXRlO3dpZHRoOjA7aGVpZ2h0OjA7Ym9yZGVyOjA7bGVmdDotOTk5OXB4JztcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHByaW50RnJhbWUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IGZyYW1lRG9jID0gcHJpbnRGcmFtZS5jb250ZW50RG9jdW1lbnQgfHwgcHJpbnRGcmFtZS5jb250ZW50V2luZG93Py5kb2N1bWVudDtcbiAgICAgICAgICAgICAgICBpZiAoZnJhbWVEb2MpIHtcbiAgICAgICAgICAgICAgICAgICAgZnJhbWVEb2Mub3BlbigpO1xuICAgICAgICAgICAgICAgICAgICBmcmFtZURvYy53cml0ZShodG1sRG9jdW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICBmcmFtZURvYy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmludEZyYW1lLmNvbnRlbnRXaW5kb3c/LmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmludEZyYW1lLmNvbnRlbnRXaW5kb3c/LnByaW50KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZG9jdW1lbnQuYm9keS5jb250YWlucyhwcmludEZyYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHByaW50RnJhbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIDEwMDApO1xuICAgICAgICAgICAgICAgICAgICB9LCAyNTApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHByb3BzLm9uQ2hhbmdlPy5jYW5FeGVjdXRlICYmIHByb3BzLm9uQ2hhbmdlPy5leGVjdXRlKSB7XG4gICAgICAgICAgICAgICAgcHJvcHMub25DaGFuZ2UuZXhlY3V0ZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdQREYgZ2VuZXJhdGlvbiBlcnJvcjonLCBlcnJvcik7XG4gICAgICAgICAgICBhbGVydCgnRmFpbGVkIHRvIGdlbmVyYXRlIFBERi4gQ2hlY2sgdGhlIGJyb3dzZXIgY29uc29sZSBmb3IgZGV0YWlscy4nKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIHNldEJ1c3koZmFsc2UpO1xuICAgICAgICB9XG4gICAgfSwgW2J1c3ksIHByb3BzXSk7XG5cbiAgICBpZiAocHJvcHMuaGlkZUJ1dHRvbiA9PT0gdHJ1ZSkgcmV0dXJuIDxGcmFnbWVudCAvPjtcblxuICAgIGNvbnN0IGJ1dHRvbkNsYXNzTmFtZSA9IHByb3BzLmJ1dHRvbkNsYXNzIHx8ICdidG4gYnRuLXByaW1hcnknO1xuICAgIGNvbnN0IGJ1dHRvblRleHQgPSBwcm9wcy5idXR0b25DYXB0aW9uPy52YWx1ZSB8fCAnRXhwb3J0IHRvIFBERic7XG5cbiAgICByZXR1cm4gKFxuICAgICAgICA8YnV0dG9uIGNsYXNzTmFtZT17YnV0dG9uQ2xhc3NOYW1lfSBkaXNhYmxlZD17YnVzeX0gb25DbGljaz17Z2VuZXJhdGVEb2N1bWVudH0+XG4gICAgICAgICAgICB7YnVzeSA/IFwiR2VuZXJhdGluZy4uLlwiIDogYnV0dG9uVGV4dH1cbiAgICAgICAgPC9idXR0b24+XG4gICAgKTtcbn0iXSwibmFtZXMiOlsidXNlU3RhdGUiLCJ1c2VDYWxsYmFjayIsImNyZWF0ZUVsZW1lbnQiLCJGcmFnbWVudCJdLCJtYXBwaW5ncyI6Ijs7SUFHTSxTQUFVLGtCQUFrQixDQUFDLEtBQXVDLEVBQUE7UUFDdEUsTUFBTSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsR0FBR0EsY0FBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRXhDLElBQUEs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
