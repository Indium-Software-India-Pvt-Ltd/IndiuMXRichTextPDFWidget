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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSW5kaXVNWFBERkV4cG9ydGVyLm1qcyIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL0luZGl1TVhQREZFeHBvcnRlci50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3JlYXRlRWxlbWVudCwgRnJhZ21lbnQsIHVzZUNhbGxiYWNrLCB1c2VTdGF0ZSB9IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IHsgSW5kaXVNWFBERkV4cG9ydGVyQ29udGFpbmVyUHJvcHMgfSBmcm9tIFwiLi4vdHlwaW5ncy9JbmRpdU1YUERGRXhwb3J0ZXJQcm9wc1wiO1xuXG5leHBvcnQgZnVuY3Rpb24gSW5kaXVNWFBERkV4cG9ydGVyKHByb3BzOiBJbmRpdU1YUERGRXhwb3J0ZXJDb250YWluZXJQcm9wcyk6IEpTWC5FbGVtZW50IHtcbiAgICBjb25zdCBbYnVzeSwgc2V0QnVzeV0gPSB1c2VTdGF0ZShmYWxzZSk7XG5cbiAgICBjb25zdCBzYW5pdGl6ZUhUTUwgPSAoaHRtbDogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICAgICAgY29uc3QgdGVtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICB0ZW1wLmlubmVySFRNTCA9IGh0bWw7XG4gICAgICAgIGNvbnN0IGRhbmdlcm91c0VsZW1lbnRzID0gdGVtcC5xdWVyeVNlbGVjdG9yQWxsKCdzY3JpcHQsIHN0eWxlW2RhdGEtcmVtb3ZlXSwgaWZyYW1lLCBvYmplY3QsIGVtYmVkLCBmb3JtJyk7XG4gICAgICAgIGRhbmdlcm91c0VsZW1lbnRzLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xuICAgICAgICBjb25zdCBhbGxFbGVtZW50cyA9IHRlbXAucXVlcnlTZWxlY3RvckFsbCgnKicpO1xuICAgICAgICBhbGxFbGVtZW50cy5mb3JFYWNoKGVsID0+IHtcbiAgICAgICAgICAgIEFycmF5LmZyb20oZWwuYXR0cmlidXRlcykuZm9yRWFjaChhdHRyID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoYXR0ci5uYW1lLnN0YXJ0c1dpdGgoJ29uJykgfHwgKGF0dHIubmFtZSA9PT0gJ2hyZWYnICYmIGF0dHIudmFsdWUuc3RhcnRzV2l0aCgnamF2YXNjcmlwdDonKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKGF0dHIubmFtZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGVtcC5pbm5lckhUTUw7XG4gICAgfTtcblxuICAgIC8vIEVuaGFuY2VkIGZ1bmN0aW9uIHRvIGV4dHJhY3QgYW5kIHByZXNlcnZlIHJpY2ggdGV4dCBjb250ZW50XG4gICAgY29uc3QgZXh0cmFjdFJpY2hUZXh0Q29udGVudCA9ICgpOiBNYXA8c3RyaW5nLCBzdHJpbmc+ID0+IHtcbiAgICAgICAgY29uc3QgcmljaFRleHRNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICAgICAgICBcbiAgICAgICAgLy8gVHJ5IG11bHRpcGxlIHNlbGVjdG9ycyB0byBmaW5kIHJpY2ggdGV4dCB3aWRnZXRzXG4gICAgICAgIGNvbnN0IHNlbGVjdG9ycyA9IFtcbiAgICAgICAgICAgICcubXgtbmFtZS1yaWNoVGV4dDEgLnFsLWVkaXRvcicsXG4gICAgICAgICAgICAnLndpZGdldC1yaWNoLXRleHQgLnFsLWVkaXRvcicsXG4gICAgICAgICAgICAnW2NsYXNzKj1cInJpY2hUZXh0XCJdIC5xbC1lZGl0b3InLFxuICAgICAgICAgICAgJy5xbC1jb250YWluZXIgLnFsLWVkaXRvcicsXG4gICAgICAgICAgICAnLndpZGdldC1yaWNoLXRleHQtY29udGFpbmVyIC5xbC1lZGl0b3InXG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICBzZWxlY3RvcnMuZm9yRWFjaChzZWxlY3RvciA9PiB7XG4gICAgICAgICAgICBjb25zdCBlZGl0b3JzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oc2VsZWN0b3IpO1xuICAgICAgICAgICAgZWRpdG9ycy5mb3JFYWNoKChlZGl0b3IsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVkaXRvciAmJiBlZGl0b3IuaW5uZXJIVE1MKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGtleSA9IGAke3NlbGVjdG9yfS0ke2luZGV4fWA7XG4gICAgICAgICAgICAgICAgICAgIGxldCBjb250ZW50ID0gZWRpdG9yLmlubmVySFRNTDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEFsc28gdHJ5IHRvIGdldCB0ZXh0IGNvbnRlbnQgaWYgaW5uZXJIVE1MIGxvb2tzIGxpa2UgcGxhaW4gdGV4dFxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXh0Q29udGVudCA9IGVkaXRvci50ZXh0Q29udGVudCB8fCBlZGl0b3IuaW5uZXJUZXh0IHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgY29udGVudCBpcyBKU09OIGFuZCBmb3JtYXQgaXRcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRleHRDb250ZW50LnRyaW0oKS5zdGFydHNXaXRoKCd7JykgJiYgdGV4dENvbnRlbnQudHJpbSgpLmVuZHNXaXRoKCd9JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZSh0ZXh0Q29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCA9IGA8ZGl2IGNsYXNzPVwianNvbi1mb3JtYXR0ZWRcIj48cHJlPiR7SlNPTi5zdHJpbmdpZnkocGFyc2VkLCBudWxsLCAyKX08L3ByZT48L2Rpdj5gO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5vdCB2YWxpZCBKU09OLCB1c2Ugb3JpZ2luYWwgSFRNTFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByaWNoVGV4dE1hcC5zZXQoa2V5LCBjb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYEZvdW5kIHJpY2ggdGV4dCBjb250ZW50IGF0ICR7c2VsZWN0b3J9OmAsIGNvbnRlbnQuc3Vic3RyaW5nKDAsIDEwMCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFsc28gbG9vayBmb3IgY29udGVudGVkaXRhYmxlIGVsZW1lbnRzXG4gICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KCdbY29udGVudGVkaXRhYmxlPVwidHJ1ZVwiXScpLmZvckVhY2goKGVkaXRvciwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGlmIChlZGl0b3IgJiYgZWRpdG9yLmlubmVySFRNTCAmJiAhcmljaFRleHRNYXAuaGFzKGBjb250ZW50ZWRpdGFibGUtJHtpbmRleH1gKSkge1xuICAgICAgICAgICAgICAgIHJpY2hUZXh0TWFwLnNldChgY29udGVudGVkaXRhYmxlLSR7aW5kZXh9YCwgZWRpdG9yLmlubmVySFRNTCk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYEZvdW5kIGNvbnRlbnRlZGl0YWJsZSBjb250ZW50OmAsIGVkaXRvci5pbm5lckhUTUwuc3Vic3RyaW5nKDAsIDEwMCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnNvbGUubG9nKGBUb3RhbCByaWNoIHRleHQgZWxlbWVudHMgZm91bmQ6ICR7cmljaFRleHRNYXAuc2l6ZX1gKTtcbiAgICAgICAgcmV0dXJuIHJpY2hUZXh0TWFwO1xuICAgIH07XG5cbiAgICAvLyBSZXBsYWNlIHJpY2ggdGV4dCB3aWRnZXRzIGluIHRoZSBjbG9uZWQgZWxlbWVudFxuICAgIGNvbnN0IHJlcGxhY2VSaWNoVGV4dFdpZGdldHMgPSAoY2xvbmU6IEhUTUxFbGVtZW50LCByaWNoVGV4dE1hcDogTWFwPHN0cmluZywgc3RyaW5nPikgPT4ge1xuICAgICAgICAvLyBGaW5kIGFsbCBwb3RlbnRpYWwgcmljaCB0ZXh0IGNvbnRhaW5lcnMgaW4gdGhlIGNsb25lXG4gICAgICAgIGNvbnN0IGNvbnRhaW5lcnMgPSBbXG4gICAgICAgICAgICAuLi5BcnJheS5mcm9tKGNsb25lLnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KCcubXgtbmFtZS1yaWNoVGV4dDEnKSksXG4gICAgICAgICAgICAuLi5BcnJheS5mcm9tKGNsb25lLnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KCcud2lkZ2V0LXJpY2gtdGV4dCcpKSxcbiAgICAgICAgICAgIC4uLkFycmF5LmZyb20oY2xvbmUucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oJ1tjbGFzcyo9XCJyaWNoVGV4dFwiXScpKSxcbiAgICAgICAgICAgIC4uLkFycmF5LmZyb20oY2xvbmUucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oJy5mb3JtLWdyb3VwOmhhcygucWwtZWRpdG9yKScpKSxcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIGxldCByZXBsYWNlbWVudENvdW50ID0gMDtcbiAgICAgICAgXG4gICAgICAgIGNvbnRhaW5lcnMuZm9yRWFjaChjb250YWluZXIgPT4ge1xuICAgICAgICAgICAgLy8gVHJ5IHRvIGZpbmQgYW55IHJpY2ggdGV4dCBjb250ZW50IGZvciB0aGlzIGNvbnRhaW5lclxuICAgICAgICAgICAgbGV0IGNvbnRlbnRGb3VuZCA9IGZhbHNlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGaXJzdCwgY2hlY2sgaWYgd2UgaGF2ZSBjb250ZW50IGZyb20gdGhlIGV4dHJhY3Rpb25cbiAgICAgICAgICAgIGZvciAoY29uc3QgWyBjb250ZW50XSBvZiByaWNoVGV4dE1hcC5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWNvbnRlbnRGb3VuZCAmJiBjb250ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBhIHJlcGxhY2VtZW50IGRpdiB3aXRoIHRoZSBjb250ZW50XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlcGxhY2VtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICAgICAgICAgIHJlcGxhY2VtZW50LmNsYXNzTmFtZSA9ICdteC1yaWNodGV4dC1wcmludGVkJztcbiAgICAgICAgICAgICAgICAgICAgcmVwbGFjZW1lbnQuaW5uZXJIVE1MID0gYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInJpY2gtdGV4dC1sYWJlbFwiPlJpY2ggVGV4dCBDb250ZW50OjwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInJpY2gtdGV4dC1jb250ZW50XCI+JHtjb250ZW50fTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVwbGFjZSB0aGUgZW50aXJlIGNvbnRhaW5lclxuICAgICAgICAgICAgICAgICAgICBpZiAoY29udGFpbmVyLnBhcmVudEVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lci5wYXJlbnRFbGVtZW50LnJlcGxhY2VDaGlsZChyZXBsYWNlbWVudCwgY29udGFpbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnRGb3VuZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXBsYWNlbWVudENvdW50Kys7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgUmVwbGFjZWQgY29udGFpbmVyICR7cmVwbGFjZW1lbnRDb3VudH0gd2l0aCByaWNoIHRleHQgY29udGVudGApO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIElmIG5vIGNvbnRlbnQgd2FzIGZvdW5kIGluIHRoZSBtYXAsIHRyeSB0byBleHRyYWN0IGRpcmVjdGx5IGZyb20gdGhlIGNsb25lXG4gICAgICAgICAgICBpZiAoIWNvbnRlbnRGb3VuZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVkaXRvciA9IGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PignLnFsLWVkaXRvcicpO1xuICAgICAgICAgICAgICAgIGlmIChlZGl0b3IgJiYgZWRpdG9yLmlubmVySFRNTCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXBsYWNlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgICAgICAgICByZXBsYWNlbWVudC5jbGFzc05hbWUgPSAnbXgtcmljaHRleHQtcHJpbnRlZCc7XG4gICAgICAgICAgICAgICAgICAgIHJlcGxhY2VtZW50LmlubmVySFRNTCA9IGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJyaWNoLXRleHQtbGFiZWxcIj5SaWNoIFRleHQgQ29udGVudDo8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJyaWNoLXRleHQtY29udGVudFwiPiR7ZWRpdG9yLmlubmVySFRNTH08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb250YWluZXIucGFyZW50RWxlbWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyLnBhcmVudEVsZW1lbnQucmVwbGFjZUNoaWxkKHJlcGxhY2VtZW50LCBjb250YWluZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVwbGFjZW1lbnRDb3VudCsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFJlcGxhY2VkIGNvbnRhaW5lciAke3JlcGxhY2VtZW50Q291bnR9IHdpdGggZGlyZWN0bHkgZXh0cmFjdGVkIGNvbnRlbnRgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgYW55IHJlbWFpbmluZyBRdWlsbCBVSSBlbGVtZW50c1xuICAgICAgICBjbG9uZS5xdWVyeVNlbGVjdG9yQWxsKCcucWwtdG9vbGJhciwgLnFsLXRvb2x0aXAsIC53aWRnZXQtcmljaC10ZXh0LXRvb2xiYXIsIC53aWRnZXQtcmljaC10ZXh0LWZvb3RlcicpLmZvckVhY2goZWwgPT4ge1xuICAgICAgICAgICAgZWwucmVtb3ZlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc29sZS5sb2coYFRvdGFsIGNvbnRhaW5lcnMgcmVwbGFjZWQ6ICR7cmVwbGFjZW1lbnRDb3VudH1gKTtcbiAgICAgICAgXG4gICAgICAgIC8vIElmIG5vIHJlcGxhY2VtZW50cyB3ZXJlIG1hZGUsIGluamVjdCB0aGUgY29udGVudCBhdCB0aGUgZW5kXG4gICAgICAgIGlmIChyZXBsYWNlbWVudENvdW50ID09PSAwICYmIHJpY2hUZXh0TWFwLnNpemUgPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBmYWxsYmFja0NvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgZmFsbGJhY2tDb250YWluZXIuY2xhc3NOYW1lID0gJ3JpY2gtdGV4dC1mYWxsYmFjayc7XG4gICAgICAgICAgICBmYWxsYmFja0NvbnRhaW5lci5pbm5lckhUTUwgPSAnPGgzPlJpY2ggVGV4dCBDb250ZW50OjwvaDM+JztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZm9yIChjb25zdCBbY29udGVudF0gb2YgcmljaFRleHRNYXAuZW50cmllcygpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgZmFsbGJhY2tDb250YWluZXIuaW5uZXJIVE1MICs9IGA8ZGl2IGNsYXNzPVwibXgtcmljaHRleHQtcHJpbnRlZFwiPiR7Y29udGVudH08L2Rpdj5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2xvbmUuYXBwZW5kQ2hpbGQoZmFsbGJhY2tDb250YWluZXIpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0FkZGVkIHJpY2ggdGV4dCBjb250ZW50IGFzIGZhbGxiYWNrIGF0IHRoZSBlbmQgb2YgZG9jdW1lbnQnKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBjb25zdCBjYXB0dXJlQ29tcHV0ZWRTdHlsZXMgPSAoZWxlbWVudDogSFRNTEVsZW1lbnQpOiBzdHJpbmcgPT4ge1xuICAgICAgICBjb25zdCBhbGxFbGVtZW50cyA9IGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnKicpO1xuICAgICAgICBjb25zdCBzdHlsZVJ1bGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBcbiAgICAgICAgYWxsRWxlbWVudHMuZm9yRWFjaCgoZWwsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjb21wdXRlZCA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsKTtcbiAgICAgICAgICAgIGNvbnN0IGNsYXNzTmFtZSA9IGBjYXB0dXJlZC1zdHlsZS0ke2luZGV4fWA7XG4gICAgICAgICAgICAoZWwgYXMgSFRNTEVsZW1lbnQpLmNsYXNzTGlzdC5hZGQoY2xhc3NOYW1lKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgaW1wb3J0YW50UHJvcHMgPSBbXG4gICAgICAgICAgICAgICAgJ2Rpc3BsYXknLCAncG9zaXRpb24nLCAnd2lkdGgnLCAnaGVpZ2h0JywgJ21hcmdpbicsICdwYWRkaW5nJyxcbiAgICAgICAgICAgICAgICAnYm9yZGVyJywgJ2JhY2tncm91bmQnLCAnY29sb3InLCAnZm9udC1mYW1pbHknLCAnZm9udC1zaXplJyxcbiAgICAgICAgICAgICAgICAnZm9udC13ZWlnaHQnLCAndGV4dC1hbGlnbicsICdsaW5lLWhlaWdodCcsICdmbG9hdCcsICdjbGVhcicsXG4gICAgICAgICAgICAgICAgJ2ZsZXgnLCAnZmxleC1kaXJlY3Rpb24nLCAnanVzdGlmeS1jb250ZW50JywgJ2FsaWduLWl0ZW1zJyxcbiAgICAgICAgICAgICAgICAnZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zJywgJ2dyaWQtdGVtcGxhdGUtcm93cycsICdnYXAnLFxuICAgICAgICAgICAgICAgICd3aGl0ZS1zcGFjZScsICd3b3JkLWJyZWFrJywgJ3dvcmQtd3JhcCcsICdvdmVyZmxvdy13cmFwJ1xuICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3Qgc3R5bGVzID0gaW1wb3J0YW50UHJvcHNcbiAgICAgICAgICAgICAgICAubWFwKHByb3AgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGNvbXB1dGVkLmdldFByb3BlcnR5VmFsdWUocHJvcCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZSAmJiB2YWx1ZSAhPT0gJ25vbmUnICYmIHZhbHVlICE9PSAnbm9ybWFsJyAmJiB2YWx1ZSAhPT0gJ2F1dG8nIFxuICAgICAgICAgICAgICAgICAgICAgICAgPyBgJHtwcm9wfTogJHt2YWx1ZX07YCBcbiAgICAgICAgICAgICAgICAgICAgICAgIDogJyc7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgICAgICAgICAgICAgLmpvaW4oJyAnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHN0eWxlcykge1xuICAgICAgICAgICAgICAgIHN0eWxlUnVsZXMucHVzaChgLiR7Y2xhc3NOYW1lfSB7ICR7c3R5bGVzfSB9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHN0eWxlUnVsZXMuam9pbignXFxuJyk7XG4gICAgfTtcblxuICAgIGNvbnN0IGdlbmVyYXRlRG9jdW1lbnQgPSB1c2VDYWxsYmFjayhhc3luYyAoKSA9PiB7XG4gICAgICAgIGlmIChidXN5KSByZXR1cm47XG4gICAgICAgIHNldEJ1c3kodHJ1ZSk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTdGFydGluZyBQREYgZ2VuZXJhdGlvbi4uLicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBFeHRyYWN0IHJpY2ggdGV4dCBjb250ZW50IEJFRk9SRSBjbG9uaW5nXG4gICAgICAgICAgICBjb25zdCByaWNoVGV4dE1hcCA9IGV4dHJhY3RSaWNoVGV4dENvbnRlbnQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU21hbGwgZGVsYXkgdG8gZW5zdXJlIGFsbCBjb250ZW50IGlzIHJlbmRlcmVkXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwKSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldENsYXNzID0gcHJvcHMudGFyZ2V0Q2xhc3MgfHwgJ214LXBhZ2UnO1xuICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihgLiR7dGFyZ2V0Q2xhc3N9YCkgYXMgSFRNTEVsZW1lbnQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBFbGVtZW50IHdpdGggY2xhc3MgLiR7dGFyZ2V0Q2xhc3N9IG5vdCBmb3VuZGApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDbG9uZSB0aGUgdGFyZ2V0XG4gICAgICAgICAgICBjb25zdCBjbG9uZSA9IHRhcmdldC5jbG9uZU5vZGUodHJ1ZSkgYXMgSFRNTEVsZW1lbnQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlcGxhY2UgcmljaCB0ZXh0IHdpZGdldHMgd2l0aCBleHRyYWN0ZWQgY29udGVudFxuICAgICAgICAgICAgcmVwbGFjZVJpY2hUZXh0V2lkZ2V0cyhjbG9uZSwgcmljaFRleHRNYXApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBHZXQgb3JpZ2luYWwgZGltZW5zaW9uc1xuICAgICAgICAgICAgY29uc3QgcmVjdCA9IHRhcmdldC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgICAgIGNvbnN0IGNvbXB1dGVkU3R5bGUgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSh0YXJnZXQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBcHBseSBhZGRpdGlvbmFsIHJpY2ggdGV4dCBtYXBwaW5ncyBmcm9tIHByb3BzIGlmIHByb3ZpZGVkXG4gICAgICAgICAgICBjb25zdCBtYXBwaW5ncyA9IFtcbiAgICAgICAgICAgICAgICB7IHNlbGVjdG9yOiBwcm9wcy5yaWNoU2VsZWN0b3IxIHx8ICcnLCBodG1sOiBwcm9wcy5yaWNoSHRtbDE/LnZhbHVlIHx8ICcnIH0sXG4gICAgICAgICAgICAgICAgeyBzZWxlY3RvcjogcHJvcHMucmljaFNlbGVjdG9yMiB8fCAnJywgaHRtbDogcHJvcHMucmljaEh0bWwyPy52YWx1ZSB8fCAnJyB9LFxuICAgICAgICAgICAgICAgIHsgc2VsZWN0b3I6IHByb3BzLnJpY2hTZWxlY3RvcjMgfHwgJycsIGh0bWw6IHByb3BzLnJpY2hIdG1sMz8udmFsdWUgfHwgJycgfVxuICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgbWFwcGluZ3MuZm9yRWFjaChtYXAgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChtYXAuc2VsZWN0b3IgJiYgbWFwLmh0bWwpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZWxlbWVudHMgPSBjbG9uZS5xdWVyeVNlbGVjdG9yQWxsKG1hcC5zZWxlY3Rvcik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNsZWFuSFRNTCA9IHNhbml0aXplSFRNTChtYXAuaHRtbCk7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnRzLmZvckVhY2goZWwgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgKGVsIGFzIEhUTUxFbGVtZW50KS5pbm5lckhUTUwgPSBjbGVhbkhUTUw7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBDYXB0dXJlIGNvbXB1dGVkIHN0eWxlc1xuICAgICAgICAgICAgY29uc3QgY2FwdHVyZWRTdHlsZXMgPSBjYXB0dXJlQ29tcHV0ZWRTdHlsZXMoY2xvbmUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDbGVhbiB1cCB1bndhbnRlZCBlbGVtZW50c1xuICAgICAgICAgICAgY2xvbmUucXVlcnlTZWxlY3RvckFsbCgnYnV0dG9uOm5vdCgua2VlcC1pbi1wZGYpLCAucGFnaW5nLXN0YXR1cywgLm14LWdyaWQtcGFnaW5nYmFyJykuZm9yRWFjaChlbCA9PiB7XG4gICAgICAgICAgICAgICAgZWwucmVtb3ZlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2V0IGFsbCBzdHlsZXNoZWV0cyBmcm9tIHRoZSBwYWdlXG4gICAgICAgICAgICBjb25zdCBzdHlsZVNoZWV0cyA9IEFycmF5LmZyb20oZG9jdW1lbnQuc3R5bGVTaGVldHMpO1xuICAgICAgICAgICAgbGV0IGV4aXN0aW5nU3R5bGVzID0gJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHN0eWxlU2hlZXRzLmZvckVhY2goc2hlZXQgPT4ge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJ1bGVzID0gQXJyYXkuZnJvbShzaGVldC5jc3NSdWxlcyB8fCBzaGVldC5ydWxlcyB8fCBbXSk7XG4gICAgICAgICAgICAgICAgICAgIHJ1bGVzLmZvckVhY2gocnVsZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocnVsZSBpbnN0YW5jZW9mIENTU1N0eWxlUnVsZSAmJiAhcnVsZS5zZWxlY3RvclRleHQ/LmluY2x1ZGVzKCdAbWVkaWEgcHJpbnQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4aXN0aW5nU3R5bGVzICs9IHJ1bGUuY3NzVGV4dCArICdcXG4nO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENyb3NzLW9yaWdpbiBzdHlsZXNoZWV0cyB3aWxsIHRocm93XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIEJ1aWxkIHRoZSBIVE1MIGRvY3VtZW50XG4gICAgICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHByb3BzLmZpbGVOYW1lPy52YWx1ZSB8fCAnZG9jdW1lbnQnO1xuICAgICAgICAgICAgY29uc3QgcGFnZU1hcmdpbiA9IHByb3BzLnBhZ2VNYXJnaW4gfHwgJzEwbW0nO1xuICAgICAgICAgICAgY29uc3QgZmlsZU9wdGlvbiA9IHByb3BzLmZpbGVPcHRpb24gfHwgJ2Rvd25sb2FkJztcblxuICAgICAgICAgICAgY29uc3QgaHRtbERvY3VtZW50ID0gYDwhRE9DVFlQRSBodG1sPlxuPGh0bWwgbGFuZz1cImVuXCI+XG48aGVhZD5cbiAgICA8bWV0YSBjaGFyc2V0PVwiVVRGLThcIj5cbiAgICA8bWV0YSBuYW1lPVwidmlld3BvcnRcIiBjb250ZW50PVwid2lkdGg9JHtyZWN0LndpZHRofVwiPlxuICAgIDx0aXRsZT4ke2ZpbGVOYW1lfTwvdGl0bGU+XG4gICAgPHN0eWxlPlxuICAgICAgICAvKiBSZXNldCBhbmQgYmFzZSBzdHlsZXMgKi9cbiAgICAgICAgKiB7XG4gICAgICAgICAgICBtYXJnaW46IDA7XG4gICAgICAgICAgICBwYWRkaW5nOiAwO1xuICAgICAgICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgQHBhZ2Uge1xuICAgICAgICAgICAgc2l6ZTogJHtyZWN0LndpZHRoID4gcmVjdC5oZWlnaHQgPyAnQTQgbGFuZHNjYXBlJyA6ICdBNCBwb3J0cmFpdCd9O1xuICAgICAgICAgICAgbWFyZ2luOiAke3BhZ2VNYXJnaW59O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBib2R5IHtcbiAgICAgICAgICAgIG1hcmdpbjogMDtcbiAgICAgICAgICAgIHBhZGRpbmc6IDA7XG4gICAgICAgICAgICB3aWR0aDogJHtyZWN0LndpZHRofXB4O1xuICAgICAgICAgICAgbWluLWhlaWdodDogJHtyZWN0LmhlaWdodH1weDtcbiAgICAgICAgICAgIGZvbnQtZmFtaWx5OiAke2NvbXB1dGVkU3R5bGUuZm9udEZhbWlseSB8fCAnLWFwcGxlLXN5c3RlbSwgQmxpbmtNYWNTeXN0ZW1Gb250LCBcIlNlZ29lIFVJXCIsIEFyaWFsLCBzYW5zLXNlcmlmJ307XG4gICAgICAgICAgICBmb250LXNpemU6ICR7Y29tcHV0ZWRTdHlsZS5mb250U2l6ZSB8fCAnMTRweCd9O1xuICAgICAgICAgICAgbGluZS1oZWlnaHQ6ICR7Y29tcHV0ZWRTdHlsZS5saW5lSGVpZ2h0IHx8ICcxLjUnfTtcbiAgICAgICAgICAgIGNvbG9yOiAke2NvbXB1dGVkU3R5bGUuY29sb3IgfHwgJyMwMDAwMDAnfTtcbiAgICAgICAgICAgIGJhY2tncm91bmQ6ICR7Y29tcHV0ZWRTdHlsZS5iYWNrZ3JvdW5kQ29sb3IgfHwgJyNmZmZmZmYnfTtcbiAgICAgICAgICAgIC13ZWJraXQtcHJpbnQtY29sb3ItYWRqdXN0OiBleGFjdDtcbiAgICAgICAgICAgIHByaW50LWNvbG9yLWFkanVzdDogZXhhY3Q7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8qIFByZXNlcnZlIG9yaWdpbmFsIHN0eWxlcyAqL1xuICAgICAgICAke2V4aXN0aW5nU3R5bGVzfVxuICAgICAgICBcbiAgICAgICAgLyogQ2FwdHVyZWQgY29tcHV0ZWQgc3R5bGVzICovXG4gICAgICAgICR7Y2FwdHVyZWRTdHlsZXN9XG4gICAgICAgIFxuICAgICAgICAvKiBSaWNoIHRleHQgcHJpbnRpbmcgc3R5bGVzICovXG4gICAgICAgIC5teC1yaWNodGV4dC1wcmludGVkIHtcbiAgICAgICAgICAgIGRpc3BsYXk6IGJsb2NrICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBtYXJnaW46IDIwcHggMCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgcGFkZGluZzogMTVweCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgYm9yZGVyOiAxcHggc29saWQgI2RkZCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgYmFja2dyb3VuZDogI2Y5ZjlmOSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgYm9yZGVyLXJhZGl1czogNHB4ICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC5yaWNoLXRleHQtbGFiZWwge1xuICAgICAgICAgICAgZm9udC13ZWlnaHQ6IGJvbGQgIWltcG9ydGFudDtcbiAgICAgICAgICAgIG1hcmdpbi1ib3R0b206IDEwcHggIWltcG9ydGFudDtcbiAgICAgICAgICAgIGNvbG9yOiAjMzMzICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC5yaWNoLXRleHQtY29udGVudCB7XG4gICAgICAgICAgICB3aGl0ZS1zcGFjZTogcHJlLXdyYXAgIWltcG9ydGFudDtcbiAgICAgICAgICAgIHdvcmQtYnJlYWs6IGJyZWFrLXdvcmQgIWltcG9ydGFudDtcbiAgICAgICAgICAgIG92ZXJmbG93LXdyYXA6IGJyZWFrLXdvcmQgIWltcG9ydGFudDtcbiAgICAgICAgICAgIGZvbnQtZmFtaWx5OiBpbmhlcml0ICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBsaW5lLWhlaWdodDogMS42ICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBjb2xvcjogIzAwMCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAuanNvbi1mb3JtYXR0ZWQge1xuICAgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogI2Y1ZjVmNSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgYm9yZGVyOiAxcHggc29saWQgI2NjYyAhaW1wb3J0YW50O1xuICAgICAgICAgICAgYm9yZGVyLXJhZGl1czogM3B4ICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBwYWRkaW5nOiAxMHB4ICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBtYXJnaW46IDEwcHggMCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAuanNvbi1mb3JtYXR0ZWQgcHJlIHtcbiAgICAgICAgICAgIHdoaXRlLXNwYWNlOiBwcmUtd3JhcCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgd29yZC1icmVhazogYnJlYWstYWxsICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBmb250LWZhbWlseTogJ0NvdXJpZXIgTmV3JywgQ291cmllciwgbW9ub3NwYWNlICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBmb250LXNpemU6IDEycHggIWltcG9ydGFudDtcbiAgICAgICAgICAgIG1hcmdpbjogMCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgY29sb3I6ICMwMDAgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLnJpY2gtdGV4dC1mYWxsYmFjayB7XG4gICAgICAgICAgICBtYXJnaW4tdG9wOiAzMHB4ICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBwYWRkaW5nOiAyMHB4ICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBib3JkZXItdG9wOiAycHggc29saWQgI2RkZCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAucmljaC10ZXh0LWZhbGxiYWNrIGgzIHtcbiAgICAgICAgICAgIG1hcmdpbi1ib3R0b206IDE1cHggIWltcG9ydGFudDtcbiAgICAgICAgICAgIGNvbG9yOiAjMzMzICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8qIEVuc3VyZSByaWNoIHRleHQgZm9ybWF0dGluZyBpcyBwcmVzZXJ2ZWQgKi9cbiAgICAgICAgLm14LXJpY2h0ZXh0LXByaW50ZWQgcCxcbiAgICAgICAgLnJpY2gtdGV4dC1jb250ZW50IHAge1xuICAgICAgICAgICAgbWFyZ2luOiAwIDAgMTBweCAwICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC5teC1yaWNodGV4dC1wcmludGVkIHVsLCAubXgtcmljaHRleHQtcHJpbnRlZCBvbCxcbiAgICAgICAgLnJpY2gtdGV4dC1jb250ZW50IHVsLCAucmljaC10ZXh0LWNvbnRlbnQgb2wge1xuICAgICAgICAgICAgbWFyZ2luOiAwIDAgMTBweCAyMHB4ICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBwYWRkaW5nLWxlZnQ6IDIwcHggIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLm14LXJpY2h0ZXh0LXByaW50ZWQgbGksXG4gICAgICAgIC5yaWNoLXRleHQtY29udGVudCBsaSB7XG4gICAgICAgICAgICBtYXJnaW46IDAgMCA1cHggMCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAubXgtcmljaHRleHQtcHJpbnRlZCBzdHJvbmcsIC5teC1yaWNodGV4dC1wcmludGVkIGIsXG4gICAgICAgIC5yaWNoLXRleHQtY29udGVudCBzdHJvbmcsIC5yaWNoLXRleHQtY29udGVudCBiIHtcbiAgICAgICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC5teC1yaWNodGV4dC1wcmludGVkIGVtLCAubXgtcmljaHRleHQtcHJpbnRlZCBpLFxuICAgICAgICAucmljaC10ZXh0LWNvbnRlbnQgZW0sIC5yaWNoLXRleHQtY29udGVudCBpIHtcbiAgICAgICAgICAgIGZvbnQtc3R5bGU6IGl0YWxpYyAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvKiBUYWJsZSBzdHlsZXMgKi9cbiAgICAgICAgdGFibGUge1xuICAgICAgICAgICAgd2lkdGg6IDEwMCUgIWltcG9ydGFudDtcbiAgICAgICAgICAgIGJvcmRlci1jb2xsYXBzZTogY29sbGFwc2UgIWltcG9ydGFudDtcbiAgICAgICAgICAgIHBhZ2UtYnJlYWstaW5zaWRlOiBhdXRvICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBtYXJnaW46IDEwcHggMCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGVhZCB7XG4gICAgICAgICAgICBkaXNwbGF5OiB0YWJsZS1oZWFkZXItZ3JvdXAgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGJvZHkge1xuICAgICAgICAgICAgZGlzcGxheTogdGFibGUtcm93LWdyb3VwICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRyIHtcbiAgICAgICAgICAgIHBhZ2UtYnJlYWstaW5zaWRlOiBhdm9pZCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aCwgdGQge1xuICAgICAgICAgICAgcGFkZGluZzogOHB4ICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBib3JkZXI6IDFweCBzb2xpZCAjZGRkICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICB0ZXh0LWFsaWduOiBsZWZ0ICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoIHtcbiAgICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6ICNmNWY1ZjUgIWltcG9ydGFudDtcbiAgICAgICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkICFpbXBvcnRhbnQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8qIEhpZGUgdW53YW50ZWQgZWxlbWVudHMgKi9cbiAgICAgICAgLm5vLXByaW50LFxuICAgICAgICBidXR0b246bm90KC5wcmludC1idXR0b24pLFxuICAgICAgICBpbnB1dFt0eXBlPVwiYnV0dG9uXCJdLFxuICAgICAgICBpbnB1dFt0eXBlPVwic3VibWl0XCJdLFxuICAgICAgICAubXgtYnV0dG9uOm5vdCgucHJpbnQtYnV0dG9uKSxcbiAgICAgICAgLmJ0bjpub3QoLnByaW50LWJ1dHRvbiksXG4gICAgICAgIC5xbC10b29sYmFyLFxuICAgICAgICAucWwtdG9vbHRpcCxcbiAgICAgICAgLnFsLXRhYmxlLW1lbnVzLWNvbnRhaW5lcixcbiAgICAgICAgLndpZGdldC1yaWNoLXRleHQtdG9vbGJhcixcbiAgICAgICAgLndpZGdldC1yaWNoLXRleHQtZm9vdGVyIHtcbiAgICAgICAgICAgIGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLyogTWVuZGl4LXNwZWNpZmljIHByZXNlcnZhdGlvbnMgKi9cbiAgICAgICAgLm14LWxheW91dGdyaWQtcm93IHtcbiAgICAgICAgICAgIGRpc3BsYXk6IGZsZXggIWltcG9ydGFudDtcbiAgICAgICAgICAgIGZsZXgtd3JhcDogd3JhcCAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAubXgtbGF5b3V0Z3JpZC1jb2wge1xuICAgICAgICAgICAgZmxleDogMCAwIGF1dG8gIWltcG9ydGFudDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLm14LWNvbnRhaW5lcixcbiAgICAgICAgLm14LXNjcm9sbGNvbnRhaW5lci13cmFwcGVyIHtcbiAgICAgICAgICAgIHdpZHRoOiAxMDAlICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBvdmVyZmxvdzogdmlzaWJsZSAhaW1wb3J0YW50O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBAbWVkaWEgcHJpbnQge1xuICAgICAgICAgICAgYm9keSB7XG4gICAgICAgICAgICAgICAgd2lkdGg6IDEwMCUgIWltcG9ydGFudDtcbiAgICAgICAgICAgICAgICBtYXJnaW46IDAgIWltcG9ydGFudDtcbiAgICAgICAgICAgICAgICBwYWRkaW5nOiAke3BhZ2VNYXJnaW59ICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICoge1xuICAgICAgICAgICAgICAgIG92ZXJmbG93OiB2aXNpYmxlICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICAgICAgbWF4LWhlaWdodDogbm9uZSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAubXgtcmljaHRleHQtcHJpbnRlZCB7XG4gICAgICAgICAgICAgICAgcGFnZS1icmVhay1pbnNpZGU6IGF2b2lkICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICAgICAgYmFja2dyb3VuZDogd2hpdGUgIWltcG9ydGFudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIDwvc3R5bGU+XG48L2hlYWQ+XG48Ym9keT5cbiAgICA8ZGl2IGNsYXNzPVwicGRmLWNvbnRlbnQtd3JhcHBlclwiIHN0eWxlPVwid2lkdGg6ICR7cmVjdC53aWR0aH1weDtcIj5cbiAgICAgICAgJHtjbG9uZS5pbm5lckhUTUx9XG4gICAgPC9kaXY+XG48L2JvZHk+XG48L2h0bWw+YDtcblxuICAgICAgICAgICAgY29uc29sZS5sb2coJ0hUTUwgZG9jdW1lbnQgcHJlcGFyZWQgZm9yIFBERicpO1xuXG4gICAgICAgICAgICAvLyBDb252ZXJ0IHRvIGJhc2U2NFxuICAgICAgICAgICAgY29uc3QgdG9CYXNlNjRJbkNodW5rcyA9ICh1OGE6IFVpbnQ4QXJyYXkpOiBzdHJpbmcgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IENIVU5LX1NJWkUgPSA4MTkyO1xuICAgICAgICAgICAgICAgIGxldCBiaW5TdHJpbmcgPSBcIlwiO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdThhLmxlbmd0aDsgaSArPSBDSFVOS19TSVpFKSB7XG4gICAgICAgICAgICAgICAgICAgIGJpblN0cmluZyArPSBTdHJpbmcuZnJvbUNvZGVQb2ludCguLi51OGEuc3ViYXJyYXkoaSwgaSArIENIVU5LX1NJWkUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGJ0b2EoYmluU3RyaW5nKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBjb25zdCBiYXNlNjQgPSB0b0Jhc2U2NEluQ2h1bmtzKG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZShodG1sRG9jdW1lbnQpKTtcbiAgICAgICAgICAgIGNvbnN0IGNsZWFuRmlsZU5hbWUgPSBmaWxlTmFtZS5yZXBsYWNlKC9bXFwvOio/XCI8PnxdKy9nLCAnXycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocHJvcHMucGRmTmFtZUF0dHI/LnNldFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgcHJvcHMucGRmTmFtZUF0dHIuc2V0VmFsdWUoY2xlYW5GaWxlTmFtZSArICcucGRmJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChwcm9wcy5iYXNlNjRBdHRyPy5zZXRWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHByb3BzLmJhc2U2NEF0dHIuc2V0VmFsdWUoYmFzZTY0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSGFuZGxlIG91dHB1dFxuICAgICAgICAgICAgaWYgKGZpbGVPcHRpb24gPT09ICdiYXNlNjQnKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0RvY3VtZW50IHN0b3JlZCBhcyBiYXNlNjQnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZmlsZU9wdGlvbiA9PT0gJ3ByZXZpZXcnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJpbnRXaW5kb3cgPSB3aW5kb3cub3BlbignJywgJ19ibGFuaycsIGB3aWR0aD0ke01hdGgubWluKHJlY3Qud2lkdGggKyAxMDAsIDEyMDApfSxoZWlnaHQ9ODAwYCk7XG4gICAgICAgICAgICAgICAgaWYgKHByaW50V2luZG93KSB7XG4gICAgICAgICAgICAgICAgICAgIHByaW50V2luZG93LmRvY3VtZW50Lm9wZW4oKTtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRXaW5kb3cuZG9jdW1lbnQud3JpdGUoaHRtbERvY3VtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRXaW5kb3cuZG9jdW1lbnQuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgcHJpbnRXaW5kb3cub25sb2FkID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBwcmludFdpbmRvdy5wcmludCgpLCAyNTApO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gUHJpbnQgdXNpbmcgaWZyYW1lXG4gICAgICAgICAgICAgICAgY29uc3QgcHJpbnRGcmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lmcmFtZScpO1xuICAgICAgICAgICAgICAgIHByaW50RnJhbWUuc3R5bGUuY3NzVGV4dCA9ICdwb3NpdGlvbjphYnNvbHV0ZTt3aWR0aDowO2hlaWdodDowO2JvcmRlcjowO2xlZnQ6LTk5OTlweCc7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChwcmludEZyYW1lKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBmcmFtZURvYyA9IHByaW50RnJhbWUuY29udGVudERvY3VtZW50IHx8IHByaW50RnJhbWUuY29udGVudFdpbmRvdz8uZG9jdW1lbnQ7XG4gICAgICAgICAgICAgICAgaWYgKGZyYW1lRG9jKSB7XG4gICAgICAgICAgICAgICAgICAgIGZyYW1lRG9jLm9wZW4oKTtcbiAgICAgICAgICAgICAgICAgICAgZnJhbWVEb2Mud3JpdGUoaHRtbERvY3VtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgZnJhbWVEb2MuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRGcmFtZS5jb250ZW50V2luZG93Py5mb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJpbnRGcmFtZS5jb250ZW50V2luZG93Py5wcmludCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRvY3VtZW50LmJvZHkuY29udGFpbnMocHJpbnRGcmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChwcmludEZyYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCAxMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMjUwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChwcm9wcy5vbkNoYW5nZT8uY2FuRXhlY3V0ZSAmJiBwcm9wcy5vbkNoYW5nZT8uZXhlY3V0ZSkge1xuICAgICAgICAgICAgICAgIHByb3BzLm9uQ2hhbmdlLmV4ZWN1dGUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignUERGIGdlbmVyYXRpb24gZXJyb3I6JywgZXJyb3IpO1xuICAgICAgICAgICAgYWxlcnQoJ0ZhaWxlZCB0byBnZW5lcmF0ZSBQREYuIENoZWNrIHRoZSBicm93c2VyIGNvbnNvbGUgZm9yIGRldGFpbHMuJyk7XG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICBzZXRCdXN5KGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH0sIFtidXN5LCBwcm9wc10pO1xuXG4gICAgaWYgKHByb3BzLmhpZGVCdXR0b24gPT09IHRydWUpIHJldHVybiA8RnJhZ21lbnQgLz47XG5cbiAgICBjb25zdCBidXR0b25DbGFzc05hbWUgPSBwcm9wcy5idXR0b25DbGFzcyB8fCAnYnRuIGJ0bi1wcmltYXJ5JztcbiAgICBjb25zdCBidXR0b25UZXh0ID0gcHJvcHMuYnV0dG9uQ2FwdGlvbj8udmFsdWUgfHwgJ0V4cG9ydCB0byBQREYnO1xuXG4gICAgcmV0dXJuIChcbiAgICAgICAgPGJ1dHRvbiBjbGFzc05hbWU9e2J1dHRvbkNsYXNzTmFtZX0gZGlzYWJsZWQ9e2J1c3l9IG9uQ2xpY2s9e2dlbmVyYXRlRG9jdW1lbnR9PlxuICAgICAgICAgICAge2J1c3kgPyBcIkdlbmVyYXRpbmcuLi5cIiA6IGJ1dHRvblRleHR9XG4gICAgICAgIDwvYnV0dG9uPlxuICAgICk7XG59Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBR00sU0FBVSxrQkFBa0IsQ0FBQyxLQUF1QyxFQUFBO0lBQ3RFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBRXhDLElBQUEsTUFBTSxZQUFZLEdBQUcsQ0FBQyxJQUFZLEtBQVk7UUFDMUMsTUFBTSxJQUFJLEdBQUcs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
