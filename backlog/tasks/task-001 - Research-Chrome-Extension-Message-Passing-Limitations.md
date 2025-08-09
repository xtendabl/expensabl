---
id: task-001
title: Research Chrome Extension Message Passing Limitations
status: Done
assignee: []
created_date: '2025-08-05'
updated_date: '2025-08-05'
labels:
  - research
  - chrome-extension
dependencies: []
---

## Description

Investigate how Chrome handles different data types in message passing between extension contexts.

## Acceptance Criteria

- [x] Document which data types can/cannot pass through chrome.runtime.sendMessage
- [x] Identify solution for passing binary data (ArrayBuffer)
- [x] Create proof of concept for binary data transfer

## Implementation Plan

1. Research Chrome's Structured Clone Algorithm limitations
2. Document supported and unsupported data types
3. Identify base64 encoding as the solution for binary data
4. Create utility functions for conversion
5. Build proof of concept with test function

## Implementation Notes

- Created comprehensive research document at `backlog/docs/chrome-message-passing-research.md`
- Documented that ArrayBuffer, Blob, and File objects cannot pass through Chrome message passing directly
- Identified base64 encoding as the most reliable solution (33% size overhead but acceptable for <10MB files)
- Implemented utility functions in `src/shared/utils/binary-encoding.ts`:
  - `fileToArrayBuffer()`: Converts File to ArrayBuffer using FileReader
  - `arrayBufferToBase64()`: Encodes ArrayBuffer to base64 with chunking to avoid stack overflow
  - `base64ToArrayBuffer()`: Decodes base64 back to ArrayBuffer
  - `validateFileSize()`: Validates file size before encoding (max 10MB default)
  - `testBinaryEncoding()`: Proof of concept test function
- Added proper error handling for all conversion functions
- Documented performance considerations and alternative approaches
