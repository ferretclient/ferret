# ferret-converters

The converters package is responsible for converting collections from one format to a Ferret collection.
It can be used as a standalone package or as a part of the Ferret framework.

## Installation

```bash
npm install @ferretclient/converters
```

## Usage

### Convert Postman collection to Ferret collection

```javascript
const { postmanToFerret } = require('@ferretclient/converters');

// Convert Postman collection to Ferret collection
const ferretCollection = postmanToFerret(postmanCollection);
```

### Convert Postman Environment to Ferret Environment

```javascript
const { postmanToFerretEnvironment } = require('@ferretclient/converters');

const ferretEnvironment = postmanToFerretEnvironment(postmanEnvironment);
```

### Convert Insomnia collection to Ferret collection

```javascript
const { insomniaToFerret } = require('@ferretclient/converters');

const ferretCollection = insomniaToFerret(insomniaCollection);
```

### Convert OpenAPI specification to Ferret collection

```javascript
const { openApiToFerret } = require('@ferretclient/converters');

const ferretCollection = openApiToFerret(openApiSpecification);
```

### Convert WSDL file to Ferret collection

```javascript
import { wsdlToFerret } from '@ferretclient/converters';

const ferretCollection = await wsdlToFerret(wsdlContent);
```

## Example 

```javascript

const { postmanToFerret } = require('@ferretclient/converters');
const fs = require('fs/promises');
const path = require('path');

async function convertPostmanToFerret(inputFile, outputFile) {
  try {
    // Read Postman collection file
    const inputData = await fs.readFile(inputFile, 'utf8');
    
    // Convert to Ferret collection
    const ferretCollection = await postmanToFerret(JSON.parse(inputData));
    
    // Save Ferret collection
    await fs.writeFile(outputFile, JSON.stringify(ferretCollection, null, 2));
    
    console.log('Conversion successful!');
  } catch (error) {
    console.error('Error during conversion:', error);
  }
}

// Usage
const inputFilePath = path.resolve(__dirname, 'demo_collection.postman_collection.json');
const outputFilePath = path.resolve(__dirname, 'ferret-collection.json');

convertPostmanToFerret(inputFilePath, outputFilePath);

``` 

## WSDL Import Features

The WSDL importer supports the following features:

- **Service Discovery**: Automatically extracts service endpoints from WSDL definitions
- **Operation Mapping**: Converts WSDL operations to Ferret HTTP requests
- **SOAP Envelope Generation**: Creates proper SOAP envelopes for each operation
- **Header Configuration**: Sets up appropriate Content-Type and SOAPAction headers
- **Environment Variables**: Creates environment variables for service base URLs
- **Folder Organization**: Groups operations by port type for better organization

### WSDL Import Example

```javascript
import { wsdlToFerret } from '@ferretclient/converters';
import fs from 'fs/promises';

async function importWSDL() {
  try {
    // Read WSDL file
    const wsdlContent = await fs.readFile('service.wsdl', 'utf8');
    
    // Convert to Ferret collection
    const ferretCollection = await wsdlToFerret(wsdlContent);
    
    // Save Ferret collection
    await fs.writeFile('soap-collection.json', JSON.stringify(ferretCollection, null, 2));
    
    console.log('WSDL import successful!');
  } catch (error) {
    console.error('Error during WSDL import:', error);
  }
}

importWSDL();
```

### CLI Usage

You can also use the Ferret CLI to import WSDL files:

```bash
# Import WSDL file to a directory
ferret import wsdl --source service.wsdl --output ~/Desktop/soap-collection --collection-name "SOAP Service"

# Import WSDL from URL
ferret import wsdl --source https://example.com/service.wsdl --output ~/Desktop --collection-name "Remote SOAP Service"

# Import WSDL and save as JSON file
ferret import wsdl --source service.wsdl --output-file ~/Desktop/soap-collection.json --collection-name "SOAP Service"
```

## Supported Formats

- **Postman Collections** (v2.1)
- **Insomnia Collections** (v4 and v5)
- **OpenAPI Specifications** (v3.0)
- **WSDL Files** (Web Services Description Language)

## Dependencies

- `lodash` - Utility functions
- `nanoid` - UUID generation
- `js-yaml` - YAML parsing
- `xml2js` - XML parsing for WSDL
- `@ferretclient/schema` - Schema validation
