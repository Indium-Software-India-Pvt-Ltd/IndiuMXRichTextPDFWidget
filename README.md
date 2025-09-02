## IndiuMXPDFExporter
IndiuMXPDFExporter is a Mendix widget designed to export HTML content or Mendix dynamic content into PDF format. It supports exporting as both Blob and Base64 strings, enabling easy integration with various workflows and storage options.

## Features
- Export HTML or Mendix content directly to PDF
- Supports output as Blob and Base64 encoded PDF
- Handles page breaks for multi-page documents
- Supports images with CORS enabled for seamless embedding
- Default page size set to A4 in portrait orientation

## Usage
1. Import the IndiuMXPDFExporter widget into your Mendix project.
2. Add the widget to your page where you want to enable PDF export.
3. Pass an HTML string or bind dynamic Mendix content to the widget.
4. Configure widget properties as needed to customize PDF generation.
5. Use the export functionality to generate and download or process the PDF output.

## Demo project
A demo project showcasing the widget usage can be found here: [Demo Sandbox](https://github.com/yourusername/IndiuMXPDFExporterDemo)

## Issues, suggestions and feature requests
If you encounter any issues, have suggestions, or want to request new features, please open an issue on the GitHub repository: [GitHub Issues](https://github.com/yourusername/IndiuMXPDFExporter/issues). Contributions via pull requests are also welcome!

## Development and contribution

1. Install NPM package dependencies by using: `npm install`. If you use NPM v7.x.x, which can be checked by executing `npm -v`, execute: `npm install --legacy-peer-deps`.
1. Run `npm start` to watch for code changes. On every change:
    - the widget will be bundled;
    - the bundle will be included in a `dist` folder in the root directory of the project;
    - the bundle will be included in the `deployment` and `widgets` folder of the Mendix test project.

Feel free to fork the repository and submit pull requests to contribute new features or improvements.
