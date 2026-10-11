# Ferret Filestore

A generic file storage and parsing package for Ferret API client.

## Purpose

This package abstracts the file format operations for Ferret, providing a clean interface for parsing and stringifying Ferret requests, collections, folders, and environments.

## Features

- Format-agnostic APIs for file operations
- Currently supports Ferret's custom `.fer` format
- Designed for future extensibility to support YAML and other formats

## Usage

```javascript
const {
  parseRequest,
  stringifyRequest,
  parseCollection,
  stringifyCollection,
  parseEnvironment,
  stringifyEnvironment,
  parseDotEnv
} = require('@ferretclient/filestore');

// Parse a .fer request file
const requestData = parseRequest(ferContent);

// Stringify request data to .fer format
const ferContent = stringifyRequest(requestData);

// Example with future format support (not yet implemented)
const requestData = parseRequest(yamlContent, { format: 'yaml' });
```

## API

The package provides the following functions:

- `parseRequest(content, options = { format: 'fer' })`: Parse request file content
- `stringifyRequest(requestObj, options = { format: 'fer' })`: Convert request object to file content
- `parseCollection(content, options = { format: 'fer' })`: Parse collection file content
- `stringifyCollection(collectionObj, options = { format: 'fer' })`: Convert collection object to file content
- `parseFolder(content, options = { format: 'fer' })`: Parse folder file content
- `stringifyFolder(folderObj, options = { format: 'fer' })`: Convert folder object to file content
- `parseEnvironment(content, options = { format: 'fer' })`: Parse environment file content
- `stringifyEnvironment(envObj, options = { format: 'fer' })`: Convert environment object to file content
- `parseDotEnv(content)`: Parse .env file content 