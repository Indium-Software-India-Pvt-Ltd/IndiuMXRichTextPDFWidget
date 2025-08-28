/**
 * This file was generated from IndiuMXPDFExporter.xml
 * WARNING: All changes made to this file will be overwritten
 * @author Mendix Widgets Framework Team
 */
import { CSSProperties } from "react";
import { ActionValue, DynamicValue, EditableValue } from "mendix";
import { Big } from "big.js";

export type FileOptionEnum = "download" | "preview" | "base64";

export interface IndiuMXPDFExporterContainerProps {
    name: string;
    class: string;
    style?: CSSProperties;
    tabIndex?: number;
    targetClass: string;
    fileOption: FileOptionEnum;
    fileName: DynamicValue<string>;
    pdfNameAttr?: EditableValue<string>;
    base64Attr?: EditableValue<string>;
    onChange?: ActionValue;
    richSelector1: string;
    richHtml1?: EditableValue<string>;
    richSelector2: string;
    richHtml2?: EditableValue<string>;
    richSelector3: string;
    richHtml3?: EditableValue<string>;
    pageMargin: string;
    scale: Big;
    buttonCaption?: DynamicValue<string>;
    buttonClass: string;
    hideButton: boolean;
}

export interface IndiuMXPDFExporterPreviewProps {
    /**
     * @deprecated Deprecated since version 9.18.0. Please use class property instead.
     */
    className: string;
    class: string;
    style: string;
    styleObject?: CSSProperties;
    readOnly: boolean;
    renderMode: "design" | "xray" | "structure";
    translate: (text: string) => string;
    targetClass: string;
    fileOption: FileOptionEnum;
    fileName: string;
    pdfNameAttr: string;
    base64Attr: string;
    onChange: {} | null;
    richSelector1: string;
    richHtml1: string;
    richSelector2: string;
    richHtml2: string;
    richSelector3: string;
    richHtml3: string;
    pageMargin: string;
    scale: number | null;
    buttonCaption: string;
    buttonClass: string;
    hideButton: boolean;
}
