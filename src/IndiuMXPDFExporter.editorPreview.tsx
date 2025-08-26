import { ReactElement, createElement } from "react";
import { HelloWorldSample } from "./components/HelloWorldSample";
import { IndiuMXPDFExporterContainerProps } from "../typings/IndiuMXPDFExporterProps";

export function preview(props: IndiuMXPDFExporterContainerProps): ReactElement {
    return <HelloWorldSample sampleText={props.class} />;
}

export function getPreviewCss(): string {
    return require("./ui/IndiuMXPDFExporter.css");
}
