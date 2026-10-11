const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const filestore = require('@ferretclient/filestore');

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

const LARGE_FILE_REDACT_THRESHOLD = 64 * 1024;

const parseLargeFer = (content, format, type) => {
  const { skeleton, blocks } = filestore.redactLargeFerTextBlocks(content);
  let data;
  switch (type) {
    case 'request':
      data = filestore.parseRequest(skeleton, { format });
      break;
    case 'collection':
      data = filestore.parseCollection(skeleton, { format });
      break;
    case 'folder':
      data = filestore.parseFolder(skeleton, { format });
      break;
    default:
      return null;
  }
  return filestore.restoreRedactedBlocks(data, blocks);
};

const extractFerMeta = (content) => {
  const data = {};
  const match = content.match(/meta\s*\{\s*([\s\S]*?)\s*\}/);
  if (match) {
    for (const line of match[1].replace(/\r\n/g, '\n').split('\n')) {
      const idx = line.indexOf(':');
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (!key || !value) continue;
      data[key] = Number.isNaN(Number(value)) ? value : Number(value);
    }
  }
  if (data.type === 'http') data.type = 'http-request';
  else if (data.type === 'graphql') data.type = 'graphql-request';
  return data;
};

const parseContent = (content, format, type, byteSize) => {
  if (type === 'config' || format === 'json') return JSON.parse(content);
  const options = { format };
  const isLargeFer = format === 'fer' && byteSize >= LARGE_FILE_REDACT_THRESHOLD;
  switch (type) {
    case 'request':
      if (isLargeFer) return parseLargeFer(content, format, type);
      return filestore.parseRequest(content, options);
    case 'collection':
      if (isLargeFer) return parseLargeFer(content, format, type);
      return filestore.parseCollection(content, options);
    case 'folder':
      if (isLargeFer) return parseLargeFer(content, format, type);
      return filestore.parseFolder(content, options);
    case 'environment':
      return filestore.parseEnvironment(content, options);
    default:
      throw new Error(`Unknown type: ${type}`);
  }
};

const parseFile = ({ collectionPath, relativePath, format, type }) => {
  const absolutePath = path.join(collectionPath, relativePath);
  const buf = fs.readFileSync(absolutePath);
  const stat = fs.statSync(absolutePath, { bigint: true });
  const mtime = stat.mtimeNs;
  const hash = sha256(buf);
  const content = buf.toString('utf8');
  try {
    const data = parseContent(content, format, type, buf.length);
    return { relativePath, mtime, hash, data, format, type, raw: content };
  } catch (err) {
    const data = format === 'fer' && type === 'request' ? extractFerMeta(content) : {};
    return { relativePath, mtime, hash, data, format, type, raw: content, partial: true, error: { message: err.message, stack: err.stack } };
  }
};

module.exports = parseFile;
