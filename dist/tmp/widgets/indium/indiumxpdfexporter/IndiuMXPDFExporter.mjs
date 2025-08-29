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
    const generateDocument = useCallback(async () => {
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
        return createElement(Fragment, null);
    const buttonClassName = props.buttonClass || 'btn btn-primary';
    const buttonText = props.buttonCaption?.value || 'Export to PDF';
    return (createElement("button", { className: buttonClassName, disabled: busy, onClick: generateDocument }, busy ? "Generating..." : buttonText));
}

export { IndiuMXPDFExporter };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSW5kaXVNWFBERkV4cG9ydGVyLm1qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL0luZGl1TVhQREZFeHBvcnRlci50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3JlYXRlRWxlbWVudCwgRnJhZ21lbnQsIHVzZUNhbGxiYWNrLCB1c2VTdGF0ZSB9IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IHsgSW5kaXVNWFBERkV4cG9ydGVyQ29udGFpbmVyUHJvcHMgfSBmcm9tIFwiLi4vdHlwaW5ncy9JbmRpdU1YUERGRXhwb3J0ZXJQcm9wc1wiO1xuXG5leHBvcnQgZnVuY3Rpb24gSW5kaXVNWFBERkV4cG9ydGVyKHByb3BzOiBJbmRpdU1YUERGRXhwb3J0ZXJDb250YWluZXJQcm9wcyk6IEpTWC5FbGVtZW50IHtcbiAgICBjb25zdCBbYnVzeSwgc2V0QnVzeV0gPSB1c2VTdGF0ZShmYWxzZSk7XG5cbiAgICBjb25zdCBzYW5pdGl6ZUhUTUwgPSAoaHRtbDogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICAgICAgY29uc3QgdGVtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICB0ZW1wLmlubmVySFRNTCA9IGh0bWw7XG4gICAgICAgIGNvbnN0IGRhbmdlcm91c0VsZW1lbnRzID0gdGVtcC5xdWVyeVNlbGVjdG9yQWxsKCdzY3JpcHQsIHN0eWxlW2RhdGEtcmVtb3ZlXSwgaWZyYW1lLCBvYmplY3QsIGVtYmVkLCBmb3JtJyk7XG4gICAgICAgIGRhbmdlcm91c0VsZW1lbnRzLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xuICAgICAgICBjb25zdCBhbGxFbGVtZW50cyA9IHRlbXAucXVlcnlTZWxlY3RvckFsbCgnKicpO1xuICAgICAgICBhbGxFbGVtZW50cy5mb3JFYWNoKGVsID0+IHtcbiAgICAgICAgICAgIEFycmF5LmZyb20oZWwuYXR0cmlidXRlcykuZm9yRWFjaChhdHRyID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoYXR0ci5uYW1lLnN0YXJ0c1dpdGgoJ29uJykgfHwgKGF0dHIubmFtZSA9PT0gJ2hyZWYnICYmIGF0dHIudmFsdWUuc3RhcnRzV2l0aCgnamF2YXNjcmlwdDonKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKGF0dHIubmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGVtcC5pbm5lckhUTUw7XG4gICAgfTtcblxuICAgIC8vIEVuaGFuY2VkIGZ1bmN0aW9uIHRvIGV4dHJhY3QgYW5kIHByZXNlcnZlIHJpY2ggdGV4dCBjb250ZW50XG4gICAgY29uc3QgZXh0cmFjdFJpY2hUZXh0Q29udGVudCA9ICgpOiBNYXA8c3RyaW5nLCBzdHJpbmc+ID0+IHtcbiAgICAgICAgY29uc3QgcmljaFRleHRNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICAgICAgICBcbiAgICAgICAgLy8gVHJ5IG11bHRpcGxlIHNlbGVjdG9ycyB0byBmaW5kIHJpY2ggdGV4dCB3aWRnZXRzXG4gICAgICAgIGNvbnN0IHNlbGVjdG9ycyA9IFtcbiAgICAgICAgICAgICcubXgtbmFtZS1yaWNoVGV4dDEgLnFsLWVkaXRvcicsXG4gICAgICAgICAgICAnLndpZGdldC1yaWNoLXRleHQgLnFsLWVkaXRvcicsXG4gICAgICAgICAgICAnW2NsYXNzKj1cInJpY2hUZXh0XCJdIC5xbC1lZGl0b3InLFxuICAgICAgICAgICAgJy5xbC1jb250YWluZXIgLnFsLWVkaXRvcicsXG4gICAgICAgICAgICAnLndpZGdldC1yaWNoLXRleHQtY29udGFpbmVyIC5xbC1lZGl0b3InXG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICBzZWxlY3RvcnMuZm9yRWFjaChzZWxlY3RvciA9PiB7XG4gICAgICAgICAgICBjb25zdCBlZGl0b3JzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oc2VsZWN0b3IpO1xuICAgICAgICAgICAgZWRpdG9ycy5mb3JFYWNoKChlZGl0b3IsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVkaXRvciAmJiBlZGl0b3IuaW5uZXJIVE1MKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IGAke3NlbGVjdG9yfS0ke2luZGV4fWA7XG4gICAgICAgICAgICAgICAgICAgIGxldCBjb250ZW50ID0gZWRpdG9yLmlubmVySFRNTDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEFsc28gdHJ5IHRvIGdldCB0ZXh0IGNvbnRlbnQgaWYgaW5uZXJIVE1MIGxvb2tzIGxpa2UgcGxhaW4gdGV4dFxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXh0Q29udGVudCA9IGVkaXRvci50ZXh0Q29udGVudCB8fCBlZGl0b3IuaW5uZXJUZXh0IHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgY29udGVudCBpcyBKU09OIGFuZCBmb3JtYXQgaXRcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRleHRDb250ZW50LnRyaW0oKS5zdGFydHNXaXRoKCd7JykgJiYgdGV4dENvbnRlbnQudHJpbSgpLmVuZHNXaXRoKCd9JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZSh0ZXh0Q29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCA9IGA8ZGl2IGNsYXNzPVwianNvbi1mb3JtYXR0ZWRcIj48cHJlPiR7SlNPTi5zdHJpbmdpZnkocGFyc2VkLCBudWxsLCAyKX08L3ByZT48L2Rpdj5gO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5vdCB2YWxpZCBKU09OLCB1c2Ugb3JpZ2luYWwgSFRNTFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByaWNoVGV4dE1hcC5zZXQoa2V5LCBjb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYEZvdW5kIHJpY2ggdGV4dCBjb250ZW50IGF0ICR7c2VsZWN0b3J9OmAsIGNvbnRlbnQuc3Vic3RyaW5nKDAsIDEwMCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFsc28gbG9vayBmb3IgY29udGVudGVkaXRhYmxlIGVsZW1lbnRzXG4gICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KCdbY29udGVudGVkaXRhYmxlPVwidHJ1ZVwiXScpLmZvckVhY2goKGVkaXRvciwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGlmIChlZGl0b3IgJiYgZWRpdG9yLmlubmVySFRNTCAmJiAhcmljaFRleHRNYXAuaGFzKGBjb250ZW50ZWRpdGFibGUtJHtpbmRleH1gKSkge1xuICAgICAgICAgICAgICAgIHJpY2hUZXh0TWFwLnNldChgY29udGVudGVkaXRhYmxlLSR7aW5kZXh9YCwgZWRpdG9yLmlubmVySFRNTCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYEZvdW5kIGNvbnRlbnRlZGl0YWJsZSBjb250ZW50OmAsIGVkaXRvci5pbm5lckhUTUwuc3Vic3RyaW5nKDAsIDEwMCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnNvbGUubG9nKGBUb3RhbCByaWNoIHRleHQgZWxlbWVudHMgZm91bmQ6ICR7cmljaFRleHRNYXAuc2l6ZX1gKTtcbiAgICAgICAgcmV0dXJuIHJpY2hUZXh0TWFwO1xuICAgIH07XG5cbiAgICAvLyBSZXBsYWNlIHJpY2ggdGV4dCB3aWRnZXRzIGluIHRoZSBjbG9uZWQgZWxlbWVudFxuICAgIGNvbnN0IHJlcGxhY2VSaWNoVGV4dFdpZGdldHMgPSAoY2xvbmU6IEhUTUxFbGVtZW50LCByaWNoVGV4dE1hcDogTWFwPHN0cmluZywgc3RyaW5nPikgPT4ge1xuICAgICAgICAvLyBGaW5kIGFsbCBwb3RlbnRpYWwgcmljaCB0ZXh0IGNvbnRhaW5lcnMgaW4gdGhlIGNsb25lXG4gICAgICAgIGNvbnN0IGNvbnRhaW5lcnMgPSBbXG4gICAgICAgICAgICAuLi5BcnJheS5mcm9tKGNsb25lLnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KCcubXgtbmFtZS1yaWNoVGV4dDEnKSksXG4gICAgICAgICAgICAuLi5BcnJheS5mcm9tKGNsb25lLnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KCcud2lkZ2V0LXJpY2gtdGV4dCcpKSxcbiAgICAgICAgICAgIC4uLkFycmF5LmZyb20oY2xvbmUucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oJ1tjbGFzcyo9XCJyaWNoVGV4dFwiXScpKSxcbiAgICAgICAgICAgIC4uLkFycmF5LmZyb20oY2xvbmUucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oJy5mb3JtLWdyb3VwOmhhcygucWwtZWRpdG9yKScpKSxcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIGxldCByZXBsYWNlbWVudENvdW50ID0gMDtcbiAgICAgICAgXG4gICAgICAgIGNvbnRhaW5lcnMuZm9yRWFjaChjb250YWluZXIgPT4ge1xuICAgICAgICAgICAgLy8gVHJ5IHRvIGZpbmQgYW55IHJpY2ggdGV4dCBjb250ZW50IGZvciB0aGlzIGNvbnRhaW5lclxuICAgICAgICAgICAgbGV0IGNvbnRlbnRGb3VuZCA9IGZhbHNlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGaXJzdCwgY2hlY2sgaWYgd2UgaGF2ZSBjb250ZW50IGZyb20gdGhlIGV4dHJhY3Rpb25cbiAgICAgICAgICAgIGZvciAoY29uc3QgWyBjb250ZW50XSBvZiByaWNoVGV4dE1hcC5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWNvbnRlbnRGb3VuZCAmJiBjb250ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBhIHJlcGxhY2VtZW50IGRpdiB3aXRoIHRoZSBjb250ZW50XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlcGxhY2VtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICAgICAgICAgIHJlcGxhY2VtZW50LmNsYXNzTmFtZSA9ICdteC1yaWNodGV4dC1wcmludGVkJztcbiAgICAgICAgICAgICAgICAgICAgcmVwbGFjZW1lbnQuaW5uZXJIVE1MID0gYFxuXG4gICAgICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBSZXBsYWNlIHRoZSBlbnRpcmUgY29udGFpbmVyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb250YWluZXIucGFyZW50RWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyLnBhcmVudEVsZW1lbnQucmVwbGFjZUNoaWxkKHJlcGxhY2VtZW50LCBjb250YWluZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudEZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcGxhY2VtZW50Q291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBSZXBsYWNlZCBjb250YWluZXIgJHtyZXBsYWNlbWVudENvdW50fSB3aXRoIHJpY2ggdGV4dCBjb250ZW50YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSWYgbm8gY29udGVudCB3YXMgZm91bmQgaW4gdGhlIG1hcCwgdHJ5IHRvIGV4dHJhY3QgZGlyZWN0bHkgZnJvbSB0aGUgY2xvbmVcbiAgICAgICAgICAgIGlmICghY29udGVudEZvdW5kKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZWRpdG9yID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3I8SFRNTEVsZW1lbnQ+KCcucWwtZWRpdG9yJyk7XG4gICAgICAgICAgICAgICAgaWYgKGVkaXRvciAmJiBlZGl0b3IuaW5uZXJIVE1MKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlcGxhY2VtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICAgICAgICAgIHJlcGxhY2VtZW50LmNsYXNzTmFtZSA9ICdteC1yaWNodGV4dC1wcmludGVkJztcbiAgICAgICAgICAgICAgICAgICAgcmVwbGFjZW1lbnQuaW5uZXJIVE1MID0gYFxuXG4gICAgICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoY29udGFpbmVyLnBhcmVudEVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lci5wYXJlbnRFbGVtZW50LnJlcGxhY2VDaGlsZChyZXBsYWNlbWVudCwgY29udGFpbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcGxhY2VtZW50Q291bnQrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBSZXBsYWNlZCBjb250YWluZXIgJHtyZXBsYWNlbWVudENvdW50fSB3aXRoIGRpcmVjdGx5IGV4dHJhY3RlZCBjb250ZW50YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGFueSByZW1haW5pbmcgUXVpbGwgVUkgZWxlbWVudHNcbiAgICAgICAgY2xvbmUucXVlcnlTZWxlY3RvckFsbCgnLnFsLXRvb2xiYXIsIC5xbC10b29sdGlwLCAud2lkZ2V0LXJpY2gtdGV4dC10b29sYmFyLCAud2lkZ2V0LXJpY2gtdGV4dC1mb290ZXInKS5mb3JFYWNoKGVsID0+IHtcbiAgICAgICAgICAgIGVsLnJlbW92ZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnNvbGUubG9nKGBUb3RhbCBjb250YWluZXJzIHJlcGxhY2VkOiAke3JlcGxhY2VtZW50Q291bnR9YCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBubyByZXBsYWNlbWVudHMgd2VyZSBtYWRlLCBpbmplY3QgdGhlIGNvbnRlbnQgYXQgdGhlIGVuZFxuICAgICAgICBpZiAocmVwbGFjZW1lbnRDb3VudCA9PT0gMCAmJiByaWNoVGV4dE1hcC5zaXplID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZmFsbGJhY2tDb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIGZhbGxiYWNrQ29udGFpbmVyLmNsYXNzTmFtZSA9ICdyaWNoLXRleHQtZmFsbGJhY2snO1xuICBcbiAgICAgICAgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNsb25lLmFwcGVuZENoaWxkKGZhbGxiYWNrQ29udGFpbmVyKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdBZGRlZCByaWNoIHRleHQgY29udGVudCBhcyBmYWxsYmFjayBhdCB0aGUgZW5kIG9mIGRvY3VtZW50Jyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgY2FwdHVyZUNvbXB1dGVkU3R5bGVzID0gKGVsZW1lbnQ6IEhUTUxFbGVtZW50KTogc3RyaW5nID0+IHtcbiAgICAgICAgY29uc3QgYWxsRWxlbWVudHMgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJyonKTtcbiAgICAgICAgY29uc3Qgc3R5bGVSdWxlczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgXG4gICAgICAgIGFsbEVsZW1lbnRzLmZvckVhY2goKGVsLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY29tcHV0ZWQgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShlbCk7XG4gICAgICAgICAgICBjb25zdCBjbGFzc05hbWUgPSBgY2FwdHVyZWQtc3R5bGUtJHtpbmRleH1gO1xuICAgICAgICAgICAgKGVsIGFzIEhUTUxFbGVtZW50KS5jbGFzc0xpc3QuYWRkKGNsYXNzTmFtZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGltcG9ydGFudFByb3BzID0gW1xuICAgICAgICAgICAgICAgICdkaXNwbGF5JywgJ3Bvc2l0aW9uJywgJ3dpZHRoJywgJ2hlaWdodCcsICdtYXJnaW4nLCAncGFkZGluZycsXG4gICAgICAgICAgICAgICAgJ2JvcmRlcicsICdiYWNrZ3JvdW5kJywgJ2NvbG9yJywgJ2ZvbnQtZmFtaWx5JywgJ2ZvbnQtc2l6ZScsXG4gICAgICAgICAgICAgICAgJ2ZvbnQtd2VpZ2h0JywgJ3RleHQtYWxpZ24nLCAnbGluZS1oZWlnaHQnLCAnZmxvYXQnLCAnY2xlYXInLFxuICAgICAgICAgICAgICAgICdmbGV4JywgJ2ZsZXgtZGlyZWN0aW9uJywgJ2p1c3RpZnktY29udGVudCcsICdhbGlnbi1pdGVtcycsXG4gICAgICAgICAgICAgICAgJ2dyaWQtdGVtcGxhdGUtY29sdW1ucycsICdncmlkLXRlbXBsYXRlLXJvd3MnLCAnZ2FwJyxcbiAgICAgICAgICAgICAgICAnd2hpdGUtc3BhY2UnLCAnd29yZC1icmVhaycsICd3b3JkLXdyYXAnLCAnb3ZlcmZsb3ctd3JhcCdcbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHN0eWxlcyA9IGltcG9ydGFudFByb3BzXG4gICAgICAgICAgICAgICAgLm1hcChwcm9wID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBjb21wdXRlZC5nZXRQcm9wZXJ0eVZhbHVlKHByb3ApO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUgJiYgdmFsdWUgIT09ICdub25lJyAmJiB2YWx1ZSAhPT0gJ25vcm1hbCcgJiYgdmFsdWUgIT09ICdhdXRvJyBcbiAgICAgICAgICAgICAgICAgICAgICAgID8gYCR7cHJvcH06ICR7dmFsdWV9O2AgXG4gICAgICAgICAgICAgICAgICAgICAgICA6ICcnO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmZpbHRlcihCb29sZWFuKVxuICAgICAgICAgICAgICAgIC5qb2luKCcgJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChzdHlsZXMpIHtcbiAgICAgICAgICAgICAgICBzdHlsZVJ1bGVzLnB1c2goYC4ke2NsYXNzTmFtZX0geyAke3N0eWxlc30gfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBzdHlsZVJ1bGVzLmpvaW4oJ1xcbicpO1xuICAgIH07XG5cbiAgICBjb25zdCBnZW5lcmF0ZURvY3VtZW50ID0gdXNlQ2FsbGJhY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICBpZiAoYnVzeSkgcmV0dXJuO1xuICAgICAgICBzZXRCdXN5KHRydWUpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnU3RhcnRpbmcgUERGIGdlbmVyYXRpb24uLi4nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRXh0cmFjdCByaWNoIHRleHQgY29udGVudCBCRUZPUkUgY2xvbmluZ1xuICAgICAgICAgICAgY29uc3QgcmljaFRleHRNYXAgPSBleHRyYWN0UmljaFRleHRDb250ZW50KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNtYWxsIGRlbGF5IHRvIGVuc3VyZSBhbGwgY29udGVudCBpcyByZW5kZXJlZFxuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMCkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCB0YXJnZXRDbGFzcyA9IHByb3BzLnRhcmdldENsYXNzIHx8ICdteC1wYWdlJztcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYC4ke3RhcmdldENsYXNzfWApIGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIXRhcmdldCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRWxlbWVudCB3aXRoIGNsYXNzIC4ke3RhcmdldENsYXNzfSBub3QgZm91bmRgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2xvbmUgdGhlIHRhcmdldFxuICAgICAgICAgICAgY29uc3QgY2xvbmUgPSB0YXJnZXQuY2xvbmVOb2RlKHRydWUpIGFzIEhUTUxFbGVtZW50O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZXBsYWNlIHJpY2ggdGV4dCB3aWRnZXRzIHdpdGggZXh0cmFjdGVkIGNvbnRlbnRcbiAgICAgICAgICAgIHJlcGxhY2VSaWNoVGV4dFdpZGdldHMoY2xvbmUsIHJpY2hUZXh0TWFwKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2V0IG9yaWdpbmFsIGRpbWVuc2lvbnNcbiAgICAgICAgICAgIGNvbnN0IHJlY3QgPSB0YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICBjb25zdCBjb21wdXRlZFN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUodGFyZ2V0KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQXBwbHkgYWRkaXRpb25hbCByaWNoIHRleHQgbWFwcGluZ3MgZnJvbSBwcm9wcyBpZiBwcm92aWRlZFxuICAgICAgICAgICAgY29uc3QgbWFwcGluZ3MgPSBbXG4gICAgICAgICAgICAgICAgeyBzZWxlY3RvcjogcHJvcHMucmljaFNlbGVjdG9yMSB8fCAnJywgaHRtbDogcHJvcHMucmljaEh0bWwxPy52YWx1ZSB8fCAnJyB9LFxuICAgICAgICAgICAgICAgIHsgc2VsZWN0b3I6IHByb3BzLnJpY2hTZWxlY3RvcjIgfHwgJycsIGh0bWw6IHByb3BzLnJpY2hIdG1sMj8udmFsdWUgfHwgJycgfSxcbiAgICAgICAgICAgICAgICB7IHNlbGVjdG9yOiBwcm9wcy5yaWNoU2VsZWN0b3IzIHx8ICcnLCBodG1sOiBwcm9wcy5yaWNoSHRtbDM/LnZhbHVlIHx8ICcnIH1cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIG1hcHBpbmdzLmZvckVhY2gobWFwID0+IHtcbiAgICAgICAgICAgICAgICBpZiAobWFwLnNlbGVjdG9yICYmIG1hcC5odG1sKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVsZW1lbnRzID0gY2xvbmUucXVlcnlTZWxlY3RvckFsbChtYXAuc2VsZWN0b3IpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjbGVhbkhUTUwgPSBzYW5pdGl6ZUhUTUwobWFwLmh0bWwpO1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50cy5mb3JFYWNoKGVsID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIChlbCBhcyBIVE1MRWxlbWVudCkuaW5uZXJIVE1MID0gY2xlYW5IVE1MO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gQ2FwdHVyZSBjb21wdXRlZCBzdHlsZXNcbiAgICAgICAgICAgIGNvbnN0IGNhcHR1cmVkU3R5bGVzID0gY2FwdHVyZUNvbXB1dGVkU3R5bGVzKGNsb25lKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2xlYW4gdXAgdW53YW50ZWQgZWxlbWVudHNcbiAgICAgICAgICAgIGNsb25lLnF1ZXJ5U2VsZWN0b3JBbGwoJ2J1dHRvbjpub3QoLmtlZXAtaW4tcGRmKSwgLnBhZ2luZy1zdGF0dXMsIC5teC1ncmlkLXBhZ2luZ2JhcicpLmZvckVhY2goZWwgPT4ge1xuICAgICAgICAgICAgICAgIGVsLnJlbW92ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEdldCBhbGwgc3R5bGVzaGVldHMgZnJvbSB0aGUgcGFnZVxuICAgICAgICAgICAgY29uc3Qgc3R5bGVTaGVldHMgPSBBcnJheS5mcm9tKGRvY3VtZW50LnN0eWxlU2hlZXRzKTtcbiAgICAgICAgICAgIGxldCBleGlzdGluZ1N0eWxlcyA9ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBzdHlsZVNoZWV0cy5mb3JFYWNoKHNoZWV0ID0+IHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBydWxlcyA9IEFycmF5LmZyb20oc2hlZXQuY3NzUnVsZXMgfHwgc2hlZXQucnVsZXMgfHwgW10pO1xuICAgICAgICAgICAgICAgICAgICBydWxlcy5mb3JFYWNoKHJ1bGUgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJ1bGUgaW5zdGFuY2VvZiBDU1NTdHlsZVJ1bGUgJiYgIXJ1bGUuc2VsZWN0b3JUZXh0Py5pbmNsdWRlcygnQG1lZGlhIHByaW50JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleGlzdGluZ1N0eWxlcyArPSBydWxlLmNzc1RleHQgKyAnXFxuJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBDcm9zcy1vcmlnaW4gc3R5bGVzaGVldHMgd2lsbCB0aHJvd1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBCdWlsZCB0aGUgSFRNTCBkb2N1bWVudFxuICAgICAgICAgICAgY29uc3QgZmlsZU5hbWUgPSBwcm9wcy5maWxlTmFtZT8udmFsdWUgfHwgJ2RvY3VtZW50JztcbiAgICAgICAgICAgIGNvbnN0IHBhZ2VNYXJnaW4gPSBwcm9wcy5wYWdlTWFyZ2luIHx8ICcxMG1tJztcbiAgICAgICAgICAgIGNvbnN0IGZpbGVPcHRpb24gPSBwcm9wcy5maWxlT3B0aW9uIHx8ICdkb3dubG9hZCc7XG5cbiAgICAgICAgICAgIGNvbnN0IGh0bWxEb2N1bWVudCA9IGA8IURPQ1RZUEUgaHRtbD5cbjxodG1sIGxhbmc9XCJlblwiPlxuPGhlYWQ+XG4gICAgPG1ldGEgY2hhcnNldD1cIlVURi04XCI+XG4gICAgPG1ldGEgbmFtZT1cInZpZXdwb3J0XCIgY29udGVudD1cIndpZHRoPSR7cmVjdC53aWR0aH1cIj5cbiAgICA8dGl0bGU+JHtmaWxlTmFtZX08L3RpdGxlPlxuICAgIDxzdHlsZT5cbiAgICAgICAgLyogUmVzZXQgYW5kIGJhc2Ugc3R5bGVzICovXG4gICAgICAgICoge1xuICAgICAgICAgICAgbWFyZ2luOiAwO1xuICAgICAgICAgICAgcGFkZGluZzogMDtcbiAgICAgICAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIEBwYWdlIHtcbiAgICAgICAgICAgIHNpemU6ICR7cmVjdC53aWR0aCA+IHJlY3QuaGVpZ2h0ID8gJ0E0IGxhbmRzY2FwZScgOiAnQTQgcG9ydHJhaXQnfTtcbiAgICAgICAgICAgIG1hcmdpbjogJHtwYWdlTWFyZ2lufTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgYm9keSB7XG4gICAgICAgICAgICBtYXJnaW46IDA7XG4gICAgICAgICAgICBwYWRkaW5nOiAwO1xuICAgICAgICAgICAgd2lkdGg6ICR7cmVjdC53aWR0aH1weDtcbiAgICAgICAgICAgIG1pbi1oZWlnaHQ6ICR7cmVjdC5oZWlnaHR9cHg7XG4gICAgICAgICAgICBmb250LWZhbWlseTogJHtjb21wdXRlZFN0eWxlLmZvbnRGYW1pbHkgfHwgJy1hcHBsZS1zeXN0ZW0sIEJsaW5rTWFjU3lzdGVtRm9udCwgXCJTZWdvZSBVSVwiLCBBcmlhbCwgc2Fucy1zZXJpZid9O1xuICAgICAgICAgICAgZm9udC1zaXplOiAke2NvbXB1dGVkU3R5bGUuZm9udFNpemUgfHwgJzE0cHgnfTtcbiAgICAgICAgICAgIGxpbmUtaGVpZ2h0OiAke2NvbXB1dGVkU3R5bGUubGluZUhlaWdodCB8fCAnMS41J307XG4gICAgICAgICAgICBjb2xvcjogJHtjb21wdXRlZFN0eWxlLmNvbG9yIHx8ICcjMDAwMDAwJ307XG4gICAgICAgICAgICBiYWNrZ3JvdW5kOiAke2NvbXB1dGVkU3R5bGUuYmFja2dyb3VuZENvbG9yIHx8ICcjZmZmZmZmJ307XG4gICAgICAgICAgICAtd2Via2l0LXByaW50LWNvbG9yLWFkanVzdDogZXhhY3Q7XG4gICAgICAgICAgICBwcmludC1jb2xvci1hZGp1c3Q6IGV4YWN0O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvKiBQcmVzZXJ2ZSBvcmlnaW5hbCBzdHlsZXMgKi9cbiAgICAgICAgJHtleGlzdGluZ1N0eWxlc31cbiAgICAgICAgXG4gICAgICAgIC8qIENhcHR1cmVkIGNvbXB1dGVkIHN0eWxlcyAqL1xuICAgICAgICAke2NhcHR1cmVkU3R5bGVzfVxuICAgICAgICBcbiAgICAgICAgLyogUmljaCB0ZXh0IHByaW50aW5nIHN0eWxlcyAqL1xuICAgICAgICAubXgtcmljaHRleHQtcHJpbnRlZCB7XG4gICAgICAgICAgICBkaXNwbGF5OiBibG9jayAhaW1wb3J0YW50O1xuICAgICAgICAgICAgbWFyZ2luOiAyMHB4IDAgIWltcG9ydGFudDtcbiAgICAgICAgICAgIHBhZGRpbmc6IDE1cHggIWltcG9ydGFudDtcbiAgICAgICAgICAgIGJvcmRlcjogMXB4IHNvbGlkICNkZGQgIWltcG9ydGFudDtcbiAgICAgICAgICAgIGJhY2tncm91bmQ6ICNmOWY5ZjkgIWltcG9ydGFudDtcbiAgICAgICAgICAgIGJvcmRlci1yYWRpdXM6IDRweCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAucmljaC10ZXh0LWxhYmVsIHtcbiAgICAgICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBtYXJnaW4tYm90dG9tOiAxMHB4ICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBjb2xvcjogIzMzMyAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAucmljaC10ZXh0LWNvbnRlbnQge1xuICAgICAgICAgICAgd2hpdGUtc3BhY2U6IHByZS13cmFwICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICB3b3JkLWJyZWFrOiBicmVhay13b3JkICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBvdmVyZmxvdy13cmFwOiBicmVhay13b3JkICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBmb250LWZhbWlseTogaW5oZXJpdCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgbGluZS1oZWlnaHQ6IDEuNiAhaW1wb3J0YW50O1xuICAgICAgICAgICAgY29sb3I6ICMwMDAgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLmpzb24tZm9ybWF0dGVkIHtcbiAgICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6ICNmNWY1ZjUgIWltcG9ydGFudDtcbiAgICAgICAgICAgIGJvcmRlcjogMXB4IHNvbGlkICNjY2MgIWltcG9ydGFudDtcbiAgICAgICAgICAgIGJvcmRlci1yYWRpdXM6IDNweCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgcGFkZGluZzogMTBweCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgbWFyZ2luOiAxMHB4IDAgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLmpzb24tZm9ybWF0dGVkIHByZSB7XG4gICAgICAgICAgICB3aGl0ZS1zcGFjZTogcHJlLXdyYXAgIWltcG9ydGFudDtcbiAgICAgICAgICAgIHdvcmQtYnJlYWs6IGJyZWFrLWFsbCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgZm9udC1mYW1pbHk6ICdDb3VyaWVyIE5ldycsIENvdXJpZXIsIG1vbm9zcGFjZSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgZm9udC1zaXplOiAxMnB4ICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBtYXJnaW46IDAgIWltcG9ydGFudDtcbiAgICAgICAgICAgIGNvbG9yOiAjMDAwICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC5yaWNoLXRleHQtZmFsbGJhY2sge1xuICAgICAgICAgICAgbWFyZ2luLXRvcDogMzBweCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgcGFkZGluZzogMjBweCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgYm9yZGVyLXRvcDogMnB4IHNvbGlkICNkZGQgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLnJpY2gtdGV4dC1mYWxsYmFjayBoMyB7XG4gICAgICAgICAgICBtYXJnaW4tYm90dG9tOiAxNXB4ICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBjb2xvcjogIzMzMyAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvKiBFbnN1cmUgcmljaCB0ZXh0IGZvcm1hdHRpbmcgaXMgcHJlc2VydmVkICovXG4gICAgICAgIC5teC1yaWNodGV4dC1wcmludGVkIHAsXG4gICAgICAgIC5yaWNoLXRleHQtY29udGVudCBwIHtcbiAgICAgICAgICAgIG1hcmdpbjogMCAwIDEwcHggMCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAubXgtcmljaHRleHQtcHJpbnRlZCB1bCwgLm14LXJpY2h0ZXh0LXByaW50ZWQgb2wsXG4gICAgICAgIC5yaWNoLXRleHQtY29udGVudCB1bCwgLnJpY2gtdGV4dC1jb250ZW50IG9sIHtcbiAgICAgICAgICAgIG1hcmdpbjogMCAwIDEwcHggMjBweCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgcGFkZGluZy1sZWZ0OiAyMHB4ICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC5teC1yaWNodGV4dC1wcmludGVkIGxpLFxuICAgICAgICAucmljaC10ZXh0LWNvbnRlbnQgbGkge1xuICAgICAgICAgICAgbWFyZ2luOiAwIDAgNXB4IDAgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLm14LXJpY2h0ZXh0LXByaW50ZWQgc3Ryb25nLCAubXgtcmljaHRleHQtcHJpbnRlZCBiLFxuICAgICAgICAucmljaC10ZXh0LWNvbnRlbnQgc3Ryb25nLCAucmljaC10ZXh0LWNvbnRlbnQgYiB7XG4gICAgICAgICAgICBmb250LXdlaWdodDogYm9sZCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAubXgtcmljaHRleHQtcHJpbnRlZCBlbSwgLm14LXJpY2h0ZXh0LXByaW50ZWQgaSxcbiAgICAgICAgLnJpY2gtdGV4dC1jb250ZW50IGVtLCAucmljaC10ZXh0LWNvbnRlbnQgaSB7XG4gICAgICAgICAgICBmb250LXN0eWxlOiBpdGFsaWMgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLyogVGFibGUgc3R5bGVzICovXG4gICAgICAgIHRhYmxlIHtcbiAgICAgICAgICAgIHdpZHRoOiAxMDAlICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBib3JkZXItY29sbGFwc2U6IGNvbGxhcHNlICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBwYWdlLWJyZWFrLWluc2lkZTogYXV0byAhaW1wb3J0YW50O1xuICAgICAgICAgICAgbWFyZ2luOiAxMHB4IDAgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhlYWQge1xuICAgICAgICAgICAgZGlzcGxheTogdGFibGUtaGVhZGVyLWdyb3VwICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRib2R5IHtcbiAgICAgICAgICAgIGRpc3BsYXk6IHRhYmxlLXJvdy1ncm91cCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0ciB7XG4gICAgICAgICAgICBwYWdlLWJyZWFrLWluc2lkZTogYXZvaWQgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGgsIHRkIHtcbiAgICAgICAgICAgIHBhZGRpbmc6IDhweCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgYm9yZGVyOiAxcHggc29saWQgI2RkZCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgdGV4dC1hbGlnbjogbGVmdCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aCB7XG4gICAgICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjZjVmNWY1ICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBmb250LXdlaWdodDogYm9sZCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvKiBIaWRlIHVud2FudGVkIGVsZW1lbnRzICovXG4gICAgICAgIC5uby1wcmludCxcbiAgICAgICAgYnV0dG9uOm5vdCgucHJpbnQtYnV0dG9uKSxcbiAgICAgICAgaW5wdXRbdHlwZT1cImJ1dHRvblwiXSxcbiAgICAgICAgaW5wdXRbdHlwZT1cInN1Ym1pdFwiXSxcbiAgICAgICAgLm14LWJ1dHRvbjpub3QoLnByaW50LWJ1dHRvbiksXG4gICAgICAgIC5idG46bm90KC5wcmludC1idXR0b24pLFxuICAgICAgICAucWwtdG9vbGJhcixcbiAgICAgICAgLnFsLXRvb2x0aXAsXG4gICAgICAgIC5xbC10YWJsZS1tZW51cy1jb250YWluZXIsXG4gICAgICAgIC53aWRnZXQtcmljaC10ZXh0LXRvb2xiYXIsXG4gICAgICAgIC53aWRnZXQtcmljaC10ZXh0LWZvb3RlciB7XG4gICAgICAgICAgICBkaXNwbGF5OiBub25lICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8qIE1lbmRpeC1zcGVjaWZpYyBwcmVzZXJ2YXRpb25zICovXG4gICAgICAgIC5teC1sYXlvdXRncmlkLXJvdyB7XG4gICAgICAgICAgICBkaXNwbGF5OiBmbGV4ICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBmbGV4LXdyYXA6IHdyYXAgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLm14LWxheW91dGdyaWQtY29sIHtcbiAgICAgICAgICAgIGZsZXg6IDAgMCBhdXRvICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC5teC1jb250YWluZXIsXG4gICAgICAgIC5teC1zY3JvbGxjb250YWluZXItd3JhcHBlciB7XG4gICAgICAgICAgICB3aWR0aDogMTAwJSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgb3ZlcmZsb3c6IHZpc2libGUgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgQG1lZGlhIHByaW50IHtcbiAgICAgICAgICAgIGJvZHkge1xuICAgICAgICAgICAgICAgIHdpZHRoOiAxMDAlICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICAgICAgbWFyZ2luOiAwICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICAgICAgcGFkZGluZzogJHtwYWdlTWFyZ2lufSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAqIHtcbiAgICAgICAgICAgICAgICBvdmVyZmxvdzogdmlzaWJsZSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgICAgIG1heC1oZWlnaHQ6IG5vbmUgIWltcG9ydGFudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLm14LXJpY2h0ZXh0LXByaW50ZWQge1xuICAgICAgICAgICAgICAgIHBhZ2UtYnJlYWstaW5zaWRlOiBhdm9pZCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6IHdoaXRlICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICA8L3N0eWxlPlxuPC9oZWFkPlxuPGJvZHk+XG4gICAgPGRpdiBjbGFzcz1cInBkZi1jb250ZW50LXdyYXBwZXJcIiBzdHlsZT1cIndpZHRoOiAke3JlY3Qud2lkdGh9cHg7XCI+XG4gICAgICAgICR7Y2xvbmUuaW5uZXJIVE1MfVxuICAgIDwvZGl2PlxuPC9ib2R5PlxuPC9odG1sPmA7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdIVE1MIGRvY3VtZW50IHByZXBhcmVkIGZvciBQREYnKTtcblxuICAgICAgICAgICAgLy8gQ29udmVydCB0byBiYXNlNjRcbiAgICAgICAgICAgIGNvbnN0IHRvQmFzZTY0SW5DaHVua3MgPSAodThhOiBVaW50OEFycmF5KTogc3RyaW5nID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBDSFVOS19TSVpFID0gODE5MjtcbiAgICAgICAgICAgICAgICBsZXQgYmluU3RyaW5nID0gXCJcIjtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHU4YS5sZW5ndGg7IGkgKz0gQ0hVTktfU0laRSkge1xuICAgICAgICAgICAgICAgICAgICBiaW5TdHJpbmcgKz0gU3RyaW5nLmZyb21Db2RlUG9pbnQoLi4udThhLnN1YmFycmF5KGksIGkgKyBDSFVOS19TSVpFKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBidG9hKGJpblN0cmluZyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY29uc3QgYmFzZTY0ID0gdG9CYXNlNjRJbkNodW5rcyhuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUoaHRtbERvY3VtZW50KSk7XG4gICAgICAgICAgICBjb25zdCBjbGVhbkZpbGVOYW1lID0gZmlsZU5hbWUucmVwbGFjZSgvW1xcLzoqP1wiPD58XSsvZywgJ18nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHByb3BzLnBkZk5hbWVBdHRyPy5zZXRWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHByb3BzLnBkZk5hbWVBdHRyLnNldFZhbHVlKGNsZWFuRmlsZU5hbWUgKyAnLnBkZicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocHJvcHMuYmFzZTY0QXR0cj8uc2V0VmFsdWUpIHtcbiAgICAgICAgICAgICAgICBwcm9wcy5iYXNlNjRBdHRyLnNldFZhbHVlKGJhc2U2NCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEhhbmRsZSBvdXRwdXRcbiAgICAgICAgICAgIGlmIChmaWxlT3B0aW9uID09PSAnYmFzZTY0Jykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdEb2N1bWVudCBzdG9yZWQgYXMgYmFzZTY0Jyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGZpbGVPcHRpb24gPT09ICdwcmV2aWV3Jykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByaW50V2luZG93ID0gd2luZG93Lm9wZW4oJycsICdfYmxhbmsnLCBgd2lkdGg9JHtNYXRoLm1pbihyZWN0LndpZHRoICsgMTAwLCAxMjAwKX0saGVpZ2h0PTgwMGApO1xuICAgICAgICAgICAgICAgIGlmIChwcmludFdpbmRvdykge1xuICAgICAgICAgICAgICAgICAgICBwcmludFdpbmRvdy5kb2N1bWVudC5vcGVuKCk7XG4gICAgICAgICAgICAgICAgICAgIHByaW50V2luZG93LmRvY3VtZW50LndyaXRlKGh0bWxEb2N1bWVudCk7XG4gICAgICAgICAgICAgICAgICAgIHByaW50V2luZG93LmRvY3VtZW50LmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIHByaW50V2luZG93Lm9ubG9hZCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gcHJpbnRXaW5kb3cucHJpbnQoKSwgMjUwKTtcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFByaW50IHVzaW5nIGlmcmFtZVxuICAgICAgICAgICAgICAgIGNvbnN0IHByaW50RnJhbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpZnJhbWUnKTtcbiAgICAgICAgICAgICAgICBwcmludEZyYW1lLnN0eWxlLmNzc1RleHQgPSAncG9zaXRpb246YWJzb2x1dGU7d2lkdGg6MDtoZWlnaHQ6MDtib3JkZXI6MDtsZWZ0Oi05OTk5cHgnO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQocHJpbnRGcmFtZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgZnJhbWVEb2MgPSBwcmludEZyYW1lLmNvbnRlbnREb2N1bWVudCB8fCBwcmludEZyYW1lLmNvbnRlbnRXaW5kb3c/LmRvY3VtZW50O1xuICAgICAgICAgICAgICAgIGlmIChmcmFtZURvYykge1xuICAgICAgICAgICAgICAgICAgICBmcmFtZURvYy5vcGVuKCk7XG4gICAgICAgICAgICAgICAgICAgIGZyYW1lRG9jLndyaXRlKGh0bWxEb2N1bWVudCk7XG4gICAgICAgICAgICAgICAgICAgIGZyYW1lRG9jLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW50RnJhbWUuY29udGVudFdpbmRvdz8uZm9jdXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW50RnJhbWUuY29udGVudFdpbmRvdz8ucHJpbnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkb2N1bWVudC5ib2R5LmNvbnRhaW5zKHByaW50RnJhbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQocHJpbnRGcmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgMTAwMCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDI1MCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocHJvcHMub25DaGFuZ2U/LmNhbkV4ZWN1dGUgJiYgcHJvcHMub25DaGFuZ2U/LmV4ZWN1dGUpIHtcbiAgICAgICAgICAgICAgICBwcm9wcy5vbkNoYW5nZS5leGVjdXRlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1BERiBnZW5lcmF0aW9uIGVycm9yOicsIGVycm9yKTtcbiAgICAgICAgICAgIGFsZXJ0KCdGYWlsZWQgdG8gZ2VuZXJhdGUgUERGLiBDaGVjayB0aGUgYnJvd3NlciBjb25zb2xlIGZvciBkZXRhaWxzLicpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgc2V0QnVzeShmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9LCBbYnVzeSwgcHJvcHNdKTtcblxuICAgIGlmIChwcm9wcy5oaWRlQnV0dG9uID09PSB0cnVlKSByZXR1cm4gPEZyYWdtZW50IC8+O1xuXG4gICAgY29uc3QgYnV0dG9uQ2xhc3NOYW1lID0gcHJvcHMuYnV0dG9uQ2xhc3MgfHwgJ2J0biBidG4tcHJpbWFyeSc7XG4gICAgY29uc3QgYnV0dG9uVGV4dCA9IHByb3BzLmJ1dHRvbkNhcHRpb24/LnZhbHVlIHx8ICdFeHBvcnQgdG8gUERGJztcblxuICAgIHJldHVybiAoXG4gICAgICAgIDxidXR0b24gY2xhc3NOYW1lPXtidXR0b25DbGFzc05hbWV9IGRpc2FibGVkPXtidXN5fSBvbkNsaWNrPXtnZW5lcmF0ZURvY3VtZW50fT5cbiAgICAgICAgICAgIHtidXN5ID8gXCJHZW5lcmF0aW5nLi4uXCIgOiBidXR0b25UZXh0fVxuICAgICAgICA8L2J1dHRvbj5cbiAgICApO1xufSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUdNLFNBQVUsa0JBQWtCLENBQUMsS0FBdUMsRUFBQTtJQUN0RSxNQUFNLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUV4QyxJQUFBLE1BQU0sWUFBWSxHQUFHLENBQUMsSUFBWSxLQUFZO1FBQzFDLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDM0MsUUFBQSxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztRQUN0QixNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyx5REFBeUQsQ0FBQyxDQUFDO0FBQzNHLFFBQUEsaUJBQWlCLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUM3QyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDL0MsUUFBQSxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBRztBQUNyQixZQUFBLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUc7Z0JBQ3JDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLElBQUksS0FBSyxNQUFNLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRTtBQUM5RixvQkFBQSxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDakM7QUFDTCxhQUFDLENBQUMsQ0FBQztBQUNQLFNBQUMsQ0FBQyxDQUFD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
